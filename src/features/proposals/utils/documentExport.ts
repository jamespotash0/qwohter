/**
 * Document Export Utilities
 *
 * Export presentation editor content to PDF and DOCX formats.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  UnderlineType,
} from 'docx';
import type { EditorContent } from '../components/presentation/PresentationEditor';

// ============================================================================
// Types
// ============================================================================

interface ExportOptions {
  filename?: string;
  title?: string;
}

interface PdfExportOptions extends ExportOptions {
  /** Pre-resolved HTML content (bypasses editor capture) */
  resolvedHtml?: string;
  /** Page format: 'letter' (US) or 'a4' (default) */
  pageFormat?: 'letter' | 'a4';
  /** Margin in mm (default: 25.4 = 1 inch) */
  margin?: number;
}

// ============================================================================
// PDF Export
// ============================================================================

/** Page dimensions in mm */
const PAGE_DIMENSIONS = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

/**
 * Create print-ready styles for PDF export
 */
function createPrintStyles(contentWidth: number): string {
  return `
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      width: ${contentWidth}px;
      margin: 0;
      padding: 0;
      color: #333;
      font-size: 14px;
      line-height: 1.6;
      background: white;
    }
    h1 { font-size: 24px; font-weight: bold; margin: 0 0 16px 0; }
    h2 { font-size: 20px; font-weight: 600; margin: 0 0 12px 0; }
    h3 { font-size: 16px; font-weight: 500; margin: 0 0 8px 0; }
    p { margin: 0 0 12px 0; }
    ul { list-style-type: disc; padding-left: 24px; margin: 12px 0; }
    ol { list-style-type: decimal; padding-left: 24px; margin: 12px 0; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    blockquote { border-left: 4px solid #d1d5db; padding-left: 16px; margin: 16px 0; font-style: italic; }
    a { color: #2563eb; text-decoration: underline; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .page-break { page-break-before: always; height: 0; }
  `;
}

/**
 * Export resolved HTML content to PDF.
 * Creates a temporary container, renders the HTML, and captures it.
 */
