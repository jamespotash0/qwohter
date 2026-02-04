//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ExtractProductsRequest {
  documentText: string;
  fileName?: string;
}

interface ProductOption {
  optionName: string;
  optionCategory: string;
  values: Array<{
    label: string;
    priceDelta?: number | null;
    absolutePrice?: number | null;
    isSelected?: boolean;
  }>;
}

interface PricingBreakdown {
  material?: {
    subtotal?: number | null;
    components?: Record<string, number>;
    pricePerUnit?: number | null;
    pricePerSqFt?: number | null;
  };
  freight?: {
    items?: Record<string, number>;
    total?: number | null;
  };
  escalation?: {
    terms?: string | null;
    percentage?: number | null;
    validUntil?: string | null;
  };
  unitPrice?: number | null;
  totalPrice?: number | null;
}

interface ConfigurableProduct {
  id: string;
  manufacturer: string | null;
  productDomain: string | null;
  productLine: string | null;
  series: string | null;
  model: string | null;
  name: string;
  description: string | null;
  baseSpecifications: {
    dimensions?: {
      height?: string | null;
      width?: string | null;
      length?: string | null;
      thickness?: string | null;
      area?: string | null;
    };
    quantity?: number | null;
    unit?: string | null;
    panelCount?: number | null;
    weight?: string | null;
    weightPerSqFt?: number | null;
  };
  frame?: {
    type?: string | null;
    material?: string | null;
  };
  closures?: {
    left?: string | null;
    right?: string | null;
  };
  seals?: {
    top?: string | null;
    bottom?: string | null;
    perimeter?: string | null;
  };
  track?: {
    type?: string | null;
    hangingWeight?: number | null;
  };
  stacking?: {
    configuration?: string | null;
    direction?: string | null;
  };
  options: ProductOption[];
  selectedConfiguration: Record<string, string>;
  pricing: PricingBreakdown;
  performanceRatings: {
    stc?: number | null;
    fireRating?: string | null;
    acousticRating?: string | null;
  };
  appearance?: {
    color?: string | null;
    finish?: string | null;
    trim?: string | null;
    surface?: string | null;
  };
  certifications: string[];
}

interface SimpleProduct {
  id: string;
  manufacturer: string | null;
  productDomain: string | null;
  productLine: string | null;
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
  specifications: Record<string, unknown>;
  description: string | null;
}

interface DocumentPricingSummary {
  materialCost?: number | null;
  laborCost?: number | null;
  freightCost?: number | null;
  markup?: {
    amount?: number | null;
    percentage?: number | null;
  };
  subtotal?: number | null;
  tax?: {
    amount?: number | null;
    percentage?: number | null;
  };
  grandTotal?: number | null;
  pricePerSqFt?: number | null;
  currency?: string;
}

interface DocumentMetadata {
  validUntil?: string | null;           // Quote expiration date
  quoteNumber?: string | null;          // Quote/proposal reference number
  quoteDate?: string | null;            // Date quote was created
  pricingSummary: DocumentPricingSummary;
  paymentTerms?: string | null;
  leadTime?: string | null;
  escalationTerms?: string | null;
  notes?: string | null;
}

interface ExtractProductsResponse {
  success: boolean;
  data?: {
    configurableProducts: ConfigurableProduct[];
    simpleProducts: SimpleProduct[];
    documentMetadata: DocumentMetadata;
    documentSummary: {
      totalProducts: number;
      configurableCount: number;
      simpleCount: number;
      hasFreight: boolean;
      hasEscalation: boolean;
    };
    extractionMetadata: {
      passes: string[];
      confidence: number;
    };
  };
  error?: string;
}

// ============================================================================
// OPENAI API HELPER
// ============================================================================

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.1
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ============================================================================
// PASS 1: PRODUCT INVENTORY & CLASSIFICATION
// ============================================================================

