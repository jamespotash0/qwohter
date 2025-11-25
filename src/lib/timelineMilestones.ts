/**
 * Timeline Milestones System
 *
 * Flexible milestone tracking for projects that adapts to different business types:
 * - Wall systems: Separate track/panel delivery and installation milestones
 * - Furniture: Simple delivery and installation milestones
 * - Custom: Any milestone types the user needs
 *
 * Works with OR without quote delivery_details data.
 */

import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// Types
// ============================================================================

export type MilestoneType =
  // Common milestones
  | 'drawings_approval'

  // Wall system specific (track/panel separation)
  | 'track_delivery'
  | 'panel_delivery'
  | 'track_installation_start'
  | 'track_installation_end'
  | 'panel_installation_start'
  | 'panel_installation_end'

  // Generic (furniture, custom, everything else)
  | 'delivery'
  | 'installation'

  // Optional custom milestones
  | 'permit_approval'
  | 'inspection'
  | 'custom'; 

export interface TimelineMilestone {
  type: MilestoneType;
  date: string | null; // ISO date string (YYYY-MM-DD) or null
  auto_calculated: boolean;
  label?: string; // Custom label for display (optional, defaults to formatted type)
  source?: {
    based_on: MilestoneType; // Which milestone this is calculated from
    offset_weeks?: number;   // Number of weeks to add
    offset_days?: number;    // Number of days to add
  };
}

export type Quote = Database['public']['Tables']['quotes']['Row'];

export interface DeliveryDetails {
  shopDrawingWeeks?: string | number;
  trackDeliveryWeeks?: string | number;
  panelDeliveryWeeks?: string | number;
  trackInstallationDays?: string | number;
  panelInstallationDays?: string | number;
  // Generic fields
  deliveryWeeks?: string | number;
  installationDays?: string | number;
  [key: string]: any;
}

// ============================================================================
// Milestone Label Formatting
// ============================================================================

