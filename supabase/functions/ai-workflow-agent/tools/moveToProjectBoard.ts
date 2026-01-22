/**
 * Move to Project Board Tool
 *
 * Moves a proposal to the project board (creates a project entry)
 * or updates an existing project's workflow status.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface MoveToProjectBoardParams {
  workflow_status?: string;
  priority?: string;
}

// Valid workflow statuses - these should match what's in the database
const DEFAULT_WORKFLOW_STATUS = 'Planning';
const VALID_PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

export const moveToProjectBoardTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'move_to_project_board',
      description:
        'Move a proposal to the project board for project tracking. Creates a project from the proposal if not already on board, or updates the project workflow status. Use when user wants to convert a won proposal to a project or manage project workflow.',
      parameters: {
        type: 'object',
        properties: {
          workflow_status: {
            type: ['string', 'null'],
            description: 'Initial workflow column/status for the project (e.g., "Planning", "In Progress", "On Hold"). If not specified, uses the organization default or "Planning".',
          },
          priority: {
            type: ['string', 'null'],
            enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest', null as any],
            description: 'Project priority level',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: true,
    category: 'proposal',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, proposalId, proposalName } = context;
    const boardParams = params as MoveToProjectBoardParams;

    console.log('[move_to_project_board] Moving proposal to project board:', proposalId);

    // First, check if proposal is already on the board
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, workflow_status')
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (checkError) {
      console.error('[move_to_project_board] Error checking existing project:', checkError);
      return {
        success: false,
        error: `Failed to check project status: ${checkError.message}`,
      };
    }

    // If project exists, update its workflow status
    if (existingProject) {
      if (boardParams.workflow_status) {
        const updateData: Record<string, unknown> = {
          workflow_status: boardParams.workflow_status,
          updated_at: new Date().toISOString(),
        };

        if (boardParams.priority && VALID_PRIORITIES.includes(boardParams.priority as typeof VALID_PRIORITIES[number])) {
          updateData.priority = boardParams.priority;
        }

        const { data: updatedProject, error: updateError } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', existingProject.id)
          .select('id, workflow_status')
          .single();

        if (updateError) {
          console.error('[move_to_project_board] Failed to update project:', updateError);
          return {
            success: false,
            error: `Failed to update project: ${updateError.message}`,
          };
        }

        return {
          success: true,
          data: {
            id: updatedProject.id,
            title: `Updated: ${proposalName || 'Project'} → ${updatedProject.workflow_status}`,
            type: 'project',
            workflow_status: updatedProject.workflow_status,
          },
        };
      }

      // No status change requested, just return current state
      return {
        success: true,
        data: {
          id: existingProject.id,
          title: `${proposalName || 'Project'} is already on board`,
          type: 'project',
          workflow_status: existingProject.workflow_status,
        },
      };
    }

    // Project doesn't exist - create it
    // First, get the default workflow column or use provided status
    let workflowStatus = boardParams.workflow_status || DEFAULT_WORKFLOW_STATUS;

    // Try to get the organization's default workflow column
    const { data: defaultColumn } = await supabase
      .from('project_workflow_columns')
      .select('name')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .maybeSingle();

    if (defaultColumn && !boardParams.workflow_status) {
      workflowStatus = defaultColumn.name;
    }

    // Get the next board order
    const { data: lastProject } = await supabase
      .from('projects')
      .select('board_order')
      .eq('organization_id', organizationId)
      .eq('workflow_status', workflowStatus)
      .order('board_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (lastProject?.board_order || 0) + 1;

    // Build project insert data
    const projectData: Record<string, unknown> = {
      proposal_id: proposalId,
      organization_id: organizationId,
      workflow_status: workflowStatus,
      board_order: nextOrder,
    };

    if (boardParams.priority && VALID_PRIORITIES.includes(boardParams.priority as typeof VALID_PRIORITIES[number])) {
      projectData.priority = boardParams.priority;
    }

    // Create the project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(projectData)
      .select('id, workflow_status')
      .single();

    if (createError) {
      console.error('[move_to_project_board] Failed to create project:', createError);
      return {
        success: false,
        error: `Failed to create project: ${createError.message}`,
      };
    }

    // Mark the proposal as being on board
    await supabase
      .from('proposals')
      .update({ is_on_board: true })
      .eq('id', proposalId);

    return {
      success: true,
      data: {
        id: newProject.id,
        title: `Added to board: ${proposalName || 'Project'} (${newProject.workflow_status})`,
        type: 'project',
        workflow_status: newProject.workflow_status,
      },
    };
  },
});
