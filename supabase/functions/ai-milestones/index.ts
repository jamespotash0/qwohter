//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MilestoneRequest {
  quoteData: Record<string, unknown>;
  wonDate: string;
}

interface MilestoneSuggestion {
  label: string;
  date: string;
  notes?: string;
}

interface AIResponse {
  reasoning: string;
  milestones: MilestoneSuggestion[];
}

/**
 * Sanitize quote data - remove sensitive info
 */
function sanitizeQuoteData(quoteData: Record<string, unknown>): string {
  const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'credit_card'];

  const sanitize = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(s => lowerKey.includes(s))) continue;
      result[key] = sanitize(value);
    }
    return result;
  };

  const sanitized = sanitize(quoteData);
  return JSON.stringify(sanitized, null, 2);
}

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
        JSON.stringify({ error: 'AI service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const requestData: MilestoneRequest = await req.json();

    // Validate required fields
    if (!requestData.quoteData || !requestData.wonDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quoteData and wonDate' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const rawQuoteJson = sanitizeQuoteData(requestData.quoteData);

    const prompt = `You are a project coordinator for a wall installation company. Analyze the quote data below and generate a realistic project timeline.

PROJECT WON DATE: ${requestData.wonDate}

RAW QUOTE DATA (JSON):
${rawQuoteJson}

YOUR TASK:
1. Search through the entire quote data structure to find delivery/timeline information
2. Look for fields like: shopDrawingWeeks, trackDeliveryWeeks, panelDeliveryWeeks, trackInstallationDays, panelInstallationDays
3. These could be nested anywhere: delivery_details, form_data, delivery, etc.
4. If you find these values, use them EXACTLY to calculate dates
5. If no delivery timeline exists, use standard estimates

MILESTONE SEQUENCE TO CREATE:
1. 30% Deposit Received - within 1 week of won date
2. Shop Drawings Delivered - use shopDrawingWeeks (or estimate 2 weeks)
3. Shop Drawings Approved - ~1 week after delivery for client review
4. Track Delivered to Site - use trackDeliveryWeeks after approval (or estimate 4 weeks)
5. Track Installation Complete - use trackInstallationDays after track delivery (or estimate 3 days)
6. Panels Delivered to Site - use panelDeliveryWeeks after track installation (or estimate 4 weeks)
7. Panel Installation Complete - use panelInstallationDays after panel delivery (or estimate 2 days)
8. Final Walkthrough - 1-2 days after installation complete
9. Final Payment Due - upon completion

IMPORTANT:
- If a value shows "4" weeks, use 4 weeks (28 days)
- If it shows "3-4" weeks, use the average
- Tell me in your reasoning what delivery values you found (or didn't find) in the data

Respond with JSON only:
{
  "reasoning": "I found/didn't find delivery timeline in the quote. [Explain what you found and how you calculated dates]",
  "milestones": [{"label": "Milestone Name", "date": "YYYY-MM-DD", "notes": "Brief description"}]
}`;

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
          {
            role: 'system',
            content: 'You are a wall installation project coordinator. Analyze JSON data to find delivery timeline values and calculate precise dates. Respond with valid JSON only, no markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorData }),
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
    let aiResponse: AIResponse;
    try {
      aiResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: cleanedResponse }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        milestones: aiResponse.milestones,
        reasoning: aiResponse.reasoning,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in generate-ai-milestones function:', error);

    return new Response(
      JSON.stringify({
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
