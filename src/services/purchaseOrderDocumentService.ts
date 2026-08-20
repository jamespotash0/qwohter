/**
 * Purchase Order Document Service
 *
 * Assembles everything a purchase order PDF needs, renders it, and sends it.
 *
 * A sent PO is also filed as an attachment against the purchase order. When a
 * manufacturer later disputes what was ordered, the question is not what the
 * database says today — it is what document they were sent, and that has to be
 * recoverable byte for byte.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  buildPurchaseOrderPdf,
  purchaseOrderFileName,
  purchaseOrderPdfBase64,
  type POPdfInput,
  type POPdfLine,
} from '@/lib/pdf/purchaseOrder';
import { uploadAttachment } from '@/services/attachmentsService';
import { getVendorById, getAcknowledgmentEmail } from '@/services/vendorsService';
import { getPOLines } from '@/services/vendorPOService';
import { getSalesOrderById, getOrderLines } from '@/services/salesOrdersService';

/**
 * Gather the PDF inputs for one purchase order.
 *
 * Line detail comes from the order lines the PO lines point at, rather than
 * being copied onto the PO — a PO line is a claim on quantity, not a second
 * description that could drift from the first.
 */
export async function buildPurchaseOrderInput(
  vendorPOId: string,
  dealerName: string,
  dealerContact: { address?: string | null; phone?: string | null; email?: string | null } = {}
): Promise<{ input: POPdfInput; vendorEmail: string | null; vendorName: string }> {
  const { data: po, error } = await supabase
    .from('vendor_pos')
    .select('*')
    .eq('id', vendorPOId)
    .maybeSingle();

  if (error || !po) {
    throw new Error('Purchase order not found.');
  }

  const [vendor, poLines, salesOrder, orderLines] = await Promise.all([
    getVendorById(po.vendor_id),
    getPOLines(vendorPOId),
    getSalesOrderById(po.sales_order_id),
    getOrderLines(po.sales_order_id),
  ]);

  if (!vendor) {
    throw new Error('This purchase order has no vendor on file.');
  }

  const orderLineById = new Map(orderLines.map(line => [line.id, line]));

  const lines: POPdfLine[] = poLines.map((poLine, index) => {
    const orderLine = orderLineById.get(poLine.order_line_id);
    return {
      lineNumber: poLine.line_number ?? index + 1,
      modelNumber: orderLine?.model_number ?? null,
      description: orderLine?.description ?? 'Item',
      optionString: orderLine?.option_string ?? null,
      area: orderLine?.area ?? null,
      quantity: Number(poLine.quantity),
      unitCost: Number(poLine.unit_cost),
      listPrice: poLine.list_price === null ? null : Number(poLine.list_price),
      dealerDiscountPercent:
        poLine.dealer_discount_percent === null
          ? null
          : Number(poLine.dealer_discount_percent),
    };
  });

  if (lines.length === 0) {
    throw new Error('This purchase order has no lines.');
  }

  const input: POPdfInput = {
    poNumber: po.po_number ?? 'DRAFT',
    orderDate: new Date(po.created_at).toLocaleDateString(),
    requestedShipDate: po.requested_ship_date,
    paymentTerms: po.payment_terms ?? vendor.payment_terms,
    freightTerms: po.freight_terms ?? vendor.freight_terms,
    customerPONumber: salesOrder?.customer_po_number ?? null,
    contractVehicle: salesOrder?.contract_vehicle ?? null,
    dealer: {
      name: dealerName,
      address: dealerContact.address ?? null,
      phone: dealerContact.phone ?? null,
      email: dealerContact.email ?? null,
    },
    vendor: {
      name: vendor.name,
      accountNumber: vendor.account_number,
      remitToName: vendor.remit_to_name,
      addressLine1: vendor.remit_to_address_line1,
      addressLine2: vendor.remit_to_address_line2,
      city: vendor.remit_to_city,
      state: vendor.remit_to_state,
      postalCode: vendor.remit_to_postal_code,
    },
    shipTo: {
      name: po.ship_to_name,
      addressLine1: po.ship_to_address_line1,
      addressLine2: po.ship_to_address_line2,
      city: po.ship_to_city,
      state: po.ship_to_state,
      postalCode: po.ship_to_postal_code,
    },
    lines,
    notes: po.notes,
  };

  return {
    input,
    vendorEmail: vendor.order_email ?? getAcknowledgmentEmail(vendor),
    vendorName: vendor.name,
  };
}

