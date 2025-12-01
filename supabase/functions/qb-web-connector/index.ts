/**
 * QuickBooks Desktop Web Connector Edge Function
 *
 * Handles SOAP requests from QB Web Connector
 * Runs on Supabase's servers with access to secrets
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
//@ts-ignore
import { parse } from 'https://deno.land/x/xml@2.1.1/mod.ts';
//@ts-ignore
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

// Active sessions (in-memory, consider using Supabase for production)
const activeSessions = new Map<string, any>();

// Initialize Supabase client with service role
//@ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
//@ts-ignore
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Parse SOAP XML request
 */
function parseSoapRequest(xmlString: string): { methodName: string; params: any } {
  try {
    const doc = parse(xmlString);
    const envelope = doc['soap:Envelope'] || doc['soapenv:Envelope'];
    const body = envelope['soap:Body'] || envelope['soapenv:Body'];

    // Find the method name (first element in body)
    const methodKey = Object.keys(body).find(key => key.includes(':'));
    const methodName = methodKey ? methodKey.split(':')[1] : Object.keys(body)[0];
    const params = body[methodKey || methodName];

    return { methodName, params };
  } catch (error) {
    console.error('Failed to parse SOAP:', error);
    return { methodName: '', params: {} };
  }
}

/**
 * Build SOAP response
 */
