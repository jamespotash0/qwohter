/**
 * OpenAI-powered quote parsing service
 * Sends extracted text to OpenAI via Supabase Edge Function for structured data extraction
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ExtractedQuoteData,
  ParseQuoteResponse,
} from '@/lib/types/quoteImport';

interface ParseQuoteOptions {
  documentText?: string;
  base64Data?: string;
  mimeType?: string;
  fileName?: string;
  fileType?: string;
}

/**
 * Parse quote using OpenAI via Edge Function
 * Supports both text content and PDF base64 data
 */
export async function parseQuoteWithAI(
  options: ParseQuoteOptions
): Promise<ExtractedQuoteData> {
  const { documentText, base64Data, mimeType, fileName, fileType } = options;

  // For text content, truncate very long documents
  let truncatedText = documentText;
  if (documentText) {
    const MAX_TEXT_LENGTH = 15000;
    truncatedText =
      documentText.length > MAX_TEXT_LENGTH
        ? documentText.substring(0, MAX_TEXT_LENGTH) + '\n\n[Document truncated...]'
        : documentText;
  }

  const request = {
    documentText: truncatedText,
    base64Data,
    mimeType,
    fileName,
    fileType,
  };

  try {
    const { data, error } = await supabase.functions.invoke<ParseQuoteResponse>(
      'parse-quote',
      {
        body: request,
      }
    );

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Failed to parse quote: ${error.message}`);
    }

    if (!data?.success || !data.data) {
      throw new Error(data?.error || 'Failed to extract quote data');
    }

    return data.data;
  } catch (error) {
    console.error('Quote parsing error:', error);
    throw error;
  }
}

/**
 * Prompt template for OpenAI
 * This is also defined in the Edge Function, but kept here for reference
 */
export const QUOTE_EXTRACTION_PROMPT = `You are an expert at extracting structured data from quotes, estimates, and invoices for any type of project.
Extract information from the following document and return a JSON object with this exact structure.
Use null for any fields you cannot find or are uncertain about.
Do not make up or infer data that is not explicitly stated.

Return ONLY valid JSON with this structure:
{
  "client": {
    "name": string | null,
    "company": string | null,
    "email": string | null,
    "phone": string | null,
    "address": string | null
  },
  "job": {
    "location": string | null,
    "description": string | null,
    "date": string | null
  },
  "pricing": {
    "total": number | null,
    "subtotal": number | null,
    "materials": number | null,
    "labor": number | null,
    "tax": number | null,
    "lineItems": [{ "description": string, "quantity": number | null, "unitPrice": number | null, "amount": number }]
  },
  "specifications": {
    "dimensions": string | null,
    "quantity": string | null,
    "materials": string | null,
    "productType": string | null,
    "additionalSpecs": {}
  },
  "notes": string | null,
  "confidence": number
}

For the confidence field, provide a number between 0 and 1 indicating how confident you are in the overall extraction.
- 1.0 = Very confident, found most key fields
- 0.7-0.9 = Moderately confident, found some key fields
- 0.4-0.6 = Low confidence, document may not be a quote
- 0.1-0.3 = Very low confidence, could not extract meaningful data

For pricing amounts, convert all values to numbers (remove $ signs, commas).
For phone numbers, keep the original format.
For dates, use ISO format (YYYY-MM-DD) if possible, otherwise keep original format.`;

/**
 * Fallback parser for when Edge Function is unavailable
 * Uses basic regex patterns to extract common fields
 */
export function fallbackParse(text: string): Partial<ExtractedQuoteData> {
  const result: Partial<ExtractedQuoteData> = {
    client: {
      name: null,
      company: null,
      email: null,
      phone: null,
      address: null,
    },
    job: {
      location: null,
      description: null,
      date: null,
    },
    pricing: {
      total: null,
      subtotal: null,
      materials: null,
      labor: null,
      tax: null,
      lineItems: [],
    },
    specifications: {
      dimensions: null,
      quantity: null,
      materials: null,
      productType: null,
      additionalSpecs: {},
    },
    notes: null,
    confidence: 0.3,
  };

  // Email regex
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch && result.client) {
    result.client.email = emailMatch[0];
  }

  // Phone regex (various formats)
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
  if (phoneMatch && result.client) {
    result.client.phone = phoneMatch[0];
  }

  // Total amount (look for "Total" followed by currency)
  const totalMatch = text.match(/total[:\s]*\$?([\d,]+\.?\d*)/i);
  if (totalMatch?.[1] && result.pricing) {
    result.pricing.total = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Date patterns
  const dateMatch = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
  if (dateMatch && result.job) {
    result.job.date = dateMatch[0];
  }

  return result;
}
