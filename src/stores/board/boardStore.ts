/**
 * @deprecated This store has been migrated to React Query
 * Use hooks from @/hooks/queries instead
 *
 * Migration:
 * - import { useProjects, useWorkflowColumns } from '@/hooks/queries'
 * - const { data: projects } = useProjects(organizationId)
 *
 * Types are still exported for backward compatibility
 */

// Re-export types from service layer
export type { Project, WorkflowColumn, CreateBoardItemData, UpdateBoardItemData } from '@/services/boardService';
