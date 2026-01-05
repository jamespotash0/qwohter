/**
 * Google Docs Generation Edge Function
 *
 * Copies a Google Docs template and replaces {{variables}} with proposal data.
 * Uses the user's OAuth token to create documents in their own Google Drive.
 *
 * Required Supabase Secrets:
 * - GOOGLE_CLIENT_ID: OAuth client ID (for token refresh)
 * - GOOGLE_CLIENT_SECRET: OAuth client secret (for token refresh)
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Data for dynamic table row duplication */
interface TableRowData {
  tableId: string;
  rows: Array<Record<string, string | number>>;
}

interface RequestBody {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  variables: Record<string, string>;
  tableData?: TableRowData[]; // Optional table data for row duplication
  outputTitle?: string;
  mode?: 'create' | 'overwrite'; // create = new version, overwrite = replace existing
  existingDocId?: string; // doc to overwrite (delete and recreate)
  version?: number; // version number for naming (e.g., 1 for _v1)
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface OrgTokenData {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  drive_folder_id: string | null;
  is_valid: boolean;
}

/**
 * Get a valid access token for the organization, refreshing if expired
 * Returns the token and the folder ID for document creation
 */
async function getOrgAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{ accessToken: string; folderId: string | null }> {
  console.log(`[getOrgAccessToken] Looking up token for org: ${organizationId}`);

  // Get org-level token from database
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_valid', true)
    .single();

  console.log(`[getOrgAccessToken] Query result - error: ${tokenError?.message || 'none'}, hasData: ${!!tokenData}`);

  if (tokenError || !tokenData) {
    // Try to find ANY token for this org to see if it's just invalid
    const { data: anyToken } = await supabaseAdmin
      .from('google_oauth_tokens')
      .select('id, is_valid, token_expires_at')
      .eq('organization_id', organizationId)
      .single();

    if (anyToken) {
      console.log(`[getOrgAccessToken] Found token but is_valid=${anyToken.is_valid}, expires_at=${anyToken.token_expires_at}`);
    } else {
      console.log(`[getOrgAccessToken] No token found for organization at all`);
    }

    throw new Error('Google Docs not configured. An admin needs to connect Google in Settings → Integrations.');
  }

  const folderId = tokenData.drive_folder_id;

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token is still valid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    return { accessToken: tokenData.access_token, folderId };
  }
  //@ts-ignore
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  //@ts-ignore
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured on server');
  }

  if (!tokenData.refresh_token) {
    // Mark token as invalid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ is_valid: false })
      .eq('id', tokenData.id);

    throw new Error('Google connection expired. An admin needs to reconnect in Settings → Integrations.');
  }

  // Refresh the token with retry logic (industry standard)
  console.log('[getOrgAccessToken] Token expired, attempting refresh...');

  let refreshResponse: Response | null = null;
  let lastError = '';

  // Retry up to 3 times with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        console.log(`[getOrgAccessToken] Token refresh succeeded on attempt ${attempt}`);
        break;
      }

      lastError = await refreshResponse.text();
      console.warn(`[getOrgAccessToken] Refresh attempt ${attempt} failed: ${lastError}`);

      // Check if error is permanent (user revoked access)
      if (lastError.includes('invalid_grant') || lastError.includes('Token has been revoked')) {
        console.error('[getOrgAccessToken] Refresh token permanently invalid - user must reconnect');
        break; // Don't retry, this is permanent
      }

      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    } catch (networkError) {
      lastError = networkError instanceof Error ? networkError.message : 'Network error';
      console.warn(`[getOrgAccessToken] Network error on attempt ${attempt}: ${lastError}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  if (!refreshResponse?.ok) {
    console.error('[getOrgAccessToken] All refresh attempts failed:', lastError);

    // Only mark as invalid if it's a permanent failure (not network issues)
    const isPermanentFailure = lastError.includes('invalid_grant') ||
                               lastError.includes('Token has been revoked') ||
                               lastError.includes('unauthorized_client');

    if (isPermanentFailure) {
      await supabaseAdmin
        .from('google_oauth_tokens')
        .update({ is_valid: false })
        .eq('id', tokenData.id);

      throw new Error('Google connection expired. An admin needs to reconnect in Settings → Integrations.');
    }

    // For transient errors, don't mark as invalid - just fail this request
    throw new Error('Failed to refresh Google token. Please try again.');
  }

  const newTokens: GoogleTokenResponse = await refreshResponse.json();

  // Calculate new expiration
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update tokens in database
  await supabaseAdmin
    .from('google_oauth_tokens')
    .update({
      access_token: newTokens.access_token,
      token_expires_at: newExpiresAt,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tokenData.id);

  return { accessToken: newTokens.access_token, folderId };
}

/**
 * Copy a Google Doc template using Drive API
 * Document is created in the specified folder (or root if no folder)
 */
async function copyDocument(
  accessToken: string,
  templateDocId: string,
  title: string,
  folderId: string | null
): Promise<string> {
  // Build the request body - include parents if folder specified
  const requestBody: { name: string; parents?: string[] } = { name: title };
  if (folderId) {
    requestBody.parents = [folderId];
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${templateDocId}/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    // Provide more helpful error messages
    if (error.includes('notFound')) {
      throw new Error('Template not found. Make sure the template is shared with the connected Google account.');
    }
    if (error.includes('forbidden') || error.includes('403')) {
      throw new Error('Access denied. Make sure the connected Google account has access to the template and target folder.');
    }

    throw new Error(`Failed to copy document: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Delete a Google Doc using Drive API
 */
async function deleteDocument(
  accessToken: string,
  docId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.warn(`Failed to delete document ${docId}: ${error}`);
    // Don't throw - we'll create a new doc anyway
  }
}

// ============ EXPRESSION EVALUATOR ============
// Supports: +, -, *, /, parentheses, PEMDAS order of operations
// Example: {{pricing.materials + pricing.labor}} or {{(subtotal + tax) * 1.1}}

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'lparen' }
  | { type: 'rparen' };