const PASS1_SYSTEM_PROMPT = `You are analyzing a commercial product document to identify ALL products.

Your task is to:
1. Identify EVERY distinct product in the document
2. Classify each as "configurable" or "simple"

CLASSIFICATION RULES:

"configurable" products have:
- Multiple selectable options (STC ratings, finishes, closures, etc.)
- Variant tables or "Add for..." pricing
- Component breakdowns that belong to ONE system
- Examples: Wall systems, door systems, custom furniture with finish options

"simple" products are:
- Single items with fixed specifications
- No meaningful options to select
- Examples: Individual parts, accessories, standard supplies, freight line items

IMPORTANT:
- Each distinct product system = one entry (don't split panels/track/seals of one wall into multiple products)
- A quote with 3 different wall systems = 3 configurable products
- Freight, shipping, and installation should be EXCLUDED from products

Return JSON:
{
  "products": [
    {
      "tempId": "unique_temp_id_1",
      "name": "Product name",
      "type": "configurable" | "simple",
      "manufacturer": "string | null",
      "model": "string | null",
      "series": "string | null",
      "productDomain": "e.g., Partitions, Furniture, Doors",
      "productLine": "e.g., Operable Walls, Glass Partitions",
      "briefDescription": "One-line description",
      "reasoning": "Why this is configurable or simple"
    }
  ],
  "documentInfo": {
    "hasFreight": true | false,
    "hasEscalation": true | false,
    "freightTotal": number | null,
    "escalationTerms": "string | null"
  },
  "confidence": 0.0-1.0
}`;

interface InventoryProduct {
  tempId: string;
  name: string;
  type: 'configurable' | 'simple';
  manufacturer: string | null;
  model: string | null;
  series: string | null;
  productDomain: string | null;
  productLine: string | null;
  briefDescription: string | null;
  reasoning: string;
}

interface Pass1Result {
  products: InventoryProduct[];
  documentInfo: {
    hasFreight: boolean;
    hasEscalation: boolean;
    freightTotal?: number | null;
    escalationTerms?: string | null;
  };
  confidence: number;
}

