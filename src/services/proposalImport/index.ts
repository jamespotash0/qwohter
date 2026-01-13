/**
 * Proposal Import Service
 * Handles file upload, text extraction, and AI parsing for bulk proposal import
 */

export { extractTextFromFile, validateFile, detectFileType } from './textExtractor';
export { parseProposalWithAI, fallbackParse, PROPOSAL_EXTRACTION_PROMPT } from './openAIParser';
