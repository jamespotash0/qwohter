//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ParseQuoteRequest {
  documentText?: string;
  fileName?: string;
  fileType?: string;
}

interface ExtractedClient {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface ExtractedJob {
  proposalNumber: string | null;
  date: string | null;
  location: string | null;
}

interface ExtractedLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

interface ExtractedPricing {
  total: number | null;
  subtotal: number | null;
  materials: number | null;
  labor: number | null;
  tax: number | null;
  lineItems: ExtractedLineItem[];
}

interface ExtractedSpecifications {
  dimensions: string | null;
  quantity: string | null;
  materials: string | null;
  productType: string | null;
  additionalSpecs: Record<string, string>;
}

// Generic product specification - supports any product type with flexible nested specs
interface ExtractedProductSpec {
  // Core identifiers
  name: string;                           // Product name/identifier (e.g., "Wall A", "Conference Table 1", "HVAC Unit 1")
  productType: string | null;             // Type of product (e.g., "Operable Wall", "Office Chair", "Air Handler")
  manufacturer: string | null;            // Manufacturer/brand name
  model: string | null;                   // Model number
  series: string | null;                  // Series/line
  sku: string | null;                     // SKU or part number

  // Quantities & Pricing
  quantity: string | null;
  unitPrice: number | null;
  totalPrice: number | null;

  // Dimensions (flexible - can be used for any product)
  dimensions: {
    height: string | null;
    width: string | null;
    length: string | null;
    depth: string | null;
    area: string | null;
    weight: string | null;
  } | null;

  // All other specifications as flexible key-value pairs
  // This allows any product-specific specs to be captured
  specifications: Record<string, any>;

  // For complex nested specifications (e.g., wall seals, door configs, furniture options)
  components: Record<string, any> | null;

