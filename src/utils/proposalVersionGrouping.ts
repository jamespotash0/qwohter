/**
 * Proposal Version Grouping Utilities
 *
 * Groups proposals by their base proposal number for display purposes.
 * Example: P1001, P1001.1, P1001.2 all group under "P1001"
 */
import type { ProposalStatus } from '@/lib/types/proposals/proposal';
import type { Proposal } from '@/stores/proposals/proposalsStore';

export interface ProposalVersionGroup {
  baseNumber: string;
  versions: Proposal[];
  latestVersion: Proposal;
  mainVersion: Proposal; // The version displayed as the main row (accepted > latest)
  hasMultipleVersions: boolean;
  statusSummary: {
    accepted: number;
    rejected: number;
    submitted: number;
    draft: number;
    pending: number;
    incomplete: number;
  };
}

/**
 * Extract base proposal number from full number
 * "P1001" -> "P1001"
 * "P1001.1" -> "P1001"
 * "P1001.2" -> "P1001"
 */
export function getBaseProposalNumber(proposalNumber: string): string {
  const dotIndex = proposalNumber.indexOf('.');
  return dotIndex === -1 ? proposalNumber : proposalNumber.substring(0, dotIndex);
}

/**
 * Get version suffix from proposal number
 * "P1001" -> null
 * "P1001.1" -> ".1"
 * "P1001.2" -> ".2"
 */
export function getVersionSuffix(proposalNumber: string): string | null {
  const dotIndex = proposalNumber.indexOf('.');
  return dotIndex === -1 ? null : proposalNumber.substring(dotIndex);
}

/**
 * Check if proposal number is a version (has suffix)
 */
export function isVersionNumber(proposalNumber: string): boolean {
  return proposalNumber.includes('.');
}

/**
 * Sort proposals by version number
 * Base (P1001) comes first, then versions in order (.1, .2, .3)
 */
export function sortProposalsByVersion(proposals: Proposal[]): Proposal[] {
  return [...proposals].sort((a, b) => {
    const aSuffix = getVersionSuffix(a.proposal_number);
    const bSuffix = getVersionSuffix(b.proposal_number);

    // Base version (no suffix) comes first
    if (!aSuffix && bSuffix) return -1;
    if (aSuffix && !bSuffix) return 1;
    if (!aSuffix && !bSuffix) return 0;

    // Both have suffixes - compare version suffixes numerically
    // At this point we know both are non-null
    const aNum = parseFloat(aSuffix!.substring(1)); // ".1" -> 1
    const bNum = parseFloat(bSuffix!.substring(1)); // ".2" -> 2
    return aNum - bNum;
  });
}

/**
 * Group proposals by their base proposal number
 */
export function groupProposalsByVersion(proposals: Proposal[]): ProposalVersionGroup[] {
  // Group by base proposal number
  const grouped = new Map<string, Proposal[]>();

  proposals.forEach(proposal => {
    const baseNumber = getBaseProposalNumber(proposal.proposal_number);
    if (!grouped.has(baseNumber)) {
      grouped.set(baseNumber, []);
    }
    grouped.get(baseNumber)!.push(proposal);
  });

  // Convert to ProposalVersionGroup[]
  return Array.from(grouped.entries()).map(([baseNumber, versions]) => {
    // Sort versions
    const sorted = sortProposalsByVersion(versions);

    // Determine which version to show as the "main" one
    // Priority: is_main_version flag > Accepted version > Base proposal > Latest version
    // 1. If a proposal is marked with is_main_version = true, show that
    // 2. Otherwise, if one was accepted, show that version
    // 3. Otherwise, show the base proposal (P1001) if it exists
    // 4. Otherwise, show the latest version (highest version number)
    const markedMainVersion = versions.find(v => v.is_main_version === true);
    const acceptedVersion = versions.find(v => v.proposal_status === 'Accepted');
    const baseVersion = versions.find(v => v.proposal_number === baseNumber); // Base proposal (no suffix)
    const latestVersion = sorted[sorted.length - 1]; // Truly latest version
    const mainVersion = markedMainVersion || acceptedVersion || baseVersion || latestVersion;

    // Calculate status summary
    const statusSummary = {
      accepted: versions.filter(v => v.proposal_status === 'Accepted').length,
      rejected: versions.filter(v => v.proposal_status === 'Rejected').length,
      submitted: versions.filter(v => v.proposal_status === 'Submitted').length,
      draft: versions.filter(v => v.proposal_status === 'Draft').length,
      incomplete: versions.filter(v => v.proposal_status === 'Incomplete').length,
    };

    return {
      baseNumber,
      versions: sorted,
      latestVersion,
      mainVersion,
      hasMultipleVersions: versions.length > 1,
      statusSummary
    };
  });
}

