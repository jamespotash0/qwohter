/**
 * AI Workflow Agent Edge Function
 *
 * Consolidated single-file edge function for AI-powered workflow automation.
 * Handles: follow-up emails, reminders, recommendations, context analysis, and chat.
 */

//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

type WorkflowAction =
  | 'generate_follow_up'
  | 'suggest_reminders'
  | 'get_recommendations'
  | 'analyze_context'
  | 'chat';

interface WorkflowRequest {
  action: WorkflowAction;
  proposalId: string;
  organizationId: string;
  userId: string;
  options?: {
    forceRegenerate?: boolean;
    emailTone?: 'formal' | 'friendly' | 'urgent';
  };
  message?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  triggerType?: 'panel_opened' | 'status_changed' | 'scheduled_check' | 'time_elapsed';
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
  };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  content: string;
  tokenUsage: { prompt: number; completion: number; total: number };
}

// ============================================================================
// OpenAI Utilities
// ============================================================================

async function callOpenAI(
  apiKey: string,
  messages: OpenAIMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json_object';
  } = {}
): Promise<OpenAIResponse> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.3,
    maxTokens = 2000,
    responseFormat = 'json_object',
  } = options;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  return {
    content,
    tokenUsage: {
      prompt: data.usage?.prompt_tokens || 0,
      completion: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0,
    },
  };
}

function parseJSONResponse<T>(content: string): T {
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleanContent) as T;
  } catch {
    console.error('Failed to parse OpenAI response:', cleanContent);
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ============================================================================
// Data Sanitizer Utilities
// ============================================================================

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'api_key', 'apikey', 'credit_card', 'card_number', 'cvv', 'ssn', 'social_security', 'bank_account', 'routing_number', 'private_key', 'access_token', 'refresh_token'];
const REDACT_KEYS = ['email', 'phone', 'address', 'street'];

function sanitizeData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeData(item));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) continue;
    if (REDACT_KEYS.some(redact => lowerKey.includes(redact)) && typeof value === 'string' && value.length > 0) {
      result[key] = '[REDACTED]';
      continue;
    }
    result[key] = sanitizeData(value);
  }
  return result;
}

function extractFollowUpContext(proposal: Record<string, unknown>) {
  const now = new Date();
  const submittedAt = proposal.submitted_at
    ? new Date(proposal.submitted_at as string)
    : proposal.updated_at
      ? new Date(proposal.updated_at as string)
      : now;
  const daysSinceSubmission = Math.floor((now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    projectName: (proposal.project_name as string) || 'Unnamed Project',
    clientName: (proposal.client_name as string) || 'Client',
    clientCompany: (proposal.client_company as string) || '',
    totalValue: (proposal.total_value as number) || 0,
    status: (proposal.status as string) || 'Draft',
    submittedAt: submittedAt.toISOString(),
    daysSinceSubmission,
  };
}

function extractFormDataContext(formData: Record<string, unknown>): string {
  if (!formData || typeof formData !== 'object') return 'No additional form data available.';
  const sanitized = sanitizeData(formData) as Record<string, unknown>;
  const relevantFields: string[] = [];

  const extractFields = (obj: Record<string, unknown>, prefix = ''): void => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value === null || value === undefined || value === '') continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        extractFields(value as Record<string, unknown>, fullKey);
      } else if (Array.isArray(value) && value.length > 0) {
        relevantFields.push(`${fullKey}: [${value.length} items]`);
      } else if (typeof value !== 'object') {
        relevantFields.push(`${fullKey}: ${value}`);
      }
    }
  };

  extractFields(sanitized);
  return relevantFields.length === 0 ? 'No additional form data available.' : relevantFields.slice(0, 20).join('\n');
}

// ============================================================================
// Follow-Up Email Generator
// ============================================================================