/** Render and download, for reviewing before sending. */
export async function downloadPurchaseOrderPdf(
  vendorPOId: string,
  dealerName: string,
  dealerContact?: { address?: string | null; phone?: string | null; email?: string | null }
): Promise<void> {
  const { input, vendorName } = await buildPurchaseOrderInput(
    vendorPOId,
    dealerName,
    dealerContact
  );
  const doc = buildPurchaseOrderPdf(input);
  doc.save(purchaseOrderFileName(input.poNumber, vendorName));
}

export interface SendPurchaseOrderInput {
  vendorPOId: string;
  organizationId: string;
  dealerName: string;
  dealerContact?: { address?: string | null; phone?: string | null; email?: string | null };
  /** Overrides the vendor's order email. */
  to?: string;
  cc?: string[];
  subject?: string;
  message?: string;
}

export interface SendPurchaseOrderResult {
  emailId: string | null;
  sentTo: string;
  /** Set when the vendor received it but the record could not be updated. */
  warning?: string;
}

/**
 * Render the PDF, file it against the purchase order, then email it.
 *
 * Filing happens before sending so the record of what was transmitted exists
 * even if the send fails; an orphaned attachment is recoverable, a sent
 * document nobody kept a copy of is not.
 */
export async function sendPurchaseOrder(
  params: SendPurchaseOrderInput
): Promise<SendPurchaseOrderResult> {
  const { input, vendorEmail, vendorName } = await buildPurchaseOrderInput(
    params.vendorPOId,
    params.dealerName,
    params.dealerContact
  );

  // Blank falls through to the vendor's own address, which ?? would not do.
  const typed = params.to?.trim();
  const recipient = typed && typed.length > 0 ? typed : vendorEmail;
  if (!recipient) {
    throw new Error(
      `${vendorName} has no order email on file. Add one under Settings › Vendors.`
    );
  }

  const doc = buildPurchaseOrderPdf(input);
  const fileName = purchaseOrderFileName(input.poNumber, vendorName);
  const pdfBase64 = purchaseOrderPdfBase64(doc);

  // File a copy first — this is the evidence in any later dispute.
  try {
    const blob = doc.output('blob');
    await uploadAttachment({
      organizationId: params.organizationId,
      entityType: 'vendor_po',
      entityId: params.vendorPOId,
      file: new File([blob], fileName, { type: 'application/pdf' }),
      documentType: 'quote',
      description: `Purchase order ${input.poNumber} as sent to ${vendorName}`,
    });
  } catch (error) {
    // Not fatal: failing to archive should not stop the order reaching the
    // factory, but it is worth knowing about.
    console.error('[purchaseOrderDocumentService] archiving the PO failed:', error);
  }

  const { data, error } = await supabase.functions.invoke('send-purchase-order', {
    body: {
      vendorPOId: params.vendorPOId,
      to: recipient,
      cc: params.cc,
      subject: params.subject,
      message: params.message,
      pdfBase64,
      fileName,
    },
  });

  if (error) {
    console.error('[purchaseOrderDocumentService] send failed:', error);
    throw new Error(`Could not send the purchase order: ${error.message}`);
  }

  const result = data as { success?: boolean; error?: string; emailId?: string | null; warning?: string };

  if (!result?.success) {
    throw new Error(result?.error ?? 'The purchase order was not sent.');
  }

  return {
    emailId: result.emailId ?? null,
    sentTo: recipient,
    warning: result.warning,
  };
}
