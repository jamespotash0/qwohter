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
  tableData?: TableRowData[];
  outputTitle?: string;
  mode?: 'create' | 'overwrite';
  existingDocId?: string;
  version?: number;
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

  // Get org-level token from database (don't filter by is_valid - we'll try to refresh if invalid)
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  console.log(`[getOrgAccessToken] Query result - error: ${tokenError?.message || 'none'}, hasData: ${!!tokenData}, is_valid: ${tokenData?.is_valid}`);

  if (tokenError || !tokenData) {
    console.log(`[getOrgAccessToken] No token found for organization at all`);
    throw new Error('Google Docs not configured. An admin needs to connect Google in Settings → Integrations.');
  }

  // If token is marked invalid, we'll still try to refresh it (user may have reauthorized)
  if (!tokenData.is_valid) {
    console.log(`[getOrgAccessToken] Token is marked invalid - will attempt refresh`);
  }

  const folderId = tokenData.drive_folder_id;

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  const isExpired = expiresAt.getTime() - bufferMs <= now.getTime();

  // Only use cached token if it's valid AND not expired
  if (tokenData.is_valid && !isExpired) {
    // Token is still valid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenData.id);

    return { accessToken: tokenData.access_token, folderId };
  }

  // Need to refresh: either expired or marked as invalid
  console.log(`[getOrgAccessToken] Token needs refresh - is_valid: ${tokenData.is_valid}, isExpired: ${isExpired}`);
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

  // Update tokens in database - also set is_valid: true since refresh succeeded
  await supabaseAdmin
    .from('google_oauth_tokens')
    .update({
      access_token: newTokens.access_token,
      token_expires_at: newExpiresAt,
      last_used_at: new Date().toISOString(),
      is_valid: true, // Mark as valid after successful refresh
    })
    .eq('id', tokenData.id);

  console.log('[getOrgAccessToken] Token refreshed successfully, marked as valid');
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

/**
 * Get or create a proposal-specific folder in Google Drive
 * Folder name format: "{proposal_number}_{project_name}" or just "{proposal_number}"
 */
