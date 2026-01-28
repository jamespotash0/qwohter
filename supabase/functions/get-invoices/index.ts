//@ts-ignore
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    //@ts-ignore
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Verify authentication using service role to validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client to validate the JWT token and perform database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token', details: authError?.message }),
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

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'Active') //membership_status
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
      (plans || []).map((p: { stripe_product_id: any; display_name: any; }) => [p.stripe_product_id, p.display_name])
    );

    // Transform invoices to match expected format
    const transformedInvoices = invoices.data.map((invoice: { lines: { data: any[]; }; id: any; invoice_pdf: any; created: number; amount_paid: any; status: any; period_start: any; period_end: any; amount_refunded?: any; billing_reason?: string; }) => {
      // Get plan name from line items
      const lineItem = invoice.lines.data[0];
      const productId = lineItem?.price?.product as string;
      const planName = planMap.get(productId) || 'Legacy Plan';

      // Calculate proration quantity for subscription_update invoices
      // Stripe creates line items for seat changes - we want to show how many seats were added
      let prorationQuantity: number | null = null;

      if (invoice.billing_reason === 'subscription_update') {
        // For subscription updates (seat changes), find the quantity difference
        // Positive line items = new seats being charged
        // We look at line items to determine how many seats were added
        const lineItems = invoice.lines.data || [];

        // Find line items with positive amounts (charges for new seats)
        const positiveItems = lineItems.filter((item: any) => item.amount > 0 && item.quantity);
        const negativeItems = lineItems.filter((item: any) => item.amount < 0 && item.quantity);

        if (positiveItems.length > 0 && negativeItems.length > 0) {
          // Standard proration: credit for old quantity, charge for new quantity
          const newQuantity = positiveItems[0].quantity || 0;
          const oldQuantity = negativeItems[0].quantity || 0;
          prorationQuantity = newQuantity - oldQuantity;
        } else if (positiveItems.length > 0) {
          // Only positive items - this is the added quantity
          prorationQuantity = positiveItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        }
      }

      return {
        id: invoice.id,
        invoice_pdf: invoice.invoice_pdf || '',
        billing_date: new Date(invoice.created * 1000).toISOString(),
        plan_name: planName,
        amount: (invoice.amount_paid || 0) / 100, // Convert cents to dollars
        status: invoice.status || 'unknown',
        period_start: new Date((invoice.period_start || invoice.created) * 1000).toISOString(),
        period_end: new Date((invoice.period_end || invoice.created) * 1000).toISOString(),
        amount_refunded: invoice.amount_refunded ? (invoice.amount_refunded / 100) : 0, // Convert cents to dollars
        billing_reason: invoice.billing_reason || 'unknown', // subscription_cycle, subscription_create, subscription_update, etc.
        proration_quantity: prorationQuantity, // Number of seats added (null if not a proration invoice)
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
        error: error instanceof Error ? error.message : 'Failed to fetch invoices'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
