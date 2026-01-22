/**
 * Tool Registry
 *
 * Central registry for all available tools. Provides methods to:
 * - Register tools
 * - Get tool definitions for OpenAI API
 * - Look up tools by name
 * - Execute tools with security validation
 */

import type {
  RegisteredTool,
  ToolDefinition,
  ToolContext,
  ToolResult,
  ToolExecutionResponse,
  PendingAction,
  ToolCall,
} from './types.ts';

import {
  validateToolParams,
  checkRateLimit,
  createAuditLog,
} from './security.ts';

// ============================================================================
// Tool Registry Class
// ============================================================================

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a tool with the registry
   */
  register(tool: RegisteredTool): void {
    const name = tool.definition.function.name;
    if (this.tools.has(name)) {
      console.warn(`[ToolRegistry] Tool "${name}" already registered, overwriting`);
    }
    this.tools.set(name, tool);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: RegisteredTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool definitions for OpenAI API
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool call
   * Returns pendingAction if tool requires confirmation, otherwise executes directly
   * Includes security validation and rate limiting
   */
  async executeToolCall(
    toolCall: ToolCall,
    context: ToolContext
  ): Promise<ToolExecutionResponse> {
    const toolName = toolCall.function.name;
    const tool = this.tools.get(toolName);

    if (!tool) {
      createAuditLog(toolName, context.userId, context.organizationId, 'blocked', {}, 'Unknown tool');
      return {
        success: false,
        requiresConfirmation: false,
        error: `Unknown tool: ${toolName}`,
      };
    }

    // ========================================================================
    // SECURITY: Rate limiting
    // ========================================================================
    const rateLimit = checkRateLimit(context.userId, context.organizationId);
    if (!rateLimit.allowed) {
      createAuditLog(toolName, context.userId, context.organizationId, 'blocked', {}, 'Rate limited');
      return {
        success: false,
        requiresConfirmation: false,
        error: 'Rate limit exceeded. Please wait before making more requests.',
      };
    }

    // Parse arguments
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      createAuditLog(toolName, context.userId, context.organizationId, 'error', {}, 'Invalid JSON arguments');
      return {
        success: false,
        requiresConfirmation: false,
        error: `Invalid tool arguments: ${e instanceof Error ? e.message : 'Parse error'}`,
      };
    }

    // ========================================================================
    // SECURITY: Validate and sanitize parameters
    // ========================================================================
    const validation = validateToolParams(toolName, params);
    if (!validation.valid) {
      createAuditLog(
        toolName,
        context.userId,
        context.organizationId,
        'blocked',
        params,
        validation.blockedReason,
        validation.errors
      );
      return {
        success: false,
        requiresConfirmation: false,
        error: `Security validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Use sanitized params from validation
    const sanitizedParams = validation.sanitized;

    // Log warnings but don't block
    if (validation.warnings.length > 0) {
      console.warn(`[ToolRegistry] Validation warnings for ${toolName}:`, validation.warnings);
    }

    // Check if tool requires proposal context
    if (tool.metadata.requiresProposalId && !context.proposalId) {
      createAuditLog(toolName, context.userId, context.organizationId, 'blocked', sanitizedParams, 'Missing proposal context');
      return {
        success: false,
        requiresConfirmation: false,
        error: `Tool "${toolName}" requires a proposal context`,
      };
    }

    // If tool requires confirmation, return pending action
    if (tool.metadata.requiresConfirmation) {
      const pendingAction: PendingAction = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: toolName,
        params: sanitizedParams, // Use sanitized params
        proposalId: context.proposalId,
        proposalName: context.proposalName,
      };

      createAuditLog(toolName, context.userId, context.organizationId, 'execute', sanitizedParams, 'Pending confirmation');
      return {
        success: true,
        requiresConfirmation: true,
        pendingAction,
      };
    }

    // Auto-execute tool with sanitized params
    try {
      const result = await tool.execute(sanitizedParams, context);
      createAuditLog(
        toolName,
        context.userId,
        context.organizationId,
        result.success ? 'execute' : 'error',
        sanitizedParams,
        result.success ? 'Success' : result.error
      );
      return {
        success: result.success,
        requiresConfirmation: false,
        result,
        error: result.error,
      };
    } catch (e) {
      createAuditLog(toolName, context.userId, context.organizationId, 'error', sanitizedParams, e instanceof Error ? e.message : 'Unknown error');
      return {
        success: false,
        requiresConfirmation: false,
        error: `Tool execution failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute a confirmed action (from frontend confirmation)
   * Bypasses confirmation check since user already confirmed
   * Still includes security validation
   */
  async executeConfirmedAction(
    actionType: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(actionType);

    if (!tool) {
      createAuditLog(actionType, context.userId, context.organizationId, 'blocked', params, 'Unknown action type');
      return {
        success: false,
        error: `Unknown action type: ${actionType}`,
      };
    }

    // ========================================================================
    // SECURITY: Rate limiting (even for confirmed actions)
    // ========================================================================
    const rateLimit = checkRateLimit(context.userId, context.organizationId);
    if (!rateLimit.allowed) {
      createAuditLog(actionType, context.userId, context.organizationId, 'blocked', params, 'Rate limited');
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before making more requests.',
      };
    }

    // ========================================================================
    // SECURITY: Validate and sanitize parameters (re-validate on confirm)
    // ========================================================================
    const validation = validateToolParams(actionType, params);
    if (!validation.valid) {
      createAuditLog(
        actionType,
        context.userId,
        context.organizationId,
        'blocked',
        params,
        validation.blockedReason,
        validation.errors
      );
      return {
        success: false,
        error: `Security validation failed: ${validation.errors.join(', ')}`,
      };
    }

    const sanitizedParams = validation.sanitized;

    // Check proposal requirement
    if (tool.metadata.requiresProposalId && !context.proposalId) {
      createAuditLog(actionType, context.userId, context.organizationId, 'blocked', sanitizedParams, 'Missing proposal context');
      return {
        success: false,
        error: `Action "${actionType}" requires a proposal context`,
      };
    }

    try {
      const result = await tool.execute(sanitizedParams, context);
      createAuditLog(
        actionType,
        context.userId,
        context.organizationId,
        result.success ? 'execute' : 'error',
        sanitizedParams,
        result.success ? 'Confirmed and executed' : result.error
      );
      return result;
    } catch (e) {
      createAuditLog(actionType, context.userId, context.organizationId, 'error', sanitizedParams, e instanceof Error ? e.message : 'Unknown error');
      return {
        success: false,
        error: `Action execution failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const toolRegistry = new ToolRegistry();

// ============================================================================
// Helper to create tool definitions
// ============================================================================

export function createTool(tool: RegisteredTool): RegisteredTool {
  return tool;
}