async function getOrCreateProposalFolder(
  accessToken: string,
  parentFolderId: string | null,
  proposalNumber: string,
  projectName: string | null
): Promise<string | null> {
  // Build folder name: "P-001_Project Name" or just "P-001"
  const sanitizedProject = projectName
    ? projectName.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 50)
    : null;
  const folderName = sanitizedProject
    ? `${proposalNumber}_${sanitizedProject}`
    : proposalNumber;

  console.log(`[getOrCreateProposalFolder] Looking for folder: ${folderName}`);

  try {
    // Search for existing folder with this name in parent
    const searchQuery = parentFolderId
      ? `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        console.log(`[getOrCreateProposalFolder] Found existing folder: ${searchData.files[0].id}`);
        return searchData.files[0].id;
      }
    }

    // Folder doesn't exist, create it
    console.log(`[getOrCreateProposalFolder] Creating new folder: ${folderName}`);

    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('[getOrCreateProposalFolder] Failed to create folder:', error);
      return null;
    }

    const createData = await createResponse.json();
    console.log(`[getOrCreateProposalFolder] Created folder: ${createData.id}`);
    return createData.id;
  } catch (error) {
    console.error('[getOrCreateProposalFolder] Error:', error);
    return null;
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
 * {{#ROW:pricing}} in the first cell (marker to identify the template row)
 * {{row.name}}, {{row.quantity}}, {{row.sellPrice}} in other cells
 * {{/ROW}} in the last cell (optional end marker)
 *
 * The system will:
 * 1. Find the template row with the marker
 * 2. Duplicate it for each data row
 * 3. Replace {{row.field}} in each row with that row's specific data
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

  // Process each table definition one at a time
  for (const tableDef of tableData) {
    await processOneTable(accessToken, docId, tableDef);
  }
}

/**
 * Process a single table definition
 *
 * New approach: Instead of inserting empty rows, we:
 * 1. Replace {{row.xxx}} in the FIRST row with first data row values (using replaceAllText)
 * 2. For additional rows, duplicate the template row and populate with data
 */
async function processOneTable(
  accessToken: string,
  docId: string,
  tableDef: TableRowData
): Promise<void> {
  const marker = `{{#ROW:${tableDef.tableId}}}`;
  const endMarker = '{{/ROW}}';

  console.log(`[processOneTable] Processing table: ${tableDef.tableId} with ${tableDef.rows.length} rows`);

  // Get the document structure
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docResponse.ok) {
    console.error('[processOneTable] Failed to read document');
    return;
  }

  const docData = await docResponse.json();
  const content = docData.body?.content || [];

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
    console.log(`[processOneTable] No table found with marker ${marker}`);
    return;
  }

  if (tableDef.rows.length === 0) {
    // No data rows - remove the template row entirely
    console.log('[processOneTable] No data rows, removing template row');
    await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteTableRow: {
              tableCellLocation: {
                tableStartLocation: { index: tableStartIndex + 1 },
                rowIndex: templateRowIndex,
                columnIndex: 0,
              },
            },
          }],
        }),
      }
    );
    return;
  }

  // Extract cell templates from the template row
  const templateRow = targetTable.tableRows[templateRowIndex];
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
    // Remove the markers from template, keep the variable placeholders
    cellText = cellText.replace(marker, '').replace(endMarker, '').trim();
    cellTemplates.push(cellText);
  }

  console.log('[processOneTable] Cell templates:', cellTemplates);

  // Step 1: Remove the markers first
  const markerRequests = [
    {
      replaceAllText: {
        containsText: { text: marker, matchCase: false },
        replaceText: '',
      },
    },
    {
      replaceAllText: {
        containsText: { text: endMarker, matchCase: false },
        replaceText: '',
      },
    },
  ];

  await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: markerRequests }),
    }
  );

  // Step 2: Replace the FIRST row's variables using replaceAllText
  // Since {{row.xxx}} only exists once in the template, this will work for the first row
  const firstRowData = tableDef.rows[0];
  const firstRowRequests: any[] = [];

  for (const [key, value] of Object.entries(firstRowData)) {
    // Replace {{row.field}} patterns
    firstRowRequests.push({
      replaceAllText: {
        containsText: { text: `{{row.${key}}}`, matchCase: false },
        replaceText: String(value),
      },
    });
    // Also handle {{item.field}} patterns
    firstRowRequests.push({
      replaceAllText: {
        containsText: { text: `{{item.${key}}}`, matchCase: false },
        replaceText: String(value),
      },
    });
  }

  if (firstRowRequests.length > 0) {
    await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: firstRowRequests }),
      }
    );
  }

  console.log('[processOneTable] Replaced first row variables');

  // Step 3: For additional rows, insert new rows and populate them
  if (tableDef.rows.length > 1) {
    const additionalRows = tableDef.rows.slice(1);
    console.log(`[processOneTable] Adding ${additionalRows.length} additional rows`);

    for (let i = 0; i < additionalRows.length; i++) {
      const rowData = additionalRows[i];

      // Re-read document to get current table structure
      const currentDoc = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const currentData = await currentDoc.json();

      // Find the table again
      let currentTableStart = -1;
      let currentTable: any = null;

      for (const element of currentData.body?.content || []) {
        if (element.table && element.table.tableRows.length > templateRowIndex) {
          // This is likely our table if it has enough rows
          currentTableStart = element.startIndex;
          currentTable = element.table;
          break;
        }
      }

      if (currentTableStart === -1 || !currentTable) {
        console.warn('[processOneTable] Could not find table for row insertion');
        continue;
      }

      // Insert a new row below the last data row
      const insertRowIndex = templateRowIndex + i; // Insert after previous rows
      const insertResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              insertTableRow: {
                tableCellLocation: {
                  tableStartLocation: { index: currentTableStart + 1 },
                  rowIndex: insertRowIndex,
                  columnIndex: 0,
                },
                insertBelow: true,
              },
            }],
          }),
        }
      );

      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        console.error('[processOneTable] Failed to insert row:', error);
        continue;
      }

      // Re-read document to get the new row's cell positions
      const updatedDoc = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const updatedData = await updatedDoc.json();

      // Find the newly inserted row (it's at insertRowIndex + 1 now)
      let updatedTable: any = null;
      for (const element of updatedData.body?.content || []) {
        if (element.table && element.table.tableRows.length > insertRowIndex + 1) {
          updatedTable = element.table;
          break;
        }
      }

      if (!updatedTable) {
        console.warn('[processOneTable] Could not find updated table');
        continue;
      }

      const newRow = updatedTable.tableRows[insertRowIndex + 1];
      if (!newRow) {
        console.warn('[processOneTable] Could not find new row at index', insertRowIndex + 1);
        continue;
      }

      // Insert text into each cell of the new row
      // Process cells in reverse order to avoid index shifting
      const cellInserts: any[] = [];
      const numCells = Math.min(newRow.tableCells.length, cellTemplates.length);

      for (let cellIdx = numCells - 1; cellIdx >= 0; cellIdx--) {
        const cell = newRow.tableCells[cellIdx];
        const template = cellTemplates[cellIdx];

        if (!template || !cell.content?.[0]?.paragraph?.elements?.[0]) continue;

        // Get the insertion point (start of the cell content)
        const insertIndex = cell.content[0].startIndex;

        // Replace template placeholders with actual values
        let cellContent = template;
        for (const [key, value] of Object.entries(rowData)) {
          const rowPattern = new RegExp(`\\{\\{row\\.${key}\\}\\}`, 'gi');
          const itemPattern = new RegExp(`\\{\\{item\\.${key}\\}\\}`, 'gi');
          cellContent = cellContent.replace(rowPattern, String(value));
          cellContent = cellContent.replace(itemPattern, String(value));
        }

        if (cellContent) {
          cellInserts.push({
            insertText: {
              location: { index: insertIndex },
              text: cellContent,
            },
          });
        }
      }

      // Apply cell content inserts
      if (cellInserts.length > 0) {
        const insertTextResponse = await fetch(
          `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: cellInserts }),
          }
        );

        if (!insertTextResponse.ok) {
          const error = await insertTextResponse.text();
          console.error('[processOneTable] Failed to insert cell text:', error);
        }
      }
    }
  }

  console.log(`[processOneTable] Completed processing table: ${tableDef.tableId}`);
}

/**
 * Parse column parameters from a TABLE marker.
 * Format: "Header Label=dataKey,Another Header=anotherKey"
 * If no "=" present, auto-generates Title Case header from the key.
 */
function parseColumnParams(params: string): { headers: string[]; rowKeys: string[] } {
  const headers: string[] = [];
  const rowKeys: string[] = [];

  const columns = params.split(',').map(s => s.trim()).filter(Boolean);
  for (const col of columns) {
    const eqIdx = col.indexOf('=');
    if (eqIdx > 0) {
      headers.push(col.substring(0, eqIdx).trim());
      rowKeys.push(col.substring(eqIdx + 1).trim());
    } else {
      // Just a key name — auto-generate Title Case header
      const key = col.trim();
      rowKeys.push(key);
      headers.push(
        key.replace(/([A-Z])/g, ' $1')
           .replace(/_/g, ' ')
           .trim()
           .split(/\s+/)
           .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
           .join(' ')
      );
    }
  }

  return { headers, rowKeys };
}

/**
 * Process {{#TABLE:tableId}} or {{#TABLE:tableId:Header=key,...}} markers
 *
 * Usage in template:
 *   {{#TABLE:pricing}}                                          — default columns
 *   {{#TABLE:wallspecs:Wall=wall,Dims=dimensions,STC=stc}}     — custom columns
 */
async function processTableMarkers(
  accessToken: string,
  docId: string,
  tableData: TableRowData[]
): Promise<void> {
  console.log('[processTableMarkers] Starting table marker processing');

  if (!tableData || tableData.length === 0) {
    console.log('[processTableMarkers] No table data to process');
    return;
  }

  for (const tableDef of tableData) {
    // Match {{#TABLE:tableId}} or {{#TABLE:tableId:columnParams}}
    const markerRegex = new RegExp(
      `\\{\\{#TABLE:${tableDef.tableId}(?::([^}]*))?\\}\\}`
    );
    console.log(`[processTableMarkers] Looking for TABLE:${tableDef.tableId} marker`);

    // Read document to find the marker
    const docResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const docData = await docResponse.json();

    // Find the marker position and extract optional column parameters
    let markerStart = -1;
    let markerEnd = -1;
    let columnParams: string | null = null;

    for (const element of docData.body?.content || []) {
      if (element.paragraph) {
        for (const textElement of element.paragraph.elements || []) {
          const textRun = textElement.textRun;
          if (!textRun?.content) continue;

          const match = textRun.content.match(markerRegex);
          if (match) {
            const idx = textRun.content.indexOf(match[0]);
            markerStart = textElement.startIndex + idx;
            markerEnd = markerStart + match[0].length;
            columnParams = match[1] || null;
            break;
          }
        }
      }
      if (markerStart !== -1) break;
    }

    if (markerStart === -1) {
      console.log(`[processTableMarkers] TABLE:${tableDef.tableId} marker not found, skipping`);
      continue;
    }

    console.log(`[processTableMarkers] Found marker at position ${markerStart}-${markerEnd}${columnParams ? ` with columns: ${columnParams}` : ''}`);

    // Define table structure — template-driven columns take priority
    let headers: string[] = [];
    let rowKeys: string[] = [];

    if (columnParams) {
      // Template specifies custom columns: {{#TABLE:wallspecs:Wall=wall,STC=stc,...}}
      const parsed = parseColumnParams(columnParams);
      headers = parsed.headers;
      rowKeys = parsed.rowKeys;
      console.log(`[processTableMarkers] Custom columns: ${headers.join(', ')} → ${rowKeys.join(', ')}`);
    } else if (tableDef.tableId === 'pricing') {
      headers = ['Description', 'Model #', 'SKU', 'Qty', 'Unit Price', 'Disc (%)', 'Extended'];
      rowKeys = ['name', 'modelNumber', 'sku', 'quantity', 'unitSellPrice', 'discountPercent', 'lineTotal'];
    } else if (tableDef.tableId === 'products') {
      headers = ['#', 'Product', 'Qty', 'Unit'];
      rowKeys = ['index', 'name', 'quantity', 'unit'];
    } else if (tableDef.tableId === 'specifications') {
      headers = ['Wall', 'Dimensions', 'STC', 'Finish'];
      rowKeys = ['wall', 'dimensions', 'stc', 'finish'];
    } else if (tableDef.tableId === 'wallspecs') {
      // Default columns when no params specified (backward compatible)
      headers = ['Wall', 'Dimensions', 'STC', 'Finish', 'Pocket Doors', 'Pass Doors', 'Panels', 'Qty'];
      rowKeys = ['wall', 'dimensions', 'stc', 'finish', 'pocketDoors', 'passDoors', 'panelCount', 'qty'];
    } else if (tableDef.tableId === 'product_catalog') {
      // Default fallback — use custom columns syntax to pick what you need:
      // {{#TABLE:product_catalog:Name=alias,Model=model,STC=stc,Finish=finish,Qty=qty}}
      headers = ['Name', 'Manufacturer', 'Model', 'Dimensions', 'STC', 'Finish', 'Qty'];
      rowKeys = ['alias', 'manufacturer', 'model', 'dimensions', 'stc', 'finish', 'qty'];
    } else {
      // Generic table - use first row's keys as headers
      if (tableDef.rows.length > 0) {
        const firstRow = tableDef.rows[0];
        headers = Object.keys(firstRow).filter(k => !k.endsWith('Raw'));
        rowKeys = headers;
      }
    }

    if (headers.length === 0 || tableDef.rows.length === 0) {
      console.log(`[processTableMarkers] No data for table ${tableDef.tableId}, removing marker`);
      // Just delete the marker
      await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              deleteContentRange: {
                range: { startIndex: markerStart, endIndex: markerEnd }
              }
            }]
          }),
        }
      );
      continue;
    }

    // Calculate table dimensions
    // +1 for header row, +1 for total row (for pricing table only)
    const isPricingTable = tableDef.tableId === 'pricing';
    const numCols = headers.length;
    const numRows = tableDef.rows.length + 1 + (isPricingTable ? 1 : 0);

    console.log(`[processTableMarkers] Creating ${numRows}x${numCols} table`);

    // Step 1: Delete the marker text
    await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteContentRange: {
              range: { startIndex: markerStart, endIndex: markerEnd }
            }
          }]
        }),
      }
    );

    // Step 2: Insert the table at the marker position
    const insertTableResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            insertTable: {
              rows: numRows,
              columns: numCols,
              location: { index: markerStart }
            }
          }]
        }),
      }
    );

    if (!insertTableResponse.ok) {
      const error = await insertTableResponse.text();
      console.error('[processTableMarkers] Failed to insert table:', error);
      continue;
    }

    console.log('[processTableMarkers] Table inserted, now populating cells');

    // Step 3: Re-read document to get the new table structure
    const updatedDocResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const updatedDocData = await updatedDocResponse.json();

    // Find the newly inserted table (should be near markerStart)
    let table: any = null;
    for (const element of updatedDocData.body?.content || []) {
      if (element.table && element.startIndex >= markerStart - 5) {
        table = element.table;
        break;
      }
    }

    if (!table) {
      console.error('[processTableMarkers] Could not find inserted table');
      continue;
    }

    // Debug: Log table structure
    console.log('[processTableMarkers] Table rows:', table.tableRows?.length);
    if (table.tableRows?.[0]) {
      console.log('[processTableMarkers] First row cells:', table.tableRows[0].tableCells?.length);
      const firstCell = table.tableRows[0].tableCells?.[0];
      console.log('[processTableMarkers] First cell structure:', JSON.stringify(firstCell, null, 2).slice(0, 500));
    }

    // Step 4: Populate cells in reverse order (to avoid index shifting)
    const cellInserts: any[] = [];

    // Helper to get cell insert index - properly handle 0 as valid
    const getCellIndex = (rowIdx: number, colIdx: number): number => {
      const row = table.tableRows?.[rowIdx];
      if (!row) {
        console.log(`[processTableMarkers] No row at index ${rowIdx}`);
        return -1;
      }
      const cell = row.tableCells?.[colIdx];
      if (!cell) {
        console.log(`[processTableMarkers] No cell at row ${rowIdx}, col ${colIdx}`);
        return -1;
      }
      // Get the startIndex from the paragraph inside the cell
      const startIndex = cell.content?.[0]?.startIndex;
      if (startIndex === undefined || startIndex === null) {
        console.log(`[processTableMarkers] No startIndex for cell at row ${rowIdx}, col ${colIdx}. Cell content:`, JSON.stringify(cell.content).slice(0, 200));
        return -1;
      }
      return startIndex;
    };

    // Build all cell content first
    const allCells: Array<{ rowIdx: number; colIdx: number; text: string }> = [];

    // Header row
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      allCells.push({ rowIdx: 0, colIdx, text: headers[colIdx] });
    }

    // Data rows
    for (let dataIdx = 0; dataIdx < tableDef.rows.length; dataIdx++) {
      const rowData = tableDef.rows[dataIdx];
      const rowIdx = dataIdx + 1; // +1 because header is row 0

      for (let colIdx = 0; colIdx < rowKeys.length; colIdx++) {
        const key = rowKeys[colIdx];
        const value = String(rowData[key] ?? '');
        allCells.push({ rowIdx, colIdx, text: value });
      }
    }

    // Total row (for pricing tables)
    if (isPricingTable) {
      const totalRowIdx = tableDef.rows.length + 1;
      // Empty cells until the second-to-last column
      for (let colIdx = 0; colIdx < headers.length - 2; colIdx++) {
        allCells.push({ rowIdx: totalRowIdx, colIdx, text: '' });
      }
      // "TOTAL:" label
      allCells.push({ rowIdx: totalRowIdx, colIdx: headers.length - 2, text: 'TOTAL:' });
      // Calculate grand total
      let grandTotal = 0;
      for (const row of tableDef.rows) {
        grandTotal += Number(row.lineTotalRaw) || Number(row.sellPriceRaw) || 0;
      }
      const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(grandTotal);
      allCells.push({ rowIdx: totalRowIdx, colIdx: headers.length - 1, text: formattedTotal });
    }

    // Sort cells in reverse order (bottom-right to top-left) for insertion
    allCells.sort((a, b) => {
      if (b.rowIdx !== a.rowIdx) return b.rowIdx - a.rowIdx;
      return b.colIdx - a.colIdx;
    });

    // Insert text into each cell
    let skippedCells = 0;
    for (const cell of allCells) {
      const insertIdx = getCellIndex(cell.rowIdx, cell.colIdx);
      if (insertIdx === -1) {
        skippedCells++;
        continue;
      }

      // Skip empty text to avoid unnecessary inserts
      if (!cell.text) continue;

      cellInserts.push({
        insertText: {
          location: { index: insertIdx },
          text: cell.text,
        },
      });
    }

    console.log(`[processTableMarkers] Built ${cellInserts.length} cell inserts, skipped ${skippedCells} cells`);

    if (cellInserts.length > 0) {
      const populateResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: cellInserts }),
        }
      );

      if (!populateResponse.ok) {
        const error = await populateResponse.text();
        console.error('[processTableMarkers] Failed to populate cells:', error);
      } else {
        console.log(`[processTableMarkers] Populated ${cellInserts.length} cells`);
      }
    }

    // Step 5: Style the header row with orange background
    // Re-read document to get current table structure for styling
    const styledDocResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const styledDocData = await styledDocResponse.json();

    // Find the table again for styling
    let styledTable: any = null;
    let styledTableStart = -1;
    for (const element of styledDocData.body?.content || []) {
      if (element.table && element.startIndex >= markerStart - 10) {
        styledTable = element.table;
        styledTableStart = element.startIndex;
        break;
      }
    }

    if (styledTable && styledTableStart !== -1) {
      // Build style requests for header row (row 0) and total row
      const styleRequests: any[] = [];

      // Peach/tan color for header (RGB: 252, 228, 207 = #FCE4CF)
      const headerBgColor = {
        color: {
          rgbColor: {
            red: 0.988,
            green: 0.894,
            blue: 0.812,
          },
        },
      };

      // Light green color for total row (RGB: 226, 239, 218 = #E2EFDA)
      const totalBgColor = {
        color: {
          rgbColor: {
            red: 0.886,
            green: 0.937,
            blue: 0.855,
          },
        },
      };

      // Style each cell in the header row with background color
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        styleRequests.push({
          updateTableCellStyle: {
            tableStartLocation: { index: styledTableStart + 1 },
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: styledTableStart + 1 },
                rowIndex: 0,
                columnIndex: colIdx,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              backgroundColor: headerBgColor,
            },
            fields: 'backgroundColor',
          },
        });
      }

      // Style total row cells (last two columns) with light green background
      if (isPricingTable) {
        const totalRowIdx = tableDef.rows.length + 1;
        // "Total:" label cell
        styleRequests.push({
          updateTableCellStyle: {
            tableStartLocation: { index: styledTableStart + 1 },
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: styledTableStart + 1 },
                rowIndex: totalRowIdx,
                columnIndex: headers.length - 2,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              backgroundColor: totalBgColor,
            },
            fields: 'backgroundColor',
          },
        });
        // Total amount cell
        styleRequests.push({
          updateTableCellStyle: {
            tableStartLocation: { index: styledTableStart + 1 },
            tableRange: {
              tableCellLocation: {
                tableStartLocation: { index: styledTableStart + 1 },
                rowIndex: totalRowIdx,
                columnIndex: headers.length - 1,
              },
              rowSpan: 1,
              columnSpan: 1,
            },
            tableCellStyle: {
              backgroundColor: totalBgColor,
            },
            fields: 'backgroundColor',
          },
        });
      }

      if (styleRequests.length > 0) {
        const styleResponse = await fetch(
          `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: styleRequests }),
          }
        );

        if (!styleResponse.ok) {
          const error = await styleResponse.text();
          console.error('[processTableMarkers] Failed to style cells:', error);
        } else {
          console.log('[processTableMarkers] Applied cell styling');
        }
      }

      // Step 6: Make header text bold
      // Get the text range for header row and apply bold formatting
      const headerRow = styledTable.tableRows?.[0];
      if (headerRow) {
        const textStyleRequests: any[] = [];

        for (let colIdx = 0; colIdx < headers.length; colIdx++) {
          const cell = headerRow.tableCells?.[colIdx];
          if (cell?.content?.[0]) {
            const startIdx = cell.content[0].startIndex;
            const endIdx = cell.content[0].endIndex - 1; // -1 to exclude newline

            if (startIdx !== undefined && endIdx !== undefined && endIdx > startIdx) {
              textStyleRequests.push({
                updateTextStyle: {
                  range: {
                    startIndex: startIdx,
                    endIndex: endIdx,
                  },
                  textStyle: {
                    bold: true,
                  },
                  fields: 'bold',
                },
              });
            }
          }
        }

        if (textStyleRequests.length > 0) {
          const boldResponse = await fetch(
            `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ requests: textStyleRequests }),
            }
          );

          if (!boldResponse.ok) {
            const error = await boldResponse.text();
            console.error('[processTableMarkers] Failed to bold header:', error);
          } else {
            console.log('[processTableMarkers] Applied bold header text');
          }
        }
      }

      // Step 7: Set column widths (Qty small, Description wide, others small)
      if (isPricingTable) {
        // Column widths in points (pt) - total ~468pt for letter size with 1" margins
        // Description: 130pt, Model#: 65pt, SKU: 55pt, Qty: 35pt, Unit Price: 65pt, Disc: 40pt, Extended: 78pt
        const columnWidths = [130, 65, 55, 35, 65, 40, 78];
        const columnWidthRequests: any[] = [];

        for (let colIdx = 0; colIdx < columnWidths.length; colIdx++) {
          columnWidthRequests.push({
            updateTableColumnProperties: {
              tableStartLocation: { index: styledTableStart + 1 },
              columnIndices: [colIdx],
              tableColumnProperties: {
                widthType: 'FIXED_WIDTH',
                width: {
                  magnitude: columnWidths[colIdx],
                  unit: 'PT',
                },
              },
              fields: 'widthType,width',
            },
          });
        }

        if (columnWidthRequests.length > 0) {
          const widthResponse = await fetch(
            `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ requests: columnWidthRequests }),
            }
          );

          if (!widthResponse.ok) {
            const error = await widthResponse.text();
            console.error('[processTableMarkers] Failed to set column widths:', error);
          } else {
            console.log('[processTableMarkers] Applied column widths');
          }
        }
      }

      // Step 8: Center-align all cells for wallspecs/specifications tables
      if (tableDef.tableId === 'wallspecs' || tableDef.tableId === 'specifications') {
        // Re-read document to get current table positions for alignment
        const alignDocResponse = await fetch(
          `https://docs.googleapis.com/v1/documents/${docId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const alignDocData = await alignDocResponse.json();

        let alignTable: any = null;
        for (const element of alignDocData.body?.content || []) {
          if (element.table && element.startIndex >= markerStart - 10) {
            alignTable = element.table;
            break;
          }
        }

        if (alignTable) {
          const alignRequests: any[] = [];

          for (let rowIdx = 0; rowIdx < alignTable.tableRows.length; rowIdx++) {
            const row = alignTable.tableRows[rowIdx];
            for (let colIdx = 0; colIdx < (row.tableCells?.length || 0); colIdx++) {
              const cell = row.tableCells[colIdx];
              if (cell?.content) {
                for (const paragraph of cell.content) {
                  if (paragraph.startIndex !== undefined && paragraph.endIndex !== undefined) {
                    alignRequests.push({
                      updateParagraphStyle: {
                        range: {
                          startIndex: paragraph.startIndex,
                          endIndex: paragraph.endIndex,
                        },
                        paragraphStyle: {
                          alignment: 'CENTER',
                        },
                        fields: 'alignment',
                      },
                    });
                  }
                }
              }
            }
          }

          if (alignRequests.length > 0) {
            const alignResponse = await fetch(
              `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requests: alignRequests }),
              }
            );

            if (!alignResponse.ok) {
              const error = await alignResponse.text();
              console.error('[processTableMarkers] Failed to center-align cells:', error);
            } else {
              console.log(`[processTableMarkers] Center-aligned ${alignRequests.length} paragraphs`);
            }
          }
        }
      }
    }

    console.log(`[processTableMarkers] Completed table: ${tableDef.tableId}`);
  }
}

/**
 * Generate a formatted signature placeholder block
 * This replaces {{SIGNATURE_BLOCK}} in the template with visible placeholder text
 * that will appear in the generated PDF and be overlaid with the actual signature
 */
function generateSignaturePlaceholder(): string {
  return `
Signature: ____________________________    Date: ______________
`;
}

/**
 * Check if a variable name is a signature block marker
 */
function isSignatureBlockMarker(varName: string): boolean {
  const normalized = varName.toLowerCase().replace(/[_\s]/g, '');
  return normalized === 'signatureblock' || normalized === 'signature';
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
    // Replace curly/smart proposals with straight ones (Google Docs converts these)
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
interface ReplaceVariablesResult {
  hasSignatureBlock: boolean;
}

async function replaceVariables(
  accessToken: string,
  docId: string,
  variables: Record<string, string>
): Promise<ReplaceVariablesResult> {
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

  // Check for signature block marker
  const hasSignatureBlock = uniquePatterns.some(p =>
    p.toLowerCase().includes('signature_block') || p.toLowerCase().includes('signature block')
  );
  if (hasSignatureBlock) {
    console.log('[replaceVariables] Found {{SIGNATURE_BLOCK}} marker - will use overlay mode for signing');
  }

  console.log(`[replaceVariables] Found ${uniquePatterns.length} unique patterns in document`);

  // Build replacement requests
  const requests: any[] = [];

  for (const pattern of uniquePatterns) {
    // Extract the content inside {{ }} and normalize it
    const rawInner = pattern.slice(2, -2);
    const inner = normalizeVariableExpr(rawInner);

    let replacement: string;


    // Check if this is a signature block marker
    if (isSignatureBlockMarker(inner)) {
      // Replace with formatted signature placeholder
      replacement = generateSignaturePlaceholder();
      console.log('[replaceVariables] Replacing signature block marker with placeholder');
    } else if (hasFallbackOperator(inner)) {
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
    return { hasSignatureBlock };
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

  return { hasSignatureBlock };
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

    // Check if this is a signature block marker
    if (isSignatureBlockMarker(varKey)) {
      replacement = generateSignaturePlaceholder();
    } else if (hasFallbackOperator(varKey)) {
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

    // Get proposal details for folder naming
    let proposalNumber = baseTitle;
    let projectName: string | null = null;

    if (proposalId) {
      const { data: proposalInfo } = await supabaseAdmin
        .from('proposals')
        .select('proposal_number, project_name')
        .eq('id', proposalId)
        .single();

      if (proposalInfo) {
        proposalNumber = proposalInfo.proposal_number || baseTitle;
        projectName = proposalInfo.project_name || null;
      }
    }

    // Get or create proposal-specific folder (e.g., "P-001_Project Name")
    const proposalFolderId = await getOrCreateProposalFolder(
      accessToken,
      folderId,
      proposalNumber,
      projectName
    );

    // Use proposal folder if created, otherwise fall back to root folder
    const targetFolderId = proposalFolderId || folderId;

    // Copy the template to the proposal's folder
    console.log(`Copying template ${templateDocId} to folder ${targetFolderId || 'root'}...`);
    const newDocId = await copyDocument(accessToken, templateDocId, title, targetFolderId);
    console.log(`Created new document: ${newDocId} (version ${version})`);

    // Process dynamic table rows first (if any) - {{#ROW:tableId}} syntax
    // Wrapped in try-catch so table errors don't block variable replacement
    if (tableData && tableData.length > 0) {
      try {
        console.log(`Processing ${tableData.length} dynamic tables...`);
        await processTableRows(accessToken, newDocId, tableData);
        console.log('Table row processing completed successfully');
      } catch (tableError) {
        console.error('Table row processing failed (continuing with variable replacement):', tableError);
        // Don't throw - continue with variable replacement
      }

      // Process table markers - {{#TABLE:tableId}} syntax (creates complete tables)
      try {
        console.log('Processing table markers...');
        await processTableMarkers(accessToken, newDocId, tableData);
        console.log('Table marker processing completed successfully');
      } catch (tableError) {
        console.error('Table marker processing failed (continuing with variable replacement):', tableError);
        // Don't throw - continue with variable replacement
      }
    }


    // Replace variables with named ranges (enables future "Update Values" mode)
    // Also detect if template has {{SIGNATURE_BLOCK}} for e-signature placement
    let hasSignatureBlock = false;

    if (variables && Object.keys(variables).length > 0) {
      console.log(`Replacing ${Object.keys(variables).length} variables with named ranges...`);
      try {
        await replaceVariablesWithNamedRanges(accessToken, newDocId, variables);
        console.log('Variable replacement with named ranges completed');
        // Named ranges function doesn't return signature detection, check separately
        // We'll detect it from the fallback or check the template content
      } catch (rangeError) {
        // Fallback to simple replacement if named ranges fail
        console.warn('Named range replacement failed, falling back to simple replacement:', rangeError);
        const replaceResult = await replaceVariables(accessToken, newDocId, variables);
        hasSignatureBlock = replaceResult.hasSignatureBlock;
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

      // Build signature config based on template detection
      const signatureConfig = hasSignatureBlock
        ? { mode: 'overlay' as const }  // Template has signature block, overlay on last page
        : { mode: 'page' as const };    // No signature block, add dedicated page

      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          google_doc_id: newDocId,
          form_data: {
            ...currentFormData,
            generated_docs: updatedDocs,
            current_doc_version: version,
            signature_config: signatureConfig,
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
