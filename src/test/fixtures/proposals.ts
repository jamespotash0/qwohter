/**
 * Proposal Test Fixtures
 *
 * Factory functions for creating test proposal data.
 * Use these to generate consistent, type-safe test data.
 */

import type { Proposal } from '@/services/proposalsService';
import { generateTestPrefix } from '../config/testEnv';

type ProposalStatus = 'Draft' | 'Submitted' | 'Won' | 'Rejected';

/**
 * Create a mock proposal with default values
 */
export function createMockProposal(overrides?: Partial<Proposal>): Proposal {
  const prefix = generateTestPrefix();
  const now = new Date().toISOString();

  return {
    id: `${prefix}_proposal`,
    organization_id: `${prefix}_org`,
    created_by: `${prefix}_user`,
    form_id: `${prefix}_form`,
    proposal_number: 'P1001',
    status: 'Draft' as ProposalStatus,
    form_data: {},
    project_name: 'Test Project',
    client_name: 'Test Client',
    client_company: 'Test Company',
    job_location: 'Test Location',
    total_value: 10000,
    is_main_version: true,
    is_complete: false,
    is_archived: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create proposals for each status
 */
export function createMockProposalsByStatus(): Record<ProposalStatus, Proposal> {
  const now = new Date().toISOString();

  return {
    Draft: createMockProposal({ status: 'Draft', proposal_number: 'P1001' }),
    Submitted: createMockProposal({
      status: 'Submitted',
      proposal_number: 'P1002',
      submitted_at: now,
    }),
    Won: createMockProposal({
      status: 'Won',
      proposal_number: 'P1003',
      won_at: now,
    }),
    Rejected: createMockProposal({
      status: 'Rejected',
      proposal_number: 'P1004',
      rejected_at: now,
    }),
  };
}

/**
 * Create a version chain of proposals
 * Returns base + versions (e.g., P1001, P1001.2, P1001.3)
 */
export function createMockVersionChain(
  baseNumber: string = 'P1001',
  versionCount: number = 3
): Proposal[] {
  const proposals: Proposal[] = [];

  // Base proposal
  proposals.push(
    createMockProposal({
      id: `base_${baseNumber}`,
      proposal_number: baseNumber,
      is_main_version: true,
      status: 'Draft',
    })
  );

  // Versions
  for (let i = 2; i <= versionCount; i++) {
    proposals.push(
      createMockProposal({
        id: `version_${baseNumber}_${i}`,
        proposal_number: `${baseNumber}.${i}`,
        is_main_version: false,
        status: 'Draft',
      })
    );
  }

  return proposals;
}

/**
 * Create proposals with mixed statuses for a version chain
 */
export function createMockVersionChainWithStatuses(): Proposal[] {
  return [
    createMockProposal({
      id: 'base_P1001',
      proposal_number: 'P1001',
      is_main_version: false,
      status: 'Draft',
    }),
    createMockProposal({
      id: 'version_P1001_2',
      proposal_number: 'P1001.2',
      is_main_version: false,
      status: 'Submitted',
    }),
    createMockProposal({
      id: 'version_P1001_3',
      proposal_number: 'P1001.3',
      is_main_version: true,
      status: 'Won',
      won_at: new Date().toISOString(),
    }),
  ];
}

/**
 * Create multiple unrelated proposal groups
 */
export function createMockProposalGroups(): Proposal[] {
  return [
    // Group 1: P1001 with versions
    createMockProposal({
      id: 'P1001_base',
      proposal_number: 'P1001',
      is_main_version: true,
      status: 'Draft',
    }),
    createMockProposal({
      id: 'P1001_v2',
      proposal_number: 'P1001.2',
      is_main_version: false,
      status: 'Submitted',
    }),

    // Group 2: P1002 single proposal
    createMockProposal({
      id: 'P1002_base',
      proposal_number: 'P1002',
      is_main_version: true,
      status: 'Won',
      won_at: new Date().toISOString(),
    }),

    // Group 3: P1003 with versions
    createMockProposal({
      id: 'P1003_base',
      proposal_number: 'P1003',
      is_main_version: true,
      status: 'Rejected',
      rejected_at: new Date().toISOString(),
    }),
    createMockProposal({
      id: 'P1003_v2',
      proposal_number: 'P1003.2',
      is_main_version: false,
      status: 'Draft',
    }),
    createMockProposal({
      id: 'P1003_v3',
      proposal_number: 'P1003.3',
      is_main_version: false,
      status: 'Draft',
    }),
  ];
}
