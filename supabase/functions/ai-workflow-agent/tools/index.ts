/**
 * Tool System Index
 *
 * Exports all tools and registers them with the registry.
 */

// Re-export types
export * from './types.ts';

// Re-export registry
export { toolRegistry, createTool } from './toolRegistry.ts';

// Import all tools
import { createTaskTool } from './createTask.ts';
import { createReminderTool } from './createReminder.ts';
import { updateStatusTool } from './updateStatus.ts';
import { createProposalTool } from './createProposal.ts';
import { draftEmailTool } from './draftEmail.ts';
import { createNotificationTool } from './createNotification.ts';
import { webSearchTool } from './webSearch.ts';
import { sendToBoardTool } from './sendToBoard.ts';
import { addAttachmentTool } from './addAttachment.ts';
import { updatePresentationTool } from './updatePresentation.ts';
// New tools
import { updateNotificationTool } from './updateNotification.ts';
import { updateProposalTool } from './updateProposal.ts';
import { updateTaskTool } from './updateTask.ts';
import { moveToProjectBoardTool } from './moveToProjectBoard.ts';
import { addContactTool } from './addContact.ts';
// Context-gathering tools (read-only, auto-execute)
import { getAnalyticsTool } from './getAnalytics.ts';
import { getProposalsTool } from './getProposals.ts';
import { getContactsTool } from './getContacts.ts';
import { getTasksTool } from './getTasks.ts';
import { getProjectsTool } from './getProjects.ts';
// System tools
import { logCapabilityGapTool } from './logCapabilityGap.ts';

// Import registry for registration
import { toolRegistry } from './toolRegistry.ts';

// ============================================================================
// All Tools Array
// ============================================================================

export const allTools = [
  createTaskTool,
  createReminderTool,
  updateStatusTool,
  createProposalTool,
  draftEmailTool,
  createNotificationTool,
  webSearchTool,
  sendToBoardTool,
  addAttachmentTool,
  updatePresentationTool,
  // New tools
  updateNotificationTool,
  updateProposalTool,
  updateTaskTool,
  moveToProjectBoardTool,
  addContactTool,
  // Context-gathering tools (read-only, auto-execute)
  getAnalyticsTool,
  getProposalsTool,
  getContactsTool,
  getTasksTool,
  getProjectsTool,
  // System tools
  logCapabilityGapTool,
];

// ============================================================================
// Register All Tools
// ============================================================================

/**
 * Initialize the tool registry with all available tools.
 * Call this once at startup.
 */
export function initializeToolRegistry(): void {
  toolRegistry.registerAll(allTools);
  console.log(`[ToolRegistry] Registered ${allTools.length} tools:`, toolRegistry.getToolNames());
}

// ============================================================================
// Individual Tool Exports (for testing/direct use)
// ============================================================================

export {
  createTaskTool,
  createReminderTool,
  updateStatusTool,
  createProposalTool,
  draftEmailTool,
  createNotificationTool,
  webSearchTool,
  sendToBoardTool,
  addAttachmentTool,
  updatePresentationTool,
  // New tools
  updateNotificationTool,
  updateProposalTool,
  updateTaskTool,
  moveToProjectBoardTool,
  addContactTool,
  // Context-gathering tools
  getAnalyticsTool,
  getProposalsTool,
  getContactsTool,
  getTasksTool,
  getProjectsTool,
  // System tools
  logCapabilityGapTool,
};
