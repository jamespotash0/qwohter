/**
 * IP Tracking Edge Function
 *
 * Returns the true client IP address from request headers.
 * More reliable than client-side IP detection APIs.
 *
 * Usage:
 * const response = await fetch(`${functionsUrl}/ip-tracking`);
 * const { ip } = await response.json();
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get IP from various possible headers (in order of preference)
    const ip =
      // Cloudflare (if using Cloudflare)
      req.headers.get('CF-Connecting-IP') ||
      // Standard proxy header (most common)
      req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      // Nginx
      req.headers.get('X-Real-IP') ||
      // Vercel
      req.headers.get('X-Vercel-Forwarded-For') ||
      // Fallback
      '0.0.0.0';

    console.log('Client IP detected:', ip);

    return new Response(
      JSON.stringify({
        ip,
        // Optionally include metadata for debugging
        debug: {
          'CF-Connecting-IP': req.headers.get('CF-Connecting-IP'),
          'X-Forwarded-For': req.headers.get('X-Forwarded-For'),
          'X-Real-IP': req.headers.get('X-Real-IP'),
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error getting client IP:', error);

    return new Response(
      JSON.stringify({
        ip: '0.0.0.0',
        error: 'Failed to detect IP'
      }),
      {
        status: 200, // Still return 200 with fallback IP
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