  // Notes specific to this product
  notes: string | null;
}

interface ExtractedProducts {
  items: ExtractedProductSpec[];
}

interface ExtractedQuoteData {
  client: ExtractedClient;
  job: ExtractedJob;
  pricing: ExtractedPricing;
  specifications: ExtractedSpecifications;  // Legacy/summary specs
  products: ExtractedProducts;              // Detailed product breakdown
  notes: string | null;
  confidence: number;
}

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from quotes, estimates, proposals, and invoices for ANY type of project or industry (construction, furniture, flooring, walls, HVAC, IT services, landscaping, etc.).

Your job is to carefully read the document and extract as much relevant information as possible.
Adapt your extraction based on what type of project/service the document describes.

Extract information from the following document and return a JSON object with the structure shown below.
Use null for any fields you cannot find or are uncertain about.
Do NOT make up or guess data that is not explicitly stated in the document.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "client": {
    "name": "string or null - the client/customer name",
    "company": "string or null - client company name",
    "email": "string or null - client email address",
    "phone": "string or null - client phone number (keep original format)",
    "address": "string or null - client address"
  },
  "job": {
    "proposalNumber": "string or null - the quote/proposal/estimate number (e.g., 'Q-2024-001', 'EST-1234', 'Proposal #567')",
    "date": "string or null - quote date or proposal date (use YYYY-MM-DD format if possible)",
    "location": "string or null - job site location/address if different from client address"
  },
  "pricing": {
    "total": "number or null - total/grand total amount (remove $ and commas)",
    "subtotal": "number or null - subtotal before tax",
    "materials": "number or null - materials cost if itemized",
    "labor": "number or null - labor cost if itemized",
    "tax": "number or null - tax amount if shown",
    "lineItems": [
      {
        "description": "string - line item description",
        "quantity": "number or null",
        "unitPrice": "number or null",
        "amount": "number - line total"
      }
    ]
  },
  "specifications": {
    "dimensions": "string or null - overall project dimensions/area",
    "quantity": "string or null - total quantity summary",
    "materials": "string or null - primary materials summary",
    "productType": "string or null - main product/service type",
    "additionalSpecs": "object - other high-level specs as key-value pairs"
  },
  "products": {
    "items": [
      {
        "name": "string - product identifier (e.g., 'Wall A', 'Conference Table 1', 'HVAC Unit 1', 'Workstation Set 1')",
        "productType": "string or null - type (e.g., 'Operable Wall', 'Office Chair', 'Air Handler', 'Demountable Partition')",
        "manufacturer": "string or null - brand/manufacturer name",
        "model": "string or null - model number",
        "series": "string or null - product series/line",
        "sku": "string or null - SKU or part number",
        "quantity": "string or null - quantity of this item",
        "unitPrice": "number or null - price per unit",
        "totalPrice": "number or null - total price for this item",
        "dimensions": {
          "height": "string or null - e.g., '8ft 4in' or '96 inches'",
          "width": "string or null",
          "length": "string or null - e.g., '38ft 5in'",
          "depth": "string or null",
          "area": "string or null - e.g., '500 sq ft'",
          "weight": "string or null"
        },
        "specifications": {
          "// For WALLS/PARTITIONS - include relevant fields like:": "",
          "panelCount": "string - number of panels",
          "panelThickness": "string - e.g., '4 inch'",
          "panelSkin": "string - e.g., 'Standard Steel Skin'",
          "panelConfiguration": "string - e.g., 'Individual Panels'",
          "panelFinishCategory": "string - e.g., 'Koroseal Standard Vinyl'",
          "panelFinishSpecificItem": "string - specific color/finish",
          "topSeals": "string - e.g., 'Fixed'",
          "bottomSeals": "string - e.g., 'Operable'",
          "verticalSeals": "string - e.g., 'Trimless Astragal'",
          "trackType": "string - e.g., 'Multi-Directional Track'",
          "trackSystem": "string - full track description",
          "structureSupport": "string - e.g., 'Pre-Drilled Steel Beam'",
          "stcRating": "string - e.g., '52'",
          "// For FURNITURE - include relevant fields like:": "",
          "material": "string - e.g., 'Oak', 'Leather'",
          "color": "string",
          "finish": "string - e.g., 'Matte', 'Glossy'",
          "upholstery": "string",
          "armStyle": "string",
          "baseType": "string",
          "// For HVAC - include relevant fields like:": "",
          "btuCapacity": "string",
          "seerRating": "string",
          "tonnage": "string",
          "refrigerantType": "string",
          "// Add ANY other specs found as key-value pairs": ""
        },
        "components": {
          "// For complex sub-components, nest them here:": "",
          "passDoors": {
            "type": "string - e.g., 'Single', 'Double'",
            "quantity": "string"
          },
          "pocketDoors": {
            "foldType": "string",
            "foldStyle": "string"
          },
          "closureSystem": {
            "initial": "string - e.g., 'Bulb Seal'",
            "final": "string - e.g., 'Expander Panel'"
          }
        },
        "notes": "string or null - notes specific to this product"
      }
    ]
  },
  "notes": "string or null - any additional relevant notes, terms, or conditions",
  "confidence": "number between 0 and 1 indicating extraction confidence"
}

PRODUCT EXTRACTION RULES:
- Extract EACH distinct product/item as a separate entry in the products.items array
- Name products descriptively: "Wall A", "Wall B" for walls; "Desk 1", "Chair Set" for furniture; "Rooftop Unit 1" for HVAC
- Put ALL product-specific specifications in the "specifications" object as key-value pairs
- Use "components" for nested sub-items (doors, accessories, options)
- Include pricing per product when available
- Preserve the hierarchical structure of specifications (e.g., panel specs, seal types, finishes)

CONFIDENCE GUIDELINES:
- 0.8-1.0: Found client info AND pricing total - definitely a quote/invoice
- 0.6-0.79: Found either client info OR pricing - likely a quote
- 0.4-0.59: Found some relevant data but missing key fields
- 0.2-0.39: Document may not be a quote, limited data found
- 0.0-0.19: Could not extract meaningful quote data

