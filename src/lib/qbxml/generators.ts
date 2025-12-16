/**
 * QBXML Generation Utilities
 *
 * Converts app data into QuickBooks XML format
 */

import type { Quote } from '@/_deprecated/services/quotesService';

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date for QuickBooks (YYYY-MM-DD)
 */
function formatQBDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate InvoiceAdd QBXML from Quote
 */
export function generateInvoiceQBXML(quote: Quote): string {
  const quoteDetails = quote.quote_details;
  const jobDetails = quote.job_details;
  const wallDetails = quote.wall_details;
  const priceDetails = quote.price_details;
  const deliveryDetails = quote.delivery_details;

  // Customer name (simplified - you may want to lookup existing QB customer)
  const customerName = escapeXml(quoteDetails.contactName || 'Unknown Customer');

  // Invoice date
  const invoiceDate = formatQBDate(new Date());

  // Due date (add payment terms if specified)
  const dueDate = deliveryDetails?.estimated_completion
    ? formatQBDate(deliveryDetails.estimated_completion)
    : formatQBDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now

  // Build line items
  const lineItems = buildInvoiceLineItems(quote);

  const qbxml = `
    <InvoiceAddRq>
      <InvoiceAdd>
        <CustomerRef>
          <FullName>${customerName}</FullName>
        </CustomerRef>

        <TxnDate>${invoiceDate}</TxnDate>
        <DueDate>${dueDate}</DueDate>

        <RefNumber>${escapeXml(quote.proposal_number || '')}</RefNumber>

        <BillAddress>
          <Addr1>${escapeXml(quoteDetails.address || '')}</Addr1>
          <City>${escapeXml(quoteDetails.city || '')}</City>
          <State>${escapeXml(quoteDetails.state || '')}</State>
          <PostalCode>${escapeXml(quoteDetails.zipCode || '')}</PostalCode>
        </BillAddress>

        <Memo>${escapeXml(`${jobDetails.jobType} - ${quoteDetails.projectName || ''}`)}</Memo>

        ${lineItems}

        <CustomerMsgRef>
          <FullName>Thank you for your business!</FullName>
        </CustomerMsgRef>
      </InvoiceAdd>
    </InvoiceAddRq>
  `;

  return qbxml.trim();
}

/**
 * Build invoice line items from quote
 */
function buildInvoiceLineItems(quote: Quote): string {
  const priceDetails = quote.price_details;
  const jobDetails = quote.job_details;
  const wallDetails = quote.wall_details;

  let lineItems = '';

  // Materials line item
  if (priceDetails.materials_cost && priceDetails.materials_cost > 0) {
    lineItems += `
      <InvoiceLineAdd>
        <ItemRef>
          <FullName>Materials</FullName>
        </ItemRef>
        <Desc>${escapeXml(`Materials for ${jobDetails.jobType}`)}</Desc>
        <Quantity>1</Quantity>
        <Rate>${priceDetails.materials_cost.toFixed(2)}</Rate>
      </InvoiceLineAdd>
    `;
  }

  // Labor line item
  if (priceDetails.labor_cost && priceDetails.labor_cost > 0) {
    lineItems += `
      <InvoiceLineAdd>
        <ItemRef>
          <FullName>Labor</FullName>
        </ItemRef>
        <Desc>${escapeXml(`Labor for ${wallDetails.squareFootage || 0} sq ft`)}</Desc>
        <Quantity>1</Quantity>
        <Rate>${priceDetails.labor_cost.toFixed(2)}</Rate>
      </InvoiceLineAdd>
    `;
  }

  // Additional services/costs
  if (priceDetails.additional_costs && Array.isArray(priceDetails.additional_costs)) {
    priceDetails.additional_costs.forEach((cost: any) => {
      if (cost.amount > 0) {
        lineItems += `
          <InvoiceLineAdd>
            <ItemRef>
              <FullName>Service</FullName>
            </ItemRef>
            <Desc>${escapeXml(cost.description || 'Additional Service')}</Desc>
            <Quantity>1</Quantity>
            <Rate>${cost.amount.toFixed(2)}</Rate>
          </InvoiceLineAdd>
        `;
      }
    });
  }

  // Discount line (if applicable)
  if (priceDetails.discount_amount && priceDetails.discount_amount > 0) {
    lineItems += `
      <InvoiceLineAdd>
        <ItemRef>
          <FullName>Discount</FullName>
        </ItemRef>
        <Desc>${escapeXml(`Discount: ${priceDetails.discount_percentage || 0}%`)}</Desc>
        <Quantity>1</Quantity>
        <Rate>-${priceDetails.discount_amount.toFixed(2)}</Rate>
      </InvoiceLineAdd>
    `;
  }

  return lineItems;
}

/**
 * Generate CustomerAdd QBXML
 */
export function generateCustomerQBXML(
  customerName: string,
  email?: string,
  phone?: string,
  address?: string
): string {
  const qbxml = `
    <CustomerAddRq>
      <CustomerAdd>
        <Name>${escapeXml(customerName)}</Name>
        <CompanyName>${escapeXml(customerName)}</CompanyName>

        ${email ? `<Email>${escapeXml(email)}</Email>` : ''}
        ${phone ? `<Phone>${escapeXml(phone)}</Phone>` : ''}

        ${address ? `
          <BillAddress>
            <Addr1>${escapeXml(address)}</Addr1>
          </BillAddress>
        ` : ''}

        <IsActive>true</IsActive>
      </CustomerAdd>
    </CustomerAddRq>
  `;

  return qbxml.trim();
}

/**
 * Generate CustomerQuery QBXML (to check if customer exists)
 */
export function generateCustomerQueryQBXML(customerName: string): string {
  const qbxml = `
    <CustomerQueryRq>
      <MaxReturned>1</MaxReturned>
      <NameFilter>
        <MatchCriterion>Contains</MatchCriterion>
        <Name>${escapeXml(customerName)}</Name>
      </NameFilter>
    </CustomerQueryRq>
  `;

  return qbxml.trim();
}

/**
 * Generate ItemQuery QBXML (to check if item/service exists)
 */
export function generateItemQueryQBXML(itemName: string): string {
  const qbxml = `
    <ItemServiceQueryRq>
      <MaxReturned>1</MaxReturned>
      <NameFilter>
        <MatchCriterion>Contains</MatchCriterion>
        <Name>${escapeXml(itemName)}</Name>
      </NameFilter>
    </ItemServiceQueryRq>
  `;

  return qbxml.trim();
}

/**
 * Generate InvoiceQuery QBXML (to check invoice status)
 */
export function generateInvoiceQueryQBXML(txnId: string): string {
  const qbxml = `
    <InvoiceQueryRq>
      <TxnID>${escapeXml(txnId)}</TxnID>
      <IncludeLineItems>true</IncludeLineItems>
    </InvoiceQueryRq>
  `;

  return qbxml.trim();
}
