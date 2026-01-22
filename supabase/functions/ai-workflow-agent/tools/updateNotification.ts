/**
 * Update Notification Tool
 *
 * Updates an existing notification's message, type, or scheduled time.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface UpdateNotificationParams {
  notification_id: string;
  message?: string;
  type?: string;
  scheduled_for?: string;
  status?: string;
}

export const updateNotificationTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'update_notification',
      description:
        'Update an existing notification. Use when user wants to modify a notification message, change its schedule, or update its type/status.',
      parameters: {
        type: 'object',
        properties: {
          notification_id: {
            type: 'string',
            description: 'The ID of the notification to update',
          },
          message: {
            type: ['string', 'null'],
            description: 'New message content for the notification',
          },
          type: {
            type: ['string', 'null'],
            enum: ['Reminder', 'Alert', 'Info', null as any],
            description: 'New type for the notification',
          },
          scheduled_for: {
            type: ['string', 'null'],
            description: 'New scheduled time in ISO 8601 format',
          },
          status: {
            type: ['string', 'null'],
            enum: ['Pending', 'Sent', 'Read', 'Dismissed', null as any],
            description: 'New status for the notification',
          },
        },
        required: ['notification_id'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false,
    category: 'communication',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId } = context;
    const notifParams = params as unknown as UpdateNotificationParams;

    console.log('[update_notification] Updating notification:', notifParams.notification_id);

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (notifParams.message !== undefined) {
      updateData.message = notifParams.message;
    }
    if (notifParams.type !== undefined) {
      updateData.type = notifParams.type;
    }
    if (notifParams.scheduled_for !== undefined) {
      updateData.scheduled_for = notifParams.scheduled_for;
    }
    if (notifParams.status !== undefined) {
      updateData.status = notifParams.status;
    }

    const { data: notification, error: updateError } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notifParams.notification_id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('[update_notification] Failed to update notification:', updateError);
      return {
        success: false,
        error: `Failed to update notification: ${updateError.message}`,
      };
    }

    return {
      success: true,
      data: {
        id: notification.id,
        title: notification.message || 'Notification Updated',
        type: 'notification',
      },
    };
  },
});
