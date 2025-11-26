/**
 * Timeline Milestones System
 *
 * Flexible, user-defined milestone tracking for projects.
 * Users can add custom milestones with their own labels and dates.
 */

// ============================================================================
// Types
// ============================================================================

export interface TimelineMilestone {
  id: string;              // Unique identifier (UUID)
  label: string;           // User-defined milestone name
  date: string | null;     // ISO date string (YYYY-MM-DD) or null
  notes?: string;          // Optional notes about this milestone
  order: number;           // Display order on timeline (0, 1, 2, 3...)
  created_at: string;      // When milestone was created (ISO timestamp)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for milestones
 */
export function generateMilestoneId(): string {
  return `milestone_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Initialize empty timeline milestones array
 * Projects start with no milestones - users add them manually
 */
export function initializeTimelineMilestones(): TimelineMilestone[] {
  return [];
}

/**
 * Add a new milestone to the timeline
 */
export function addMilestone(
  milestones: TimelineMilestone[],
  label: string,
  date: string | null = null
): TimelineMilestone[] {
  const newMilestone: TimelineMilestone = {
    id: generateMilestoneId(),
    label,
    date,
    order: milestones.length, // Add to end
    created_at: new Date().toISOString(),
  };

  return [...milestones, newMilestone];
}

/**
 * Update an existing milestone
 */
export function updateMilestone(
  milestones: TimelineMilestone[],
  milestoneId: string,
  updates: Partial<Pick<TimelineMilestone, 'label' | 'date' | 'notes'>>
): TimelineMilestone[] {
  return milestones.map(m =>
    m.id === milestoneId ? { ...m, ...updates } : m
  );
}

/**
 * Delete a milestone
 */
export function deleteMilestone(
  milestones: TimelineMilestone[],
  milestoneId: string
): TimelineMilestone[] {
  const filtered = milestones.filter(m => m.id !== milestoneId);

  // Reorder remaining milestones
  return filtered.map((m, index) => ({ ...m, order: index }));
}

/**
 * Reorder milestones
 */
export function reorderMilestones(
  milestones: TimelineMilestone[],
  fromIndex: number,
  toIndex: number
): TimelineMilestone[] {
  const result = [...milestones];
  const [removed] = result.splice(fromIndex, 1);

  if (!removed) return result;

  result.splice(toIndex, 0, removed);

  // Update order values
  return result.map((m, index) => ({ ...m, order: index }));
}

/**
 * Get milestone by ID
 */
export function getMilestone(
  milestones: TimelineMilestone[],
  milestoneId: string
): TimelineMilestone | undefined {
  return milestones.find(m => m.id === milestoneId);
}

/**
 * Sort milestones by order
 */
export function sortMilestonesByOrder(
  milestones: TimelineMilestone[]
): TimelineMilestone[] {
  return [...milestones].sort((a, b) => a.order - b.order);
}