/**
 * Parse a currency string to a number
 * Handles: "$1,234.56", "1234.56", "$1234", etc.
 */
function parseCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove $ and commas, then parse
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format a number as currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Tokenize an expression string
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Operators
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    // Numbers (including decimals and negative)
    if (/[\d.]/.test(char)) {
      let numStr = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: parseFloat(numStr) });
      continue;
    }

    // Unknown character - skip it
    i++;
  }

  return tokens;
}

/**
 * Recursive descent parser for PEMDAS
 * Grammar:
 *   expr    = term (('+' | '-') term)*
 *   term    = factor (('*' | '/') factor)*
 *   factor  = number | '(' expr ')'
 */
function parseExpression(tokens: Token[]): number {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function parseFactor(): number {
    const token = peek();

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'number') {
      consume();
      return token.value;
    }

    if (token.type === 'lparen') {
      consume(); // consume '('
      const result = parseExpr();
      const closing = peek();
      if (closing?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      consume(); // consume ')'
      return result;
    }

    // Handle negative numbers
    if (token.type === 'operator' && token.value === '-') {
      consume();
      return -parseFactor();
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  function parseTerm(): number {
    let left = parseFactor();

    while (true) {
      const token = peek();
      if (!token || token.type !== 'operator') break;
      if (token.value !== '*' && token.value !== '/') break;

      consume();
      const right = parseFactor();

      if (token.value === '*') {
        left = left * right;
      } else {
        left = left / right;
      }
    }

    return left;
  }

  function parseExpr(): number {
    let left = parseTerm();

    while (true) {
      const token = peek();
      if (!token || token.type !== 'operator') break;
      if (token.value !== '+' && token.value !== '-') break;

      consume();
      const right = parseTerm();

      if (token.value === '+') {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  return parseExpr();
}

/**
 * Evaluate an expression string
 * First resolves variables, then evaluates the math
 */
function evaluateExpression(
  expr: string,
  variables: Record<string, string>
): string {
  // First, replace all variable references with their numeric values
  let resolved = expr;

  // Find all variable references (words with dots, like "pricing.total")
  // Include & for section names like "delivery_&_installation"
  const varPattern = /[a-zA-Z_][a-zA-Z0-9_.&]+/g;
  const matches = expr.match(varPattern) || [];

  for (const varName of matches) {
    const value = lookupVariable(varName, variables);
    let numValue: number;

    if (value !== undefined && value !== '') {
      // Parse the value as a number (handle currency formatting)
      numValue = parseCurrency(value);
    } else if (varName.startsWith('pricing.')) {
      // Missing pricing variables default to 0 (prevents NaN in calculations)
      numValue = 0;
    } else {
      // Non-pricing variables: skip replacement (will cause NaN if used in math)
      continue;
    }

    resolved = resolved.replace(new RegExp(varName.replace(/\./g, '\\.'), 'g'), numValue.toString());
  }

  // Now tokenize and evaluate
  try {
    const tokens = tokenize(resolved);
    if (tokens.length === 0) return '';

    const result = parseExpression(tokens);

    // Format as currency if it looks like a money value (has decimals or is > 1)
    return formatCurrency(result);
  } catch (error) {
    console.warn(`Failed to evaluate expression: ${expr}`, error);
    return `{{${expr}}}`; // Return original if evaluation fails
  }
}

/**
 * Process dynamic table rows in a Google Doc
 * Finds markers like {{#ROW:pricing}} and duplicates rows for each item
 *
 * Template format in Google Docs:
 * Create a table with a header row and a template row containing:
 * {{#ROW:pricing}} in the first cell
 * {{row.name}}, {{row.quantity}}, {{row.sellPrice}} in other cells
 * {{/ROW}} in the last cell (optional, auto-detected)
 */
async function processTableRows(
  accessToken: string,
  docId: string,
  tableData: TableRowData[]
): Promise<void> {
  console.log('[processTableRows] Starting with tableData:', JSON.stringify(tableData).slice(0, 500));

  if (!tableData || tableData.length === 0) {
    console.log('[processTableRows] No table data to process');
    return;
  }

  // Get the document structure
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docResponse.ok) {
    console.error('Failed to read document for table processing');
    return;
  }

  const docData = await docResponse.json();
  const content = docData.body?.content || [];

  // Process each table definition
  for (const tableDef of tableData) {
    const marker = `{{#ROW:${tableDef.tableId}}}`;
    const endMarker = '{{/ROW}}';

    // Find the table containing our marker
    let targetTable: any = null;
    let templateRowIndex = -1;
    let tableStartIndex = -1;

    for (const element of content) {
      if (element.table) {
        const table = element.table;
        tableStartIndex = element.startIndex;

        // Search for marker in table rows
        for (let rowIdx = 0; rowIdx < table.tableRows.length; rowIdx++) {
          const row = table.tableRows[rowIdx];
          for (const cell of row.tableCells) {
            const cellContent = JSON.stringify(cell);
            if (cellContent.includes(marker)) {
              targetTable = table;
              templateRowIndex = rowIdx;
              break;
            }
          }
          if (targetTable) break;
        }
      }
      if (targetTable) break;
    }

    if (!targetTable || templateRowIndex === -1) {
      console.log(`No table found with marker ${marker}`);
      continue;
    }

    if (tableDef.rows.length === 0) {
      // No rows - just remove the template row markers
      continue;
    }

    const requests: any[] = [];
    const templateRow = targetTable.tableRows[templateRowIndex];

    // Build cell content template from the template row
    const cellTemplates: string[] = [];
    for (const cell of templateRow.tableCells) {
      let cellText = '';
      if (cell.content) {
        for (const para of cell.content) {
          if (para.paragraph?.elements) {
            for (const elem of para.paragraph.elements) {
              if (elem.textRun?.content) {
                cellText += elem.textRun.content;
              }
            }
          }
        }
      }
      // Remove the markers from template
      cellText = cellText.replace(marker, '').replace(endMarker, '').trim();
      cellTemplates.push(cellText);
    }

    // First, remove the start/end markers
    requests.push({
      replaceAllText: {
        containsText: { text: marker, matchCase: false },
        replaceText: '',
      },
    });
    requests.push({
      replaceAllText: {
        containsText: { text: endMarker, matchCase: false },
        replaceText: '',
      },
    });

    // For each data row (except first which uses template row), insert new rows
    // We'll duplicate by inserting rows after the template row
    if (tableDef.rows.length > 1) {
      // Insert additional rows after template row
      const rowsToInsert = tableDef.rows.length - 1;
      for (let i = 0; i < rowsToInsert; i++) {
        requests.push({
          insertTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex + 1 },
              rowIndex: templateRowIndex,
              columnIndex: 0,
            },
            insertBelow: true,
          },
        });
      }
    }

    // Apply first batch (markers + row insertions)
    if (requests.length > 0) {
      const response = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to insert table rows:', error);
        continue;
      }
    }

    // Now replace row variables for all rows
    // Each row gets {{row.X}} replaced with its values
    const replaceRequests: any[] = [];

    // Replace {{row.field}} patterns for each row's data
    // Since we can't target specific rows with replaceAllText,
    // we'll use indexed patterns: {{row.1.name}}, {{row.2.name}}, etc.
    // But for simpler usage, we use the sequential replacement approach

    for (let rowIdx = 0; rowIdx < tableDef.rows.length; rowIdx++) {
      const rowData = tableDef.rows[rowIdx];

      // For each cell template, create the replacement text
      for (let cellIdx = 0; cellIdx < cellTemplates.length; cellIdx++) {
        let cellText = cellTemplates[cellIdx];

        // Replace {{row.field}} with actual values
        for (const [key, value] of Object.entries(rowData)) {
          const pattern = `{{row.${key}}}`;
          cellText = cellText.replace(new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'), String(value));
        }

        // Also support {{item.field}} as alias
        for (const [key, value] of Object.entries(rowData)) {
          const pattern = `{{item.${key}}}`;
          cellText = cellText.replace(new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'), String(value));
        }
      }
    }

    // Use a different approach: replace all {{row.field}} patterns globally
    // This works because after row duplication, each row has the same template
    // We'll replace with indexed values using numbered patterns
    const firstRow = tableDef.rows[0];
    for (const [key, value] of Object.entries(firstRow)) {
      replaceRequests.push({
        replaceAllText: {
          containsText: { text: `{{row.${key}}}`, matchCase: false },
          replaceText: String(value),
        },
      });
      replaceRequests.push({
        replaceAllText: {
          containsText: { text: `{{item.${key}}}`, matchCase: false },
          replaceText: String(value),
        },
      });
    }

    if (replaceRequests.length > 0) {
      await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: replaceRequests }),
        }
      );
    }
  }
}