export function formatMilestoneLabel(type: MilestoneType): string {
  const labels: Record<MilestoneType, string> = {
    drawings_approval: 'Drawings Approval',
    track_delivery: 'Track Delivery',
    panel_delivery: 'Panel Delivery',
    track_installation_start: 'Track Installation Start',
    track_installation_end: 'Track Installation End',
    panel_installation_start: 'Panel Installation Start',
    panel_installation_end: 'Panel Installation End',
    delivery: 'Delivery',
    installation: 'Installation',
    permit_approval: 'Permit Approval',
    inspection: 'Inspection',
    custom: 'Custom Milestone',
  };

  return labels[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ============================================================================
// Business Type Detection
// ============================================================================

export function detectBusinessType(deliveryDetails?: DeliveryDetails | null): 'wall_systems' | 'generic' {
  if (!deliveryDetails) return 'generic';

  // Check for wall system indicators (track AND panel fields)
  const hasTrackFields = !!(deliveryDetails.trackDeliveryWeeks || deliveryDetails.trackInstallationDays);
  const hasPanelFields = !!(deliveryDetails.panelDeliveryWeeks || deliveryDetails.panelInstallationDays);

  // If has both track AND panel fields → it's a wall system
  if (hasTrackFields && hasPanelFields) {
    return 'wall_systems';
  }

  // Everything else (furniture, custom, no delivery details) → generic
  return 'generic';
}

// ============================================================================
// Milestone Initialization
// ============================================================================

/**
 * Initialize timeline milestones for a project based on quote data
 * Handles all scenarios:
 * - Full delivery_details (auto-populate with calculations)
 * - Partial delivery_details (use what's available)
 * - Empty delivery_details (create manual structure)
 * - No delivery_details (create basic manual structure)
 */
export function initializeTimelineMilestones(
  quote?: Quote | null,
): TimelineMilestone[] {
  const deliveryDetails = quote?.delivery_details as DeliveryDetails | undefined;
  const businessType = detectBusinessType(deliveryDetails);

  // Helper to parse weeks/days (handles string or number, with ranges like "4-6")
  const parseWeeks = (value?: string | number): number | null => {
    if (value === null || value === undefined) return null;
    const numValue = typeof value === 'number' ? value : parseFloat(String(value).split('-')[0] || '0');
    return isNaN(numValue) ? null : numValue;
  };

  const parseDays = (value?: string | number): number | null => {
    if (value === null || value === undefined) return null;
    const numValue = typeof value === 'number' ? value : parseFloat(String(value).split('-')[0] || '0');
    return isNaN(numValue) ? null : numValue;
  };

  // Wall Systems Timeline - Track and Panel separated
  if (businessType === 'wall_systems') {
    const shopDrawingWeeks = parseWeeks(deliveryDetails?.shopDrawingWeeks);
    const trackDeliveryWeeks = parseWeeks(deliveryDetails?.trackDeliveryWeeks);
    const panelDeliveryWeeks = parseWeeks(deliveryDetails?.panelDeliveryWeeks);
    const trackInstallationDays = parseDays(deliveryDetails?.trackInstallationDays);
    const panelInstallationDays = parseDays(deliveryDetails?.panelInstallationDays);

    return [
      {
        type: 'drawings_approval',
        date: null,
        auto_calculated: false,
      },
      {
        type: 'track_delivery',
        date: null,
        auto_calculated: !!trackDeliveryWeeks,
        source: trackDeliveryWeeks ? {
          based_on: 'drawings_approval',
          offset_weeks: trackDeliveryWeeks,
        } : undefined,
      },
      {
        type: 'panel_delivery',
        date: null,
        auto_calculated: !!panelDeliveryWeeks,
        source: panelDeliveryWeeks ? {
          based_on: 'drawings_approval',
          offset_weeks: panelDeliveryWeeks,
        } : undefined,
      },
      {
        type: 'track_installation_start',
        date: null,
        auto_calculated: false,
      },
      {
        type: 'panel_installation_start',
        date: null,
        auto_calculated: false,
      },
    ];
  }

  // Generic Timeline - Everything else (furniture, custom, no delivery details)
  // Simple: drawings → delivery → installation
  return [
    {
      type: 'drawings_approval',
      date: null,
      auto_calculated: false,
    },
    {
      type: 'delivery',
      date: null,
      auto_calculated: false,
    },
    {
      type: 'installation',
      date: null,
      auto_calculated: false,
    },
  ];
}

// ============================================================================
// Milestone Calculation
// ============================================================================

/**
 * Calculate milestone dates based on dependencies
 * Updates milestones marked as auto_calculated when their source milestone changes
 */
export function calculateMilestoneDates(
  milestones: TimelineMilestone[]
): TimelineMilestone[] {
  const result = [...milestones];

  // Helper to add weeks/days to a date
  const addTime = (dateStr: string, weeks?: number, days?: number): string => {
    const date = new Date(dateStr);
    if (weeks) date.setDate(date.getDate() + weeks * 7);
    if (days) date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
  };

  // Calculate each auto-calculated milestone
  result.forEach((milestone, index) => {
    if (!milestone.auto_calculated || !milestone.source) return;

    // Find the source milestone
    const sourceMilestone = result.find(m => m.type === milestone.source!.based_on);
    if (!sourceMilestone || !sourceMilestone.date) {
      // Source not set, clear this milestone
      result[index] = { ...milestone, date: null };
      return;
    }

    // Calculate new date
    const newDate = addTime(
      sourceMilestone.date,
      milestone.source.offset_weeks,
      milestone.source.offset_days
    );

    result[index] = { ...milestone, date: newDate };
  });

  return result;
}

/**
 * Update a specific milestone and recalculate dependent milestones
 */
export function updateMilestone(
  milestones: TimelineMilestone[],
  type: MilestoneType,
  newDate: string | null
): TimelineMilestone[] {
  // Update the target milestone
  const updated = milestones.map(m =>
    m.type === type ? { ...m, date: newDate } : m
  );

  // Recalculate all auto-calculated milestones
  return calculateMilestoneDates(updated);
}

/**
 * Get milestone by type
 */
export function getMilestone(
  milestones: TimelineMilestone[],
  type: MilestoneType
): TimelineMilestone | undefined {
  return milestones.find(m => m.type === type);
}

/**
 * Add a custom milestone
 */
export function addCustomMilestone(
  milestones: TimelineMilestone[],
  label: string,
  insertAfter?: MilestoneType
): TimelineMilestone[] {
  const newMilestone: TimelineMilestone = {
    type: 'custom',
    label,
    date: null,
    auto_calculated: false,
  };

  if (insertAfter) {
    const index = milestones.findIndex(m => m.type === insertAfter);
    if (index >= 0) {
      return [
        ...milestones.slice(0, index + 1),
        newMilestone,
        ...milestones.slice(index + 1),
      ];
    }
  }

  return [...milestones, newMilestone];
}