/**
 * Get display information for a version group
 * Returns the most important status and count
 */
export function getVersionDisplayInfo(group: ProposalVersionGroup) {
  const { statusSummary } = group;

  // Priority: Accepted > Submitted > Rejected > Draft > Incomplete
  if (statusSummary.accepted > 0) {
    return {
      status: 'Accepted' as ProposalStatus,
      label: statusSummary.accepted === 1 ? 'Accepted' : `${statusSummary.accepted} Accepted`,
      color: 'success' as const,
      icon: '✓'
    };
  }

  if (statusSummary.submitted > 0) {
    return {
      status: 'Submitted' as ProposalStatus,
      label: statusSummary.submitted === 1 ? 'Submitted' : `${statusSummary.submitted} Submitted`,
      color: 'default' as const,
      icon: '→'
    };
  }

  if (statusSummary.rejected > 0) {
    return {
      status: 'Rejected' as ProposalStatus,
      label: statusSummary.rejected === 1 ? 'Rejected' : `${statusSummary.rejected} Rejected`,
      color: 'destructive' as const,
      icon: '✕'
    };
  }

  if (statusSummary.draft > 0) {
    return {
      status: 'Draft' as ProposalStatus,
      label: statusSummary.draft === 1 ? 'Draft' : `${statusSummary.draft} Draft`,
      color: 'outline' as const,
      icon: '◐'
    };
  }

  return {
    status: 'Incomplete' as ProposalStatus,
    label: statusSummary.incomplete === 1 ? 'Incomplete' : `${statusSummary.incomplete} Incomplete`,
    color: 'outline' as const,
    icon: '...'
  };
}

/**
 * Get all statuses for a version group with counts
 * Returns array of status badges to display
 */
export function getVersionStatusBadges(group: ProposalVersionGroup) {
  const badges: Array<{
    status: ProposalStatus;
    count: number;
    label: string;
    color: string;
  }> = [];

  if (group.statusSummary.accepted > 0) {
    badges.push({
      status: 'Accepted',
      count: group.statusSummary.accepted,
      label: `${group.statusSummary.accepted} Accepted`,
      color: 'success'
    });
  }

  if (group.statusSummary.submitted > 0) {
    badges.push({
      status: 'Submitted',
      count: group.statusSummary.submitted,
      label: `${group.statusSummary.submitted} Submitted`,
      color: 'default'
    });
  }

  if (group.statusSummary.rejected > 0) {
    badges.push({
      status: 'Rejected',
      count: group.statusSummary.rejected,
      label: `${group.statusSummary.rejected} Rejected`,
      color: 'destructive'
    });
  }


  if (group.statusSummary.draft > 0) {
    badges.push({
      status: 'Draft',
      count: group.statusSummary.draft,
      label: `${group.statusSummary.draft} Draft`,
      color: 'outline'
    });
  }

  if (group.statusSummary.incomplete > 0) {
    badges.push({
      status: 'Incomplete',
      count: group.statusSummary.incomplete,
      label: `${group.statusSummary.incomplete} Incomplete`,
      color: 'outline'
    });
  }

  return badges;
}

/**
 * Check if a proposal is the latest version in its group
 */
export function isLatestVersion(proposal: Proposal, allProposals: Proposal[]): boolean {
  const baseNumber = getBaseProposalNumber(proposal.proposal_number);
  const versionsInGroup = allProposals.filter(
    q => getBaseProposalNumber(q.proposal_number) === baseNumber
  );
  const sorted = sortProposalsByVersion(versionsInGroup);
  return sorted[sorted.length - 1]!.id === proposal.id;
}

/**
 * Get proposal version number (1, 2, 3, etc.) from proposal number
 * "P1001" -> 1 (base version)
 * "P1001.1" -> 2
 * "P1001.2" -> 3
 */
export function getProposalVersionNumber(proposalNumber: string): number {
  const suffix = getVersionSuffix(proposalNumber);
  if (!suffix) return 1; // Base version
  const num = parseFloat(suffix.substring(1));
  return Math.floor(num) + 1;
}
