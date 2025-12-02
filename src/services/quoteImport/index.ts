/**
 * Quote Import Service
 * Handles file upload, text extraction, and AI parsing for bulk quote import
 */

export { extractTextFromFile, validateFile, detectFileType } from './textExtractor';
export { parseQuoteWithAI, fallbackParse, QUOTE_EXTRACTION_PROMPT } from './openAIParser';
