import { describe, it, expect } from 'vitest';
import { buildPurchaseOrderPdf, purchaseOrderFileName, purchaseOrderPdfBase64 } from '@/lib/pdf/purchaseOrder';

const input = {
  poNumber: 'PO-2001',
  orderDate: '10/01/2026',
  requestedShipDate: '2026-10-01',
  paymentTerms: 'Net 30',
  freightTerms: 'FOB Origin',
  customerPONumber: 'LHS-2026-441',
  contractVehicle: 'GSA',
  dealer: { name: 'QA Dealer', address: '1 Main St', phone: '555-0100', email: 'po@dealer.test' },
  vendor: { name: 'Steelcase', accountNumber: 'ACC-9931', remitToName: 'Steelcase Inc', addressLine1: '901 44th St SE', city: 'Grand Rapids', state: 'MI', postalCode: '49508' },
  shipTo: { name: 'Lincoln HS', addressLine1: '200 School Rd', city: 'Springfield', state: 'IL', postalCode: '62704' },
  lines: Array.from({ length: 60 }, (_, i) => ({
    lineNumber: i + 1,
    modelNumber: '453A-5S2',
    description: `Series 1 Task Chair variant ${i + 1}`,
    optionString: '5S2-6205/6249-ARM-ADJ',
    area: 'Level 3 Open Plan',
    quantity: 10,
    unitCost: 420,
    listPrice: 1000,
    dealerDiscountPercent: 58,
  })),
  notes: 'Deliver to dock 7. COI on file.',
};

describe('purchase order PDF', () => {
  it('renders a multi-page document', () => {
    const doc = buildPurchaseOrderPdf(input);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('produces a real PDF, not an empty shell', () => {
    const b64 = purchaseOrderPdfBase64(buildPurchaseOrderPdf(input));
    const bytes = Buffer.from(b64, 'base64');
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(5000);
  });

  it('stays small enough to email — a rasterised page would not', () => {
    const bytes = Buffer.from(purchaseOrderPdfBase64(buildPurchaseOrderPdf(input)), 'base64');
    expect(bytes.length).toBeLessThan(400_000);
  });

  it('handles a single line and a missing ship-to without throwing', () => {
    const doc = buildPurchaseOrderPdf({
      ...input,
      shipTo: {},
      notes: null,
      lines: [{ lineNumber: 1, description: 'One item', quantity: 1, unitCost: 10 }],
    });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('builds a filename a factory can recognise', () => {
    expect(purchaseOrderFileName('PO-2001', 'Steelcase Inc.')).toBe('PO_PO-2001_Steelcase_Inc..pdf');
  });
});