/**
 * Resolve a variable with fallback support
 * Supports: {{varA || varB || varC}} - returns first non-empty value
 * Also supports: {{varA ?? varB}} as an alias
 */
function resolveVariableWithFallback(
  expr: string,
  variables: Record<string, string>
): string {
  // Split by || or ?? (fallback operators)
  const parts = expr.split(/\s*(\|\||\?\?)\s*/);

  // Filter out the operators, keep only variable names
  const varNames = parts.filter((_, idx) => idx % 2 === 0).map(v => v.trim());

  // Return the first variable that has a non-empty value
  for (const varName of varNames) {
    // Use lookupVariable for consistent fuzzy matching
    const value = lookupVariable(varName, variables);
    const hasValue = value !== undefined && value !== null && value.trim() !== '';

    if (hasValue) {
      return value;
    }
  }

  // If all are empty, return empty string
  return '';
}

/**
 * Check if expression contains fallback operators (|| or ??)
 */
function hasFallbackOperator(expr: string): boolean {
  return /\|\||\?\?/.test(expr);
}

/**
 * Normalize a variable expression by:
 * - Trimming whitespace
 * - Converting to consistent case for lookup
 * - Removing hidden Unicode characters
 */
function normalizeVariableExpr(expr: string): string {
  return expr
    // Remove zero-width characters and other invisible Unicode
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    // Replace curly/smart quotes with straight ones (Google Docs converts these)
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Trim whitespace
    .trim();
}

