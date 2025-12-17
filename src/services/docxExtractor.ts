/**
 * DOCX Text Extraction Service
 * Uses mammoth.js to extract text content from Word documents
 */

import mammoth from 'mammoth';

/**
 * Extract text content from a DOCX file
 * @param file - The DOCX file to extract text from
 * @returns Promise<string> - The extracted text content
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  console.log('=== DOCX Text Extraction ===');
  console.log('Starting DOCX text extraction for:', file.name);

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('DOCX loaded as ArrayBuffer, size:', arrayBuffer.byteLength);

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    console.log('DOCX extraction complete');
    console.log('Total extracted text length:', text.length);
    console.log('Text preview (first 500 chars):', text.substring(0, 500));

    // Log any warnings
    if (result.messages.length > 0) {
      console.log('Mammoth warnings:', result.messages);
    }

    if (text.trim().length === 0) {
      throw new Error('DOCX appears to be empty or contains only images without extractable text.');
    }

    return text;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Check if a file is a DOCX document
 */
export function isDocx(file: File): boolean {
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx')
  );
}
