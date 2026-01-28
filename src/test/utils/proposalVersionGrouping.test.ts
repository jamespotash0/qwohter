/**
 * Proposal Version Grouping Tests
 *
 * Tests for proposal version grouping utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getBaseProposalNumber,
  getVersionSuffix,
  isVersionNumber,
  sortProposalsByVersion,
  groupProposalsByVersion,
  getVersionDisplayInfo,
  getVersionStatusBadges,
  isLatestVersion,
  getProposalVersionNumber,
} from '@/utils/proposalVersionGrouping';
import {
  createMockProposal,
  createMockVersionChain,
  createMockVersionChainWithStatuses,
  createMockProposalGroups,
} from '@/test/fixtures/proposals';

describe('proposalVersionGrouping', () => {
  describe('getBaseProposalNumber', () => {
    it('should return same number for base proposals', () => {
      expect(getBaseProposalNumber('P1001')).toBe('P1001');
      expect(getBaseProposalNumber('SR-1005')).toBe('SR-1005');
      expect(getBaseProposalNumber('ES-1-014')).toBe('ES-1-014');
    });

    it('should extract base from versioned numbers', () => {
      expect(getBaseProposalNumber('P1001.2')).toBe('P1001');
      expect(getBaseProposalNumber('P1001.10')).toBe('P1001');
      expect(getBaseProposalNumber('SR-1005.3')).toBe('SR-1005');
    });

    it('should handle complex prefixes with versions', () => {
      expect(getBaseProposalNumber('ES-1-014.2')).toBe('ES-1-014');
      expect(getBaseProposalNumber('Q1-002-2024.5')).toBe('Q1-002-2024');
    });

    it('should handle empty string', () => {
      expect(getBaseProposalNumber('')).toBe('');
    });
  });

  describe('getVersionSuffix', () => {
    it('should return null for base proposals', () => {
      expect(getVersionSuffix('P1001')).toBeNull();
      expect(getVersionSuffix('SR-1005')).toBeNull();
    });

    it('should return suffix for versioned numbers', () => {
      expect(getVersionSuffix('P1001.2')).toBe('.2');
      expect(getVersionSuffix('P1001.10')).toBe('.10');
      expect(getVersionSuffix('SR-1005.3')).toBe('.3');
    });

    it('should handle empty string', () => {
      expect(getVersionSuffix('')).toBeNull();
    });
  });

  describe('isVersionNumber', () => {
    it('should return false for base proposals', () => {
      expect(isVersionNumber('P1001')).toBe(false);
      expect(isVersionNumber('SR-1005')).toBe(false);
    });

    it('should return true for versioned numbers', () => {
      expect(isVersionNumber('P1001.2')).toBe(true);
      expect(isVersionNumber('P1001.10')).toBe(true);
    });

    it('should handle empty string', () => {
      expect(isVersionNumber('')).toBe(false);
    });
  });

  describe('sortProposalsByVersion', () => {
    it('should sort base version first', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001.3' }),
        createMockProposal({ proposal_number: 'P1001' }),
        createMockProposal({ proposal_number: 'P1001.2' }),
      ];

      const sorted = sortProposalsByVersion(proposals);

      expect(sorted[0].proposal_number).toBe('P1001');
      expect(sorted[1].proposal_number).toBe('P1001.2');
      expect(sorted[2].proposal_number).toBe('P1001.3');
    });

    it('should handle proposals with only versions (no base)', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001.5' }),
        createMockProposal({ proposal_number: 'P1001.2' }),
        createMockProposal({ proposal_number: 'P1001.10' }),
      ];

      const sorted = sortProposalsByVersion(proposals);

      expect(sorted[0].proposal_number).toBe('P1001.2');
      expect(sorted[1].proposal_number).toBe('P1001.5');
      expect(sorted[2].proposal_number).toBe('P1001.10');
    });

    it('should handle single proposal', () => {
      const proposals = [createMockProposal({ proposal_number: 'P1001' })];
      const sorted = sortProposalsByVersion(proposals);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].proposal_number).toBe('P1001');
    });

    it('should handle empty array', () => {
      const sorted = sortProposalsByVersion([]);
      expect(sorted).toHaveLength(0);
    });

    it('should not mutate original array', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001.2' }),
        createMockProposal({ proposal_number: 'P1001' }),
      ];
      const original = [...proposals];

      sortProposalsByVersion(proposals);

      expect(proposals[0].proposal_number).toBe(original[0].proposal_number);
      expect(proposals[1].proposal_number).toBe(original[1].proposal_number);
    });
  });

  describe('groupProposalsByVersion', () => {
    it('should group proposals by base number', () => {
      const proposals = createMockProposalGroups();
      const groups = groupProposalsByVersion(proposals);

      expect(groups).toHaveLength(3);

      const p1001Group = groups.find((g) => g.baseNumber === 'P1001');
      expect(p1001Group?.versions).toHaveLength(2);

      const p1002Group = groups.find((g) => g.baseNumber === 'P1002');
      expect(p1002Group?.versions).toHaveLength(1);

      const p1003Group = groups.find((g) => g.baseNumber === 'P1003');
      expect(p1003Group?.versions).toHaveLength(3);
    });

    it('should select is_main_version as mainVersion when available', () => {
      const proposals = createMockVersionChainWithStatuses();
      const groups = groupProposalsByVersion(proposals);

      expect(groups).toHaveLength(1);
      expect(groups[0].mainVersion.is_main_version).toBe(true);
      expect(groups[0].mainVersion.proposal_number).toBe('P1001.3');
    });

    it('should select Won version as mainVersion when no is_main_version flag', () => {
      const proposals = [
        createMockProposal({
          proposal_number: 'P1001',
          is_main_version: false,
          status: 'Draft',
        }),
        createMockProposal({
          proposal_number: 'P1001.2',
          is_main_version: false,
          status: 'Won',
        }),
      ];

      const groups = groupProposalsByVersion(proposals);

      expect(groups[0].mainVersion.status).toBe('Won');
      expect(groups[0].mainVersion.proposal_number).toBe('P1001.2');
    });

    it('should select base version as mainVersion when no Won or is_main_version', () => {
      const proposals = [
        createMockProposal({
          proposal_number: 'P1001',
          is_main_version: false,
          status: 'Draft',
        }),
        createMockProposal({
          proposal_number: 'P1001.2',
          is_main_version: false,
          status: 'Draft',
        }),
      ];

      const groups = groupProposalsByVersion(proposals);

      expect(groups[0].mainVersion.proposal_number).toBe('P1001');
    });

    it('should set hasMultipleVersions correctly', () => {
      const proposals = createMockProposalGroups();
      const groups = groupProposalsByVersion(proposals);

      const p1001Group = groups.find((g) => g.baseNumber === 'P1001');
      expect(p1001Group?.hasMultipleVersions).toBe(true);

      const p1002Group = groups.find((g) => g.baseNumber === 'P1002');
      expect(p1002Group?.hasMultipleVersions).toBe(false);
    });

    it('should calculate statusSummary correctly', () => {
      const proposals = createMockVersionChainWithStatuses();
      const groups = groupProposalsByVersion(proposals);

      expect(groups[0].statusSummary).toEqual({
        won: 1,
        rejected: 0,
        submitted: 1,
        draft: 1,
      });
    });

    it('should sort versions within each group', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001.3' }),
        createMockProposal({ proposal_number: 'P1001' }),
        createMockProposal({ proposal_number: 'P1001.2' }),
      ];

      const groups = groupProposalsByVersion(proposals);

      expect(groups[0].versions[0].proposal_number).toBe('P1001');
      expect(groups[0].versions[1].proposal_number).toBe('P1001.2');
      expect(groups[0].versions[2].proposal_number).toBe('P1001.3');
    });

    it('should handle empty array', () => {
      const groups = groupProposalsByVersion([]);
      expect(groups).toHaveLength(0);
    });

    it('should identify latestVersion correctly', () => {
      const proposals = createMockVersionChain('P1001', 3);
      const groups = groupProposalsByVersion(proposals);

      expect(groups[0].latestVersion.proposal_number).toBe('P1001.3');
    });
  });

  describe('getVersionDisplayInfo', () => {
    it('should return Won status with priority', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001', status: 'Won' }),
        createMockProposal({ proposal_number: 'P1001.2', status: 'Rejected' }),
      ];
      const groups = groupProposalsByVersion(proposals);

      const info = getVersionDisplayInfo(groups[0]);

      expect(info.status).toBe('Won');
      expect(info.color).toBe('success');
      expect(info.icon).toBe('✓');
    });

    it('should return Rejected when no Won', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001', status: 'Rejected' }),
        createMockProposal({ proposal_number: 'P1001.2', status: 'Draft' }),
      ];
      const groups = groupProposalsByVersion(proposals);

      const info = getVersionDisplayInfo(groups[0]);

      expect(info.status).toBe('Rejected');
      expect(info.color).toBe('destructive');
    });

    it('should return Submitted when no Won or Rejected', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001', status: 'Submitted' }),
        createMockProposal({ proposal_number: 'P1001.2', status: 'Draft' }),
      ];
      const groups = groupProposalsByVersion(proposals);

      const info = getVersionDisplayInfo(groups[0]);

      expect(info.status).toBe('Submitted');
      expect(info.color).toBe('default');
    });

    it('should return Draft as default', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001', status: 'Draft' }),
        createMockProposal({ proposal_number: 'P1001.2', status: 'Draft' }),
      ];
      const groups = groupProposalsByVersion(proposals);

      const info = getVersionDisplayInfo(groups[0]);

      expect(info.status).toBe('Draft');
      expect(info.color).toBe('outline');
    });

    it('should show count when multiple of same status', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001', status: 'Won' }),
        createMockProposal({ proposal_number: 'P1001.2', status: 'Won' }),
      ];
      const groups = groupProposalsByVersion(proposals);

      const info = getVersionDisplayInfo(groups[0]);

      expect(info.label).toBe('2 Won');
    });
  });

  describe('getVersionStatusBadges', () => {
    it('should return badges for all statuses present', () => {
      const proposals = createMockVersionChainWithStatuses();
      const groups = groupProposalsByVersion(proposals);

      const badges = getVersionStatusBadges(groups[0]);

      expect(badges).toHaveLength(3); // Won, Submitted, Draft
      expect(badges.map((b) => b.status)).toContain('Won');
      expect(badges.map((b) => b.status)).toContain('Submitted');
      expect(badges.map((b) => b.status)).toContain('Draft');
    });

    it('should return badges in priority order', () => {
      const proposals = createMockVersionChainWithStatuses();
      const groups = groupProposalsByVersion(proposals);

      const badges = getVersionStatusBadges(groups[0]);

      expect(badges[0].status).toBe('Won');
      expect(badges[badges.length - 1].status).toBe('Draft');
    });

    it('should include correct counts', () => {
      const proposals = [
        createMockProposal({ proposal_number: 'P1001', status: 'Draft' }),
        createMockProposal({ proposal_number: 'P1001.2', status: 'Draft' }),
        createMockProposal({ proposal_number: 'P1001.3', status: 'Won' }),
      ];
      const groups = groupProposalsByVersion(proposals);

      const badges = getVersionStatusBadges(groups[0]);

      const wonBadge = badges.find((b) => b.status === 'Won');
      const draftBadge = badges.find((b) => b.status === 'Draft');

      expect(wonBadge?.count).toBe(1);
      expect(draftBadge?.count).toBe(2);
    });
  });

  describe('isLatestVersion', () => {
    it('should return true for latest version', () => {
      const proposals = createMockVersionChain('P1001', 3);
      const latestProposal = proposals[2]; // P1001.3

      expect(isLatestVersion(latestProposal, proposals)).toBe(true);
    });

    it('should return false for non-latest versions', () => {
      const proposals = createMockVersionChain('P1001', 3);
      const baseProposal = proposals[0]; // P1001

      expect(isLatestVersion(baseProposal, proposals)).toBe(false);
    });

    it('should return true for single proposal', () => {
      const proposals = [createMockProposal({ proposal_number: 'P1001' })];

      expect(isLatestVersion(proposals[0], proposals)).toBe(true);
    });

    it('should only consider proposals in same group', () => {
      const proposals = [
        createMockProposal({ id: 'a', proposal_number: 'P1001' }),
        createMockProposal({ id: 'b', proposal_number: 'P1001.2' }),
        createMockProposal({ id: 'c', proposal_number: 'P1002' }),
        createMockProposal({ id: 'd', proposal_number: 'P1002.2' }),
      ];

      // P1001.2 should be latest in P1001 group
      expect(isLatestVersion(proposals[1], proposals)).toBe(true);

      // P1002.2 should be latest in P1002 group
      expect(isLatestVersion(proposals[3], proposals)).toBe(true);
    });
  });

  describe('getProposalVersionNumber', () => {
    it('should return 1 for base version', () => {
      expect(getProposalVersionNumber('P1001')).toBe(1);
      expect(getProposalVersionNumber('SR-1005')).toBe(1);
    });

    it('should return correct number for versions', () => {
      expect(getProposalVersionNumber('P1001.1')).toBe(2);
      expect(getProposalVersionNumber('P1001.2')).toBe(3);
      expect(getProposalVersionNumber('P1001.9')).toBe(10);
    });

    it('should handle large version numbers', () => {
      expect(getProposalVersionNumber('P1001.99')).toBe(100);
    });

    it('should handle empty string', () => {
      expect(getProposalVersionNumber('')).toBe(1);
    });
  });
});
