import { FilterFn } from '@tanstack/react-table';
import useEnhancedSearch from '@/hooks/useEnhancedSearch';
import { Proposal } from '@/stores/proposals/proposalsStore';

// Create a custom filter function that uses Fuse.js
export const createFuseFilter = (proposals: Proposal[]): FilterFn<Proposal> => {
  const { search } = useEnhancedSearch(proposals);

  const fuseFilter: FilterFn<Proposal> = (row, _columnId, filterValue) => {
    if (!filterValue || filterValue === '') {
      return true;
    }

    // Get search results
    const searchResults = search(filterValue);

    // Check if the current row's proposal is in the search results
    return searchResults.some(result => result.item.id === row.original.id);
  };

  return fuseFilter;
};

// Alternative approach: Return filtered data directly
export const searchProposals = (proposals: Proposal[], searchTerm: string): Proposal[] => {
  if (!searchTerm.trim()) {
    return proposals;
  }

  const { search } = useEnhancedSearch(proposals);
  const results = search(searchTerm);

  return results.map(result => result.item);
};