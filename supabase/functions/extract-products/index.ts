//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExtractProductsRequest {
  documentText: string;
  fileName?: string;
}

interface ExtractedProduct {
  manufacturer: string | null;
  productType: string | null;
  productCategory: string | null;
  series: string | null;
  model: string | null;

  name: string;
  quantity: string | null;
  unit: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;

  dimensions: {
    height: string | null;
    width: string | null;
    length: string | null;
    thickness: string | null;
  };

  performanceRatings: {
    stc: number | null;
    fireRating: string | null;
    acousticRating: string | null;
  };

  appearance: {
    color: string | null;
    finish: string | null;
    trim: string | null;
  };

  materials: {
    core: string | null;
    face: string | null;
    frame: string | null;
  };

  certifications: string[];
  specifications: Record<string, any>;
  description: string | null;
}

interface ExtractProductsResponse {
  success: boolean;
  data?: {
    products: ExtractedProduct[];
    summary?: string;
  };
  error?: string;
}

serve(async (req: { method: string; json: () => ExtractProductsRequest | PromiseLike<ExtractProductsRequest>; }) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentText, fileName }: ExtractProductsRequest = await req.json()

    if (!documentText) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Document text is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Get OpenAI API key from environment
    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Product extraction prompt
    const systemPrompt = `
You are an expert product catalog and construction-materials data extraction engine.

Your task is to extract structured, normalized product data from unstructured documents
(spec sheets, proposals, submittals, invoices, line items, PDFs, emails).

Your output MUST support cascading dropdowns and CPQ product modeling.

────────────────────────────────────────────
EXTRACTION GOAL
────────────────────────────────────────────
For each distinct product mentioned, infer and extract the most complete hierarchy possible:

Manufacturer → Product Type → Product Category → Series → Model

Then extract all relevant attributes and pricing information.

You may infer missing hierarchy levels when they are strongly implied.
If a hierarchy level cannot be determined, return null for that field.

────────────────────────────────────────────
REQUIRED OUTPUT STRUCTURE
────────────────────────────────────────────
Return a JSON object with the following structure:

{
  "products": [
    {
      "manufacturer": "string | null",
      "productType": "string | null",
      "productCategory": "string | null",
      "series": "string | null",
      "model": "string | null",

      "name": "Human-readable product name",
      "quantity": "string",
      "unit": "string",
      "unitPrice": number | null,
      "totalPrice": number | null,

      "dimensions": {
        "height": "string | null",
        "width": "string | null",
        "length": "string | null",
        "thickness": "string | null"
      },

      "performanceRatings": {
        "stc": number | null,
        "fireRating": "string | null",
        "acousticRating": "string | null"
      },

      "appearance": {
        "color": "string | null",
        "finish": "string | null",
        "trim": "string | null"
      },

      "materials": {
        "core": "string | null",
        "face": "string | null",
        "frame": "string | null"
      },

      "certifications": ["UL", "ASTM", "LEED", "..."],

      "specifications": {
        "key": "value"
      },

      "description": "Full descriptive text synthesized from the source"
    }
  ],

  "summary": "Brief description of the extracted catalog data"
}

────────────────────────────────────────────
EXTRACTION RULES
────────────────────────────────────────────
1. Extract ALL products, even if incomplete
2. Default quantity to "1" and unit to "ea" if missing
3. Normalize units (ft, sqft, in, mm, ea, pcs)
4. Preserve manufacturer terminology and model numbers exactly
5. Do NOT invent specs — infer only when clearly implied
6. Prefer structured fields over description text
7. If multiple variants appear, create separate product entries
8. Assume construction and architectural domain unless stated otherwise

────────────────────────────────────────────
DOMAIN INTELLIGENCE
────────────────────────────────────────────
- Walls, doors, panels, partitions, glazing, furniture, and finishes may have
  performance ratings such as STC, fire rating, or acoustic values.
- Series typically groups models under a manufacturer.
- Model is the most specific purchasable configuration.

Your output will be consumed by a CPQ system and MUST be deterministic, structured,
and suitable for dropdown-based product selection.

────────────────────────────────────────────
EXAMPLES
────────────────────────────────────────────

EXAMPLE 1 - Simple Product:
Input: "50 boxes of 2x4 screws, $12.50 per box"

Output:
{
  "products": [
    {
      "manufacturer": null,
      "productType": "Fasteners",
      "productCategory": "Screws",
      "series": null,
      "model": "2x4",
      "name": "2x4 Screws",
      "quantity": "50",
      "unit": "box",
      "unitPrice": 12.50,
      "totalPrice": 625.00,
      "dimensions": { "height": null, "width": null, "length": null, "thickness": null },
      "performanceRatings": { "stc": null, "fireRating": null, "acousticRating": null },
      "appearance": { "color": null, "finish": null, "trim": null },
      "materials": { "core": null, "face": null, "frame": null },
      "certifications": [],
      "specifications": {},
      "description": "Standard construction screws, 2x4 size"
    }
  ],
  "summary": "Extracted 1 fastener product"
}

EXAMPLE 2 - Complex Construction Product:
Input: "ModernFold Acousti-Clear 924 series, model AC-924-48-STC52, 48\" wide demountable glass partition with aluminum frame, clear tempered glass, STC 52 rating, 2-hour fire rating, brushed aluminum finish. Quantity: 15 panels @ $2,850/panel"

Output:
{
  "products": [
    {
      "manufacturer": "ModernFold",
      "productType": "Partitions",
      "productCategory": "Glass Partitions",
      "series": "Acousti-Clear 924",
      "model": "AC-924-48-STC52",
      "name": "ModernFold Acousti-Clear 924 Glass Partition",
      "quantity": "15",
      "unit": "ea",
      "unitPrice": 2850.00,
      "totalPrice": 42750.00,
      "dimensions": {
        "height": null,
        "width": "48 in",
        "length": null,
        "thickness": null
      },
      "performanceRatings": {
        "stc": 52,
        "fireRating": "2-hour",
        "acousticRating": "STC 52"
      },
      "appearance": {
        "color": "Clear",
        "finish": "Brushed Aluminum",
        "trim": "Aluminum Frame"
      },
      "materials": {
        "core": null,
        "face": "Tempered Glass",
        "frame": "Aluminum"
      },
      "certifications": [],
      "specifications": {
        "demountable": "Yes",
        "glassType": "Clear Tempered"
      },
      "description": "48-inch wide demountable glass partition with aluminum frame, clear tempered glass, STC 52 rating, 2-hour fire rating, brushed aluminum finish"
    }
  ],
  "summary": "Extracted 1 high-performance glass partition with acoustic and fire ratings"
}

EXAMPLE 3 - Multiple Products from Invoice:
Input:
"Line 1: Steelcase Flex Height-Adjustable Desk, 60x30, Walnut top - Qty 10 @ $1,245
Line 2: Herman Miller Aeron Chair, Size B, Graphite - Qty 10 @ $1,495
Line 3: 3M Privacy Screen 24\" - Qty 10 @ $89.99"

Output:
{
  "products": [
    {
      "manufacturer": "Steelcase",
      "productType": "Furniture",
      "productCategory": "Desks",
      "series": "Flex",
      "model": "Height-Adjustable 60x30",
      "name": "Steelcase Flex Height-Adjustable Desk",
      "quantity": "10",
      "unit": "ea",
      "unitPrice": 1245.00,
      "totalPrice": 12450.00,
      "dimensions": {
        "height": "Adjustable",
        "width": "60 in",
        "length": "30 in",
        "thickness": null
      },
      "performanceRatings": { "stc": null, "fireRating": null, "acousticRating": null },
      "appearance": {
        "color": "Walnut",
        "finish": "Wood Top",
        "trim": null
      },
      "materials": { "core": null, "face": "Walnut", "frame": null },
      "certifications": [],
      "specifications": {
        "adjustable": "Height-Adjustable"
      },
      "description": "Height-adjustable desk with walnut top, 60x30 inches"
    },
    {
      "manufacturer": "Herman Miller",
      "productType": "Furniture",
      "productCategory": "Seating",
      "series": "Aeron",
      "model": "Size B",
      "name": "Herman Miller Aeron Chair",
      "quantity": "10",
      "unit": "ea",
      "unitPrice": 1495.00,
      "totalPrice": 14950.00,
      "dimensions": { "height": null, "width": null, "length": null, "thickness": null },
      "performanceRatings": { "stc": null, "fireRating": null, "acousticRating": null },
      "appearance": {
        "color": "Graphite",
        "finish": null,
        "trim": null
      },
      "materials": { "core": null, "face": null, "frame": null },
      "certifications": [],
      "specifications": {
        "size": "B"
      },
      "description": "Ergonomic office chair, Size B, Graphite color"
    },
    {
      "manufacturer": "3M",
      "productType": "Accessories",
      "productCategory": "Privacy Screens",
      "series": null,
      "model": "24\"",
      "name": "3M Privacy Screen 24\"",
      "quantity": "10",
      "unit": "ea",
      "unitPrice": 89.99,
      "totalPrice": 899.90,
      "dimensions": {
        "height": null,
        "width": "24 in",
        "length": null,
        "thickness": null
      },
      "performanceRatings": { "stc": null, "fireRating": null, "acousticRating": null },
      "appearance": { "color": null, "finish": null, "trim": null },
      "materials": { "core": null, "face": null, "frame": null },
      "certifications": [],
      "specifications": {
        "screenSize": "24 inch"
      },
      "description": "Privacy screen for 24-inch monitor"
    }
  ],
  "summary": "Extracted 3 products: 1 desk, 1 chair, 1 privacy screen"
}
`

    const userPrompt = fileName
      ? `Extract all products from this document (${fileName}):\n\n${documentText}`
      : `Extract all products from this document:\n\n${documentText}`

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API request failed: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    const extractedData = JSON.parse(content)

    // Validate and return the response
    const response: ExtractProductsResponse = {
      success: true,
      data: {
        products: extractedData.products || [],
        summary: extractedData.summary
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Extract products error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
