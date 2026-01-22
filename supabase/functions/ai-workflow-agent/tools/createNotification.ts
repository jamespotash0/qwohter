/**
 * Create Notification Tool
 *
 * Creates a notification for a user.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface CreateNotificationParams {
  type?: string;
  message?: string;
  scheduled_for?: string;
}

export const createNotificationTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'create_notification',
      description:
        'Create a notification or alert for the user. Use when user wants to be notified about something or needs an alert set up.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The notification message content',
          },
          type: {
            type: ['string', 'null'],
            enum: ['Reminder', 'Alert', 'Info', null as any],
            description: 'Type of notification',
          },
          scheduled_for: {
            type: ['string', 'null'],
            description: 'When to send the notification in ISO 8601 format. Leave null for immediate.',
          },
        },
        required: ['message'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false, // Notifications can be standalone
    category: 'communication',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId, proposalId } = context;
    const notifParams = params as CreateNotificationParams;

    console.log('[create_notification] Creating notification:', {
      proposalId,
      message: notifParams.message,
    });

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        proposal_id: proposalId || null,
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
      console.error('[create_notification] Failed to create notification:', notifError);
      return { success: false, error: 'Failed to create notification' };
    }

    return {
      success: true,
      data: {
        id: notification.id,
        title: notifParams.message || 'Notification',
        type: 'notification',
      },
    };
  },
});
