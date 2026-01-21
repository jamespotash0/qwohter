/**
 * AI Scheduled Analysis Edge Function
 *
 * Runs on a schedule (daily) to:
 * - Check proposals that need attention (submitted X days ago, etc.)
 * - Create proactive AI suggestions for them
 * - Enable time-based triggers without user interaction
 *
 * Schedule: Every day at 9:00 AM UTC
 * Cron: 0 9 * * *
 *
 * To configure in Supabase:
 * 1. Go to Database → Extensions → Enable pg_cron
 * 2. Use: SELECT cron.schedule('ai-daily-analysis', '0 9 * * *',
 *    $$SELECT net.http_post(
 *      url := 'https://your-project.supabase.co/functions/v1/ai-scheduled-analysis',
 *      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
 *      body := '{}'::jsonb
 *    )$$
 * );
 */

//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// Types
// ============================================================================

interface ProposalNeedingAttention {
  id: string;
  proposal_number: string;
  project_name: string | null;
  client_name: string | null;
  status: string;
  total_value: number | null;
  organization_id: string;
  updated_at: string;
  days_since_update: number;
  days_since_submission: number | null;
  needs_analysis: boolean;
}

interface AnalysisResult {
  proposalId: string;
  success: boolean;
  suggestionsCreated: number;
  error?: string;
}

// ============================================================================
// Main Handler
// ============================================================================

