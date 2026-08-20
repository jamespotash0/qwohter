/**
 * Purchase Order PDF
 *
 * Drawn as vector text and tables rather than screenshotted from the DOM, which
 * is how the proposal exporter works. A purchase order is a tabular business
 * document a factory's order-entry clerk reads and keys from: it has to stay
 * crisp at any zoom, be selectable, and print at a sane file size. A rasterised
 * page fails all three, and a 400-line order would run to tens of megabytes.
 *
 * Every field a manufacturer needs to accept the order is present, because a PO
 * missing the dealer's account number or a ship-to address comes straight back
 * as a query and costs a day.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/pricing';

export interface POPdfVendor {
  name: string;
  accountNumber?: string | null;
  remitToName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

export interface POPdfDealer {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface POPdfShipTo {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

export interface POPdfLine {
  lineNumber: number;
  modelNumber?: string | null;
  description: string;
  optionString?: string | null;
  area?: string | null;
  quantity: number;
  unitCost: number;
  listPrice?: number | null;
  dealerDiscountPercent?: number | null;
}

export interface POPdfInput {
  poNumber: string;
  orderDate: string;
  requestedShipDate?: string | null;
  paymentTerms?: string | null;
  freightTerms?: string | null;
  /** The customer's own PO number, which some manufacturers require. */
  customerPONumber?: string | null;
  contractVehicle?: string | null;
  dealer: POPdfDealer;
  vendor: POPdfVendor;
  shipTo: POPdfShipTo;
  lines: POPdfLine[];
  notes?: string | null;
}

const MARGIN = 40;

/**
 * A value, or a placeholder when it is missing or blank. Blank matters as much
 * as null here: an empty string printed on a purchase order reads as an omission
 * a clerk has to ring about.
 */
function orDash(value: string | null | undefined, placeholder = '—'): string {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return placeholder;
  return trimmed;
}

