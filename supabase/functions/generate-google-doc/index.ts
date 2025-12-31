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

interface RequestBody {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  variables: Record<string, string>;
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
  // Get org-level token from database
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_valid', true)
    .single();

  if (tokenError || !tokenData) {
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

  // Refresh the token
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    const error = await refreshResponse.text();
    console.error('Token refresh failed:', error);

    // Mark token as invalid
    await supabaseAdmin
      .from('google_oauth_tokens')
      .update({ is_valid: false })
      .eq('id', tokenData.id);

    throw new Error('Google connection expired. An admin needs to reconnect in Settings → Integrations.');
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
  const varPattern = /[a-zA-Z_][a-zA-Z0-9_.]+/g;
  const matches = expr.match(varPattern) || [];

  for (const varName of matches) {
    const value = variables[varName];
    if (value !== undefined) {
      // Parse the value as a number (handle currency formatting)
      const numValue = parseCurrency(value);
      resolved = resolved.replace(new RegExp(varName.replace(/\./g, '\\.'), 'g'), numValue.toString());
    }
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
 * Process all expressions in the variables
 * Finds {{expr}} patterns that contain operators and evaluates them
 */
function processExpressions(variables: Record<string, string>): Record<string, string> {
  const processed: Record<string, string> = { ...variables };

  // Also add expression-evaluated versions
  // These will be used for patterns like {{pricing.a + pricing.b}}
  // The replaceVariables function will handle simple replacements first,
  // then we need to handle expressions separately in the document

  return processed;
}

/**
 * Replace variables in a Google Doc using Docs API
 * Supports both simple variables and expressions:
 * - Simple: {{pricing.total}} -> $1,234.56
 * - Expression: {{pricing.materials + pricing.labor}} -> $2,500.00
 * Note: replaceAllText preserves formatting (bold, italic, etc.)
 */
async function replaceVariables(
  accessToken: string,
  docId: string,
  variables: Record<string, string>
): Promise<void> {
  // First, get the document content to find expressions
  const docResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docResponse.ok) {
    throw new Error('Failed to read document for expression processing');
  }

  const docData = await docResponse.json();
  const docContent = JSON.stringify(docData);

  // Find all {{...}} patterns in the document
  const allPatterns = docContent.match(/\{\{[^}]+\}\}/g) || [];
  const uniquePatterns = [...new Set(allPatterns)];

  // Build replacement requests
  const requests: any[] = [];

  for (const pattern of uniquePatterns) {
    // Extract the content inside {{ }}
    const inner = pattern.slice(2, -2).trim();

    // Check if it's a simple variable or an expression
    const isExpression = /[+\-*/()]/.test(inner);

    let replacement: string;

    if (isExpression) {
      // Evaluate the expression
      replacement = evaluateExpression(inner, variables);
    } else {
      // Simple variable lookup
      replacement = variables[inner] ?? '';
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

  if (requests.length === 0) return;

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
    throw new Error(`Failed to replace variables: ${error}`);
  }
}
//@ts-ignore
serve(async (req) => {
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
    const {
      templateDocId,
      proposalId,
      organizationId,
      variables,
      outputTitle,
      mode = 'create',
      existingDocId,
      version = 1,
    } = body;

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

    // Generate document title with version
    // Format: "{title}_v{version}" e.g., "P-001_v1" or "Project ABC_v2"
    const baseTitle = outputTitle || `Proposal-${proposalId || 'Draft'}`;
    const title = `${baseTitle}_v${version}`;

    // Copy the template to the org's shared folder
    console.log(`Copying template ${templateDocId} to folder ${folderId || 'root'}...`);
    const newDocId = await copyDocument(accessToken, templateDocId, title, folderId);
    console.log(`Created new document: ${newDocId} (version ${version})`);

    // Replace variables (formatting like bold/italic is preserved)
    if (variables && Object.keys(variables).length > 0) {
      console.log(`Replacing ${Object.keys(variables).length} variables...`);
      await replaceVariables(accessToken, newDocId, variables);
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
