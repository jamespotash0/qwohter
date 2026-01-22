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
  | 'chat'
  | 'confirm_action';

type PendingActionType =
  | 'create_task'
  | 'create_reminder'
  | 'draft_email'
  | 'create_notification'
  | 'create_proposal'
  | 'send_to_board'
  | 'add_attachment'
  | 'update_presentation'
  | 'update_integration'
  | 'web_search';

interface PendingAction {
  id: string;
  type: PendingActionType;
  params: Record<string, unknown>;
  proposalId?: string;
  proposalName?: string;
}

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
  pendingAction?: PendingAction; // For confirm_action
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
// Task Reference Generation
// ============================================================================

/**
 * Generate org initials from name (e.g., "Acme Corp" -> "AC", "WallQu" -> "WAL")
 * Removes special characters before processing to avoid hyphens/symbols in reference
 */
function getOrgInitials(orgName: string): string {
  if (!orgName?.trim()) return 'TSK';

  // Remove special characters (keep only letters, numbers, spaces)
  const cleanedName = orgName.replace(/[^a-zA-Z0-9\s]/g, '');
  const words = cleanedName.trim().toUpperCase().split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return 'TSK';

  if (words.length === 1) {
    // Single word: take first 3 chars
    return words[0]!.slice(0, 3);
  }

  // Multiple words: take first letter of each (max 3)
  return words.slice(0, 3).map(w => w[0]).join('');
}

/**
 * Get the next task reference number for an organization
 */
async function getNextTaskReference(supabase: SupabaseClient, organizationId: string): Promise<string> {
  // Get org name for prefix
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  const orgData = org as { name: string } | null;
  const initials = getOrgInitials(orgData?.name || 'TASK');

  // Find max existing reference number
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('reference')
    .eq('organization_id', organizationId)
    .not('reference', 'is', null);

  let maxNum = 0;
  const pattern = new RegExp(`^${initials}-(\\d+)$`);

  const taskList = (tasks || []) as { reference: string | null }[];
  for (const task of taskList) {
    if (!task.reference) continue;
    const match = task.reference.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${initials}-${maxNum + 1}`;
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
// Content Moderation
// ============================================================================

const BLOCKED_PATTERNS = [
  // SQL injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
  // Script injection
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  // Command injection
  /[;&|`$].*\b(rm|del|format|shutdown|reboot|curl|wget|nc|bash|sh|powershell)\b/i,
  // Explicit content markers
  /\b(porn|xxx|nsfw|explicit|nude)\b/i,
];

const HARMFUL_INTENT_KEYWORDS = [
  'delete all', 'drop table', 'truncate', 'destroy', 'hack', 'exploit',
  'inject', 'bypass security', 'steal data', 'unauthorized access',
];

interface ModerationResult {
  safe: boolean;
  reason?: string;
  flaggedPatterns?: string[];
}

