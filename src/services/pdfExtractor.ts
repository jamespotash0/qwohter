/**
 * PDF Text Extraction Service
 * Uses pdf.js to extract text content from PDF files
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker - use local copy in public folder with version for cache busting
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.5.4.449.min.mjs';

/**
 * Extract text content from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Promise<string> - The extracted text content
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  console.log('=== PDF Text Extraction ===');
  console.log('Starting PDF text extraction for:', file.name);

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('PDF loaded as ArrayBuffer, size:', arrayBuffer.byteLength);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdf.numPages);

    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items with proper spacing
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');

      textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
      console.log(`Page ${pageNum}: extracted ${pageText.length} characters`);
    }

    const fullText = textParts.join('\n\n');
    console.log('Total extracted text length:', fullText.length);
    console.log('Text preview (first 500 chars):', fullText.substring(0, 500));

    if (fullText.trim().length === 0) {
      throw new Error('PDF appears to be scanned/image-based with no extractable text. OCR is required.');
    }

    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