async function generateFollowUp(params: {
  supabase: SupabaseClient;
  openaiApiKey: string;
  proposalId: string;
  organizationId: string;
  userId: string;
  options?: { emailTone?: 'formal' | 'friendly' | 'urgent'; forceRegenerate?: boolean };
}) {
  const { supabase, openaiApiKey, proposalId, organizationId, userId, options } = params;

  try {
    if (!options?.forceRegenerate) {
      const { data: existing } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('proposal_id', proposalId)
        .eq('suggestion_type', 'follow_up_email')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        return { success: true, data: { id: existing.id, title: existing.title, content: existing.content, email_subject: existing.email_subject, email_recipient: existing.email_recipient, reasoning: existing.reasoning, confidence_score: existing.confidence_score } };
      }
    }

    const { data: proposal, error: proposalError } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
    if (proposalError || !proposal) return { success: false, error: 'Proposal not found' };

    const context = extractFollowUpContext(proposal);
    const formContext = extractFormDataContext(proposal.form_data || {});
    const tone = options?.emailTone || (context.daysSinceSubmission <= 3 ? 'friendly' : context.daysSinceSubmission <= 7 ? 'formal' : 'urgent');

    const toneInstructions: Record<string, string> = {
      formal: 'Write in a professional, business-like tone. Be courteous but direct.',
      friendly: 'Write in a warm, personable tone while maintaining professionalism.',
      urgent: 'Write with a sense of urgency while remaining respectful. Emphasize time-sensitivity.',
    };

    const systemPrompt = `You are a professional business development assistant helping to write follow-up emails for proposals.\n\n${toneInstructions[tone]}\n\nGuidelines:\n- Keep emails concise (3-4 paragraphs max)\n- Reference the specific proposal/project\n- Include a clear call-to-action\n- Be respectful of the recipient's time\n- Don't be pushy or aggressive\n\nRespond with valid JSON only, no markdown.`;

    const urgencyNote = context.daysSinceSubmission > 7 ? `\n\nNote: It has been ${context.daysSinceSubmission} days since submission. The email should gently emphasize the importance of a timely response.` : '';
    const userPrompt = `Generate a follow-up email for a proposal with these details:\n\nPROJECT: ${context.projectName}\nCLIENT: ${context.clientName}${context.clientCompany ? ` at ${context.clientCompany}` : ''}\nVALUE: ${context.totalValue > 0 ? `$${context.totalValue.toLocaleString()}` : 'Not specified'}\nSTATUS: ${context.status}\nSUBMITTED: ${new Date(context.submittedAt).toLocaleDateString()}\nDAYS SINCE SUBMISSION: ${context.daysSinceSubmission}\nTONE: ${tone}\n\nADDITIONAL CONTEXT:\n${formContext}${urgencyNote}\n\nRespond with JSON:\n{\n  "subject": "Email subject line",\n  "body": "Full email body with greeting and signature placeholder",\n  "reasoning": "Brief explanation of your approach",\n  "confidence": 0.85\n}`;

    const response = await callOpenAI(openaiApiKey, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
    const parsed = parseJSONResponse<{ subject: string; body: string; reasoning: string; confidence: number }>(response.content);

    if (!parsed.subject || !parsed.body) return { success: false, error: 'Invalid AI response format' };

    const { data: suggestion, error: insertError } = await supabase
      .from('ai_suggestions')
      .insert({
        proposal_id: proposalId, organization_id: organizationId, user_id: userId,
        suggestion_type: 'follow_up_email', title: 'Follow-up Email Draft', content: parsed.body,
        email_subject: parsed.subject, email_recipient: context.clientName, reasoning: parsed.reasoning,
        confidence_score: Math.min(Math.max(parsed.confidence || 0.8, 0), 1), model_used: 'gpt-4o-mini',
        prompt_tokens: response.tokenUsage.prompt, completion_tokens: response.tokenUsage.completion, status: 'pending',
      })
      .select().single();

    if (insertError) return { success: false, error: 'Failed to save suggestion' };

    return { success: true, data: { id: suggestion.id, title: suggestion.title, content: suggestion.content, email_subject: suggestion.email_subject, email_recipient: suggestion.email_recipient, reasoning: suggestion.reasoning, confidence_score: suggestion.confidence_score }, tokenUsage: response.tokenUsage };
  } catch (error) {
    console.error('generateFollowUp error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Reminder Suggester
// ============================================================================

async function suggestReminders(params: { supabase: SupabaseClient; openaiApiKey: string; proposalId: string; organizationId: string; userId: string }) {
  const { supabase, openaiApiKey, proposalId, organizationId, userId } = params;

  try {
    const { data: proposal, error: proposalError } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
    if (proposalError || !proposal) return { success: false, error: 'Proposal not found' };

    const context = extractFollowUpContext(proposal);

    const systemPrompt = `You are a project management assistant helping to create smart reminders for proposals.\n\nYour job is to suggest appropriate reminders based on:\n- The proposal status\n- How long it's been since submission\n- Industry best practices for follow-up timing\n\nGuidelines:\n- Suggest 1-3 reminders maximum\n- Each reminder should have a clear purpose\n- Suggested dates should be realistic and actionable\n\nRespond with valid JSON only.`;

    const userPrompt = `Analyze this proposal and suggest appropriate reminders:\n\nPROJECT: ${context.projectName}\nCLIENT: ${context.clientName}${context.clientCompany ? ` at ${context.clientCompany}` : ''}\nVALUE: ${context.totalValue > 0 ? `$${context.totalValue.toLocaleString()}` : 'Not specified'}\nCURRENT STATUS: ${context.status}\nDAYS SINCE SUBMISSION: ${context.daysSinceSubmission}\nTODAY'S DATE: ${new Date().toISOString().split('T')[0]}\n\nRespond with JSON:\n{\n  "reminders": [{ "title": "...", "content": "...", "suggestedDate": "YYYY-MM-DD", "priority": "low|medium|high", "reasoning": "..." }],\n  "analysis": "...",\n  "confidence": 0.85\n}`;

    const response = await callOpenAI(openaiApiKey, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
    const parsed = parseJSONResponse<{ reminders: Array<{ title: string; content: string; suggestedDate: string; priority: string; reasoning: string }>; analysis: string; confidence: number }>(response.content);

    if (!parsed.reminders || !Array.isArray(parsed.reminders)) return { success: false, error: 'Invalid AI response format' };

    const savedSuggestions = [];
    for (const reminder of parsed.reminders.slice(0, 3)) {
      const { data: suggestion, error: insertError } = await supabase
        .from('ai_suggestions')
        .insert({
          proposal_id: proposalId, organization_id: organizationId, user_id: userId,
          suggestion_type: 'status_reminder', title: reminder.title,
          content: `${reminder.content}\n\nSuggested date: ${reminder.suggestedDate}\nPriority: ${reminder.priority}`,
          reasoning: `${reminder.reasoning}\n\nOverall analysis: ${parsed.analysis}`,
          confidence_score: Math.min(Math.max(parsed.confidence || 0.8, 0), 1), model_used: 'gpt-4o-mini',
          prompt_tokens: Math.floor(response.tokenUsage.prompt / parsed.reminders.length),
          completion_tokens: Math.floor(response.tokenUsage.completion / parsed.reminders.length), status: 'pending',
        })
        .select().single();

      if (!insertError && suggestion) {
        savedSuggestions.push({ id: suggestion.id, title: suggestion.title, content: suggestion.content, reasoning: suggestion.reasoning, confidence_score: suggestion.confidence_score });
      }
    }

    return { success: true, data: { suggestions: savedSuggestions }, tokenUsage: response.tokenUsage };
  } catch (error) {
    console.error('suggestReminders error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Recommendation Engine
// ============================================================================

async function getRecommendations(params: { supabase: SupabaseClient; openaiApiKey: string; proposalId: string; organizationId: string; userId: string }) {
  const { supabase, openaiApiKey, proposalId, organizationId, userId } = params;

  try {
    const { data: proposal, error: proposalError } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
    if (proposalError || !proposal) return { success: false, error: 'Proposal not found' };

    const { data: orgStats } = await supabase.from('proposals').select('status, total_value').eq('organization_id', organizationId).in('status', ['Won', 'Rejected']);
    const wonCount = orgStats?.filter(p => p.status === 'Won').length || 0;
    const totalDecided = orgStats?.length || 1;
    const winRate = Math.round((wonCount / totalDecided) * 100);

    const context = extractFollowUpContext(proposal);
    const formContext = extractFormDataContext(proposal.form_data || {});

    const systemPrompt = `You are a business development strategist helping to optimize proposal outcomes.\n\nYour role is to analyze proposals and suggest actionable recommendations to improve win rates.\n\nGuidelines:\n- Provide 1-3 specific, actionable recommendations\n- Consider timing, client relationship, and proposal value\n- Focus on practical steps the team can take\n\nRespond with valid JSON only.`;

    const userPrompt = `Analyze this proposal and provide strategic recommendations:\n\nPROJECT: ${context.projectName}\nCLIENT: ${context.clientName}${context.clientCompany ? ` at ${context.clientCompany}` : ''}\nVALUE: ${context.totalValue > 0 ? `$${context.totalValue.toLocaleString()}` : 'Not specified'}\nCURRENT STATUS: ${context.status}\nDAYS SINCE SUBMISSION: ${context.daysSinceSubmission}\n\nORGANIZATION CONTEXT:\n- Historical win rate: ${winRate}%\n- Total decided proposals: ${totalDecided}\n\nADDITIONAL DETAILS:\n${formContext}\n\nRespond with JSON:\n{\n  "recommendations": [{ "title": "...", "description": "...", "actionType": "follow_up|update_status|schedule_meeting|review_pricing|other", "priority": "low|medium|high", "reasoning": "..." }],\n  "overallAssessment": "...",\n  "confidence": 0.85\n}`;

    const response = await callOpenAI(openaiApiKey, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
    const parsed = parseJSONResponse<{ recommendations: Array<{ title: string; description: string; actionType: string; priority: string; reasoning: string }>; overallAssessment: string; confidence: number }>(response.content);

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) return { success: false, error: 'Invalid AI response format' };

    const savedSuggestions = [];
    for (const rec of parsed.recommendations.slice(0, 3)) {
      const { data: suggestion, error: insertError } = await supabase
        .from('ai_suggestions')
        .insert({
          proposal_id: proposalId, organization_id: organizationId, user_id: userId,
          suggestion_type: 'action_recommendation', title: rec.title,
          content: `${rec.description}\n\nAction type: ${rec.actionType}\nPriority: ${rec.priority}`,
          reasoning: `${rec.reasoning}\n\nOverall assessment: ${parsed.overallAssessment}`,
          confidence_score: Math.min(Math.max(parsed.confidence || 0.8, 0), 1), model_used: 'gpt-4o-mini',
          prompt_tokens: Math.floor(response.tokenUsage.prompt / parsed.recommendations.length),
          completion_tokens: Math.floor(response.tokenUsage.completion / parsed.recommendations.length), status: 'pending',
        })
        .select().single();

      if (!insertError && suggestion) {
        savedSuggestions.push({ id: suggestion.id, title: suggestion.title, content: suggestion.content, reasoning: suggestion.reasoning, confidence_score: suggestion.confidence_score });
      }
    }

    return { success: true, data: { suggestions: savedSuggestions }, tokenUsage: response.tokenUsage };
  } catch (error) {
    console.error('getRecommendations error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Context Analyzer
// ============================================================================

async function analyzeContext(params: {
  supabase: SupabaseClient;
  openaiApiKey: string;
  proposalId: string;
  organizationId: string;
  userId: string;
  triggerType?: string;
  metadata?: { previousStatus?: string; newStatus?: string };
}) {
  const { supabase, openaiApiKey, proposalId, organizationId, userId, triggerType, metadata } = params;

  try {
    const { data: proposal, error: proposalError } = await supabase.from('proposals').select('*, ai_last_analyzed_at').eq('id', proposalId).single();
    if (proposalError || !proposal) return { success: false, error: 'Proposal not found' };

    // Skip if analyzed recently (unless status changed)
    if (proposal.ai_last_analyzed_at && triggerType !== 'status_changed') {
      const lastAnalyzed = new Date(proposal.ai_last_analyzed_at);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (lastAnalyzed > thirtyMinutesAgo) {
        const { data: existingSuggestions } = await supabase.from('ai_suggestions').select('*').eq('proposal_id', proposalId).eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
        return { success: true, data: { suggestions: (existingSuggestions || []).map(s => ({ id: s.id, title: s.title, content: s.content, suggestion_type: s.suggestion_type, confidence_score: s.confidence_score })), analyzedAt: proposal.ai_last_analyzed_at } };
      }
    }

    const context = extractFollowUpContext(proposal);
    const formContext = extractFormDataContext(proposal.form_data || {});

    // Fetch extended context
    const { data: tasks } = await supabase.from('project_tasks').select('id, title, status, due_date, created_at').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(10);
    const { data: notifications } = await supabase.from('notifications').select('id, type, status, scheduled_for').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(5);

    const now = new Date();
    const tasksList = (tasks || []).map(t => ({ id: t.id, title: t.title, status: t.status, due_date: t.due_date, is_overdue: t.due_date ? new Date(t.due_date) < now : false }));
    const notificationsList = (notifications || []).map(n => ({ id: n.id, type: n.type, status: n.status, scheduled_for: n.scheduled_for }));

    const overdueTasks = tasksList.filter(t => t.is_overdue && t.status !== 'completed');
    const incompleteTasks = tasksList.filter(t => t.status !== 'completed');
    const pendingNotifications = notificationsList.filter(n => n.status === 'pending');

    const activities = [];
    if (overdueTasks.length > 0) activities.push(`${overdueTasks.length} overdue task(s)`);
    if (incompleteTasks.length > 0) activities.push(`${incompleteTasks.length} incomplete task(s)`);
    if (pendingNotifications.length > 0) activities.push(`${pendingNotifications.length} pending notification(s)`);

    let triggerContext = '';
    if (triggerType === 'status_changed' && metadata) triggerContext = `\n\nSTATUS JUST CHANGED: ${metadata.previousStatus} → ${metadata.newStatus}`;
    else if (triggerType === 'panel_opened') triggerContext = '\n\nUser just opened this proposal to review it.';
    else if (triggerType === 'time_elapsed') triggerContext = '\n\nThis is a scheduled background check.';

    const tasksContext = tasksList.length > 0 ? tasksList.map(t => `- ${t.title}: ${t.status}${t.due_date ? ` (due: ${new Date(t.due_date).toLocaleDateString()})` : ''}${t.is_overdue ? ' [OVERDUE]' : ''}`).join('\n') : 'No tasks found.';
    const notificationsContext = notificationsList.length > 0 ? notificationsList.map(n => `- ${n.type}: ${n.status}${n.scheduled_for ? ` (scheduled: ${new Date(n.scheduled_for).toLocaleDateString()})` : ''}`).join('\n') : 'No scheduled notifications.';
    const activitySummary = activities.length ? activities.join(', ') : 'No notable activity';

    const systemPrompt = `You are a proactive business assistant that analyzes proposal status, tasks, and project activity to suggest helpful actions.\n\nGuidelines:\n- Be helpful and specific, not generic\n- Focus on actionable insights\n- Consider timing, deadlines, and urgency\n- Look for overdue tasks or upcoming deadlines\n- Maximum 3 insights per analysis\n\nTypes: follow_up_email, status_reminder, action_recommendation, win_loss_insight, task_suggestion, pricing_suggestion\n\nRespond with valid JSON only, no markdown code blocks.`;

    const userPrompt = `Analyze this proposal and its related data:\n\n== PROPOSAL ==\nPROJECT: ${context.projectName}\nCLIENT: ${context.clientName}${context.clientCompany ? ` at ${context.clientCompany}` : ''}\nVALUE: ${context.totalValue > 0 ? `$${context.totalValue.toLocaleString()}` : 'Not specified'}\nCURRENT STATUS: ${context.status}\nDAYS SINCE LAST UPDATE: ${context.daysSinceSubmission}${triggerContext}\n\n== TASKS ==\n${tasksContext}\n\n== NOTIFICATIONS ==\n${notificationsContext}\n\n== ACTIVITY SUMMARY ==\n${activitySummary}\n\n== FORM DATA ==\n${formContext}\n\nRespond with JSON:\n{\n  "insights": [{ "type": "...", "title": "...", "message": "...", "suggestedAction": "...", "priority": "high|medium|low", "reasoning": "...", "confidence": 0.85 }],\n  "summary": "A brief conversational message to the user summarizing what you found (1-2 sentences)"\n}`;

    const response = await callOpenAI(openaiApiKey, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], { temperature: 0.4, maxTokens: 1500 });
    const parsed = parseJSONResponse<{ insights: Array<{ type: string; title: string; message: string; suggestedAction: string; priority: string; reasoning: string; confidence: number }>; summary: string }>(response.content);

    const createdSuggestions: Array<{ id: string; title: string; content: string; suggestion_type: string; confidence_score: number }> = [];

    for (const insight of parsed.insights || []) {
      const { data: existing } = await supabase.from('ai_suggestions').select('id').eq('proposal_id', proposalId).eq('suggestion_type', insight.type).eq('status', 'pending').limit(1).single();
      if (existing) continue;

      const { data: suggestion, error: insertError } = await supabase
        .from('ai_suggestions')
        .insert({
          proposal_id: proposalId, organization_id: organizationId, user_id: userId,
          suggestion_type: insight.type, title: insight.title, content: insight.message + '\n\n' + insight.suggestedAction,
          reasoning: insight.reasoning, confidence_score: Math.min(Math.max(insight.confidence, 0), 1), model_used: 'gpt-4o-mini',
          prompt_tokens: Math.floor(response.tokenUsage.prompt / (parsed.insights?.length || 1)),
          completion_tokens: Math.floor(response.tokenUsage.completion / (parsed.insights?.length || 1)), status: 'pending',
        })
        .select().single();

      if (!insertError && suggestion) {
        createdSuggestions.push({ id: suggestion.id, title: suggestion.title, content: suggestion.content, suggestion_type: suggestion.suggestion_type, confidence_score: suggestion.confidence_score });
      }
    }

    let proactiveMessage = null;
    if (parsed.summary && createdSuggestions.length > 0) {
      const { data: message, error: messageError } = await supabase
        .from('ai_messages')
        .insert({ proposal_id: proposalId, organization_id: organizationId, user_id: null, role: 'assistant', content: parsed.summary, is_proactive: true, model_used: 'gpt-4o-mini', tokens_used: response.tokenUsage.total })
        .select().single();
      if (!messageError && message) proactiveMessage = { id: message.id, content: message.content };
    }

    await supabase.from('proposals').update({ ai_last_analyzed_at: new Date().toISOString() }).eq('id', proposalId);

    return { success: true, data: { suggestions: createdSuggestions, proactiveMessage: proactiveMessage || undefined, analyzedAt: new Date().toISOString() }, tokenUsage: response.tokenUsage };
  } catch (error) {
    console.error('analyzeContext error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Chat Handler
// ============================================================================

async function handleChat(params: {
  supabase: SupabaseClient;
  openaiApiKey: string;
  proposalId?: string; // Optional for global chat
  organizationId: string;
  userId: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}) {
  const { supabase, openaiApiKey, proposalId, organizationId, userId, message, conversationHistory } = params;
  const isGlobalChat = !proposalId;

  try {
    // Get organization info
    const { data: organization } = await supabase.from('organizations').select('name, organization_info').eq('id', organizationId).single();

    let systemPrompt: string;
    let context: ReturnType<typeof extractFollowUpContext> | null = null;

    if (isGlobalChat) {
      // Global chat mode - fetch organization-level context
      type ProposalSummary = { id: string; project_name: string | null; client_name: string | null; status: string; total_value: number | null; created_at: string; updated_at: string };
      const { data: recentProposals } = await supabase.from('proposals').select('id, project_name, client_name, status, total_value, created_at, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(10) as { data: ProposalSummary[] | null };

      // Calculate stats
      const proposals = recentProposals || [];
      const proposalStats = {
        total: proposals.length,
        draft: proposals.filter((p: ProposalSummary) => p.status === 'Draft').length,
        submitted: proposals.filter((p: ProposalSummary) => p.status === 'Submitted').length,
        won: proposals.filter((p: ProposalSummary) => p.status === 'Won').length,
        rejected: proposals.filter((p: ProposalSummary) => p.status === 'Rejected').length,
        totalValue: proposals.reduce((sum: number, p: ProposalSummary) => sum + (p.total_value || 0), 0),
        wonValue: proposals.filter((p: ProposalSummary) => p.status === 'Won').reduce((sum: number, p: ProposalSummary) => sum + (p.total_value || 0), 0),
      };
      const winRate = proposalStats.total > 0 ? Math.round((proposalStats.won / proposalStats.total) * 100) : 0;

      const proposalsList = proposals.map((p: ProposalSummary) => `- ${p.project_name || 'Unnamed'} (${p.client_name || 'No client'}): ${p.status}${p.total_value ? ` - $${p.total_value.toLocaleString()}` : ''}`).join('\n') || 'No proposals yet.';

      systemPrompt = `You are Ada, a friendly and intelligent AI assistant for ${organization?.name || 'a business'} helping manage proposals and projects.

== ORGANIZATION OVERVIEW ==
- Recent Proposals: ${proposalStats.total}
- By Status: ${proposalStats.draft} Draft, ${proposalStats.submitted} Submitted, ${proposalStats.won} Won, ${proposalStats.rejected} Rejected
- Win Rate: ${winRate}%
- Total Pipeline Value: $${proposalStats.totalValue.toLocaleString()}
- Won Value: $${proposalStats.wonValue.toLocaleString()}

== RECENT PROPOSALS ==
${proposalsList}

== CONVERSATION GUIDELINES ==
1. Be conversational, friendly, and helpful - not robotic
2. ASK CLARIFYING QUESTIONS when you need more information before taking action:
   - If user wants to create something but doesn't specify details (title, description, date, etc.), ask for them
   - If the request is ambiguous, ask for clarification
   - If multiple approaches are possible, offer options and ask which they prefer
3. Don't make assumptions about missing details - it's better to ask than guess wrong
4. Keep responses concise but warm
5. Use the user's name if known, and reference specific proposal names when relevant

You can help users with:
1. Answering questions about their proposals and business
2. Providing insights on proposal performance and win rates
3. General questions about proposal management
4. Writing tips and best practices for proposals

Respond with JSON:
{
  "message": "Your conversational response to the user",
  "action": { "type": "none" }
}`;
    } else {
      // Proposal-specific chat mode
      // Save user message
      await supabase.from('ai_messages').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, role: 'user', content: message, is_proactive: false });

      const { data: proposal, error: proposalError } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
      if (proposalError || !proposal) return { success: false, error: 'Proposal not found' };

      context = extractFollowUpContext(proposal);
      const formContext = extractFormDataContext(proposal.form_data || {});

      // Fetch extended context
      type TaskSummary = { id: string; title: string; status: string; due_date: string | null };
      type NotificationSummary = { id: string; type: string; status: string };
      const { data: tasks } = await supabase.from('project_tasks').select('id, title, status, due_date').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(10) as { data: TaskSummary[] | null };
      const { data: notifications } = await supabase.from('notifications').select('id, type, status').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(5) as { data: NotificationSummary[] | null };

      const tasksContext = (tasks || []).length > 0 ? (tasks || []).map((t: TaskSummary) => `- ${t.title}: ${t.status}${t.due_date ? ` (due: ${new Date(t.due_date).toLocaleDateString()})` : ''}`).join('\n') : 'No tasks yet.';
      const notificationsContext = (notifications || []).length > 0 ? (notifications || []).map((n: NotificationSummary) => `- ${n.type}: ${n.status}`).join('\n') : 'No notifications.';

      systemPrompt = `You are Ada, a friendly and intelligent AI assistant for ${organization?.name || 'a business'} helping manage proposals and projects.

== CURRENT PROPOSAL ==
- Project: ${context.projectName}
- Client: ${context.clientName}${context.clientCompany ? ` (${context.clientCompany})` : ''}
- Value: ${context.totalValue > 0 ? `$${context.totalValue.toLocaleString()}` : 'Not specified'}
- Status: ${context.status}
- Days since update: ${context.daysSinceSubmission}

== TASKS ==
${tasksContext}

== NOTIFICATIONS ==
${notificationsContext}

== FORM DATA ==
${formContext}

== CONVERSATION GUIDELINES ==
1. Be conversational, friendly, and helpful - not robotic
2. ASK CLARIFYING QUESTIONS when you need more information before taking action:
   - Creating a task? Ask for title, description, priority, and due date if not provided
   - Creating a reminder? Ask when they want to be reminded and what for
   - Drafting an email? Ask about tone, key points to include, or recipient if unclear
   - Multiple steps needed? Walk through them one at a time, confirming each step
3. Don't make assumptions about missing details - it's better to ask than guess wrong
4. Only set "action" when you have ALL required information. Otherwise, ask questions first.
5. Keep responses concise but warm
6. Reference the proposal and client by name to show context awareness

You can help users with:
1. Answering questions about this proposal and its tasks
2. Creating reminders (e.g., "remind me to follow up in 3 days")
3. Drafting emails (e.g., "write a follow-up email")
4. Creating tasks (e.g., "create a task to review the pricing")
5. Setting up notifications (e.g., "notify me when...")
6. Providing insights and recommendations

Respond with JSON:
{
  "message": "Your conversational response to the user",
  "action": { "type": "create_reminder | draft_email | update_status | add_note | create_task | create_notification | none", "params": { "key": "value" } },
  "suggestedFollowUp": "Optional: A follow-up question or suggestion"
}

IMPORTANT: Only include an action with type other than "none" when you have ALL the required parameters. If the user's request is missing information (like title, date, description), ask for it first and use action type "none".

Action params by type (only use when you have all required info):
- create_reminder: { "title": "...", "due_date": "ISO date" }
- draft_email: { "subject": "...", "body": "...", "tone": "formal|friendly|urgent" }
- create_task: { "title": "...", "description": "...", "due_date": "ISO date", "priority": "low|medium|high" }
- create_notification: { "type": "reminder|follow_up|deadline", "message": "...", "scheduled_for": "ISO date" }`;
    }

    const messages: OpenAIMessage[] = [{ role: 'system', content: systemPrompt }];
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await callOpenAI(openaiApiKey, messages, { temperature: 0.5, maxTokens: 1000 });
    const parsed = parseJSONResponse<{ message: string; action?: { type: string; params?: Record<string, unknown> }; suggestedFollowUp?: string }>(response.content);

    // For proposal context, save assistant message to database
    let assistantMessageId = `global-${Date.now()}`;
    if (!isGlobalChat) {
      const { data: assistantMessage, error: assistantError } = await supabase
        .from('ai_messages')
        .insert({ proposal_id: proposalId, organization_id: organizationId, user_id: null, role: 'assistant', content: parsed.message, is_proactive: false, model_used: 'gpt-4o-mini', tokens_used: response.tokenUsage.total })
        .select().single();

      if (assistantError) return { success: false, error: 'Failed to save response' };
      assistantMessageId = assistantMessage.id;
    }

    // Handle actions only for proposal context
    let createdSuggestion = null;
    if (!isGlobalChat && parsed.action && parsed.action.type !== 'none') {
      createdSuggestion = await handleChatAction(supabase, parsed.action as { type: string; params?: Record<string, unknown> }, proposalId!, organizationId, userId, parsed.message);
    }

    return { success: true, data: { response: parsed.message, message: { id: assistantMessageId, role: 'assistant' as const, content: parsed.message }, action: parsed.action, suggestion: createdSuggestion || undefined }, tokenUsage: response.tokenUsage };
  } catch (error) {
    console.error('handleChat error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handleChatAction(supabase: SupabaseClient, action: { type: string; params?: Record<string, unknown> }, proposalId: string, organizationId: string, userId: string, responseMessage: string) {
  try {
    switch (action.type) {
      case 'create_reminder': {
        const params = action.params as { title?: string; due_date?: string } | undefined;
        const { data: suggestion } = await supabase.from('ai_suggestions').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, suggestion_type: 'status_reminder', title: params?.title || 'Reminder', content: `Reminder: ${params?.title || 'Follow up on this proposal'}\n\nDue: ${params?.due_date || 'Soon'}`, reasoning: 'Created via chat request', confidence_score: 1.0, model_used: 'gpt-4o-mini', status: 'pending' }).select().single();
        if (suggestion) return { id: suggestion.id, title: suggestion.title, content: suggestion.content, suggestion_type: suggestion.suggestion_type };
        break;
      }
      case 'draft_email': {
        const params = action.params as { subject?: string; body?: string; tone?: string } | undefined;
        const { data: suggestion } = await supabase.from('ai_suggestions').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, suggestion_type: 'follow_up_email', title: 'Email Draft', content: params?.body || responseMessage, email_subject: params?.subject || 'Follow-up', reasoning: 'Created via chat request', confidence_score: 1.0, model_used: 'gpt-4o-mini', status: 'pending' }).select().single();
        if (suggestion) return { id: suggestion.id, title: suggestion.title, content: suggestion.content, suggestion_type: suggestion.suggestion_type };
        break;
      }
      case 'create_task': {
        const params = action.params as { title?: string; description?: string; due_date?: string; priority?: string } | undefined;
        const { data: task, error: taskError } = await supabase.from('project_tasks').insert({ proposal_id: proposalId, organization_id: organizationId, title: params?.title || 'New Task', description: params?.description || '', status: 'pending', priority: params?.priority || 'medium', due_date: params?.due_date || null, created_by: userId }).select().single();
        if (!taskError && task) {
          const { data: suggestion } = await supabase.from('ai_suggestions').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, suggestion_type: 'action_recommendation', title: `Task Created: ${params?.title || 'New Task'}`, content: `A new task has been created.\n\nTitle: ${params?.title}\nDescription: ${params?.description || 'None'}\nDue: ${params?.due_date || 'Not set'}`, reasoning: 'Created via chat request', confidence_score: 1.0, model_used: 'gpt-4o-mini', status: 'applied', applied_at: new Date().toISOString() }).select().single();
          if (suggestion) return { id: suggestion.id, title: suggestion.title, content: suggestion.content, suggestion_type: suggestion.suggestion_type };
        }
        break;
      }
      case 'create_notification': {
        const params = action.params as { type?: string; message?: string; scheduled_for?: string } | undefined;
        const { data: notification, error: notifError } = await supabase.from('notifications').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, type: params?.type || 'reminder', message: params?.message || 'Reminder', status: 'pending', scheduled_for: params?.scheduled_for || null }).select().single();
        if (!notifError && notification) {
          const { data: suggestion } = await supabase.from('ai_suggestions').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, suggestion_type: 'status_reminder', title: 'Notification Scheduled', content: `A notification has been scheduled.\n\nType: ${params?.type || 'reminder'}\nMessage: ${params?.message || 'Reminder'}\nScheduled: ${params?.scheduled_for || 'Immediately'}`, reasoning: 'Created via chat request', confidence_score: 1.0, model_used: 'gpt-4o-mini', status: 'applied', applied_at: new Date().toISOString() }).select().single();
          if (suggestion) return { id: suggestion.id, title: suggestion.title, content: suggestion.content, suggestion_type: suggestion.suggestion_type };
        }
        break;
      }
      case 'add_note':
      case 'update_status': {
        const { data: suggestion } = await supabase.from('ai_suggestions').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, suggestion_type: 'action_recommendation', title: action.type === 'add_note' ? 'Add Note' : 'Update Status', content: responseMessage, reasoning: 'Created via chat request', confidence_score: 1.0, model_used: 'gpt-4o-mini', status: 'pending' }).select().single();
        if (suggestion) return { id: suggestion.id, title: suggestion.title, content: suggestion.content, suggestion_type: suggestion.suggestion_type };
        break;
      }
    }
  } catch (error) {
    console.error('handleChatAction error:', error);
  }
  return null;
}

// ============================================================================
// Main Handler
// ============================================================================

//@ts-ignore
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    //@ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ success: false, error: 'Service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'AI service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const request: WorkflowRequest = await req.json();

    // Validate required fields - proposalId is optional for 'chat' action (global chat mode)
    const requiresProposalId = request.action !== 'chat';
    if (!request.action || !request.organizationId || !request.userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: action, organizationId, userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (requiresProposalId && !request.proposalId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required field: proposalId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: membership, error: membershipError } = await supabaseClient.from('memberships').select('role').eq('organization_id', request.organizationId).eq('user_id', user.id).eq('status', 'Active').single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ success: false, error: 'Access denied to organization' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let result;
    switch (request.action) {
      case 'generate_follow_up':
        result = await generateFollowUp({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: request.userId, options: request.options });
        break;
      case 'suggest_reminders':
        result = await suggestReminders({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: request.userId });
        break;
      case 'get_recommendations':
        result = await getRecommendations({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: request.userId });
        break;
      case 'analyze_context':
        result = await analyzeContext({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: request.userId, triggerType: request.triggerType, metadata: request.metadata });
        break;
      case 'chat':
        if (!request.message) {
          return new Response(JSON.stringify({ success: false, error: 'Message is required for chat action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = await handleChat({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: request.userId, message: request.message, conversationHistory: request.conversationHistory });
        break;
      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${request.action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log agent run
    const duration = Date.now() - startTime;
    const agentTypes: Record<string, string> = { generate_follow_up: 'follow_up_generator', suggest_reminders: 'reminder_suggester', get_recommendations: 'recommendation_engine', analyze_context: 'status_monitor', chat: 'recommendation_engine' };
    try {
      await supabaseAdmin.from('ai_agent_runs').insert({ organization_id: request.organizationId, triggered_by: user.id, agent_type: agentTypes[request.action] || 'recommendation_engine', trigger_event: 'manual', proposal_id: request.proposalId, status: result.success ? 'completed' : 'failed', suggestions_generated: result.success ? 1 : 0, duration_ms: duration, error_message: result.error || null, total_tokens: result.tokenUsage?.total || null, started_at: new Date(Date.now() - duration).toISOString(), completed_at: new Date().toISOString() });
    } catch (logError) {
      console.error('Failed to log agent run:', logError);
    }

    return new Response(JSON.stringify(result), { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('AI Workflow Agent error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