/**
 * Look up a variable with fallback to case-insensitive match
 */
function lookupVariable(varName: string, variables: Record<string, string>): string | undefined {
  // Try exact match first
  if (variables[varName] !== undefined) {
    return variables[varName];
  }

  // Try case-insensitive match
  const lowerVarName = varName.toLowerCase();
  const matchingKey = Object.keys(variables).find(k => k.toLowerCase() === lowerVarName);
  if (matchingKey) {
    return variables[matchingKey];
  }

  // Try trimmed match (in case of extra spaces in variable name)
  const trimmedVarName = varName.replace(/\s+/g, '');
  const trimmedMatch = Object.keys(variables).find(k => k.replace(/\s+/g, '') === trimmedVarName);
  if (trimmedMatch) {
    return variables[trimmedMatch];
  }

  return undefined;
}

/**
 * Replace variables in a Google Doc using Docs API
 * Supports:
 * - Simple: {{pricing.total}} -> $1,234.56
 * - Fallback: {{project.jobLocation || project.locationName}} -> first non-empty value
 * - Expression: {{pricing.materials + pricing.labor}} -> $2,500.00
 * Note: replaceAllText preserves formatting (bold, italic, etc.)
 */
async function replaceVariables(
  accessToken: string,
  docId: string,
  variables: Record<string, string>
): Promise<void> {
  console.log('[replaceVariables] Starting variable replacement...');
  console.log('[replaceVariables] Variables received - count:', Object.keys(variables).length);

  // First, get the document content to find expressions
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docResponse.ok) {
    const errorText = await docResponse.text();
    console.error('[replaceVariables] Failed to read document:', errorText);
    throw new Error('Failed to read document for expression processing');
  }

  const docData = await docResponse.json();
  const docContent = JSON.stringify(docData);

  // Find all {{...}} patterns in the document
  const allPatterns = docContent.match(/\{\{[^}]+\}\}/g) || [];
  const uniquePatterns = [...new Set(allPatterns)];

  console.log(`[replaceVariables] Found ${uniquePatterns.length} unique patterns in document`);

  // Build replacement requests
  const requests: any[] = [];

  for (const pattern of uniquePatterns) {
    // Extract the content inside {{ }} and normalize it
    const rawInner = pattern.slice(2, -2);
    const inner = normalizeVariableExpr(rawInner);

    let replacement: string;


    // Check for fallback operator (|| or ??) first
    if (hasFallbackOperator(inner)) {
      // Resolve with fallback chain
      replacement = resolveVariableWithFallback(inner, variables);
    } else if (/[+\-*/()]/.test(inner)) {
      // Math expression
      replacement = evaluateExpression(inner, variables);
    } else {
      // Simple variable lookup with fuzzy matching
      const value = lookupVariable(inner, variables);
      replacement = value ?? '';

      if (value === undefined) {
        console.log(`  Variable "${inner}" not found in variables`);
      }
    }

    // Only log when pattern wasn't replaced (helps debug)
    if (replacement === '' && uniquePatterns.indexOf(pattern) < 5) {
      console.log(`[replaceVariables] Pattern "${pattern}" -> inner "${inner}" -> replacement "${replacement?.substring(0, 50) || '(empty)'}"`)
    }

    requests.push({
      replaceAllText: {
        containsText: {
          text: pattern,
          matchCase: false,
        },
        replaceText: replacement,
      },
    });
  }

  console.log(`[replaceVariables] Created ${requests.length} replacement requests`);

  if (requests.length === 0) {
    console.log('[replaceVariables] No replacement requests to process');
    return;
  }

  console.log('[replaceVariables] Sending batchUpdate to Google Docs API...');
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[replaceVariables] batchUpdate failed:', error);
    throw new Error(`Failed to replace variables: ${error}`);
  }

  const result = await response.json();
  console.log('[replaceVariables] batchUpdate successful, replies:', result.replies?.length || 0);
}