IMPORTANT RULES:
1. For pricing, convert all amounts to numbers (remove $, commas, etc.)
2. For phone numbers, keep the original format
3. Look for common patterns: "Bill To", "Sold To", "Client", "Customer", "Total", "Grand Total", etc.
4. Look for proposal/quote numbers near the top - patterns like "Quote #", "Proposal No.", "Estimate #", "Invoice #", etc.
5. Look for dates near the proposal number or at the top of the document
6. If you see line items, extract them as separate products with full specifications
7. Be conservative - only extract what you're confident about
8. Adapt the specifications fields based on the product type (walls, furniture, HVAC, etc.)
9. Preserve manufacturer-specific terminology and specifications
10. If a product has options or configurations, capture them in the specifications or components`;

//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Get OpenAI API key from environment
    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const requestData: ParseQuoteRequest = await req.json();
    const { documentText, fileName, fileType } = requestData;

    // Validate - need documentText
    if (!documentText || documentText.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No document content provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build context for the AI
    let context = '';
    if (fileName) {
      context += `File name: ${fileName}\n`;
    }
    if (fileType) {
      context += `File type: ${fileType}\n`;
    }

    // Use GPT-4o-mini for text content extraction
    const userPrompt = `${context ? context + '\n' : ''}DOCUMENT CONTENT:\n${documentText}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: EXTRACTION_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error', details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices?.[0]?.message?.content || '';

    // Clean up response (remove markdown if present)
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse AI response
    let extractedData: ExtractedQuoteData;
    try {
      extractedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse AI response',
          raw: cleanedResponse
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate and sanitize the response
    const sanitizedData: ExtractedQuoteData = {
      client: {
        name: extractedData.client?.name || null,
        company: extractedData.client?.company || null,
        email: extractedData.client?.email || null,
        phone: extractedData.client?.phone || null,
        address: extractedData.client?.address || null,
      },
      job: {
        proposalNumber: extractedData.job?.proposalNumber || null,
        date: extractedData.job?.date || null,
        location: extractedData.job?.location || null,
      },
      pricing: {
        total: typeof extractedData.pricing?.total === 'number' ? extractedData.pricing.total : null,
        subtotal: typeof extractedData.pricing?.subtotal === 'number' ? extractedData.pricing.subtotal : null,
        materials: typeof extractedData.pricing?.materials === 'number' ? extractedData.pricing.materials : null,
        labor: typeof extractedData.pricing?.labor === 'number' ? extractedData.pricing.labor : null,
        tax: typeof extractedData.pricing?.tax === 'number' ? extractedData.pricing.tax : null,
        lineItems: Array.isArray(extractedData.pricing?.lineItems)
          ? extractedData.pricing.lineItems.filter(item =>
              item && typeof item.description === 'string' && typeof item.amount === 'number'
            )
          : [],
      },
      specifications: {
        dimensions: extractedData.specifications?.dimensions || null,
        quantity: extractedData.specifications?.quantity || null,
        materials: extractedData.specifications?.materials || null,
        productType: extractedData.specifications?.productType || null,
        additionalSpecs: typeof extractedData.specifications?.additionalSpecs === 'object'
          && extractedData.specifications?.additionalSpecs !== null
          ? extractedData.specifications.additionalSpecs
          : {},
      },
      products: {
        items: Array.isArray(extractedData.products?.items)
          ? extractedData.products.items.map((item: any) => ({
              name: item.name || 'Unnamed Product',
              productType: item.productType || null,
              manufacturer: item.manufacturer || null,
              model: item.model || null,
              series: item.series || null,
              sku: item.sku || null,
              quantity: item.quantity || null,
              unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : null,
              totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : null,
              dimensions: item.dimensions && typeof item.dimensions === 'object' ? {
                height: item.dimensions.height || null,
                width: item.dimensions.width || null,
                length: item.dimensions.length || null,
                depth: item.dimensions.depth || null,
                area: item.dimensions.area || null,
                weight: item.dimensions.weight || null,
              } : null,
              specifications: typeof item.specifications === 'object' && item.specifications !== null
                ? item.specifications
                : {},
              components: typeof item.components === 'object' && item.components !== null
                ? item.components
                : null,
              notes: item.notes || null,
            }))
          : [],
      },
      notes: extractedData.notes || null,
      confidence: typeof extractedData.confidence === 'number'
        ? Math.min(1, Math.max(0, extractedData.confidence))
        : 0.5,
    };

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: sanitizedData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in parse-quote function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
