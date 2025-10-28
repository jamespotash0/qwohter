import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'Active')
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - not a member of this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization's Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ invoices: [], error: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 100,
    });

    // Get subscription plan name for each invoice
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, display_name, stripe_product_id');

    const planMap = new Map(
      (plans || []).map(p => [p.stripe_product_id, p.display_name])
    );

    // Transform invoices to match expected format
    const transformedInvoices = invoices.data.map((invoice) => {
      // Get plan name from line items
      const lineItem = invoice.lines.data[0];
      const productId = lineItem?.price?.product as string;
      const planName = planMap.get(productId) || 'Unknown Plan';

      return {
        id: invoice.id,
        invoice_pdf: invoice.invoice_pdf || '',
        billing_date: new Date(invoice.created * 1000).toISOString(),
        plan_name: planName,
        amount: (invoice.amount_paid || 0) / 100, // Convert cents to dollars
        status: invoice.status || 'unknown',
        period_start: new Date((invoice.period_start || invoice.created) * 1000).toISOString(),
        period_end: new Date((invoice.period_end || invoice.created) * 1000).toISOString(),
      };
    });

    return new Response(
      JSON.stringify({ invoices: transformedInvoices, error: null }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return new Response(
      JSON.stringify({
        invoices: null,
        error: error.message || 'Failed to fetch invoices'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