/** Non-empty address lines, in postal order. */
function addressLines(parts: {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): string[] {
  const cityLine = [parts.city, parts.state].filter(Boolean).join(', ');
  const lastLine = [cityLine, parts.postalCode].filter(Boolean).join(' ');
  return [parts.name, parts.addressLine1, parts.addressLine2, lastLine]
    .map(line => line?.trim())
    .filter((line): line is string => !!line);
}

/**
 * Render a purchase order. Returns the document so the caller can decide
 * whether to download it, upload it, or attach it to an email.
 */
export function buildPurchaseOrderPdf(input: POPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightEdge = pageWidth - MARGIN;

  // ── Header ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PURCHASE ORDER', MARGIN, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(input.dealer.name, rightEdge, 44, { align: 'right' });
  let dealerY = 58;
  for (const line of [input.dealer.address, input.dealer.phone, input.dealer.email]) {
    if (!line) continue;
    doc.setFontSize(9);
    doc.text(line, rightEdge, dealerY, { align: 'right' });
    dealerY += 11;
  }

  doc.setDrawColor(200);
  doc.line(MARGIN, 74, rightEdge, 74);

  // ── Order facts ───────────────────────────────────────────────────────
  // A clerk keys from these, so they lead rather than sitting under the table.
  const facts: [string, string][] = [
    ['PO number', input.poNumber],
    ['Order date', input.orderDate],
    ['Requested ship', orDash(input.requestedShipDate, 'Not specified')],
    ['Account number', orDash(input.vendor.accountNumber)],
    ['Payment terms', orDash(input.paymentTerms)],
    ['Freight terms', orDash(input.freightTerms)],
  ];
  if (input.customerPONumber) facts.push(['Customer PO', input.customerPONumber]);
  if (input.contractVehicle) facts.push(['Contract', input.contractVehicle]);

  let factY = 94;
  doc.setFontSize(9);
  facts.forEach(([label, value], index) => {
    const column = index % 3;
    const x = MARGIN + column * 172;
    if (column === 0 && index > 0) factY += 26;
    doc.setTextColor(120);
    doc.text(label.toUpperCase(), x, factY);
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x, factY + 12);
    doc.setFont('helvetica', 'normal');
  });

  // ── Vendor and ship-to, side by side ──────────────────────────────────
  const blockY = factY + 40;
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text('VENDOR', MARGIN, blockY);
  doc.text('SHIP TO', MARGIN + 260, blockY);
  doc.setTextColor(20);
  doc.setFontSize(10);

  const vendorBlock = addressLines({
    name: orDash(input.vendor.remitToName, input.vendor.name),
    addressLine1: input.vendor.addressLine1,
    addressLine2: input.vendor.addressLine2,
    city: input.vendor.city,
    state: input.vendor.state,
    postalCode: input.vendor.postalCode,
  });
  const shipBlock = addressLines(input.shipTo);

  vendorBlock.forEach((line, i) => doc.text(line, MARGIN, blockY + 14 + i * 12));
  if (shipBlock.length === 0) {
    doc.setTextColor(150);
    doc.text('Not specified', MARGIN + 260, blockY + 14);
    doc.setTextColor(20);
  } else {
    shipBlock.forEach((line, i) => doc.text(line, MARGIN + 260, blockY + 14 + i * 12));
  }

  const blockHeight = Math.max(vendorBlock.length, shipBlock.length, 1) * 12;

  // ── Lines ─────────────────────────────────────────────────────────────
  // The option string goes on its own row beneath the description: it is what a
  // clerk keys to build the product, and truncating it would produce the wrong
  // item.
  const body = input.lines.flatMap(line => {
    const detail = [
      line.optionString ? `Options: ${line.optionString}` : null,
      line.area ? `Area: ${line.area}` : null,
      line.listPrice !== null &&
      line.listPrice !== undefined &&
      line.dealerDiscountPercent !== null &&
      line.dealerDiscountPercent !== undefined
        ? `List ${formatCurrency(line.listPrice)} less ${line.dealerDiscountPercent}%`
        : null,
    ]
      .filter(Boolean)
      .join('   ');

    const main = [
      `${line.lineNumber}`,
      line.modelNumber ?? '',
      line.description,
      `${line.quantity}`,
      formatCurrency(line.unitCost),
      formatCurrency(line.quantity * line.unitCost),
    ];

    return detail
      ? [main, [{ content: '', colSpan: 2 }, { content: detail, colSpan: 4, styles: { fontSize: 7.5, textColor: 110 } }]]
      : [main];
  });

  const total = input.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);

  autoTable(doc, {
    startY: blockY + blockHeight + 28,
    head: [['#', 'Model', 'Description', 'Qty', 'Unit', 'Extended']],
    body: body as unknown as string[][],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4, textColor: 20 },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 8,
      textColor: 90,
      lineWidth: { bottom: 0.75 },
      lineColor: 120,
    },
    columnStyles: {
      0: { cellWidth: 24, textColor: 130 },
      1: { cellWidth: 78 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 62, halign: 'right' },
      5: { cellWidth: 70, halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
    // Repeat the header on every page — a multi-page order is normal.
    showHead: 'everyPage',
  });

  const afterTable =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    blockY + blockHeight + 60;

  // ── Total ─────────────────────────────────────────────────────────────
  doc.setDrawColor(120);
  doc.line(rightEdge - 200, afterTable + 8, rightEdge, afterTable + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Order total', rightEdge - 200, afterTable + 24);
  doc.text(formatCurrency(total), rightEdge, afterTable + 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  if (input.notes?.trim()) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text('Notes', MARGIN, afterTable + 50);
    doc.setTextColor(20);
    doc.text(doc.splitTextToSize(input.notes.trim(), rightEdge - MARGIN), MARGIN, afterTable + 63);
  }

  // ── Page numbers ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `${input.poNumber}  ·  page ${page} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 24,
      { align: 'center' }
    );
  }

  return doc;
}

/** Filename a manufacturer will recognise in an inbox. */
export function purchaseOrderFileName(poNumber: string, vendorName: string): string {
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `PO_${safe(poNumber)}_${safe(vendorName)}.pdf`;
}

/** The PDF as a base64 string, for upload or email attachment. */
export function purchaseOrderPdfBase64(doc: jsPDF): string {
  const dataUri = doc.output('datauristring');
  return dataUri.slice(dataUri.indexOf(',') + 1);
}