//@ts-ignore
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('AI Scheduled Analysis started at:', new Date().toISOString());

  try {
    // Get environment variables
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this is a scheduled call or has service role auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.includes(supabaseServiceKey.slice(0, 20))) {
      // For scheduled calls, verify it's coming from Supabase
      const isScheduledCall = req.headers.get('x-supabase-function-version');
      if (!isScheduledCall) {
        console.log('Unauthorized scheduled analysis attempt');
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find proposals needing attention
    const proposalsToAnalyze = await findProposalsNeedingAttention(supabase);
    console.log(`Found ${proposalsToAnalyze.length} proposals needing attention`);

    // Analyze each proposal (with rate limiting)
    const results: AnalysisResult[] = [];
    for (const proposal of proposalsToAnalyze) {
      try {
        const result = await analyzeProposal(supabase, openaiApiKey, proposal);
        results.push(result);

        // Rate limit: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing proposal ${proposal.id}:`, error);
        results.push({
          proposalId: proposal.id,
          success: false,
          suggestionsCreated: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary
    const successful = results.filter(r => r.success).length;
    const totalSuggestions = results.reduce((sum, r) => sum + r.suggestionsCreated, 0);
    const duration = Date.now() - startTime;

    console.log(`AI Scheduled Analysis completed:
      - Proposals analyzed: ${results.length}
      - Successful: ${successful}
      - Suggestions created: ${totalSuggestions}
      - Duration: ${duration}ms`);

    // Log the run in ai_agent_runs
    await supabase.from('ai_agent_runs').insert({
      organization_id: null, // System-wide run
      triggered_by: null,
      agent_type: 'status_monitor',
      trigger_event: 'scheduled',
      proposal_id: null,
      status: 'completed',
      suggestions_generated: totalSuggestions,
      duration_ms: duration,
      input_data: { proposals_checked: proposalsToAnalyze.length },
      output_data: {
        successful,
        failed: results.length - successful,
        suggestions: totalSuggestions,
      },
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          proposalsAnalyzed: results.length,
          successful,
          suggestionsCreated: totalSuggestions,
          durationMs: duration,
          results,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Scheduled Analysis error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function findProposalsNeedingAttention(
  supabase: ReturnType<typeof createClient>
): Promise<ProposalNeedingAttention[]> {
  // Query the view we created
  const { data, error } = await supabase
    .from('proposals_needing_ai_attention')
    .select('*')
    .eq('needs_analysis', true)
    .limit(50); // Process max 50 per run to stay within limits

  if (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }

  // Also find proposals that:
  // 1. Were submitted more than 5 days ago with no activity
  // 2. Have been in Draft for more than 14 days
  const additionalProposals: ProposalNeedingAttention[] = [];

  // Submitted proposals needing follow-up (5+ days)
  const { data: submittedProposals } = await supabase
    .from('proposals')
    .select('id, proposal_number, project_name, client_name, status, total_value, organization_id, updated_at')
    .eq('status', 'Submitted')
    .lt('updated_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
    .is('ai_last_analyzed_at', null)
    .limit(20);

  if (submittedProposals) {
    for (const p of submittedProposals) {
      const daysSince = Math.floor(
        (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      additionalProposals.push({
        ...p,
        days_since_update: daysSince,
        days_since_submission: daysSince,
        needs_analysis: true,
      });
    }
  }

  // Stale drafts (14+ days)
  const { data: staleDrafts } = await supabase
    .from('proposals')
    .select('id, proposal_number, project_name, client_name, status, total_value, organization_id, updated_at')
    .eq('status', 'Draft')
    .lt('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .is('ai_last_analyzed_at', null)
    .limit(20);

  if (staleDrafts) {
    for (const p of staleDrafts) {
      const daysSince = Math.floor(
        (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      additionalProposals.push({
        ...p,
        days_since_update: daysSince,
        days_since_submission: null,
        needs_analysis: true,
      });
    }
  }

  // Combine and deduplicate
  const allProposals = [...(data || []), ...additionalProposals];
  const uniqueProposals = Array.from(
    new Map(allProposals.map(p => [p.id, p])).values()
  );

  return uniqueProposals.slice(0, 50); // Max 50 per run
}

async function analyzeProposal(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  proposal: ProposalNeedingAttention
): Promise<AnalysisResult> {
  // Determine the type of suggestion to create
  let suggestionType: string;
  let title: string;
  let content: string;
  let reasoning: string;

  if (proposal.status === 'Submitted' && (proposal.days_since_submission || 0) >= 5) {
    // Follow-up email suggestion
    suggestionType = 'follow_up_email';
    title = 'Time to Follow Up';
    content = `This proposal was submitted ${proposal.days_since_submission} days ago and hasn't received a response yet. Consider sending a polite follow-up email to ${proposal.client_name || 'the client'} to check on the status.`;
    reasoning = `Proposal submitted ${proposal.days_since_submission} days ago with no update.`;
  } else if (proposal.status === 'Draft' && proposal.days_since_update >= 14) {
    // Status reminder for stale drafts
    suggestionType = 'status_reminder';
    title = 'Draft Needs Attention';
    content = `This proposal has been in draft status for ${proposal.days_since_update} days. Consider either completing and submitting it, or archiving it if no longer relevant.`;
    reasoning = `Draft proposal inactive for ${proposal.days_since_update} days.`;
  } else {
    // General recommendation
    suggestionType = 'action_recommendation';
    title = 'Review Recommended';
    content = `This proposal may need your attention. Last updated ${proposal.days_since_update} days ago.`;
    reasoning = `Proposal hasn't been analyzed recently.`;
  }

  // Check for existing similar suggestion
  const { data: existing } = await supabase
    .from('ai_suggestions')
    .select('id')
    .eq('proposal_id', proposal.id)
    .eq('suggestion_type', suggestionType)
    .eq('status', 'pending')
    .single();

  if (existing) {
    // Update the proposal's last analyzed timestamp even if we didn't create new suggestion
    await supabase
      .from('proposals')
      .update({ ai_last_analyzed_at: new Date().toISOString() })
      .eq('id', proposal.id);

    return {
      proposalId: proposal.id,
      success: true,
      suggestionsCreated: 0,
    };
  }

  // Create the suggestion
  const { error: insertError } = await supabase
    .from('ai_suggestions')
    .insert({
      proposal_id: proposal.id,
      organization_id: proposal.organization_id,
      user_id: null, // System-generated
      suggestion_type: suggestionType,
      title,
      content,
      reasoning,
      confidence_score: 0.85,
      model_used: 'rule-based', // Not using AI for scheduled checks (cheaper)
      status: 'pending',
    });

  if (insertError) {
    console.error('Failed to insert suggestion:', insertError);
    return {
      proposalId: proposal.id,
      success: false,
      suggestionsCreated: 0,
      error: insertError.message,
    };
  }

  // Update proposal's last analyzed timestamp
  await supabase
    .from('proposals')
    .update({ ai_last_analyzed_at: new Date().toISOString() })
    .eq('id', proposal.id);

  return {
    proposalId: proposal.id,
    success: true,
    suggestionsCreated: 1,
  };
}