/**
 * Replace variables AND create named ranges for future updates
 * This enables "update mode" which preserves comments
 *
 * Process:
 * 1. Read document to find all {{...}} patterns with their positions
 * 2. Process in reverse order (to avoid index shifting)
 * 3. For each pattern: delete it, insert replacement, create named range
 */
async function replaceVariablesWithNamedRanges(
  accessToken: string,
  docId: string,
  variables: Record<string, string>
): Promise<void> {
  console.log('[replaceWithRanges] Starting variable replacement with named ranges...');

  // Read the full document structure to get text positions
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docResponse.ok) {
    throw new Error('Failed to read document for named range creation');
  }

  const doc = await docResponse.json();

  // Find all {{...}} patterns with their positions in the document body
  const patterns: Array<{ pattern: string; varKey: string; startIndex: number; endIndex: number }> = [];

  function extractPatterns(content: any) {
    if (!content) return;

    if (content.paragraph) {
      for (const element of content.paragraph.elements || []) {
        if (element.textRun?.content) {
          const text = element.textRun.content;
          const startIdx = element.startIndex;

          // Find all {{...}} in this text run
          const regex = /\{\{[^}]+\}\}/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const pattern = match[0];
            const rawInner = pattern.slice(2, -2);
            const inner = normalizeVariableExpr(rawInner);

            patterns.push({
              pattern,
              varKey: inner,
              startIndex: startIdx + match.index,
              endIndex: startIdx + match.index + pattern.length,
            });
          }
        }
      }
    }

    if (content.table) {
      for (const row of content.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          for (const cellContent of cell.content || []) {
            extractPatterns(cellContent);
          }
        }
      }
    }
  }

  // Process document body
  for (const element of doc.body?.content || []) {
    extractPatterns(element);
  }

  console.log(`[replaceWithRanges] Found ${patterns.length} patterns to replace`);

  if (patterns.length === 0) {
    return;
  }

  // Sort by position descending (process from end to start to avoid index shifting)
  patterns.sort((a, b) => b.startIndex - a.startIndex);

  // Build requests for each pattern
  const requests: any[] = [];

  for (const { pattern, varKey, startIndex, endIndex } of patterns) {
    // Resolve the variable value
    let replacement: string;

    if (hasFallbackOperator(varKey)) {
      replacement = resolveVariableWithFallback(varKey, variables);
    } else if (/[+\-*/()]/.test(varKey)) {
      replacement = evaluateExpression(varKey, variables);
    } else {
      replacement = lookupVariable(varKey, variables) ?? '';
    }

    // Skip empty replacements (leave placeholder in doc)
    if (replacement === '') {
      continue;
    }

    // Create a safe range name (Google Docs has restrictions)
    const rangeName = `var_${varKey.replace(/[^a-zA-Z0-9_.]/g, '_')}`;

    // Delete the placeholder text
    requests.push({
      deleteContentRange: {
        range: {
          startIndex,
          endIndex,
        },
      },
    });

    // Insert the replacement text
    requests.push({
      insertText: {
        location: { index: startIndex },
        text: replacement,
      },
    });

    // Create named range spanning the inserted text
    requests.push({
      createNamedRange: {
        name: rangeName,
        range: {
          startIndex,
          endIndex: startIndex + replacement.length,
        },
      },
    });
  }

  if (requests.length === 0) {
    console.log('[replaceWithRanges] No replacements to make');
    return;
  }

  console.log(`[replaceWithRanges] Sending ${requests.length} requests...`);

  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[replaceWithRanges] batchUpdate failed:', error);
    throw new Error(`Failed to replace variables with ranges: ${error}`);
  }

  console.log('[replaceWithRanges] Completed successfully');
}

