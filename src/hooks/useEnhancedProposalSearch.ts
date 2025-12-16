import { useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import type { FuseResultMatch, IFuseOptions, FuseResult } from 'fuse.js';
import type { Proposal } from '@/services/proposalsService';

export interface ProposalSearchResult {
  item: Proposal;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

// Field-specific search patterns
const FIELD_PATTERNS = {
  proposal: /^(proposal|prop|#):\s*(.+)/i,
  client: /^(client|company):\s*(.+)/i,
  project: /^(project|name):\s*(.+)/i,
  status: /^(status|state):\s*(.+)/i,
  location: /^(location|address|loc):\s*(.+)/i,
};

// Base fuse options - defined outside component to avoid recreation
const BASE_FUSE_OPTIONS: IFuseOptions<Proposal> = {
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: false,
};

const useEnhancedProposalSearch = (proposals: Proposal[]) => {
  // Memoize all Fuse instances upfront to avoid creating them during search
  const fuseInstances = useMemo(() => {
    const mainKeys = [
      { name: 'proposal_number', weight: 0.3 },
      { name: 'project_name', weight: 0.25 },
      { name: 'client_name', weight: 0.2 },
      { name: 'client_company', weight: 0.15 },
      { name: 'job_location', weight: 0.1 },
      { name: 'status', weight: 0.05 },
    ];

    return {
      main: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: mainKeys }),
      proposalNumber: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: ['proposal_number'] }),
      clientCompany: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: ['client_company'] }),
      clientName: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: ['client_name'] }),
      projectName: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: ['project_name'] }),
      status: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: ['status'] }),
      jobLocation: new Fuse(proposals, { ...BASE_FUSE_OPTIONS, keys: ['job_location'] }),
    };
  }, [proposals]);

  const parseFieldSpecificSearch = useCallback((searchTerm: string) => {
    for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
      const match = searchTerm.match(pattern);
      if (match && match[2]) {
        return { field, term: match[2].trim() };
      }
    }
    return null;
  }, []);

  const performFieldSpecificSearch = useCallback((field: string, term: string): ProposalSearchResult[] => {
    let results: FuseResult<Proposal>[] = [];

    switch (field) {
      case 'proposal':
        results = fuseInstances.proposalNumber.search(term);
        break;
      case 'client': {
        const companyResults = fuseInstances.clientCompany.search(term);
        const nameResults = fuseInstances.clientName.search(term);
        const combinedResults = [...companyResults, ...nameResults];
        // Remove duplicates based on proposal ID
        const seenIds = new Set<string>();
        results = combinedResults.filter(result => {
          if (seenIds.has(result.item.id)) return false;
          seenIds.add(result.item.id);
          return true;
        });
        break;
      }
      case 'project':
        results = fuseInstances.projectName.search(term);
        break;
      case 'status':
        results = fuseInstances.status.search(term);
        break;
      case 'location':
        results = fuseInstances.jobLocation.search(term);
        break;
      default:
        return [];
    }

    return results.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));
  }, [fuseInstances]);

  const search = useCallback((searchTerm: string): ProposalSearchResult[] => {
    if (!searchTerm.trim()) {
      return proposals.map(proposal => ({ item: proposal }));
    }

    // Check for field-specific search patterns
    const fieldSearchResult = parseFieldSpecificSearch(searchTerm);
    if (fieldSearchResult) {
      return performFieldSpecificSearch(fieldSearchResult.field, fieldSearchResult.term);
    }

    // Regular fuzzy search
    const results = fuseInstances.main.search(searchTerm);
    return results.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));
  }, [proposals, fuseInstances, parseFieldSpecificSearch, performFieldSpecificSearch]);

  // Get search suggestions based on existing data
  const getSearchSuggestions = useCallback((searchTerm: string, limit = 5): string[] => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];

    const suggestions = new Set<string>();
    const lowerTerm = searchTerm.toLowerCase();

    // Early exit if we have enough suggestions
    for (const proposal of proposals) {
      if (suggestions.size >= limit) break;

      if (proposal.client_name?.toLowerCase().includes(lowerTerm)) {
        suggestions.add(proposal.client_name);
      }
      if (suggestions.size >= limit) break;

      if (proposal.client_company?.toLowerCase().includes(lowerTerm)) {
        suggestions.add(proposal.client_company);
      }
      if (suggestions.size >= limit) break;

      if (proposal.project_name?.toLowerCase().includes(lowerTerm)) {
        suggestions.add(proposal.project_name);
      }
      if (suggestions.size >= limit) break;

      if (proposal.proposal_number?.toLowerCase().includes(lowerTerm)) {
        suggestions.add(proposal.proposal_number);
      }
      if (suggestions.size >= limit) break;

      if (proposal.job_location?.toLowerCase().includes(lowerTerm)) {
        suggestions.add(proposal.job_location);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }, [proposals]);

  // Helper to get field search examples
  const getSearchExamples = useCallback((): string[] => [
    'proposal:PROP-001',
    'client:Acme Corp',
    'project:Office Renovation',
    'status:Draft',
    'location:New York'
  ], []);

  return {
    search,
    getSearchSuggestions,
    getSearchExamples,
  };
};

export default useEnhancedProposalSearch;
