/**
 * Ada Action Confirmation Card
 *
 * Shows a preview of an action Ada wants to take and lets
 * the user confirm or cancel before execution.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  ListTodo,
  Bell,
  Mail,
  AlertCircle,
  Loader2,
  Calendar,
  Flag,
  FileText,
  Send,
  Paperclip,
  Presentation,
  Settings,
  Search,
  Building2,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PendingAction {
  id: string;
  type:
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
  params: {
    title?: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
    subject?: string;
    body?: string;
    tone?: string;
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
  };
  proposalId?: string;
  proposalName?: string;
}

interface AdaActionConfirmationProps {
  action: PendingAction;
  onConfirm: (action: PendingAction) => Promise<void>;
  onCancel: () => void;
  onEdit?: (action: PendingAction) => void;
}

// ============================================================================
// Icon Map
// ============================================================================

const ACTION_ICONS: Record<PendingAction['type'], React.ElementType> = {
  create_task: ListTodo,
  create_reminder: Bell,
  draft_email: Mail,
  create_notification: AlertCircle,
  create_proposal: FileText,
  send_to_board: Send,
  add_attachment: Paperclip,
  update_presentation: Presentation,
  update_integration: Settings,
  web_search: Search,
};

const ACTION_LABELS: Record<PendingAction['type'], string> = {
  create_task: 'Create Task',
  create_reminder: 'Set Reminder',
  draft_email: 'Draft Email',
  create_notification: 'Create Notification',
  create_proposal: 'Create Proposal',
  send_to_board: 'Send to Board',
  add_attachment: 'Add Attachment',
  update_presentation: 'Update Presentation',
  update_integration: 'Update Integration',
  web_search: 'Web Search',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  medium: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  high: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
};

// ============================================================================
// Component
// ============================================================================

export const AdaActionConfirmation: React.FC<AdaActionConfirmationProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const Icon = ACTION_ICONS[action.type] || AlertCircle;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(action);
    } finally {
      setIsConfirming(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'rounded-lg overflow-hidden',
        'bg-gradient-to-br from-blue-50 to-indigo-50',
        'dark:from-blue-950/30 dark:to-indigo-950/30',
        'border border-blue-200 dark:border-blue-800'
      )}
    >
      {/* Header - Compact */}
      <div className="px-2.5 py-1.5 bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
            <Icon className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-[9px] font-medium text-blue-600 dark:text-blue-400 uppercase">
              Confirm
            </p>
            <span className="text-[9px] text-gray-400">•</span>
            <p className="text-[10px] font-medium text-gray-900 dark:text-white">
              {ACTION_LABELS[action.type]}
            </p>
          </div>
        </div>
      </div>

      {/* Content - Compact */}
      <div className="px-2.5 py-2 space-y-1.5">
        {/* Title */}
        {action.params.title && (
          <p className="text-[10px] font-medium text-gray-900 dark:text-white">
            {action.params.title}
          </p>
        )}

        {/* Description / Body / Message */}
        {(action.params.description || action.params.body || action.params.message) && (
          <p className="text-[9px] text-gray-600 dark:text-gray-400 line-clamp-2">
            {action.params.description || action.params.body || action.params.message}
          </p>
        )}

        {/* Email Subject */}
        {action.params.subject && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {action.params.subject}
            </p>
          </div>
        )}

        {/* Proposal Details */}
        {action.type === 'create_proposal' && (
          <div className="space-y-2">
            {action.params.project_name && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Project Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {action.params.project_name}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {action.params.client_name && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {action.params.client_company
                      ? `${action.params.client_name} (${action.params.client_company})`
                      : action.params.client_name}
                  </span>
                </div>
              )}
              {action.params.job_location && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {action.params.job_location}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Web Search Query */}
        {action.type === 'web_search' && action.params.search_query && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Search Query</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              "{action.params.search_query}"
            </p>
            {action.params.search_context && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Context: {action.params.search_context}
              </p>
            )}
          </div>
        )}

        {/* Attachment Details */}
        {action.type === 'add_attachment' && action.params.file_name && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {action.params.file_name}
              </p>
              {action.params.file_type && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {action.params.file_type}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Board/Presentation Details */}
        {(action.type === 'send_to_board' || action.type === 'update_presentation') && (
          <div>
            {action.params.board_name && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 inline-flex">
                <Send className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {action.params.board_name}
                </span>
              </div>
            )}
            {action.params.presentation_content && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                {action.params.presentation_content}
              </p>
            )}
          </div>
        )}

        {/* Integration Details */}
        {action.type === 'update_integration' && action.params.integration_type && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 inline-flex">
            <Settings className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
              {action.params.integration_type}
            </span>
          </div>
        )}

        {/* Metadata row - Compact */}
        <div className="flex flex-wrap gap-1">
          {/* Due date */}
          {(action.params.due_date || action.params.scheduled_for) && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              <Calendar className="w-2.5 h-2.5 text-gray-500" />
              <span className="text-[9px] text-gray-600 dark:text-gray-400">
                {formatDate(action.params.due_date || action.params.scheduled_for)}
              </span>
            </div>
          )}

          {/* Priority */}
          {action.params.priority && (
            <div className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded',
              PRIORITY_COLORS[action.params.priority] || PRIORITY_COLORS.medium
            )}>
              <Flag className="w-2.5 h-2.5" />
              <span className="text-[9px] font-medium capitalize">
                {action.params.priority}
              </span>
            </div>
          )}

          {/* Tone */}
          {action.params.tone && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              <span className="text-[9px] text-gray-600 dark:text-gray-400 capitalize">
                {action.params.tone}
              </span>
            </div>
          )}
        </div>

        {/* Proposal context */}
        {action.proposalName && (
          <p className="text-[9px] text-gray-500 dark:text-gray-400 pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
            → {action.proposalName}
          </p>
        )}
      </div>

      {/* Actions - Compact */}
      <div className="px-2.5 pb-2 flex gap-1.5">
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className={cn(
            'flex-1 flex items-center justify-center gap-1',
            'px-2 py-1 rounded',
            'bg-blue-600 hover:bg-blue-700',
            'text-white text-[10px] font-medium',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150'
          )}
        >
          {isConfirming ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-3 h-3" />
              <span>Yes</span>
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={isConfirming}
          className={cn(
            'px-2 py-1 rounded',
            'border border-gray-200 dark:border-gray-700',
            'text-gray-500 dark:text-gray-400 text-[10px]',
            'hover:bg-gray-50 dark:hover:bg-gray-800',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150'
          )}
        >
          <XCircle className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

export default AdaActionConfirmation;
