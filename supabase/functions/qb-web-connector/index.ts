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

// Initialize Supabase client with service role
//@ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
//@ts-ignore
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Look up an active session by its ticket.
 *
 * Edge functions are stateless and ephemeral — the Web Connector's call
 * sequence (authenticate → sendRequestXML → receiveResponseXML → closeConnection)
 * can land on different instances, so session state MUST live in the database,
 * not in process memory. The session row is created during authenticate.
 */
async function getActiveSession(
  ticket: string
): Promise<{ organization_id: string } | null> {
  if (!ticket) return null;
  const { data } = await supabase
    .from('quickbooks_desktop_session_logs')
    .select('organization_id')
    .eq('session_ticket', ticket)
    .eq('status', 'active')
    .maybeSingle();
  return data ?? null;
}

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

    // Create session ticket. This row IS the session store — read back by
    // getActiveSession() on subsequent (stateless) Web Connector calls.
    const sessionTicket = crypto.randomUUID();
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
  const session = await getActiveSession(ticket);

  if (!session) {
    console.log('Invalid session ticket');
    return '';
  }

  try {
    // Get next pending request from queue
    const { data: requests, error } = await supabase
      .from('quickbooks_request_queue')
      .select('*')
      .eq('organization_id', session.organization_id)
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

    // Mark request as sent. The 'Sent' status itself tracks the in-flight
    // request — receiveResponseXML pairs the response back to it by org +
    // status, so no per-process session state is needed.
    await supabase
      .from('quickbooks_request_queue')
      .update({
        queue_status: 'Sent',
        attempts: request.attempts + 1,
        processed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

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
  const session = await getActiveSession(ticket);

  if (!session) {
    console.log('Invalid session ticket');
    return 100; // Error percentage
  }

  try {
    // The response belongs to the request we just marked 'Sent' for this org.
    // The Web Connector processes one request per send/receive cycle, so the
    // most-recently-sent request is the one being answered now.
    const { data: sentRequests } = await supabase
      .from('quickbooks_request_queue')
      .select('*')
      .eq('organization_id', session.organization_id)
      .eq('queue_status', 'Sent')
      .order('processed_at', { ascending: false })
      .limit(1);

    const request = sentRequests?.[0];
    if (!request) {
      console.log('No in-flight request to match response to');
      return 100;
    }

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
      .eq('id', request.id);

    if (!hasError) {
      // Process successful responses
      await processSuccessfulResponse(request, response);
    }

    console.log(`Response received: ${queueStatus}`);

    // Check if there are more pending requests
    const { count } = await supabase
      .from('quickbooks_request_queue')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', session.organization_id)
      .eq('queue_status', 'Pending');

    return count && count > 0 ? 10 : 100; // 10% if more requests, 100% if done

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
 * Handle getLastError - QB requests the reason the last call returned no work.
 * The Web Connector displays this string in its log; an empty/normal queue is
 * not an error condition.
 */
async function handleGetLastError(params: any): Promise<string> {
  const { ticket } = params;
  const session = await getActiveSession(ticket);
  if (!session) return 'Invalid or expired session ticket';
  return 'No error';
}

/**
 * Handle connectionError - QB Web Connector could not reach/open QuickBooks.
 * Returning "done" tells the connector to stop trying for this run.
 */
function handleConnectionError(params: any): string {
  console.log(`Connection error reported: hresult=${params.hresult}, message=${params.message}`);
  return 'done';
}

/**
 * Handle closeConnection - Close the session
 */
async function handleCloseConnection(params: any): Promise<string> {
  const { ticket } = params;

  // Mark the session row completed. Safe to call even if already closed.
  await supabase
    .from('quickbooks_desktop_session_logs')
    .update({
      status: 'completed',
      session_ended_at: new Date().toISOString(),
    })
    .eq('session_ticket', ticket)
    .eq('status', 'active');

  console.log(`Session closed: ${ticket}`);
  return 'OK';
}

/**
 * Build the QBWebConnectorSvc WSDL document. The Web Connector requests this
 * (GET ?wsdl) to learn the SOAP operations before it calls authenticate.
 * The soap:address location is set to the live endpoint so the connector
 * posts back to the right place.
 */
function buildWSDL(endpoint: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
                  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                  xmlns:tns="http://developer.intuit.com/"
                  targetNamespace="http://developer.intuit.com/"
                  name="QBWebConnectorSvc">
  <wsdl:types>
    <xsd:schema elementFormDefault="qualified" targetNamespace="http://developer.intuit.com/">
      <xsd:complexType name="ArrayOfString">
        <xsd:sequence>
          <xsd:element minOccurs="0" maxOccurs="unbounded" name="string" nillable="true" type="xsd:string"/>
        </xsd:sequence>
      </xsd:complexType>
      <xsd:element name="serverVersion"><xsd:complexType><xsd:sequence/></xsd:complexType></xsd:element>
      <xsd:element name="serverVersionResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="serverVersionResult" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="clientVersion"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="strVersion" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="clientVersionResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="clientVersionResult" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="authenticate"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="strUserName" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="strPassword" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="authenticateResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="authenticateResult" type="tns:ArrayOfString"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="sendRequestXML"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="ticket" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="strHCPResponse" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="strCompanyFileName" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="qbXMLCountry" type="xsd:string"/>
        <xsd:element minOccurs="1" maxOccurs="1" name="qbXMLMajorVers" type="xsd:int"/>
        <xsd:element minOccurs="1" maxOccurs="1" name="qbXMLMinorVers" type="xsd:int"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="sendRequestXMLResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="sendRequestXMLResult" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="receiveResponseXML"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="ticket" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="response" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="hresult" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="message" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="receiveResponseXMLResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="1" maxOccurs="1" name="receiveResponseXMLResult" type="xsd:int"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="connectionError"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="ticket" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="hresult" type="xsd:string"/>
        <xsd:element minOccurs="0" maxOccurs="1" name="message" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="connectionErrorResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="connectionErrorResult" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="getLastError"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="ticket" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="getLastErrorResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="getLastErrorResult" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="closeConnection"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="ticket" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="closeConnectionResponse"><xsd:complexType><xsd:sequence>
        <xsd:element minOccurs="0" maxOccurs="1" name="closeConnectionResult" type="xsd:string"/>
      </xsd:sequence></xsd:complexType></xsd:element>
    </xsd:schema>
  </wsdl:types>
  <wsdl:message name="serverVersionSoapIn"><wsdl:part name="parameters" element="tns:serverVersion"/></wsdl:message>
  <wsdl:message name="serverVersionSoapOut"><wsdl:part name="parameters" element="tns:serverVersionResponse"/></wsdl:message>
  <wsdl:message name="clientVersionSoapIn"><wsdl:part name="parameters" element="tns:clientVersion"/></wsdl:message>
  <wsdl:message name="clientVersionSoapOut"><wsdl:part name="parameters" element="tns:clientVersionResponse"/></wsdl:message>
  <wsdl:message name="authenticateSoapIn"><wsdl:part name="parameters" element="tns:authenticate"/></wsdl:message>
  <wsdl:message name="authenticateSoapOut"><wsdl:part name="parameters" element="tns:authenticateResponse"/></wsdl:message>
  <wsdl:message name="sendRequestXMLSoapIn"><wsdl:part name="parameters" element="tns:sendRequestXML"/></wsdl:message>
  <wsdl:message name="sendRequestXMLSoapOut"><wsdl:part name="parameters" element="tns:sendRequestXMLResponse"/></wsdl:message>
  <wsdl:message name="receiveResponseXMLSoapIn"><wsdl:part name="parameters" element="tns:receiveResponseXML"/></wsdl:message>
  <wsdl:message name="receiveResponseXMLSoapOut"><wsdl:part name="parameters" element="tns:receiveResponseXMLResponse"/></wsdl:message>
  <wsdl:message name="connectionErrorSoapIn"><wsdl:part name="parameters" element="tns:connectionError"/></wsdl:message>
  <wsdl:message name="connectionErrorSoapOut"><wsdl:part name="parameters" element="tns:connectionErrorResponse"/></wsdl:message>
  <wsdl:message name="getLastErrorSoapIn"><wsdl:part name="parameters" element="tns:getLastError"/></wsdl:message>
  <wsdl:message name="getLastErrorSoapOut"><wsdl:part name="parameters" element="tns:getLastErrorResponse"/></wsdl:message>
  <wsdl:message name="closeConnectionSoapIn"><wsdl:part name="parameters" element="tns:closeConnection"/></wsdl:message>
  <wsdl:message name="closeConnectionSoapOut"><wsdl:part name="parameters" element="tns:closeConnectionResponse"/></wsdl:message>
  <wsdl:portType name="QBWebConnectorSvcSoap">
    <wsdl:operation name="serverVersion"><wsdl:input message="tns:serverVersionSoapIn"/><wsdl:output message="tns:serverVersionSoapOut"/></wsdl:operation>
    <wsdl:operation name="clientVersion"><wsdl:input message="tns:clientVersionSoapIn"/><wsdl:output message="tns:clientVersionSoapOut"/></wsdl:operation>
    <wsdl:operation name="authenticate"><wsdl:input message="tns:authenticateSoapIn"/><wsdl:output message="tns:authenticateSoapOut"/></wsdl:operation>
    <wsdl:operation name="sendRequestXML"><wsdl:input message="tns:sendRequestXMLSoapIn"/><wsdl:output message="tns:sendRequestXMLSoapOut"/></wsdl:operation>
    <wsdl:operation name="receiveResponseXML"><wsdl:input message="tns:receiveResponseXMLSoapIn"/><wsdl:output message="tns:receiveResponseXMLSoapOut"/></wsdl:operation>
    <wsdl:operation name="connectionError"><wsdl:input message="tns:connectionErrorSoapIn"/><wsdl:output message="tns:connectionErrorSoapOut"/></wsdl:operation>
    <wsdl:operation name="getLastError"><wsdl:input message="tns:getLastErrorSoapIn"/><wsdl:output message="tns:getLastErrorSoapOut"/></wsdl:operation>
    <wsdl:operation name="closeConnection"><wsdl:input message="tns:closeConnectionSoapIn"/><wsdl:output message="tns:closeConnectionSoapOut"/></wsdl:operation>
  </wsdl:portType>
  <wsdl:binding name="QBWebConnectorSvcSoap" type="tns:QBWebConnectorSvcSoap">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http" style="document"/>
    <wsdl:operation name="serverVersion"><soap:operation soapAction="http://developer.intuit.com/serverVersion" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="clientVersion"><soap:operation soapAction="http://developer.intuit.com/clientVersion" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="authenticate"><soap:operation soapAction="http://developer.intuit.com/authenticate" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="sendRequestXML"><soap:operation soapAction="http://developer.intuit.com/sendRequestXML" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="receiveResponseXML"><soap:operation soapAction="http://developer.intuit.com/receiveResponseXML" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="connectionError"><soap:operation soapAction="http://developer.intuit.com/connectionError" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="getLastError"><soap:operation soapAction="http://developer.intuit.com/getLastError" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
    <wsdl:operation name="closeConnection"><soap:operation soapAction="http://developer.intuit.com/closeConnection" style="document"/><wsdl:input><soap:body use="literal"/></wsdl:input><wsdl:output><soap:body use="literal"/></wsdl:output></wsdl:operation>
  </wsdl:binding>
  <wsdl:service name="QBWebConnectorSvc">
    <wsdl:port name="QBWebConnectorSvcSoap" binding="tns:QBWebConnectorSvcSoap">
      <soap:address location="${endpoint}"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>`;
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

  if (req.method === 'GET') {
    const url = new URL(req.url);

    // The Web Connector fetches the WSDL (typically AppURL?wsdl) to discover the
    // SOAP contract before it ever calls authenticate. Without this it cannot
    // connect at all.
    if (url.searchParams.has('wsdl') || url.search.toLowerCase().includes('wsdl')) {
      const endpoint = `${url.origin}${url.pathname}`;
      return new Response(buildWSDL(endpoint), {
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      });
    }

    // Health check
    return new Response(
      JSON.stringify({ status: 'OK' }),
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
          response = await handleGetLastError(params);
          break;

        case 'connectionError':
          response = handleConnectionError(params);
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