export async function exportToPdf(
  editorElement: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    resolvedHtml,
    pageFormat = 'letter',
    margin = 25.4, // 1 inch default margin
  } = options;

  const pageDims = PAGE_DIMENSIONS[pageFormat];
  const contentWidthMm = pageDims.width - (margin * 2);
  const contentHeightMm = pageDims.height - (margin * 2);

  // Convert mm to px (at 96 DPI: 1mm ≈ 3.78px, but we use scale 2 for quality)
  const mmToPx = 3.78;
  const contentWidthPx = contentWidthMm * mmToPx;

  let contentElement: HTMLElement;
  let tempContainer: HTMLElement | null = null;

  if (resolvedHtml) {
    // Create temporary container for resolved HTML
    tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: ${contentWidthPx}px;
      background: white;
      padding: 0;
      margin: 0;
    `;

    // Add styles and content
    const styleElement = document.createElement('style');
    styleElement.textContent = createPrintStyles(contentWidthPx);
    tempContainer.appendChild(styleElement);

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = resolvedHtml;
    tempContainer.appendChild(contentDiv);

    document.body.appendChild(tempContainer);

    // Force layout calculation
    tempContainer.offsetHeight;

    contentElement = contentDiv;
  } else {
    // Fallback: capture from editor element directly
    const tiptapElement = editorElement.querySelector('.tiptap') as HTMLElement;
    if (!tiptapElement) {
      throw new Error('Editor content not found');
    }
    contentElement = tiptapElement;
  }

  try {
    // Capture the content as a canvas with high resolution
    const canvas = await html2canvas(contentElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: contentWidthPx,
      windowWidth: contentWidthPx,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageFormat,
    });

    // Calculate image dimensions to fit content width
    const imgWidth = contentWidthMm;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png', 1.0);

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    heightLeft -= contentHeightMm;

    // Add additional pages if content is longer than one page
    while (heightLeft > 0) {
      position -= contentHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position + margin, imgWidth, imgHeight);
      heightLeft -= contentHeightMm;
    }

    // Download the PDF
    pdf.save(filename);
  } finally {
    // Clean up temporary container
    if (tempContainer && document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}

// ============================================================================
// DOCX Export
// ============================================================================

/**
 * Convert Tiptap JSON content to DOCX format.
 */
export async function exportToDocx(
  content: EditorContent,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'document.docx', title = 'Document' } = options;

  // Convert Tiptap content to docx elements
  const children = convertTiptapToDocx(content);

  // Create the document
  const doc = new Document({
    title,
    creator: 'Qwohter Form Builder',
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate and download the file
  const buffer = await Packer.toBlob(doc);
  downloadBlob(buffer, filename);
}

/**
 * Convert Tiptap JSON content to docx elements.
 */
function convertTiptapToDocx(content: EditorContent): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  if (!content.content) {
    return elements;
  }

  for (const node of content.content) {
    switch (node.type) {
      case 'paragraph':
        elements.push(convertParagraph(node));
        break;
      case 'heading':
        elements.push(convertHeading(node));
        break;
      case 'bulletList':
      case 'orderedList':
        elements.push(...convertList(node));
        break;
      case 'blockquote':
        elements.push(...convertBlockquote(node));
        break;
      case 'table':
        elements.push(convertTable(node));
        break;
      case 'horizontalRule':
        elements.push(
          new Paragraph({
            thematicBreak: true,
          })
        );
        break;
      default:
        // Try to extract text from unknown nodes
        if (node.content) {
          elements.push(convertParagraph(node));
        }
    }
  }

  return elements;
}

/**
 * Convert a paragraph node to a docx Paragraph.
 */
function convertParagraph(node: EditorContent): Paragraph {
  const children = extractTextRuns(node);
  const alignment = getAlignment(node.attrs?.textAlign as string);

  return new Paragraph({
    children,
    alignment,
  });
}

/**
 * Convert a heading node to a docx Paragraph with heading level.
 */
function convertHeading(node: EditorContent): Paragraph {
  const children = extractTextRuns(node);
  const level = (node.attrs?.level as number) || 1;
  const alignment = getAlignment(node.attrs?.textAlign as string);

  const headingLevel = level === 1
    ? HeadingLevel.HEADING_1
    : level === 2
      ? HeadingLevel.HEADING_2
      : HeadingLevel.HEADING_3;

  return new Paragraph({
    children,
    heading: headingLevel,
    alignment,
  });
}

/**
 * Convert a list to docx Paragraphs with bullet/number formatting.
 */
function convertList(node: EditorContent): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const isOrdered = node.type === 'orderedList';

  if (node.content) {
    node.content.forEach((item, index) => {
      if (item.type === 'listItem' && item.content) {
        for (const childNode of item.content) {
          const children = extractTextRuns(childNode);
          paragraphs.push(
            new Paragraph({
              children,
              bullet: isOrdered ? undefined : { level: 0 },
              numbering: isOrdered
                ? { reference: 'default-numbering', level: 0 }
                : undefined,
            })
          );
        }
      }
    });
  }

  return paragraphs;
}

/**
 * Convert a blockquote to docx Paragraphs with indentation.
 */
function convertBlockquote(node: EditorContent): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (node.content) {
    for (const childNode of node.content) {
      const children = extractTextRuns(childNode);
      paragraphs.push(
        new Paragraph({
          children,
          indent: { left: 720 }, // 0.5 inch indent
        })
      );
    }
  }

  return paragraphs;
}

/**
 * Convert a table node to a docx Table.
 */
function convertTable(node: EditorContent): Table {
  const rows: TableRow[] = [];

  if (node.content) {
    for (const rowNode of node.content) {
      if (rowNode.type === 'tableRow' && rowNode.content) {
        const cells: TableCell[] = [];

        for (const cellNode of rowNode.content) {
          const isHeader = cellNode.type === 'tableHeader';
          const children: Paragraph[] = [];

          if (cellNode.content) {
            for (const contentNode of cellNode.content) {
              children.push(convertParagraph(contentNode));
            }
          } else {
            children.push(new Paragraph({}));
          }

          cells.push(
            new TableCell({
              children,
              shading: isHeader ? { fill: 'f0f0f0' } : undefined,
            })
          );
        }

        rows.push(new TableRow({ children: cells }));
      }
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Extract TextRun elements from a node's content.
 */
function extractTextRuns(node: EditorContent): TextRun[] {
  const runs: TextRun[] = [];

  if (node.text) {
    runs.push(createTextRun(node.text, node.marks));
  }

  if (node.content) {
    for (const child of node.content) {
      if (child.type === 'text' && child.text) {
        runs.push(createTextRun(child.text, child.marks));
      } else if (child.type === 'variable' && child.attrs) {
        // Handle variable nodes - use the label
        const label = (child.attrs.variableLabel as string) || `{${child.attrs.variableKey}}`;
        runs.push(
          new TextRun({
            text: label,
            highlight: 'yellow',
          })
        );
      } else if (child.content) {
        runs.push(...extractTextRuns(child));
      }
    }
  }

  return runs;
}

/**
 * Create a TextRun with appropriate formatting from marks.
 */
function createTextRun(
  text: string,
  marks?: { type: string; attrs?: Record<string, unknown> }[]
): TextRun {
  let bold = false;
  let italic = false;
  let underline: { type: typeof UnderlineType } | undefined;
  let strike = false;
  let color: string | undefined;
  let highlight: string | undefined;
  let fontFamily: string | undefined;
  let fontSize: number | undefined;

  if (marks) {
    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          bold = true;
          break;
        case 'italic':
          italic = true;
          break;
        case 'underline':
          underline = { type: UnderlineType.SINGLE };
          break;
        case 'strike':
          strike = true;
          break;
        case 'textStyle':
          if (mark.attrs?.color) {
            color = (mark.attrs.color as string).replace('#', '');
          }
          if (mark.attrs?.fontFamily) {
            fontFamily = mark.attrs.fontFamily as string;
          }
          if (mark.attrs?.fontSize) {
            const sizeStr = mark.attrs.fontSize as string;
            const sizeMatch = sizeStr.match(/^(\d+)/);
            if (sizeMatch) {
              fontSize = parseInt(sizeMatch[1], 10) * 2; // docx uses half-points
            }
          }
          break;
        case 'highlight':
          if (mark.attrs?.color) {
            highlight = 'yellow'; // Simplify to yellow for now
          }
          break;
        case 'link':
          underline = { type: UnderlineType.SINGLE };
          color = '0000EE';
          break;
      }
    }
  }

  return new TextRun({
    text,
    bold,
    italics: italic,
    underline,
    strike,
    color,
    highlight,
    font: fontFamily,
    size: fontSize,
  });
}

/**
 * Get alignment type from text align string.
 */
function getAlignment(textAlign?: string): AlignmentType | undefined {
  switch (textAlign) {
    case 'left':
      return AlignmentType.LEFT;
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return undefined;
  }
}

/**
 * Download a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