async function pass1_inventoryProducts(
  apiKey: string,
  documentText: string,
  fileName?: string
): Promise<Pass1Result> {
  console.log('=== PASS 1: Product Inventory & Classification ===');

  const userPrompt = fileName
    ? `Analyze this document (${fileName}) and identify all products:\n\n${documentText}`
    : `Analyze this document and identify all products:\n\n${documentText}`;

  const response = await callOpenAI(apiKey, PASS1_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(response) as Pass1Result;

  console.log('Pass 1 Result:', JSON.stringify(result, null, 2));
  console.log(`Found ${result.products.length} products (${result.products.filter(p => p.type === 'configurable').length} configurable, ${result.products.filter(p => p.type === 'simple').length} simple)`);

  return result;
}

// ============================================================================
// PASS 2: CONFIGURABLE PRODUCT DETAILS
// ============================================================================

const PASS2_SYSTEM_PROMPT = `You are extracting detailed specifications and configuration options for a specific product.

CONTEXT: You are extracting data for ONE specific product that has already been identified.
The product information is provided in the user prompt.

CRITICAL DISTINCTION - Selected Specifications vs Configurable Options:

1. SELECTED SPECIFICATIONS (single values already chosen for this quote):
   Put these in the dedicated fields, NOT in options array!
   Examples: "Frame: 2000", "STC Rating: 49S", "Color: Satin (Gray)", "Left Closure: Expander Panel"
   → These are SELECTED values, put them in performanceRatings, appearance, closures, seals, etc.

2. CONFIGURABLE OPTIONS (multiple choices available with pricing):
   ONLY use options array when document shows MULTIPLE alternatives the customer can choose.
   Examples: "Available finishes: Red (+$100), Blue (+$150), Green" or "Add for STC 52: +$500"
   → These have multiple values with pricing variations

RULES:
- If only ONE value is specified (like "STC Rating: 49S"), put it in performanceRatings.stc = 49
- If only ONE closure is specified (like "Left Closure: Expander Panel"), put it in closures.left = "Expander Panel"
- ONLY create an option when there are MULTIPLE choices listed in the document
- "Add for..." with alternatives = options array
- Single selected value = specification field

Return JSON:
{
  "baseSpecifications": {
    "dimensions": {
      "height": "string | null",
      "width": "string | null",
      "length": "string | null",
      "thickness": "string | null",
      "area": "string | null"
    },
    "quantity": number | null,
    "unit": "ea | sqft | lf | null",
    "panelCount": number | null,
    "weight": "string | null",
    "weightPerSqFt": number | null
  },
  "frame": {
    "type": "string | null (e.g., '2000', 'Standard')",
    "material": "string | null"
  },
  "closures": {
    "left": "string | null (e.g., 'Expander Panel', 'Pocket Door')",
    "right": "string | null (e.g., 'Bulb Seal', 'Flush Panel')"
  },
  "seals": {
    "top": "string | null (e.g., 'Fixed Tops')",
    "bottom": "string | null (e.g., 'Operable Bottoms')",
    "perimeter": "string | null"
  },
  "track": {
    "type": "string | null (e.g., '425MD')",
    "hangingWeight": number | null
  },
  "stacking": {
    "configuration": "string | null",
    "direction": "string | null (e.g., 'Multi-Directional')"
  },
  "options": [
    {
      "optionName": "Human-readable option name",
      "optionCategory": "Closure | Seal | Track | Finish | Performance | Hardware | Glass | Stacking | Dimensions | Other",
      "values": [
        {
          "label": "Option value",
          "priceDelta": number | null,
          "absolutePrice": number | null,
          "isSelected": boolean
        }
      ]
    }
  ],
  "selectedConfiguration": {
    "optionName": "selectedValue"
  },
  "pricing": {
    "material": {
      "subtotal": number | null,
      "components": { "componentName": price },
      "pricePerUnit": number | null,
      "pricePerSqFt": number | null
    },
    "unitPrice": number | null,
    "totalPrice": number | null
  },
  "performanceRatings": {
    "stc": number | null,
    "fireRating": "string | null",
    "acousticRating": "string | null"
  },
  "appearance": {
    "color": "string | null (e.g., 'Satin (Gray)')",
    "finish": "string | null",
    "trim": "string | null (e.g., 'Trimless')",
    "surface": "string | null (e.g., 'Standard Vinyl')"
  },
  "certifications": ["UL", "ASTM", "etc"],
  "fullDescription": "Comprehensive product description"
}`;

interface Pass2Result {
  baseSpecifications: {
    dimensions?: {
      height?: string | null;
      width?: string | null;
      length?: string | null;
      thickness?: string | null;
      area?: string | null;
    };
    quantity?: number | null;
    unit?: string | null;
    panelCount?: number | null;
    weight?: string | null;
    weightPerSqFt?: number | null;
  };
  frame?: {
    type?: string | null;
    material?: string | null;
  };
  closures?: {
    left?: string | null;
    right?: string | null;
  };
  seals?: {
    top?: string | null;
    bottom?: string | null;
    perimeter?: string | null;
  };
  track?: {
    type?: string | null;
    hangingWeight?: number | null;
  };
  stacking?: {
    configuration?: string | null;
    direction?: string | null;
  };
  options: ProductOption[];
  selectedConfiguration: Record<string, string>;
  pricing: PricingBreakdown;
  performanceRatings: {
    stc?: number | null;
    fireRating?: string | null;
    acousticRating?: string | null;
  };
  appearance?: {
    color?: string | null;
    finish?: string | null;
    trim?: string | null;
    surface?: string | null;
  };
  certifications: string[];
  fullDescription: string | null;
}

async function pass2_extractConfigurableDetails(
  apiKey: string,
  documentText: string,
  product: InventoryProduct
): Promise<Pass2Result> {
  console.log(`=== PASS 2: Extracting details for "${product.name}" ===`);

  const userPrompt = `Extract configuration options for this SPECIFIC product:

PRODUCT TO EXTRACT:
- Name: ${product.name}
- Manufacturer: ${product.manufacturer || 'Unknown'}
- Model: ${product.model || 'Unknown'}
- Series: ${product.series || 'Unknown'}
- Domain: ${product.productDomain || 'Unknown'}
- Product Line: ${product.productLine || 'Unknown'}
- Description: ${product.briefDescription || 'N/A'}

Focus ONLY on options and specifications for this product. Ignore other products.

DOCUMENT TEXT:
${documentText}`;

  const response = await callOpenAI(apiKey, PASS2_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(response) as Pass2Result;

  console.log(`Pass 2 Result for "${product.name}": ${result.options.length} options found`);
  return result;
}

// ============================================================================
// PASS 3: SIMPLE PRODUCTS EXTRACTION
// ============================================================================

const PASS3_SYSTEM_PROMPT = `You are extracting simple line-item products from a document.

CONTEXT: Some products have already been identified as "configurable" and extracted separately.
You are extracting the remaining "simple" products.

RULES:
1. Each product must have a name
2. Default quantity to "1" and unit to "ea" if not specified
3. Normalize units (ft, sqft, in, mm, ea, pcs)
4. Preserve manufacturer terminology exactly
5. EXCLUDE freight, shipping, installation line items
6. ONLY extract products from the provided list

Return JSON:
{
  "products": [
    {
      "tempId": "matching_temp_id",
      "manufacturer": "string | null",
      "productDomain": "string | null",
      "productLine": "string | null",
      "series": "string | null",
      "model": "string | null",
      "name": "Product name",
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
      "certifications": [],
      "specifications": {},
      "description": "string | null"
    }
  ]
}`;

interface Pass3Result {
  products: Array<SimpleProduct & { tempId: string }>;
}

async function pass3_extractSimpleProducts(
  apiKey: string,
  documentText: string,
  simpleProducts: InventoryProduct[]
): Promise<Pass3Result> {
  console.log(`=== PASS 3: Extracting ${simpleProducts.length} simple products ===`);

  if (simpleProducts.length === 0) {
    return { products: [] };
  }

  const productList = simpleProducts.map(p =>
    `- [${p.tempId}] ${p.name} (${p.manufacturer || 'Unknown manufacturer'})`
  ).join('\n');

  const userPrompt = `Extract details for these SPECIFIC simple products:

PRODUCTS TO EXTRACT:
${productList}

IMPORTANT: Use the tempId from the list for each product in your response.

DOCUMENT TEXT:
${documentText}`;

  const response = await callOpenAI(apiKey, PASS3_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(response) as Pass3Result;

  console.log(`Pass 3 Result: ${result.products.length} simple products extracted`);
  return result;
}

// ============================================================================
// PASS 4: FREIGHT & ESCALATION EXTRACTION
// ============================================================================

const PASS4_SYSTEM_PROMPT = `You are extracting freight and escalation pricing from a product quote.

RULES:
- Extract ALL freight/shipping line items with their costs
- Capture escalation terms exactly as written
- Do NOT include product prices, only logistics

Return JSON:
{
  "freight": {
    "items": [
      {
        "description": "Freight description",
        "cost": number
      }
    ],
    "total": number | null
  },
  "escalation": {
    "terms": "Exact escalation terms text | null",
    "percentage": number | null,
    "validUntil": "date | null"
  },
  "paymentTerms": "string | null",
  "leadTime": "string | null"
}`;

interface Pass4Result {
  freight: {
    items: Array<{ description: string; cost: number }>;
    total: number | null;
  };
  escalation: {
    terms: string | null;
    percentage: number | null;
    validUntil: string | null;
  };
  paymentTerms: string | null;
  leadTime: string | null;
}

async function pass4_extractFreightAndEscalation(
  apiKey: string,
  documentText: string
): Promise<Pass4Result> {
  console.log('=== PASS 4: Freight & Escalation Extraction ===');

  const userPrompt = `Extract freight and escalation information from this document:\n\n${documentText}`;

  const response = await callOpenAI(apiKey, PASS4_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(response) as Pass4Result;

  console.log('Pass 4 Result:', JSON.stringify(result, null, 2));
  return result;
}

// ============================================================================
// PASS 5: DOCUMENT METADATA EXTRACTION
// ============================================================================

const PASS5_SYSTEM_PROMPT = `You are extracting document-level metadata from a commercial quote or proposal.

Extract the following information if present:
1. Quote validity / expiration date
2. Quote number or reference
3. Quote date
4. Overall pricing summary (calculated totals, not line items)
5. Payment terms
6. Lead time / delivery timeline
7. Escalation terms
8. Important notes or conditions

PRICING SUMMARY should include significant calculated costs:
- Material cost (total materials)
- Labor cost (installation, labor charges)
- Freight cost (shipping, delivery)
- Markup (profit margin - amount and/or percentage)
- Subtotal (before tax)
- Tax (if applicable - amount and/or percentage)
- Grand total (final price)
- Price per square foot (if quoted that way)

IMPORTANT:
- Only extract values that are explicitly stated
- For dates, use ISO format (YYYY-MM-DD) when possible
- For currency, default to USD if not specified
- Look for phrases like "valid until", "expires", "quote valid for X days"

Return JSON:
{
  "validUntil": "YYYY-MM-DD | null",
  "quoteNumber": "string | null",
  "quoteDate": "YYYY-MM-DD | null",
  "pricingSummary": {
    "materialCost": number | null,
    "laborCost": number | null,
    "freightCost": number | null,
    "markup": {
      "amount": number | null,
      "percentage": number | null
    },
    "subtotal": number | null,
    "tax": {
      "amount": number | null,
      "percentage": number | null
    },
    "grandTotal": number | null,
    "pricePerSqFt": number | null,
    "currency": "USD"
  },
  "paymentTerms": "string | null",
  "leadTime": "string | null",
  "escalationTerms": "string | null",
  "notes": "string | null"
}`;

async function pass5_extractDocumentMetadata(
  apiKey: string,
  documentText: string
): Promise<DocumentMetadata> {
  console.log('=== PASS 5: Document Metadata Extraction ===');

  const userPrompt = `Extract document-level metadata and pricing summary from this quote/proposal:\n\n${documentText}`;

  const response = await callOpenAI(apiKey, PASS5_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(response) as DocumentMetadata;

  console.log('Pass 5 Result:', JSON.stringify(result, null, 2));
  return result;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: { method: string; json: () => ExtractProductsRequest | PromiseLike<ExtractProductsRequest>; }) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { documentText, fileName }: ExtractProductsRequest = await req.json();

    if (!documentText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document text is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('=== MULTI-PASS EXTRACTION STARTED ===');
    console.log('File:', fileName);
    console.log('Text length:', documentText.length);

    const passes: string[] = [];

    // ========== PASS 1: Product Inventory ==========
    const pass1Result = await pass1_inventoryProducts(openaiApiKey, documentText, fileName);
    passes.push('inventory');

    const configurableProducts: ConfigurableProduct[] = [];
    const simpleProducts: SimpleProduct[] = [];

    // ========== PASS 2: Extract Configurable Products ==========
    const configurableInventory = pass1Result.products.filter(p => p.type === 'configurable');

    for (const product of configurableInventory) {
      const details = await pass2_extractConfigurableDetails(openaiApiKey, documentText, product);
      passes.push(`configurable:${product.tempId}`);

      configurableProducts.push({
        id: generateId(),
        manufacturer: product.manufacturer,
        productDomain: product.productDomain,
        productLine: product.productLine,
        series: product.series,
        model: product.model,
        name: product.name,
        description: details.fullDescription,
        baseSpecifications: details.baseSpecifications,
        frame: details.frame,
        closures: details.closures,
        seals: details.seals,
        track: details.track,
        stacking: details.stacking,
        options: details.options,
        selectedConfiguration: details.selectedConfiguration,
        pricing: details.pricing,
        performanceRatings: details.performanceRatings,
        appearance: details.appearance,
        certifications: details.certifications,
      });
    }

    // ========== PASS 3: Extract Simple Products ==========
    const simpleInventory = pass1Result.products.filter(p => p.type === 'simple');

    if (simpleInventory.length > 0) {
      const pass3Result = await pass3_extractSimpleProducts(openaiApiKey, documentText, simpleInventory);
      passes.push('simple_products');

      for (const product of pass3Result.products) {
        simpleProducts.push({
          id: generateId(),
          manufacturer: product.manufacturer,
          productDomain: product.productDomain,
          productLine: product.productLine,
          series: product.series,
          model: product.model,
          name: product.name,
          quantity: product.quantity,
          unit: product.unit,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
          dimensions: product.dimensions,
          performanceRatings: product.performanceRatings,
          appearance: product.appearance,
          materials: product.materials,
          certifications: product.certifications,
          specifications: product.specifications,
          description: product.description,
        });
      }
    }

    // ========== PASS 4: Freight & Escalation (if needed) ==========
    let freightData: Pass4Result | null = null;
    if (pass1Result.documentInfo.hasFreight || pass1Result.documentInfo.hasEscalation) {
      freightData = await pass4_extractFreightAndEscalation(openaiApiKey, documentText);
      passes.push('freight_escalation');

      // Attach freight data to configurable products
      if (configurableProducts.length > 0 && freightData.freight.total) {
        const freightPerProduct = freightData.freight.total / configurableProducts.length;
        configurableProducts.forEach(product => {
          product.pricing.freight = {
            total: freightPerProduct,
            items: freightData!.freight.items.reduce((acc, item) => {
              acc[item.description] = item.cost / configurableProducts.length;
              return acc;
            }, {} as Record<string, number>),
          };
          if (freightData!.escalation.terms) {
            product.pricing.escalation = freightData!.escalation;
          }
        });
      }
    }

    // ========== PASS 5: Document Metadata ==========
    const documentMetadata = await pass5_extractDocumentMetadata(openaiApiKey, documentText);
    passes.push('document_metadata');

    // Merge freight data into document metadata if not already captured
    if (freightData) {
      if (!documentMetadata.pricingSummary) {
        documentMetadata.pricingSummary = {};
      }
      if (!documentMetadata.pricingSummary.freightCost && freightData.freight.total) {
        documentMetadata.pricingSummary.freightCost = freightData.freight.total;
      }
      if (!documentMetadata.paymentTerms && freightData.paymentTerms) {
        documentMetadata.paymentTerms = freightData.paymentTerms;
      }
      if (!documentMetadata.leadTime && freightData.leadTime) {
        documentMetadata.leadTime = freightData.leadTime;
      }
      if (!documentMetadata.escalationTerms && freightData.escalation.terms) {
        documentMetadata.escalationTerms = freightData.escalation.terms;
      }
    }

    // ========== Build Response ==========
    const response: ExtractProductsResponse = {
      success: true,
      data: {
        configurableProducts,
        simpleProducts,
        documentMetadata,
        documentSummary: {
          totalProducts: configurableProducts.length + simpleProducts.length,
          configurableCount: configurableProducts.length,
          simpleCount: simpleProducts.length,
          hasFreight: pass1Result.documentInfo.hasFreight,
          hasEscalation: pass1Result.documentInfo.hasEscalation,
        },
        extractionMetadata: {
          passes,
          confidence: pass1Result.confidence,
        },
      },
    };

    console.log('=== MULTI-PASS EXTRACTION COMPLETE ===');
    console.log(`Total: ${response.data?.documentSummary.totalProducts} products`);
    console.log(`Configurable: ${response.data?.documentSummary.configurableCount}`);
    console.log(`Simple: ${response.data?.documentSummary.simpleCount}`);
    console.log('Passes executed:', passes);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Extract products error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