function buildSoapResponse(methodName: string, returnValue: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <${methodName}Response xmlns="http://developer.intuit.com/">
      <${methodName}Result>${returnValue}</${methodName}Result>
    </${methodName}Response>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Handle serverVersion - QB asks for server version
 */
function handleServerVersion(): string {
  return '1.0.0';
}

/**
 * Handle clientVersion - QB sends Web Connector version
 */
function handleClientVersion(params: any): string {
  console.log(`Web Connector version: ${params.strVersion}`);
  return ''; // Accept any version
}

/**
 * Handle authenticate - QB authenticates user
 */
async function handleAuthenticate(params: any): Promise<string> {
  const { strUserName, strPassword } = params;

  try {
    // Find connection by username
    const { data: connection, error } = await supabase
      .from('quickbooks_desktop_connections')
      .select('*')
      .eq('username', strUserName)
      .eq('is_active', true)
      .single();

    if (error || !connection) {
      console.log('Authentication failed: user not found');
      return '<string>nvu</string>'; // Invalid user
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(strPassword, connection.password_hash);

    if (!isValidPassword) {
      console.log('Authentication failed: invalid password');
      return '<string>nvu</string>';
    }

    // Create session ticket
    const sessionTicket = crypto.randomUUID();
    activeSessions.set(sessionTicket, {
      organizationId: connection.organization_id,
      companyFileName: connection.company_file_name,
      startedAt: new Date(),
    });

    // Log session
    await supabase.from('quickbooks_desktop_session_logs').insert({
      organization_id: connection.organization_id,
      session_ticket: sessionTicket,
      status: 'active',
    });

    // Update last sync time
    await supabase
      .from('quickbooks_desktop_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    console.log(`Authentication successful for ${strUserName}`);

    // Return session ticket and empty company file name
    return `<string>${sessionTicket}</string><string></string>`;

  } catch (error) {
    console.error('Authentication error:', error);
    return '<string>nvu</string>';
  }
}

/**
 * Handle sendRequestXML - Send QBXML request to QuickBooks
 */
async function handleSendRequestXML(params: any): Promise<string> {
  const { ticket } = params;
  const session = activeSessions.get(ticket);

  if (!session) {
    console.log('Invalid session ticket');
    return '';
  }

  try {
    // Get next pending request from queue
    const { data: requests, error } = await supabase
      .from('quickbooks_request_queue')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('queue_status', 'Pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (!requests || requests.length === 0) {
      console.log('No pending requests');
      return ''; // No more requests
    }

    const request = requests[0];

    // Mark request as sent
    await supabase
      .from('quickbooks_request_queue')
      .update({
        queue_status: 'Sent',
        attempts: request.attempts + 1,
        processed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    // Store current request in session
    session.currentRequestId = request.id;
    activeSessions.set(ticket, session);

    console.log(`Sending QBXML request: ${request.request_type}`);

    // Wrap QBXML in proper envelope
    const qbxmlEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    ${request.qbxml_request}
  </QBXMLMsgsRq>
</QBXML>`;

    return qbxmlEnvelope;

  } catch (error) {
    console.error('Error fetching request:', error);
    return '';
  }
}

/**
 * Handle receiveResponseXML - Receive QBXML response from QuickBooks
 */
async function handleReceiveResponseXML(params: any): Promise<number> {
  const { ticket, response, hresult } = params;
  const session = activeSessions.get(ticket);

  if (!session || !session.currentRequestId) {
    console.log('Invalid session or missing request ID');
    return 100; // Error percentage
  }

  try {
    const requestId = session.currentRequestId;
    const hasError = hresult && hresult !== '0';
    const queueStatus = hasError ? 'Failed' : 'Completed';

    // Update request with response
    await supabase
      .from('quickbooks_request_queue')
      .update({
        queue_status: queueStatus,
        qbxml_response: response,
        error_message: hasError ? `HRESULT: ${hresult}` : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Get request details to process response
    const { data: request } = await supabase
      .from('quickbooks_request_queue')
      .select('*')
      .eq('id', requestId)
      .single();

    if (request && !hasError) {
      // Process successful responses
      await processSuccessfulResponse(request, response);
    }

    console.log(`Response received: ${queueStatus}`);

    // Check if there are more pending requests
    const { count } = await supabase
      .from('quickbooks_request_queue')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', session.organizationId)
      .eq('queue_status', 'Pending');

    return count > 0 ? 10 : 100; // 10% if more requests, 100% if done

  } catch (error) {
    console.error('Error processing response:', error);
    return 100;
  }
}

/**
 * Process successful QBXML responses
 */
async function processSuccessfulResponse(request: any, responseXml: string) {
  try {
    const response = parse(responseXml);

    switch (request.request_type) {
      case 'InvoiceAdd':
        await processInvoiceAddResponse(request, response);
        break;

      default:
        console.log(`No processor for request type: ${request.request_type}`);
    }
  } catch (error) {
    console.error('Error processing successful response:', error);
  }
}

/**
 * Process InvoiceAdd response
 */
async function processInvoiceAddResponse(request: any, response: any) {
  try {
    const invoiceRet = response.QBXML?.QBXMLMsgsRs?.InvoiceAddRs?.InvoiceRet;

    if (invoiceRet) {
      await supabase
        .from('quickbooks_desktop_invoice_sync')
        .update({
          qb_txn_id: invoiceRet.TxnID,
          qb_edit_sequence: invoiceRet.EditSequence,
          qb_invoice_number: invoiceRet.RefNumber,
          sync_status: 'Synced',
          last_sync_at: new Date().toISOString(),
        })
        .eq('quote_id', request.source_record_id);

      console.log(`Invoice created: ${invoiceRet.RefNumber}`);
    }
  } catch (error) {
    console.error('Error processing InvoiceAdd response:', error);
  }
}

/**
 * Handle getLastError - QB requests last error
 */
function handleGetLastError(params: any): string {
  const { ticket } = params;
  const session = activeSessions.get(ticket);
  return session?.lastError || 'No error';
}

/**
 * Handle closeConnection - Close the session
 */
async function handleCloseConnection(params: any): Promise<string> {
  const { ticket } = params;
  const session = activeSessions.get(ticket);

  if (session) {
    // Update session log
    await supabase
      .from('quickbooks_desktop_session_logs')
      .update({
        status: 'completed',
        session_ended_at: new Date().toISOString(),
      })
      .eq('session_ticket', ticket);

    activeSessions.delete(ticket);
    console.log(`Session closed: ${ticket}`);
  }

  return 'OK';
}

/**
 * Main request handler
 */
//@ts-ignore
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'OK', activeSessions: activeSessions.size }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // SOAP endpoint
  if (req.method === 'POST') {
    try {
      const xmlBody = await req.text();
      const { methodName, params } = parseSoapRequest(xmlBody);

      console.log(`QB Web Connector called: ${methodName}`);

      let response: string | number;

      switch (methodName) {
        case 'serverVersion':
          response = handleServerVersion();
          break;

        case 'clientVersion':
          response = handleClientVersion(params);
          break;

        case 'authenticate':
          response = await handleAuthenticate(params);
          break;

        case 'sendRequestXML':
          response = await handleSendRequestXML(params);
          break;

        case 'receiveResponseXML':
          response = await handleReceiveResponseXML(params);
          break;

        case 'getLastError':
          response = handleGetLastError(params);
          break;

        case 'closeConnection':
          response = await handleCloseConnection(params);
          break;

        default:
          console.log(`Unknown method: ${methodName}`);
          response = '';
      }

      const soapResponse = buildSoapResponse(methodName, String(response));

      return new Response(soapResponse, {
        headers: { 'Content-Type': 'text/xml' },
      });

    } catch (error) {
      console.error('SOAP request error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
