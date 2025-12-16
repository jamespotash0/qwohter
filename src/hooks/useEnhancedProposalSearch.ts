import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { FuseResultMatch, IFuseOptions } from 'fuse.js';
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

const useEnhancedProposalSearch = (proposals: Proposal[]) => {
  // Configure Fuse.js with weighted fields for proposals
  const fuseOptions: IFuseOptions<Proposal> = {
    keys: [
      { name: 'proposal_number', weight: 0.3 },
      { name: 'project_name', weight: 0.25 },
      { name: 'client_name', weight: 0.2 },
      { name: 'client_company', weight: 0.15 },
      { name: 'job_location', weight: 0.1 },
      { name: 'status', weight: 0.05 },
    ],
    threshold: 0.4, // 0 = exact match, 1 = match anything
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: false,
  };

  // Create Fuse instance
  const fuse = useMemo(() => new Fuse(proposals, fuseOptions), [proposals]);

  const search = (searchTerm: string): ProposalSearchResult[] => {
    if (!searchTerm.trim()) {
      return proposals.map(proposal => ({ item: proposal }));
    }

    // Check for field-specific search patterns
    const fieldSearchResult = parseFieldSpecificSearch(searchTerm);
    if (fieldSearchResult) {
      return performFieldSpecificSearch(fieldSearchResult.field, fieldSearchResult.term);
    }

    // Regular fuzzy search
    const results = fuse.search(searchTerm);
    return results.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));
  };

  const parseFieldSpecificSearch = (searchTerm: string) => {
    for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
      const match = searchTerm.match(pattern);
      if (match && match[2]) {
        return { field, term: match[2].trim() };
      }
    }
    return null;
  };

  const performFieldSpecificSearch = (field: string, term: string): ProposalSearchResult[] => {
    let searchKey = '';

    switch (field) {
      case 'proposal':
        searchKey = 'proposal_number';
        break;
      case 'client':
        // Search both client company and name
        const companyFuse = new Fuse(proposals, { ...fuseOptions, keys: ['client_company'] });
        const nameFuse = new Fuse(proposals, { ...fuseOptions, keys: ['client_name'] });

        const clientResults = [
          ...companyFuse.search(term),
          ...nameFuse.search(term)
        ];
        // Remove duplicates based on proposal ID
        const uniqueClientResults = clientResults.filter((result, index, self) =>
          index === self.findIndex(r => r.item.id === result.item.id)
        );
        return uniqueClientResults.map(result => ({
          item: result.item,
          score: result.score,
          matches: result.matches,
        }));
      case 'project':
        searchKey = 'project_name';
        break;
      case 'status':
        searchKey = 'status';
        break;
      case 'location':
        searchKey = 'job_location';
        break;
      default:
        return [];
    }

    const fieldFuse = new Fuse(proposals, { ...fuseOptions, keys: [searchKey] });
    const results = fieldFuse.search(term);
    return results.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));
  };

  // Get search suggestions based on existing data
  const getSearchSuggestions = (searchTerm: string, limit = 5): string[] => {
    if (!searchTerm.trim()) return [];

    const suggestions = new Set<string>();
    const lowerTerm = searchTerm.toLowerCase();

    if (searchTerm.length >= 2) {
      proposals.forEach(proposal => {
        // Client names/companies
        if (proposal.client_name?.toLowerCase().includes(lowerTerm)) {
          suggestions.add(proposal.client_name);
        }
        if (proposal.client_company?.toLowerCase().includes(lowerTerm)) {
          suggestions.add(proposal.client_company);
        }

        // Project names
        if (proposal.project_name?.toLowerCase().includes(lowerTerm)) {
          suggestions.add(proposal.project_name);
        }

        // Proposal numbers
        if (proposal.proposal_number?.toLowerCase().includes(lowerTerm)) {
          suggestions.add(proposal.proposal_number);
        }

        // Locations
        if (proposal.job_location?.toLowerCase().includes(lowerTerm)) {
          suggestions.add(proposal.job_location);
        }
      });
    }

    return Array.from(suggestions).slice(0, limit);
  };

  // Helper to get field search examples
  const getSearchExamples = (): string[] => [
    'proposal:PROP-001',
    'client:Acme Corp',
    'project:Office Renovation',
    'status:Draft',
    'location:New York'
  ];

  return {
    search,
    getSearchSuggestions,
    getSearchExamples,
  };
};

export default useEnhancedProposalSearch;
