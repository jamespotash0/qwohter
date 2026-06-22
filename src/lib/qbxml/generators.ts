/**
 * QBXML Generation Utilities
 *
 * Converts app data into QuickBooks XML format
 */

import type { Proposal } from '@/services/proposalsService';

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
 * Generate InvoiceAdd QBXML from Proposal
 */
export function generateInvoiceQBXML(proposal: Proposal): string {
  const formData = (proposal.form_data ?? {}) as Record<string, any>;

  const customerName = escapeXml(proposal.client_name || 'Unknown Customer');
  const invoiceDate = formatQBDate(new Date());
  const dueDate = formData.estimated_completion
    ? formatQBDate(formData.estimated_completion)
    : formatQBDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const lineItems = buildInvoiceLineItems(proposal);

  const qbxml = `
    <InvoiceAddRq>
      <InvoiceAdd>
        <CustomerRef>
          <FullName>${customerName}</FullName>
        </CustomerRef>

        <TxnDate>${invoiceDate}</TxnDate>
        <DueDate>${dueDate}</DueDate>

        <RefNumber>${escapeXml(proposal.proposal_number || '')}</RefNumber>

        <BillAddress>
          <Addr1>${escapeXml(formData.address || '')}</Addr1>
          <City>${escapeXml(formData.city || '')}</City>
          <State>${escapeXml(formData.state || '')}</State>
          <PostalCode>${escapeXml(formData.zipCode || '')}</PostalCode>
        </BillAddress>

        <Memo>${escapeXml(`${formData.jobType || ''} - ${proposal.project_name || ''}`)}</Memo>

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
 * Generate InvoiceAdd QBXML for a single billing phase.
 *
 * Unlike generateInvoiceQBXML (which itemizes the whole proposal), a phase
 * invoice has one line for the phase's resolved dollar amount. Customer and
 * address come from the proposal; the phase name becomes the line description.
 */
export function generatePhaseInvoiceQBXML(
  proposal: Proposal,
  phase: { name: string; refNumber: string; amount: number }
): string {
  const formData = (proposal.form_data ?? {}) as Record<string, any>;
  const customerName = escapeXml(proposal.client_name || 'Unknown Customer');
  const invoiceDate = formatQBDate(new Date());
  const dueDate = formatQBDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const lineDesc = `${phase.name} - ${proposal.project_name || proposal.proposal_number || ''}`;

  const qbxml = `
    <InvoiceAddRq>
      <InvoiceAdd>
        <CustomerRef>
          <FullName>${customerName}</FullName>
        </CustomerRef>

        <TxnDate>${invoiceDate}</TxnDate>
        <DueDate>${dueDate}</DueDate>

        <RefNumber>${escapeXml(phase.refNumber)}</RefNumber>

        <BillAddress>
          <Addr1>${escapeXml(formData.address || '')}</Addr1>
          <City>${escapeXml(formData.city || '')}</City>
          <State>${escapeXml(formData.state || '')}</State>
          <PostalCode>${escapeXml(formData.zipCode || '')}</PostalCode>
        </BillAddress>

        <Memo>${escapeXml(lineDesc)}</Memo>

        <InvoiceLineAdd>
          <ItemRef>
            <FullName>Service</FullName>
          </ItemRef>
          <Desc>${escapeXml(lineDesc)}</Desc>
          <Quantity>1</Quantity>
          <Rate>${phase.amount.toFixed(2)}</Rate>
        </InvoiceLineAdd>

        <CustomerMsgRef>
          <FullName>Thank you for your business!</FullName>
        </CustomerMsgRef>
      </InvoiceAdd>
    </InvoiceAddRq>
  `;

  return qbxml.trim();
}

/**
 * Build invoice line items from proposal
 */
function buildInvoiceLineItems(proposal: Proposal): string {
  const formData = (proposal.form_data ?? {}) as Record<string, any>;

  let lineItems = '';

  // Materials line item
  if (formData.materials_cost && formData.materials_cost > 0) {
    lineItems += `
      <InvoiceLineAdd>
        <ItemRef>
          <FullName>Materials</FullName>
        </ItemRef>
        <Desc>${escapeXml(`Materials for ${formData.jobType || ''}`)}</Desc>
        <Quantity>1</Quantity>
        <Rate>${formData.materials_cost.toFixed(2)}</Rate>
      </InvoiceLineAdd>
    `;
  }

  // Labor line item
  if (formData.labor_cost && formData.labor_cost > 0) {
    lineItems += `
      <InvoiceLineAdd>
        <ItemRef>
          <FullName>Labor</FullName>
        </ItemRef>
        <Desc>${escapeXml(`Labor for ${formData.squareFootage || 0} sq ft`)}</Desc>
        <Quantity>1</Quantity>
        <Rate>${formData.labor_cost.toFixed(2)}</Rate>
      </InvoiceLineAdd>
    `;
  }

  // Additional services/costs
  if (formData.additional_costs && Array.isArray(formData.additional_costs)) {
    formData.additional_costs.forEach((cost: any) => {
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
  if (formData.discount_amount && formData.discount_amount > 0) {
    lineItems += `
      <InvoiceLineAdd>
        <ItemRef>
          <FullName>Discount</FullName>
        </ItemRef>
        <Desc>${escapeXml(`Discount: ${formData.discount_percentage || 0}%`)}</Desc>
        <Quantity>1</Quantity>
        <Rate>-${formData.discount_amount.toFixed(2)}</Rate>
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
