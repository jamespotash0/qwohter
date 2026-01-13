/**
 * Text extraction utilities for proposal import
 * Supports PDF, DOCX, CSV, and TXT files
 * Uses pdf.js for PDF text extraction
 */

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextExtractionResult, ImportFileType } from '@/lib/types/proposalImport';

// Configure pdf.js worker - use unpkg CDN for v5.4.149
pdfjsLib.GlobalWorkerOptions.workerSrc = '//unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs';

/**
 * Detect file type from file extension
 */
export function detectFileType(file: File): ImportFileType | null {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'csv':
      return 'csv';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

/**
 * Convert file to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const parts = result.split(',');
      const base64 = (parts.length > 1 ? parts[1] : result) ?? result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from PDF using pdf.js
 * Extracts text from all pages and concatenates them
 */
async function extractFromPDF(file: File): Promise<TextExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      textParts.push(pageText);
    }

    const fullText = textParts.join('\n\n--- Page Break ---\n\n').trim();
    const meaningfulText = fullText.replace(/[\s\n\r]+/g, '').length;

    // Calculate confidence based on extracted text quality
    let confidence = 0.9;
    if (meaningfulText < 50) {
      confidence = 0.3; // Very little text - might be scanned/image PDF
    } else if (meaningfulText < 200) {
      confidence = 0.6;
    }

    return {
      text: fullText,
      method: 'direct',
      pageCount: numPages,
      confidence,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(
      `Failed to extract text from PDF. The file may be corrupted or password-protected.`
    );
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
async function extractFromDOCX(file: File): Promise<TextExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  const text = result.value;
  const meaningfulText = text.replace(/[\s\n\r]+/g, '').length;
  const confidence = meaningfulText > 50 ? 0.95 : meaningfulText > 10 ? 0.6 : 0.2;

  return {
    text: text.trim(),
    method: 'direct',
    confidence,
  };
}

/**
 * Extract text from CSV file
 */
async function extractFromCSV(file: File): Promise<TextExtractionResult> {
  const text = await file.text();

  // Parse CSV and convert to readable text
  const lines = text.split('\n').filter(line => line.trim());
  const rows = lines.map(line => {
    // Handle quoted fields and commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  });

  // Format as readable text
  let formattedText = '';
  const headers = rows[0] || [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const entries = row.map((value, index) => {
      const header = headers[index] || `Column ${index + 1}`;
      return `${header}: ${value}`;
    }).filter(entry => !entry.endsWith(': '));

    if (entries.length > 0) {
      formattedText += entries.join('\n') + '\n---\n';
    }
  }

  return {
    text: formattedText.trim() || text.trim(),
    method: 'direct',
    confidence: 0.9,
  };
}

/**
 * Extract text from TXT file
 */
async function extractFromTXT(file: File): Promise<TextExtractionResult> {
  const text = await file.text();

  return {
    text: text.trim(),
    method: 'direct',
    confidence: 1.0,
  };
}

/**
 * Main extraction function - routes to appropriate extractor based on file type
 */
export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  const fileType = detectFileType(file);

  if (!fileType) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  try {
    switch (fileType) {
      case 'pdf':
        return await extractFromPDF(file);
      case 'docx':
        return await extractFromDOCX(file);
      case 'csv':
        return await extractFromCSV(file);
      case 'txt':
        return await extractFromTXT(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Text extraction failed for ${file.name}:`, error);
    throw new Error(
      `Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate file size and type before extraction
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is 10MB, but file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  const fileType = detectFileType(file);
  if (!fileType) {
    return {
      valid: false,
      error: `Unsupported file type. Please upload a PDF, DOCX, CSV, or TXT file.`,
    };
  }

  return { valid: true };
}