/**
 * Update variables in a document using existing named ranges
 * This preserves comments and manual edits outside variable positions
 *
 * Process:
 * 1. Read document to get all named ranges
 * 2. For each variable, compute expected range name and find it
 * 3. Delete the old text at that range position
 * 4. Insert the new value
 * 5. Recreate the named range to span the new text
 */
async function updateVariablesViaNamedRanges(
  accessToken: string,
  docId: string,
  variables: Record<string, string>
): Promise<{ updated: number; notFound: string[] }> {
  console.log('[updateViaRanges] Starting update via named ranges...');
  console.log(`[updateViaRanges] Variables to update: ${Object.keys(variables).length}`);

  // Read the document to get named ranges
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docResponse.ok) {
    throw new Error('Failed to read document for update');
  }

  const doc = await docResponse.json();
  const namedRanges = doc.namedRanges || {};

  console.log(`[updateViaRanges] Document has ${Object.keys(namedRanges).length} named ranges`);

  // Build list of updates by iterating through variables and finding their ranges
  const updates: Array<{
    varKey: string;
    rangeName: string;
    namedRangeId: string;
    startIndex: number;
    endIndex: number;
    newValue: string;
  }> = [];
  const notFound: string[] = [];

  for (const [varKey, newValue] of Object.entries(variables)) {
    // Skip empty values
    if (!newValue) continue;

    // Compute the expected range name (same logic as when creating)
    const expectedRangeName = `var_${varKey.replace(/[^a-zA-Z0-9_.]/g, '_')}`;

    // Look for this range in the document
    const rangeData = namedRanges[expectedRangeName] as any;
    if (!rangeData?.namedRanges?.[0]?.ranges?.[0]) {
      // Range not found - this variable wasn't in the original doc or doc is old
      continue;
    }

    const range = rangeData.namedRanges[0];
    const rangePosition = range.ranges[0];

    updates.push({
      varKey,
      rangeName: expectedRangeName,
      namedRangeId: range.namedRangeId,
      startIndex: rangePosition.startIndex,
      endIndex: rangePosition.endIndex,
      newValue,
    });
  }

  console.log(`[updateViaRanges] Found ${updates.length} variables with matching named ranges`);

  if (updates.length === 0) {
    return { updated: 0, notFound };
  }

  // Sort by position descending (process from end to start to avoid index shifting)
  updates.sort((a, b) => b.startIndex - a.startIndex);

  const requests: any[] = [];

  for (const { rangeName, namedRangeId, startIndex, endIndex, newValue } of updates) {
    // Delete the existing named range first
    requests.push({
      deleteNamedRange: {
        namedRangeId,
      },
    });

    // Delete the old text
    requests.push({
      deleteContentRange: {
        range: { startIndex, endIndex },
      },
    });

    // Insert the new value
    requests.push({
      insertText: {
        location: { index: startIndex },
        text: newValue,
      },
    });

    // Recreate the named range for the new text
    requests.push({
      createNamedRange: {
        name: rangeName,
        range: {
          startIndex,
          endIndex: startIndex + newValue.length,
        },
      },
    });
  }

  console.log(`[updateViaRanges] Sending ${requests.length} update requests...`);

  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[updateViaRanges] batchUpdate failed:', error);
    throw new Error(`Failed to update variables via ranges: ${error}`);
  }

  console.log(`[updateViaRanges] Updated ${updates.length} variables`);
  return { updated: updates.length, notFound };
}

