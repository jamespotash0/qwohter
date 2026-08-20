/**
 * ProjectBoardOverlay Component
 *
 * A sidebar overlay for viewing and editing project details.
 * Extracted from Board.tsx for better modularity.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  X as XIcon,
  CaretDown as CaretDownIcon,
  CaretRight as CaretRightIcon,
  File as FileIcon,
} from '@phosphor-icons/react';
import { TimelineVisualizer } from './TimelineVisualizer';
import { ProjectAttachments } from './ProjectAttachments';
import { ProjectTasks } from './ProjectTasks';
import { ProjectPaymentsSection } from './ProjectPaymentsSection';
import type { Project, ProjectPriority } from '@/services/boardService';
import type { AttachmentWithUrl } from '@/hooks/queries/useAttachments';
import { trackEvent } from '@/lib/analytics';

// =============================================================================
// Types
// =============================================================================

interface ProjectBoardOverlayProps {
  project: Project;
  organizationId: string;
  attachments: AttachmentWithUrl[];
  onClose: () => void;
  onUpdate: (projectId: string, updates: Partial<Project>) => void;
  onAttachmentsChange: () => void;
  /** Show the Payments section (invoices are admin-only). */
  canManagePayments?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

const formatCurrency = (amount?: number) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// =============================================================================
// Main Component
// =============================================================================

export function ProjectBoardOverlay({
  project,
  organizationId,
  attachments,
  onClose,
  onUpdate,
  onAttachmentsChange,
  canManagePayments = false,
}: ProjectBoardOverlayProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleUpdate = (updates: Partial<Project>) => {
    onUpdate(project.id, updates);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 animate-in fade-in-0 duration-150"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed top-0 right-0 h-full w-[40%] min-w-[400px] max-w-[95vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-100 px-5 py-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {project.proposal?.project_name || 'Untitled Project'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase">
                  {project.proposal?.proposal_number || 'No #'}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] text-gray-500">{project.workflow_status}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Inline Properties */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {/* Priority */}
            <select
              value={project.priority || ''}
              onChange={(e) => { trackEvent('project_field_edited', { field: 'priority' }); handleUpdate({ priority: (e.target.value as ProjectPriority) || null }); }}
              className={`h-6 text-[11px] px-2 rounded-md border-0 bg-gray-50 hover:bg-gray-100 cursor-pointer ${
                project.priority === 'High' || project.priority === 'Highest'
                  ? 'text-red-600'
                  : project.priority === 'Medium'
                  ? 'text-amber-600'
                  : 'text-gray-600'
              }`}
            >
              <option value="">Priority</option>
              <option value="Lowest">Lowest</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Highest">Highest</option>
            </select>

            {/* Completion Date */}
            <Input
              type="date"
              value={project.completion_date || ''}
              onChange={(e) => { trackEvent('project_field_edited', { field: 'completion_date' }); handleUpdate({ completion_date: e.target.value || null }); }}
              className="h-6 text-[11px] w-28 border-0 bg-gray-50 hover:bg-gray-100 px-2"
              placeholder="Due date"
            />

            {/* View Proposal Button */}
            {project.proposal?.id && (
              <button
                onClick={() => { window.location.href = `/proposals/${project.proposal!.id}/edit`; }}
                className="h-6 px-2.5 text-[11px] rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                <FileIcon className="w-3 h-3" />
                Proposal
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* Project Summary Section */}
            <div>
              <button
                onClick={() => toggleSection('summary')}
                className="w-full flex items-center gap-1.5 mb-2 group"
              >
                {collapsedSections.has('summary') ? (
                  <CaretRightIcon className="w-3 h-3 text-gray-400" />
                ) : (
                  <CaretDownIcon className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Project Details
                </span>
              </button>
              {!collapsedSections.has('summary') && (
                <div className="space-y-1.5 pl-4">
                  {project.proposal?.client_name && (
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-gray-400 w-20 flex-shrink-0">Client</span>
                      <span className="text-gray-700">{project.proposal.client_name}</span>
                    </div>
                  )}
                  {project.proposal?.client_company && (
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-gray-400 w-20 flex-shrink-0">Company</span>
                      <span className="text-gray-700">{project.proposal.client_company}</span>
                    </div>
                  )}
                  {project.proposal?.job_location && (
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-gray-400 w-20 flex-shrink-0">Location</span>
                      <span className="text-gray-700">{project.proposal.job_location}</span>
                    </div>
                  )}
                  {project.proposal?.total_value && (
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-gray-400 w-20 flex-shrink-0">Value</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(project.proposal.total_value)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div>
              <button
                onClick={() => toggleSection('timeline')}
                className="w-full flex items-center gap-1.5 mb-2 group"
              >
                {collapsedSections.has('timeline') ? (
                  <CaretRightIcon className="w-3 h-3 text-gray-400" />
                ) : (
                  <CaretDownIcon className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Timeline
                </span>
              </button>
              {!collapsedSections.has('timeline') && (
                <div className="pl-4">
                  <TimelineVisualizer
                    milestones={project.timeline_milestones || []}
                    wonDate={project.created_at}
                    onMilestoneUpdate={(updatedMilestones) => {
                      handleUpdate({ timeline_milestones: updatedMilestones });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Tasks Section */}
            <div>
              <button
                onClick={() => toggleSection('tasks')}
                className="w-full flex items-center gap-1.5 mb-2 group"
              >
                {collapsedSections.has('tasks') ? (
                  <CaretRightIcon className="w-3 h-3 text-gray-400" />
                ) : (
                  <CaretDownIcon className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Tasks
                </span>
              </button>
              {!collapsedSections.has('tasks') && (
                <div className="pl-4">
                  <ProjectTasks
                    projectId={project.id}
                    organizationId={organizationId}
                    projectName={project.proposal?.project_name || 'Project'}
                  />
                </div>
              )}
            </div>

            {/* Payments Section (admin only — invoices) */}
            {canManagePayments && (
              <div>
                <button
                  onClick={() => toggleSection('payments')}
                  className="w-full flex items-center gap-1.5 mb-2 group"
                >
                  {collapsedSections.has('payments') ? (
                    <CaretRightIcon className="w-3 h-3 text-gray-400" />
                  ) : (
                    <CaretDownIcon className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Payments
                  </span>
                </button>
                {!collapsedSections.has('payments') && (
                  <div className="pl-4">
                    <ProjectPaymentsSection
                      projectId={project.id}
                      organizationId={organizationId}
                      contractDefault={project.proposal?.total_value || 0}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Documents Section */}
            <div>
              <button
                onClick={() => toggleSection('documents')}
                className="w-full flex items-center gap-1.5 mb-2 group"
              >
                {collapsedSections.has('documents') ? (
                  <CaretRightIcon className="w-3 h-3 text-gray-400" />
                ) : (
                  <CaretDownIcon className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Documents
                </span>
              </button>
              {!collapsedSections.has('documents') && (
                <div className="pl-4">
                  <ProjectAttachments
                    projectId={project.id}
                    attachments={attachments}
                    onAttachmentsChange={onAttachmentsChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProjectBoardOverlay;
