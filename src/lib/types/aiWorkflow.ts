/**
 * AI Workflow Types
 *
 * Type definitions for the AI workflow automation system.
 * Supports follow-up emails, smart reminders, and action recommendations.
 */

// ============================================================================
// Suggestion Types
// ============================================================================

export type AISuggestionType =
  | 'follow_up_email'
  | 'status_reminder'
  | 'action_recommendation'
  | 'win_loss_insight'
  | 'pricing_suggestion';

export type AISuggestionStatus = 'pending' | 'applied' | 'dismissed' | 'expired';

export interface AISuggestion {
  id: string;
  proposal_id: string;
  organization_id: string;
  user_id: string;
  suggestion_type: AISuggestionType;
  title: string;
  content: string;
  reasoning: string | null;
  email_subject: string | null;
  email_recipient: string | null;
  status: AISuggestionStatus;
  applied_at: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  model_used: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

// ============================================================================
// Agent Types
// ============================================================================

export type AIAgentType =
  | 'follow_up_generator'
  | 'reminder_suggester'
  | 'win_loss_analyzer'
  | 'status_monitor'
  | 'recommendation_engine';

export type AIAgentTrigger = 'manual' | 'status_change' | 'scheduled' | 'proposal_age';

export type AIAgentRunStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AIAgentRun {
  id: string;
  organization_id: string;
  triggered_by: string | null;
  agent_type: AIAgentType;
  trigger_event: AIAgentTrigger;
  proposal_id: string | null;
  input_data: Record<string, unknown>;
  suggestions_generated: number;
  output_data: Record<string, unknown>;
  status: AIAgentRunStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  created_at: string;
}

// ============================================================================
// Feedback Types
// ============================================================================

export type AIFeedbackType = 'helpful' | 'not_helpful' | 'incorrect' | 'too_generic';

export interface AIUserFeedback {
  id: string;
  suggestion_id: string;
  user_id: string;
  rating: number | null;
  feedback_type: AIFeedbackType | null;
  comment: string | null;
  created_at: string;
}

// ============================================================================
// Service Request/Response Types
// ============================================================================

export type AIWorkflowAction =
  | 'generate_follow_up'
  | 'suggest_reminders'
  | 'analyze_win_loss'
  | 'get_recommendations';

export type EmailTone = 'formal' | 'friendly' | 'urgent';

export interface GenerateFollowUpOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
  tone?: EmailTone;
  forceRegenerate?: boolean;
}

export interface SuggestRemindersOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
}

export interface GetRecommendationsOptions {
  proposalId: string;
  organizationId: string;
  userId: string;
}

export interface AIWorkflowRequest {
  action: AIWorkflowAction;
  proposalId: string;
  organizationId: string;
  userId: string;
  options?: {
    forceRegenerate?: boolean;
    emailTone?: EmailTone;
  };
}

export interface AIServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AIWorkflowResponse {
  success: boolean;
  data?: AISuggestion | AISuggestion[];
  error?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AIAssistantState {
  isOpen: boolean;
  isGenerating: boolean;
  selectedSuggestionId: string | null;
  lastGeneratedAt: string | null;
}

export interface SuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onDismiss: () => void;
  onCopy: () => void;
  isApplying?: boolean;
  isDismissing?: boolean;
}

// ============================================================================
// Chat/Conversation Types
// ============================================================================

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  proposal_id: string;
  organization_id: string;
  user_id: string | null;
  role: AIMessageRole;
  content: string;
  suggestion_id: string | null;
  is_proactive: boolean;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface ChatMessageRequest {
  proposalId: string;
  organizationId: string;
  userId: string;
  message: string;
  conversationHistory?: AIMessage[];
}

export interface ChatMessageResponse {
  success: boolean;
  message?: AIMessage;
  response?: string; // For global chat mode (plain text response)
  suggestion?: AISuggestion;
  pendingAction?: PendingAction;
  proposalsForSelection?: Array<{ id: string; name: string }>;
  error?: string;
}

/** Simplified message type for local/global chat state */
export interface LocalChatMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  created_at: string;
}

// ============================================================================
// Context Analysis Types
// ============================================================================

export interface ProposalContext {
  proposal_id: string;
  proposal_number: string;
  project_name: string | null;
  client_name: string | null;
  client_company: string | null;
  status: string;
  total_value: number | null;
  created_at: string;
  updated_at: string;
  days_since_update: number;
  days_since_submission: number | null;
  has_pending_suggestions: boolean;
}

export interface ContextAnalysisRequest {
  proposalId: string;
  organizationId: string;
  userId: string;
  forceAnalysis?: boolean;
}

export interface ContextAnalysisResponse {
  success: boolean;
  suggestions?: AISuggestion[];
  message?: AIMessage;
  proactiveMessage?: { id: string; content: string };
  analyzed_at?: string;
  error?: string;
}

// ============================================================================
// Proactive Trigger Types
// ============================================================================

export type ProactiveTriggerType =
  | 'panel_opened'
  | 'status_changed'
  | 'scheduled_check'
  | 'time_elapsed';

export interface ProactiveTriggerEvent {
  trigger_type: ProactiveTriggerType;
  proposal_id: string;
  organization_id: string;
  user_id: string;
  metadata?: {
    previous_status?: string;
    new_status?: string;
    days_elapsed?: number;
  };
}

// ============================================================================
// Extended Action Types
// ============================================================================

export type AIWorkflowActionExtended =
  | AIWorkflowAction
  | 'analyze_context'
  | 'chat'
  | 'create_reminder'
  | 'scheduled_analysis'
  | 'confirm_action';

export interface AIWorkflowRequestExtended extends Omit<AIWorkflowRequest, 'action'> {
  action: AIWorkflowActionExtended;
  message?: string;
  conversationHistory?: AIMessage[];
  triggerType?: ProactiveTriggerType;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface AINotificationSummary {
  total_pending: number;
  by_proposal: {
    proposal_id: string;
    proposal_name: string;
    count: number;
  }[];
  by_type: {
    type: AISuggestionType;
    count: number;
  }[];
}

// ============================================================================
// Pending Action Types (Action Confirmation Flow)
// ============================================================================

export type PendingActionType =
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

export interface PendingActionParams {
  // Common fields
  title?: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';

  // Email fields
  subject?: string;
  body?: string;
  tone?: string;

  // Notification fields
  message?: string;
  scheduled_for?: string;
  notification_type?: string;

  // Proposal fields
  project_name?: string;
  client_name?: string;
  client_company?: string;
  job_location?: string;
  status?: 'Draft' | 'Submitted' | 'Won' | 'Rejected';

  // Board/presentation fields
  board_id?: string;
  board_name?: string;
  presentation_content?: string;

  // Attachment fields
  file_url?: string;
  file_name?: string;
  file_type?: string;

  // Integration fields
  integration_type?: string;
  integration_settings?: Record<string, unknown>;

  // Web search fields
  search_query?: string;
  search_context?: string;
}

export interface PendingAction {
  id: string;
  type: PendingActionType;
  params: PendingActionParams;
  proposalId?: string;
  proposalName?: string;
}

export interface ChatMessageResponseWithAction extends ChatMessageResponse {
  pendingAction?: PendingAction;
}

export interface ContentModerationResult {
  safe: boolean;
  flagged_categories?: string[];
  message?: string;
}