//@ts-ignore
serve(async (req) => {
  console.log('[generate-google-doc] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    //@ts-ignore
    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: RequestBody = await req.json();

    // DEBUG: Log the raw body structure
    console.log('[generate-google-doc] Body received:', {
      templateDocId: body.templateDocId,
      proposalId: body.proposalId,
      organizationId: body.organizationId,
      variablesType: typeof body.variables,
      variablesIsObject: body.variables !== null && typeof body.variables === 'object',
      variablesKeys: body.variables ? Object.keys(body.variables).length : 0,
      tableDataLength: body.tableData?.length || 0,
    });

    const {
      templateDocId,
      proposalId,
      organizationId,
      variables,
      tableData,
      outputTitle,
      mode: modeInput = 'create',
      existingDocId,
      version = 1,
    } = body;

    // Type the mode to include all supported values
    const mode = modeInput as 'create' | 'overwrite' | 'update';

    if (!templateDocId) {
      return new Response(JSON.stringify({ error: 'templateDocId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organizationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client for token operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get organization's Google access token (refreshes if expired)
    console.log(`Getting org access token for organization ${organizationId}...`);
    const { accessToken, folderId } = await getOrgAccessToken(supabaseAdmin, organizationId);

    // If overwriting, delete the existing document first
    if (mode === 'overwrite' && existingDocId) {
      console.log(`Overwrite mode: deleting existing document ${existingDocId}...`);
      await deleteDocument(accessToken, existingDocId);
    }

    // UPDATE MODE: Update variables in existing doc (preserves comments)
    if (mode === 'update' && existingDocId) {
      console.log(`Update mode: updating variables in existing document ${existingDocId}...`);

      if (variables && Object.keys(variables).length > 0) {
        const { updated, notFound } = await updateVariablesViaNamedRanges(
          accessToken,
          existingDocId,
          variables
        );

        if (notFound.length > 0) {
          console.warn(`[update] Variables not found in named ranges: ${notFound.join(', ')}`);
        }

        console.log(`Update completed: ${updated} variables updated`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          docId: existingDocId,
          docUrl: `https://docs.google.com/document/d/${existingDocId}/edit`,
          version,
          mode: 'update',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate document title with version
    // Format: "{title}_v{version}" e.g., "P-001_v1" or "Project ABC_v2"
    const baseTitle = outputTitle || `Proposal-${proposalId || 'Draft'}`;
    const title = `${baseTitle}_v${version}`;

    // Copy the template to the org's shared folder
    console.log(`Copying template ${templateDocId} to folder ${folderId || 'root'}...`);
    const newDocId = await copyDocument(accessToken, templateDocId, title, folderId);
    console.log(`Created new document: ${newDocId} (version ${version})`);

    // Process dynamic table rows first (if any)
    // Wrapped in try-catch so table errors don't block variable replacement
    if (tableData && tableData.length > 0) {
      try {
        console.log(`Processing ${tableData.length} dynamic tables...`);
        await processTableRows(accessToken, newDocId, tableData);
        console.log('Table processing completed successfully');
      } catch (tableError) {
        console.error('Table processing failed (continuing with variable replacement):', tableError);
        // Don't throw - continue with variable replacement
      }
    }

    // Replace variables with named ranges (enables future "Update Values" mode)
    if (variables && Object.keys(variables).length > 0) {
      console.log(`Replacing ${Object.keys(variables).length} variables with named ranges...`);
      try {
        await replaceVariablesWithNamedRanges(accessToken, newDocId, variables);
        console.log('Variable replacement with named ranges completed');
      } catch (rangeError) {
        // Fallback to simple replacement if named ranges fail
        console.warn('Named range replacement failed, falling back to simple replacement:', rangeError);
        await replaceVariables(accessToken, newDocId, variables);
        console.log('Variable replacement (fallback) completed');
      }
    }

    // Update the proposal with the new doc ID and version info
    if (proposalId) {
      // Get current generated_docs array
      const { data: proposalData } = await supabase
        .from('proposals')
        .select('form_data')
        .eq('id', proposalId)
        .single();

      const currentFormData = proposalData?.form_data || {};
      const generatedDocs = currentFormData.generated_docs || [];

      // If overwriting, remove the old version from history
      const updatedDocs = mode === 'overwrite'
        ? generatedDocs.filter((doc: any) => doc.docId !== existingDocId)
        : generatedDocs;

      // Add new doc to history
      updatedDocs.push({
        docId: newDocId,
        version,
        title,
        createdAt: new Date().toISOString(),
        createdBy: user.id,
      });

      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          google_doc_id: newDocId,
          form_data: {
            ...currentFormData,
            generated_docs: updatedDocs,
            current_doc_version: version,
          },
        })
        .eq('id', proposalId);

      if (updateError) {
        console.error('Failed to update proposal:', updateError);
        // Don't fail - the doc was created successfully
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        docId: newDocId,
        docUrl: `https://docs.google.com/document/d/${newDocId}/edit`,
        version,
        title,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating document:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate document';
    const needsAuth = errorMessage.includes('connect') || errorMessage.includes('reconnect');

    return new Response(
      JSON.stringify({
        error: errorMessage,
        needsAuth,
      }),
      {
        status: needsAuth ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
