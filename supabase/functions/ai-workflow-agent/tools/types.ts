/**
 * Tool System Types
 *
 * Type definitions for the OpenAI function calling tool system.
 * Tools are self-documenting via JSON schemas and can require user confirmation.
 */

//@ts-ignore
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// JSON Schema Types (OpenAI Function Calling format)
// ============================================================================

export interface JSONSchemaProperty {
  type: string | string[];
  description?: string;
  enum?: string[];
  format?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

// ============================================================================
// Tool Definition Types (OpenAI Chat Completion format)
// ============================================================================

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    strict?: boolean;
    parameters: JSONSchema;
  };
}

// ============================================================================
// Tool Metadata
// ============================================================================

export type ToolCategory =
  | 'task'           // Task and reminder management
  | 'communication'  // Emails, notifications
  | 'proposal'       // Proposal CRUD operations
  | 'search'         // Web search, data queries
  | 'integration';   // External integrations

export interface ToolMetadata {
  /** If true, returns pendingAction for user confirmation before executing */
  requiresConfirmation: boolean;
  /** If true, tool cannot execute without a proposal context */
  requiresProposalId: boolean;
  /** Tool category for organization */
  category: ToolCategory;
}

// ============================================================================
// Tool Execution Context
// ============================================================================

export interface ToolContext {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
  proposalId?: string;
  proposalName?: string;
  projectId?: string;
  /** Organization name for generating task references */
  organizationName?: string;
  /** User's role in the organization (Owner, Admin, Member) */
  userRole?: 'Owner' | 'Admin' | 'Member';
}

// ============================================================================
// Tool Execution Result
// ============================================================================

export interface ToolResult {
  success: boolean;
  data?: {
    id: string;
    title: string;
    type: string;
    [key: string]: unknown;
  };
  error?: string;
}

// ============================================================================
// Pending Action (for tools requiring confirmation)
// ============================================================================

export interface PendingAction {
  id: string;
  type: string;
  params: Record<string, unknown>;
  proposalId?: string;
  proposalName?: string;
}

// ============================================================================
// Registered Tool Interface
// ============================================================================

export interface RegisteredTool {
  /** OpenAI function calling definition */
  definition: ToolDefinition;
  /** Tool behavior metadata */
  metadata: ToolMetadata;
  /** Execution function - called when tool is invoked */
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

// ============================================================================
// Tool Call Types (from OpenAI response)
// ============================================================================

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  result: ToolResult;
}

// ============================================================================
// Tool Execution Response
// ============================================================================

export interface ToolExecutionResponse {
  /** Whether execution was successful or pending confirmation */
  success: boolean;
  /** True if tool requires user confirmation */
  requiresConfirmation: boolean;
  /** Pending action for frontend confirmation UI */
  pendingAction?: PendingAction;
  /** Result if tool was auto-executed */
  result?: ToolResult;
  /** Error message if execution failed */
  error?: string;
}