function moderateContent(content: string): ModerationResult {
  if (!content || typeof content !== 'string') {
    return { safe: true };
  }

  const flaggedPatterns: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      flaggedPatterns.push(pattern.toString());
    }
  }

  // Check harmful intent keywords
  for (const keyword of HARMFUL_INTENT_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      flaggedPatterns.push(`keyword: ${keyword}`);
    }
  }

  if (flaggedPatterns.length > 0) {
    return {
      safe: false,
      reason: 'Content contains potentially harmful patterns',
      flaggedPatterns,
    };
  }

  return { safe: true };
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
        .eq('status', 'Pending')
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
        prompt_tokens: response.tokenUsage.prompt, completion_tokens: response.tokenUsage.completion, status: 'Pending',
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
          completion_tokens: Math.floor(response.tokenUsage.completion / parsed.reminders.length), status: 'Pending',
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
    const wonCount = orgStats?.filter((p: { status: string }) => p.status === 'Won').length || 0;
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
          completion_tokens: Math.floor(response.tokenUsage.completion / parsed.recommendations.length), status: 'Pending',
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
        const { data: existingSuggestions } = await supabase.from('ai_suggestions').select('*').eq('proposal_id', proposalId).eq('status', 'Pending').order('created_at', { ascending: false }).limit(5);
        return { success: true, data: { suggestions: (existingSuggestions || []).map((s: { id: string; title: string; content: string; suggestion_type: string; confidence_score: number }) => ({ id: s.id, title: s.title, content: s.content, suggestion_type: s.suggestion_type, confidence_score: s.confidence_score })), analyzedAt: proposal.ai_last_analyzed_at } };
      }
    }

    const context = extractFollowUpContext(proposal);
    const formContext = extractFormDataContext(proposal.form_data || {});

    // Fetch extended context
    const { data: tasks } = await supabase.from('project_tasks').select('id, title, status, due_date, created_at').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(10);
    const { data: notifications } = await supabase.from('notifications').select('id, type, status, scheduled_for').eq('proposal_id', proposalId).order('created_at', { ascending: false }).limit(5);

    const now = new Date();
    type TaskRow = { id: string; title: string; status: string; due_date: string | null };
    type NotificationRow = { id: string; type: string; status: string; scheduled_for: string | null };
    const tasksList = (tasks || []).map((t: TaskRow) => ({ id: t.id, title: t.title, status: t.status, due_date: t.due_date, is_overdue: t.due_date ? new Date(t.due_date) < now : false }));
    const notificationsList = (notifications || []).map((n: NotificationRow) => ({ id: n.id, type: n.type, status: n.status, scheduled_for: n.scheduled_for }));

    const overdueTasks = tasksList.filter((t: { is_overdue: boolean; status: string }) => t.is_overdue && t.status !== 'completed');
    const incompleteTasks = tasksList.filter((t: { status: string }) => t.status !== 'completed');
    const pendingNotifications = notificationsList.filter((n: { status: string }) => n.status === 'pending');

    const activities = [];
    if (overdueTasks.length > 0) activities.push(`${overdueTasks.length} overdue task(s)`);
    if (incompleteTasks.length > 0) activities.push(`${incompleteTasks.length} incomplete task(s)`);
    if (pendingNotifications.length > 0) activities.push(`${pendingNotifications.length} pending notification(s)`);

    let triggerContext = '';
    if (triggerType === 'status_changed' && metadata) triggerContext = `\n\nSTATUS JUST CHANGED: ${metadata.previousStatus} → ${metadata.newStatus}`;
    else if (triggerType === 'panel_opened') triggerContext = '\n\nUser just opened this proposal to review it.';
    else if (triggerType === 'time_elapsed') triggerContext = '\n\nThis is a scheduled background check.';

    type TaskItem = { title: string; status: string; due_date: string | null; is_overdue: boolean };
    type NotificationItem = { type: string; status: string; scheduled_for: string | null };
    const tasksContext = tasksList.length > 0 ? tasksList.map((t: TaskItem) => `- ${t.title}: ${t.status}${t.due_date ? ` (due: ${new Date(t.due_date).toLocaleDateString()})` : ''}${t.is_overdue ? ' [OVERDUE]' : ''}`).join('\n') : 'No tasks found.';
    const notificationsContext = notificationsList.length > 0 ? notificationsList.map((n: NotificationItem) => `- ${n.type}: ${n.status}${n.scheduled_for ? ` (scheduled: ${new Date(n.scheduled_for).toLocaleDateString()})` : ''}`).join('\n') : 'No scheduled notifications.';
    const activitySummary = activities.length ? activities.join(', ') : 'No notable activity';

    const systemPrompt = `You are a proactive business assistant that analyzes proposal status, tasks, and project activity to suggest helpful actions.\n\nGuidelines:\n- Be helpful and specific, not generic\n- Focus on actionable insights\n- Consider timing, deadlines, and urgency\n- Look for overdue tasks or upcoming deadlines\n- Maximum 3 insights per analysis\n\nTypes: follow_up_email, status_reminder, action_recommendation, win_loss_insight, task_suggestion, pricing_suggestion\n\nRespond with valid JSON only, no markdown code blocks.`;

    const userPrompt = `Analyze this proposal and its related data:\n\n== PROPOSAL ==\nPROJECT: ${context.projectName}\nCLIENT: ${context.clientName}${context.clientCompany ? ` at ${context.clientCompany}` : ''}\nVALUE: ${context.totalValue > 0 ? `$${context.totalValue.toLocaleString()}` : 'Not specified'}\nCURRENT STATUS: ${context.status}\nDAYS SINCE LAST UPDATE: ${context.daysSinceSubmission}${triggerContext}\n\n== TASKS ==\n${tasksContext}\n\n== NOTIFICATIONS ==\n${notificationsContext}\n\n== ACTIVITY SUMMARY ==\n${activitySummary}\n\n== FORM DATA ==\n${formContext}\n\nRespond with JSON:\n{\n  "insights": [{ "type": "...", "title": "...", "message": "...", "suggestedAction": "...", "priority": "high|medium|low", "reasoning": "...", "confidence": 0.85 }],\n  "summary": "A brief conversational message to the user summarizing what you found (1-2 sentences)"\n}`;

    const response = await callOpenAI(openaiApiKey, [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], { temperature: 0.4, maxTokens: 1500 });
    const parsed = parseJSONResponse<{ insights: Array<{ type: string; title: string; message: string; suggestedAction: string; priority: string; reasoning: string; confidence: number }>; summary: string }>(response.content);

    const createdSuggestions: Array<{ id: string; title: string; content: string; suggestion_type: string; confidence_score: number }> = [];

    for (const insight of parsed.insights || []) {
      const { data: existing } = await supabase.from('ai_suggestions').select('id').eq('proposal_id', proposalId).eq('suggestion_type', insight.type).eq('status', 'Pending').limit(1).single();
      if (existing) continue;

      const { data: suggestion, error: insertError } = await supabase
        .from('ai_suggestions')
        .insert({
          proposal_id: proposalId, organization_id: organizationId, user_id: userId,
          suggestion_type: insight.type, title: insight.title, content: insight.message + '\n\n' + insight.suggestedAction,
          reasoning: insight.reasoning, confidence_score: Math.min(Math.max(insight.confidence, 0), 1), model_used: 'gpt-4o-mini',
          prompt_tokens: Math.floor(response.tokenUsage.prompt / (parsed.insights?.length || 1)),
          completion_tokens: Math.floor(response.tokenUsage.completion / (parsed.insights?.length || 1)), status: 'Pending',
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
        .insert({ proposal_id: proposalId, organization_id: organizationId, user_id: null, role: 'Assistant', content: parsed.summary, is_proactive: true, model_used: 'gpt-4o-mini', tokens_used: response.tokenUsage.total })
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
  userRole?: string; // User's role in the organization
}) {
  const { supabase, openaiApiKey, proposalId, organizationId, userId, message, conversationHistory, userRole } = params;
  const isGlobalChat = !proposalId;
  const isGreetingRequest = message === '[GREETING]';

  // Skip content moderation for greeting requests
  if (!isGreetingRequest) {
    // Content moderation check
    const moderationResult = moderateContent(message);
    if (!moderationResult.safe) {
      console.warn('Content moderation blocked message:', moderationResult);
      return {
        success: false,
        error: 'Your message contains content that cannot be processed. Please rephrase your request.',
        moderation: { blocked: true, reason: moderationResult.reason },
      };
    }
  }

  try {
    // Get organization info
    const { data: organization } = await supabase.from('organizations').select('name, organization_info').eq('id', organizationId).single();

    // Fetch user's role if not provided
    let effectiveRole = userRole;
    if (!effectiveRole) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single();
      effectiveRole = membership?.role || 'Member';
    }
    const isAdmin = effectiveRole === 'Admin' || effectiveRole === 'Owner';

    let systemPrompt: string;
    let context: ReturnType<typeof extractFollowUpContext> | null = null;
    let proposalsForSelection: Array<{ id: string; name: string; number: string | null }> = [];

    if (isGlobalChat) {
      // Global chat mode - fetch organization-level context
      type ProposalSummary = { id: string; proposal_number: string | null; project_name: string | null; client_name: string | null; status: string; total_value: number | null; is_on_board: boolean | null; created_at: string; updated_at: string };
      const { data: recentProposals } = await supabase.from('proposals').select('id, proposal_number, project_name, client_name, status, total_value, is_on_board, created_at, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(10) as { data: ProposalSummary[] | null };

      // Fetch project workflow statuses for proposals that are on board
      type ProjectInfo = { proposal_id: string; workflow_status: string };
      const proposalIds = (recentProposals || []).filter(p => p.is_on_board).map(p => p.id);
      let projectMap: Record<string, string> = {};
      if (proposalIds.length > 0) {
        const { data: projects } = await supabase.from('projects').select('proposal_id, workflow_status').in('proposal_id', proposalIds) as { data: ProjectInfo[] | null };
        projectMap = (projects || []).reduce((acc, p) => ({ ...acc, [p.proposal_id]: p.workflow_status }), {} as Record<string, string>);
      }

      // Calculate stats
      const proposals = recentProposals || [];
      proposalsForSelection = proposals.map((p: ProposalSummary) => ({ id: p.id, name: p.project_name || 'Unnamed Project', number: p.proposal_number }));

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

      // Internal mapping for AI to resolve proposals (never shown to users)
      const proposalIdMap: Record<string, string> = {};
      proposals.forEach((p: ProposalSummary) => {
        const key = `${p.proposal_number || ''}-${(p.project_name || '').toLowerCase()}`;
        proposalIdMap[key] = p.id;
      });

      // User-friendly list with clear number→name mapping (no database IDs exposed)
      const proposalsList = proposals.map((p: ProposalSummary) => {
        const num = p.proposal_number || 'No number';
        const name = p.project_name || 'Unnamed';
        const client = p.client_name || 'No client';
        const value = p.total_value ? ` - $${p.total_value.toLocaleString()}` : '';
        // Include board/project status if on board
        const boardStatus = p.is_on_board ? ` → Project: ${projectMap[p.id] || 'On Board'}` : '';
        return `• ${num} = "${name}" (${client}) [${p.status}]${value}${boardStatus}`;
      }).join('\n') || 'No proposals yet.';

      systemPrompt = `You are Ada, a friendly and intelligent AI assistant for ${organization?.name || 'a business'} helping manage proposals and projects.

== CRITICAL RULES ==
1. NEVER expose database IDs, UUIDs, or internal identifiers to users. Always refer to proposals by their proposal number or project name.

2. PROPOSAL NUMBER MATCHING: When a user mentions a proposal number (e.g., "PR-101", "P-001"), ALWAYS look up that number in the RECENT PROPOSALS list below to find the matching project name. The format is:
   • Number = "Project Name" (Client) [Status] - $Value → Project: WorkflowStatus
   - Example: If user says "PR-101" and the list shows "• PR-101 = \"Testin\" (No client) [Won] → Project: In Progress", then:
     - PR-101 IS the "Testin" proposal
     - It's currently WON and has an associated PROJECT with status "In Progress"
   - NEVER say "I don't have PR-101" if it appears in the list - look it up!

3. When referring to proposals in responses, use BOTH the number and name: "PR-101 (Testin)" so users know you found the right one.

4. PROJECTS: When a proposal shows "→ Project: [status]", it means that proposal has been sent to the project board. Use this context when users ask about projects associated with proposals.

== USER CONTEXT ==
- Role: ${effectiveRole} ${isAdmin ? '(has admin privileges)' : '(standard member)'}

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
2. ASK NATURAL QUESTIONS when you need more info - don't ask for specific "fields":
   - BAD: "What title would you like?" or "Please provide: title, description, due date"
   - GOOD: "What's this about?" or "Tell me more about what you need" or "When do you need this done by?"
3. Use your best judgment to fill in details from what the user says naturally
4. Only ask follow-up questions if you genuinely need more context
5. If user wants something for a proposal but doesn't specify which, ask "Which proposal is this for?"
6. Keep responses concise but warm
7. Reference specific proposal names when relevant

== CRITICAL: MULTI-STEP WORKFLOWS ==
Guide users through complex requests ONE STEP AT A TIME. After completing each step, automatically offer the next logical step.

**WORKFLOW CHAINING - VERY IMPORTANT:**
When you complete an action, ALWAYS think about what naturally comes next:
- Task created → Offer to set a reminder/due date
- Reminder set → Confirm and offer related actions
- Email drafted → Offer to send or schedule

**TASK + REMINDER FLOW (most common):**
User: "I need to call the architect about the project"
Step 1: Create the task action immediately with the info you have
→ action: { type: "create_task", params: { title: "Call the architect about the project" } }
(System will auto-prompt: "Would you like me to set a reminder for when this is due?")

Step 2: If user says "yes" or provides a time:
→ action: { type: "create_reminder", params: { title: "Call the architect", due_date: "..." } }

**REMINDER FLOW:**
When user asks for a reminder (e.g., "remind me to X"):
1. If they mention WHEN: Create task with due_date immediately
2. If no time given: Ask "When should I remind you?" then create

**EXAMPLE CONVERSATIONS:**

User: "remind me to call the architect tomorrow"
Ada: (Create immediately - you have title AND time)
→ action: { type: "create_task", params: { title: "Call the architect", due_date: "tomorrow" } }
"Done! I'll remind you tomorrow to call the architect."

User: "create a task to review the proposal"
Ada: (Create immediately - you have the title)
→ action: { type: "create_task", params: { title: "Review the proposal" } }
(System auto-follows up with reminder offer)

User: "yes, remind me Friday"
Ada: (Continue the workflow)
→ action: { type: "create_reminder", params: { title: "Review the proposal", due_date: "Friday" } }

**KEY RULES:**
- Create action as soon as you have the core info (title for tasks)
- The system will automatically prompt for follow-up steps
- If user provides time with request, include it in the action
- Keep the conversation flowing - don't over-confirm simple requests

== CRITICAL: TASK vs ACTION INTENT ==
When users describe something they need to do, create a TASK. Only perform actions if they explicitly ask YOU to do it:

TASK (user will do it themselves):
- "send email to architect" → Ask when, then create_task with due_date
- "call the client" → Ask when, then create_task with due_date
- "follow up with supplier" → Ask when, then create_task with due_date

ACTION (Ada performs it):
- "draft an email for me" → draft_email (user wants you to WRITE it)
- "write a follow-up email" → draft_email (user wants you to COMPOSE it)
- "help me write an email" → draft_email (asking for help writing)

KEY DISTINCTION: Words like "send", "email", "call", "contact" describe what THE USER wants to do → create a task (after confirming details).
Words like "draft", "write", "compose", "help me write" ask YOU to create content → perform the action.

== PERMISSIONS & CAPABILITIES ==
THINGS YOU CAN DO:
- Create tasks, reminders, and notifications for proposals
- Create new proposals from scratch
- Draft follow-up emails
- Update proposal details (status, notes, comments)
- Assign tasks to team members
- Send proposals/projects to boards
- Add attachments and documents to proposals
- Update presentation content
- Search the web for information (plans, templates, research)
- Answer questions about proposals and business metrics

THINGS YOU CANNOT DO (provide guidance instead):
- Delete proposals → Guide: "You can archive proposals from the proposal menu (⋮) → Archive"
- Delete user accounts → Guide: "Account management is in Settings → Team Members"
- Remove team members → Guide: "Go to Settings → Team Members to manage team"
- Update billing/subscription → Guide: "Go to Settings → Billing Plan → Manage Plan"
- Access other organizations' data
${isAdmin ? '' : '- Change organization settings (admin only) → Guide: "Contact your organization admin"'}

When user asks to do something you cannot do, provide helpful navigation instructions instead.

You can help users with:
1. Answering questions about their proposals and business
2. Providing insights on proposal performance and win rates
3. Creating tasks for specific proposals (requires proposal selection)
4. Creating reminders for specific proposals (just needs a title!)
5. Drafting emails for specific proposals (requires proposal selection)
6. Creating new proposals
7. Web searches for research, templates, planning help
8. General questions about proposal management

IMPORTANT - For actions that need a proposal:
- If user specifies a proposal by name (e.g., "the Johnson project") or number (e.g., "P-001"), you can match it
- If no proposal is specified, ASK which proposal by listing their names/numbers: "Which proposal? I see P-001 Johnson Kitchen, P-002 Smith Bathroom..."
- Include "targetProposalNumber" and "targetProjectName" in the action params when you know which proposal
- NEVER mention database IDs or UUIDs to users - only use proposal numbers and project names

Respond with JSON:
{
  "message": "Your conversational response to the user",
  "action": { "type": "create_task | create_reminder | draft_email | create_notification | create_proposal | send_to_board | add_attachment | update_presentation | web_search | none", "params": { ... }, "targetProposalNumber": "P-001 if known", "targetProjectName": "project name if known" }
}

Action params (use your best judgment to fill these from natural conversation):
- create_task: { "title": "infer from context" }
- create_reminder: { "title": "infer from context", "due_date": "if mentioned" }
- draft_email: { "subject": "infer", "body": "generate based on context and tone" }
- create_notification: { "message": "infer from context" }
- create_proposal: { "project_name": "infer from what user describes" }
- send_to_board: { "board_name": "ask if not clear" }
- add_attachment: { "file_name": "from user's description" }
- update_presentation: { "presentation_content": "generate based on request" }
- web_search: { "search_query": "formulate based on what user wants to know" }

IMPORTANT: Don't ask users for "title", "subject", "body" etc. - extract these naturally from conversation.`;
    } else {
      // Proposal-specific chat mode
      // Save user message
      await supabase.from('ai_messages').insert({ proposal_id: proposalId, organization_id: organizationId, user_id: userId, role: 'User', content: message, is_proactive: false });

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

== USER CONTEXT ==
- Role: ${effectiveRole} ${isAdmin ? '(has admin privileges)' : '(standard member)'}

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
2. ASK NATURAL QUESTIONS - never ask for specific "fields" like a form:
   - BAD: "What title would you like?" or "Please provide the subject and body"
   - GOOD: "What's this about?" or "What should the email say?" or "When do you need a reminder?"
3. Only ask follow-up questions if you genuinely can't understand what they want
4. Keep responses concise but warm
5. Reference the proposal and client by name to show context awareness

== CRITICAL: MULTI-STEP WORKFLOWS ==
Guide users through complex requests ONE STEP AT A TIME. After completing each step, automatically offer the next logical step.

**WORKFLOW CHAINING:**
When you complete an action, the system will automatically prompt for next steps:
- Task created → System offers to set a reminder
- You just need to create the action when you have the core info

**TASK + REMINDER FLOW:**
User: "remind me to follow up"
Ada: Create task immediately with context from proposal
→ action: { type: "create_task", params: { title: "Follow up on ${context.projectName} with ${context.clientName}" } }
(System will auto-prompt: "Would you like me to set a reminder for when this is due?")

User: "yes, Friday"
Ada: Create the reminder
→ action: { type: "create_reminder", params: { title: "Follow up on ${context.projectName}", due_date: "Friday" } }

User: "remind me Friday to send the quote"
Ada: (Has both title AND time - create immediately)
→ action: { type: "create_task", params: { title: "Send the quote to ${context.clientName}", due_date: "Friday" } }

**KEY RULES:**
- Create action as soon as you have the core info (title for tasks)
- If user provides a time, include it as due_date
- System handles follow-up prompts automatically
- Reference the proposal/client names to show context awareness
- Keep responses concise - don't over-explain

== CRITICAL: TASK vs ACTION INTENT ==
When users describe something they need to do, create a TASK. Only perform actions if they explicitly ask YOU to do it:

TASK (user will do it themselves):
- "send email to architect" → Ask when, then create_task with due_date
- "call the client" → Ask when, then create_task with due_date
- "follow up with supplier" → Ask when, then create_task with due_date

ACTION (Ada performs it):
- "draft an email for me" → draft_email (user wants you to WRITE it)
- "write a follow-up email" → draft_email (user wants you to COMPOSE it)
- "help me write an email" → draft_email (asking for help writing)

KEY DISTINCTION: Words like "send", "email", "call", "contact" describe what THE USER wants to do → create a task (after confirming details).
Words like "draft", "write", "compose", "help me write" ask YOU to create content → perform the action.

== PERMISSIONS & CAPABILITIES ==
THINGS YOU CAN DO:
- Create tasks, reminders, and notifications for this proposal
- Draft follow-up emails
- Update proposal details (add notes, comments)
- Assign tasks to team members
- Send this proposal to a board
- Add attachments and documents
- Update presentation content
- Search the web for information (plans, templates, research)
- Answer questions about this proposal

THINGS YOU CANNOT DO (provide guidance instead):
- Delete this proposal → Guide: "You can archive from the proposal menu (⋮) → Archive"
- Delete user accounts → Guide: "Account management is in Settings → Team Members"
- Update billing → Guide: "Go to Settings → Billing Plan → Manage Plan"
${isAdmin ? '' : '- Change organization settings (admin only) → Guide: "Contact your organization admin"'}

When user asks to do something you cannot do, provide helpful navigation instructions instead.

You can help users with:
1. Answering questions about this proposal and its tasks
2. Creating reminders (e.g., "remind me to follow up in 3 days")
3. Drafting emails (e.g., "write a follow-up email")
4. Creating tasks (e.g., "create a task to review the pricing")
5. Setting up notifications (e.g., "notify me when...")
6. Web searches for research, templates, or help with planning
7. Adding documents/attachments to this proposal
8. Sending this proposal to a board
9. Providing insights and recommendations

Respond with JSON:
{
  "message": "Your conversational response to the user",
  "action": { "type": "create_reminder | draft_email | update_status | add_note | create_task | create_notification | send_to_board | add_attachment | update_presentation | web_search | none", "params": { "key": "value" } },
  "suggestedFollowUp": "Optional: A follow-up question or suggestion"
}

IMPORTANT: Use your best judgment to fill action params from natural conversation. Don't ask users to provide specific "fields" - infer them.

Action params (infer these naturally from conversation):
- create_task: { "title": "from context", "due_date": "if mentioned", "priority": "if implied" }
- create_reminder: { "title": "from context", "due_date": "if mentioned" }
- draft_email: { "subject": "generate", "body": "generate based on context/tone", "tone": "from request" }
- create_notification: { "message": "from context", "scheduled_for": "if mentioned" }
- send_to_board: { "board_name": "ask only if unclear" }
- add_attachment: { "file_name": "from description" }
- update_presentation: { "presentation_content": "generate from request" }
- web_search: { "search_query": "formulate from user's question" }

Example: User says "remind me to call the client next Tuesday" →
Action: { type: "create_reminder", params: { title: "Call ${context.clientName}", due_date: "next Tuesday ISO" } }`;
    }

    const messages: OpenAIMessage[] = [{ role: 'system', content: systemPrompt }];
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }

    // Handle greeting request with special prompt
    if (isGreetingRequest && isGlobalChat) {
      messages.push({
        role: 'user',
        content: `[SYSTEM: User just opened the chat. Respond with a greeting message that has TWO parts:

PART 1 - Your greeting (2-3 sentences):
- Introduce yourself as Ada
- Give a quick snapshot of their situation (e.g., "You have X proposals, Y won")

PART 2 - These EXACT lines (MUST include, copy exactly with the bullet character):
• What proposals are pending?
• Create a follow-up reminder
• What's my win rate?

CRITICAL: Your "message" field in the JSON MUST end with those 3 bullet point lines exactly as shown above. Use the • character and include newlines between them.]`
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const response = await callOpenAI(openaiApiKey, messages, { temperature: 0.5, maxTokens: 1000 });
    const parsed = parseJSONResponse<{
      message: string;
      action?: { type: string; params?: Record<string, unknown>; targetProposalId?: string; targetProposalNumber?: string; targetProjectName?: string };
      suggestedFollowUp?: string;
    }>(response.content);

    // For proposal context, save assistant message to database
    let assistantMessageId = `global-${Date.now()}`;
    if (!isGlobalChat) {
      const { data: assistantMessage, error: assistantError } = await supabase
        .from('ai_messages')
        .insert({ proposal_id: proposalId, organization_id: organizationId, user_id: null, role: 'Assistant', content: parsed.message, is_proactive: false, model_used: 'gpt-4o-mini', tokens_used: response.tokenUsage.total })
        .select().single();

      if (assistantError) return { success: false, error: 'Failed to save response' };
      assistantMessageId = assistantMessage.id;
    }

    // Build pending action if AI wants to take an action (instead of auto-executing)
    let pendingAction: PendingAction | null = null;
    if (parsed.action && parsed.action.type !== 'none') {
      const actionType = parsed.action.type as PendingActionType;

      // Resolve target proposal ID from number/name (for global chat)
      let targetProposalId: string | undefined = proposalId; // Default to current proposal if in proposal context
      const action = parsed.action; // Capture for type narrowing
      if (isGlobalChat && action && (action.targetProposalNumber || action.targetProjectName)) {
        // Try to find matching proposal by number or name
        const matchByNumber = action.targetProposalNumber
          ? proposalsForSelection.find(p => p.number === action.targetProposalNumber)
          : null;
        const matchByName = action.targetProjectName
          ? proposalsForSelection.find(p => p.name.toLowerCase().includes(action.targetProjectName!.toLowerCase()))
          : null;

        targetProposalId = matchByNumber?.id || matchByName?.id || undefined;
      }

      // Only create pending action if we have a target proposal or it's a global action
      if (targetProposalId || ['create_task', 'create_reminder', 'draft_email', 'create_notification'].includes(actionType)) {
        // Get proposal name if we have a target
        let proposalName: string | undefined;
        if (targetProposalId) {
          const { data: targetProposal } = await supabase
            .from('proposals')
            .select('project_name')
            .eq('id', targetProposalId)
            .single();
          proposalName = targetProposal?.project_name || 'Unnamed Project';
        }

        pendingAction = {
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: actionType,
          params: parsed.action.params || {},
          proposalId: targetProposalId,
          proposalName,
        };
      }
    }

    return {
      success: true,
      data: {
        response: parsed.message,
        message: { id: assistantMessageId, role: 'assistant' as const, content: parsed.message },
        pendingAction: pendingAction || undefined,
        proposalsForSelection: isGlobalChat ? proposalsForSelection : undefined,
      },
      tokenUsage: response.tokenUsage,
    };
  } catch (error) {
    console.error('handleChat error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Confirm Action Handler (Executes pending actions after user approval)
// ============================================================================

async function handleConfirmAction(params: {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
  pendingAction: PendingAction;
}) {
  const { supabase, organizationId, userId, pendingAction } = params;
  const { type, params: actionParams, proposalId } = pendingAction;

  // Actions that don't require a proposal ID
  // Tasks and reminders can be standalone or linked to a project directly
  const actionsWithoutProposal = ['create_proposal', 'update_integration', 'create_task', 'create_reminder'];
  const requiresProposal = !actionsWithoutProposal.includes(type);

  if (requiresProposal && !proposalId) {
    return { success: false, error: 'Proposal ID is required to execute this action' };
  }

  try {
    // Verify proposal exists and user has access (if required)
    // Also look up the associated project if the proposal has been sent to board
    let projectId: string | null = null;

    if (requiresProposal && proposalId) {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('id, project_name')
        .eq('id', proposalId)
        .eq('organization_id', organizationId)
        .single();

      if (proposalError || !proposal) {
        return { success: false, error: 'Proposal not found or access denied' };
      }

      // Look up the project associated with this proposal (if sent to board)
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('proposal_id', proposalId)
        .single();

      if (project) {
        projectId = project.id;
      }
    }

    let result: { id: string; title: string; type: string } | null = null;

    switch (type) {
      case 'create_task': {
        const taskParams = actionParams as { title?: string; description?: string; due_date?: string; priority?: string };

        // Normalize priority to capitalized (DB constraint: 'Low', 'Medium', 'High')
        const validPriorities = ['Low', 'Medium', 'High'];
        const rawPriority = (taskParams.priority || 'Medium').trim();
        // Capitalize first letter, lowercase rest
        const normalizedPriority = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1).toLowerCase();
        const priority = validPriorities.includes(normalizedPriority) ? normalizedPriority : 'Medium';

        // Generate task reference number (e.g., "WAL-42")
        const taskReference = await getNextTaskReference(supabase, organizationId);

        console.log('[create_task] Starting task creation:', {
          userId,
          organizationId,
          projectId,
          title: taskParams.title,
          priority,
          reference: taskReference,
        });

        const insertData = {
          project_id: projectId, // null for standalone tasks
          organization_id: organizationId,
          reference: taskReference,
          title: taskParams.title || 'New Task',
          description: taskParams.description || '',
          status: 'To Do',
          priority,
          due_date: taskParams.due_date || null,
          created_by: userId,
          assigned_to: userId,
        };

        console.log('[create_task] Insert data:', insertData);

        const { data: task, error: taskError } = await supabase
          .from('project_tasks')
          .insert(insertData)
          .select()
          .single();

        if (taskError) {
          console.error('[create_task] Insert failed:', {
            code: taskError.code,
            message: taskError.message,
            details: taskError.details,
            hint: taskError.hint,
          });
          return { success: false, error: `Failed to create task: ${taskError.message} (${taskError.code})` };
        }

        console.log('[create_task] Task created successfully:', task.id);
        result = { id: task.id, title: taskParams.title || 'New Task', type: 'task' };
        break;
      }

      case 'create_reminder': {
        // Reminders are implemented as tasks with a due_date
        // The notification system will send reminders based on the task's due_date
        const reminderParams = actionParams as { title?: string; due_date?: string; message?: string; priority?: string };

        // Normalize priority to capitalized (DB constraint: 'Low', 'Medium', 'High')
        const validReminderPriorities = ['Low', 'Medium', 'High'];
        const rawReminderPriority = (reminderParams.priority || 'Medium').trim();
        // Capitalize first letter, lowercase rest
        const normalizedReminderPriority = rawReminderPriority.charAt(0).toUpperCase() + rawReminderPriority.slice(1).toLowerCase();
        const reminderPriority = validReminderPriorities.includes(normalizedReminderPriority) ? normalizedReminderPriority : 'Medium';

        // Generate task reference number (e.g., "WAL-43")
        const reminderReference = await getNextTaskReference(supabase, organizationId);

        console.log('[create_reminder] Starting reminder creation:', {
          userId,
          organizationId,
          projectId,
          title: reminderParams.title,
          due_date: reminderParams.due_date,
          priority: reminderPriority,
          reference: reminderReference,
        });

        const reminderInsertData = {
          project_id: projectId,
          organization_id: organizationId,
          reference: reminderReference,
          title: reminderParams.title || 'Reminder',
          description: reminderParams.message || `Reminder: ${reminderParams.title || 'Follow up'}`,
          status: 'To Do',
          priority: reminderPriority,
          due_date: reminderParams.due_date || null,
          created_by: userId,
          assigned_to: userId,
        };

        console.log('[create_reminder] Insert data:', reminderInsertData);

        const { data: task, error: taskError } = await supabase
          .from('project_tasks')
          .insert(reminderInsertData)
          .select()
          .single();

        if (taskError) {
          console.error('[create_reminder] Insert failed:', {
            code: taskError.code,
            message: taskError.message,
            details: taskError.details,
            hint: taskError.hint,
          });
          return { success: false, error: `Failed to create reminder: ${taskError.message} (${taskError.code})` };
        }

        console.log('[create_reminder] Task created successfully:', task.id);

        // If a due_date was specified, also create a scheduled notification for exact timing
        if (reminderParams.due_date && task) {
          try {
            await supabase
              .from('scheduled_notifications')
              .insert({
                entity_type: 'Task',
                entity_id: task.id,
                user_id: userId,
                organization_id: organizationId,
                scheduled_for: reminderParams.due_date,
                notification_type: 'Reminder',
                title: `Reminder: ${reminderParams.title || 'Follow up'}`,
                message: reminderParams.message || `Your reminder "${reminderParams.title}" is due`,
                link: `/board?task=${task.id}`,
                metadata: { proposal_id: proposalId },
              });
          } catch (notifError) {
            // Non-critical - the task was created, just log the notification error
            console.warn('Failed to create scheduled notification:', notifError);
          }
        }

        result = { id: task.id, title: reminderParams.title || 'Reminder', type: 'task' };
        break;
      }

      case 'draft_email': {
        const emailParams = actionParams as { subject?: string; body?: string; tone?: string };
        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_suggestions')
          .insert({
            proposal_id: proposalId,
            organization_id: organizationId,
            user_id: userId,
            suggestion_type: 'follow_up_email',
            title: 'Email Draft',
            content: emailParams.body || 'Email content',
            email_subject: emailParams.subject || 'Follow-up',
            reasoning: 'Created via Ada chat',
            confidence_score: 1.0,
            model_used: 'user-confirmed',
            status: 'Pending',
          })
          .select()
          .single();

        if (suggestionError) {
          console.error('Failed to create email draft:', suggestionError);
          return { success: false, error: 'Failed to create email draft' };
        }

        result = { id: suggestion.id, title: emailParams.subject || 'Email Draft', type: 'email' };
        break;
      }

      case 'create_notification': {
        const notifParams = actionParams as { type?: string; message?: string; scheduled_for?: string };
        const { data: notification, error: notifError } = await supabase
          .from('notifications')
          .insert({
            proposal_id: proposalId,
            organization_id: organizationId,
            user_id: userId,
            type: notifParams.type || 'Reminder',
            message: notifParams.message || 'Reminder',
            status: 'Pending',
            scheduled_for: notifParams.scheduled_for || null,
          })
          .select()
          .single();

        if (notifError) {
          console.error('Failed to create notification:', notifError);
          return { success: false, error: 'Failed to create notification' };
        }

        result = { id: notification.id, title: notifParams.message || 'Notification', type: 'notification' };
        break;
      }

      case 'create_proposal': {
        const proposalParams = actionParams as {
          project_name?: string;
          client_name?: string;
          client_company?: string;
          job_location?: string;
          status?: string;
        };

        // Get the next proposal number
        const { data: lastProposal } = await supabase
          .from('proposals')
          .select('proposal_number')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;
        if (lastProposal?.proposal_number) {
          const match = lastProposal.proposal_number.match(/P-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }

        const { data: newProposal, error: proposalError } = await supabase
          .from('proposals')
          .insert({
            organization_id: organizationId,
            proposal_number: `P-${String(nextNumber).padStart(3, '0')}`,
            project_name: proposalParams.project_name || 'New Project',
            client_name: proposalParams.client_name || null,
            client_company: proposalParams.client_company || null,
            job_location: proposalParams.job_location || null,
            status: proposalParams.status || 'Draft',
            form_data: {},
          })
          .select()
          .single();

        if (proposalError) {
          console.error('Failed to create proposal:', proposalError);
          return { success: false, error: 'Failed to create proposal' };
        }

        result = { id: newProposal.id, title: proposalParams.project_name || 'New Project', type: 'proposal' };
        break;
      }

      case 'send_to_board': {
        // For now, log the action - actual board integration would go here
        const boardParams = actionParams as { board_name?: string; board_id?: string };
        console.log('Send to board requested:', { proposalId, boardParams });

        // Create a suggestion to track this action
        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_suggestions')
          .insert({
            proposal_id: proposalId,
            organization_id: organizationId,
            user_id: userId,
            suggestion_type: 'action_recommendation',
            title: `Send to ${boardParams.board_name || 'Board'}`,
            content: `Proposal queued to be sent to board: ${boardParams.board_name || 'Board'}`,
            reasoning: 'Created via Ada chat',
            confidence_score: 1.0,
            model_used: 'user-confirmed',
            status: 'Applied',
          })
          .select()
          .single();

        if (suggestionError) {
          console.error('Failed to log board action:', suggestionError);
        }

        result = { id: suggestion?.id || 'board-action', title: boardParams.board_name || 'Board', type: 'board' };
        break;
      }

      case 'add_attachment': {
        // For now, log the action - actual file handling would need to be done client-side
        const attachmentParams = actionParams as { file_name?: string; file_type?: string; file_url?: string };
        console.log('Add attachment requested:', { proposalId, attachmentParams });

        // Create a note about the attachment request
        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_suggestions')
          .insert({
            proposal_id: proposalId,
            organization_id: organizationId,
            user_id: userId,
            suggestion_type: 'action_recommendation',
            title: `Add Attachment: ${attachmentParams.file_name || 'File'}`,
            content: `Attachment requested: ${attachmentParams.file_name || 'File'}\nType: ${attachmentParams.file_type || 'Unknown'}`,
            reasoning: 'Created via Ada chat - requires manual upload',
            confidence_score: 1.0,
            model_used: 'user-confirmed',
            status: 'Pending',
          })
          .select()
          .single();

        if (suggestionError) {
          console.error('Failed to log attachment action:', suggestionError);
        }

        result = { id: suggestion?.id || 'attachment-action', title: attachmentParams.file_name || 'Attachment', type: 'attachment' };
        break;
      }

      case 'update_presentation': {
        const presentationParams = actionParams as { presentation_content?: string };
        console.log('Update presentation requested:', { proposalId, presentationParams });

        // Store the presentation update as a suggestion
        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_suggestions')
          .insert({
            proposal_id: proposalId,
            organization_id: organizationId,
            user_id: userId,
            suggestion_type: 'action_recommendation',
            title: 'Presentation Update',
            content: presentationParams.presentation_content || 'Presentation content update requested',
            reasoning: 'Created via Ada chat',
            confidence_score: 1.0,
            model_used: 'user-confirmed',
            status: 'Pending',
          })
          .select()
          .single();

        if (suggestionError) {
          console.error('Failed to log presentation update:', suggestionError);
        }

        result = { id: suggestion?.id || 'presentation-action', title: 'Presentation Update', type: 'presentation' };
        break;
      }

      case 'web_search': {
        // Web search action - returns results to be displayed
        const searchParams = actionParams as { search_query?: string; search_context?: string };

        if (!searchParams.search_query) {
          return { success: false, error: 'Search query is required' };
        }

        // For now, we'll create a note that a search was requested
        // In a full implementation, this would call a web search API
        console.log('Web search requested:', searchParams);

        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_suggestions')
          .insert({
            proposal_id: proposalId,
            organization_id: organizationId,
            user_id: userId,
            suggestion_type: 'action_recommendation',
            title: `Search: ${searchParams.search_query}`,
            content: `Web search requested: "${searchParams.search_query}"\nContext: ${searchParams.search_context || 'General search'}`,
            reasoning: 'Web search feature - results will be displayed in future implementation',
            confidence_score: 1.0,
            model_used: 'user-confirmed',
            status: 'Pending',
          })
          .select()
          .single();

        if (suggestionError) {
          console.error('Failed to log search action:', suggestionError);
        }

        result = { id: suggestion?.id || 'search-action', title: searchParams.search_query || 'Search', type: 'search' };
        break;
      }

      case 'update_integration': {
        const integrationParams = actionParams as { integration_type?: string; integration_settings?: Record<string, unknown> };
        console.log('Update integration requested:', { organizationId, integrationParams });

        // Log the integration update request
        result = { id: 'integration-action', title: integrationParams.integration_type || 'Integration', type: 'integration' };
        break;
      }

      default:
        return { success: false, error: `Unknown action type: ${type}` };
    }

    // Generate contextual follow-up message based on action type
    let successMessage = `Done! I've created the ${result?.type}: "${result?.title}".`;
    let followUpPrompt: string | undefined;
    let isWorkflowComplete = false; // True when this is a final step

    switch (type) {
      case 'create_task':
        // After creating a task, offer to set a reminder (workflow continues)
        successMessage = `Done! I've added "${result?.title}" to your task list.`;
        followUpPrompt = 'Would you like me to set a reminder for when this is due?';
        break;
      case 'create_reminder':
        // Reminder is typically the final step of a workflow
        successMessage = `Got it! I'll remind you about "${result?.title}".`;
        isWorkflowComplete = true;
        break;
      case 'draft_email':
        successMessage = `I've drafted the email "${result?.title}". You can review and send it from the proposal.`;
        isWorkflowComplete = true;
        break;
      case 'create_proposal':
        successMessage = `I've created a new proposal: "${result?.title}".`;
        followUpPrompt = 'Would you like to add any details to it?';
        break;
      case 'create_notification':
        successMessage = `Notification set: "${result?.title}".`;
        isWorkflowComplete = true;
        break;
      default:
        isWorkflowComplete = true;
    }

    // Add "anything else" prompt when workflow is complete
    const closingPrompt = isWorkflowComplete ? '\n\nIs there anything else I can help you with?' : '';

    // Combine message with follow-up or closing prompt
    const fullMessage = followUpPrompt
      ? `${successMessage}\n\n${followUpPrompt}`
      : `${successMessage}${closingPrompt}`;

    return {
      success: true,
      data: {
        created: result,
        message: fullMessage,
        followUpPrompt,
      },
    };
  } catch (error) {
    console.error('handleConfirmAction error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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

    // Validate required fields - proposalId is optional for 'chat' and 'confirm_action' (tasks/reminders can be standalone)
    const actionsWithoutProposalRequired = ['chat', 'confirm_action'];
    const requiresProposalId = !actionsWithoutProposalRequired.includes(request.action);
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

    // IMPORTANT: Always use verified user.id from JWT, not request.userId from client
    // This ensures security and that the user ID matches profiles table
    const verifiedUserId = user.id;

    let result;
    switch (request.action) {
      case 'generate_follow_up':
        result = await generateFollowUp({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: verifiedUserId, options: request.options });
        break;
      case 'suggest_reminders':
        result = await suggestReminders({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: verifiedUserId });
        break;
      case 'get_recommendations':
        result = await getRecommendations({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: verifiedUserId });
        break;
      case 'analyze_context':
        result = await analyzeContext({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: verifiedUserId, triggerType: request.triggerType, metadata: request.metadata });
        break;
      case 'chat':
        if (!request.message) {
          return new Response(JSON.stringify({ success: false, error: 'Message is required for chat action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = await handleChat({ supabase: supabaseAdmin, openaiApiKey, proposalId: request.proposalId, organizationId: request.organizationId, userId: verifiedUserId, message: request.message, conversationHistory: request.conversationHistory, userRole: membership.role });
        break;
      case 'confirm_action':
        if (!request.pendingAction) {
          return new Response(JSON.stringify({ success: false, error: 'Pending action is required for confirm_action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = await handleConfirmAction({ supabase: supabaseAdmin, organizationId: request.organizationId, userId: verifiedUserId, pendingAction: request.pendingAction });
        break;
      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${request.action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log agent run
    const duration = Date.now() - startTime;
    const agentTypes: Record<string, string> = { generate_follow_up: 'follow_up_generator', suggest_reminders: 'reminder_suggester', get_recommendations: 'recommendation_engine', analyze_context: 'status_monitor', chat: 'recommendation_engine', confirm_action: 'recommendation_engine' };
    const tokenUsage = 'tokenUsage' in result ? result.tokenUsage : null;
    try {
      await supabaseAdmin.from('ai_agent_runs').insert({ organization_id: request.organizationId, triggered_by: user.id, agent_type: agentTypes[request.action] || 'recommendation_engine', trigger_event: 'manual', proposal_id: request.proposalId, status: result.success ? 'completed' : 'failed', suggestions_generated: result.success ? 1 : 0, duration_ms: duration, error_message: result.error || null, total_tokens: tokenUsage?.total || null, started_at: new Date(Date.now() - duration).toISOString(), completed_at: new Date().toISOString() });
    } catch (logError) {
      console.error('Failed to log agent run:', logError);
    }

    return new Response(JSON.stringify(result), { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('AI Workflow Agent error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
