import { FilterFn } from '@tanstack/react-table';
import useEnhancedSearch from '@/hooks/useEnhancedSearch';
import type { Quote } from '@/services/quotesService';

// Create a custom filter function that uses Fuse.js
export const createFuseFilter = (quotes: Quote[]): FilterFn<Quote> => {
  const { search } = useEnhancedSearch(quotes);

  const fuseFilter: FilterFn<Quote> = (row, _columnId, filterValue) => {
    if (!filterValue || filterValue === '') {
      return true;
    }

    // Get search results
    const searchResults = search(filterValue);

    // Check if the current row's quote is in the search results
    return searchResults.some(result => result.item.id === row.original.id);
  };

  return fuseFilter;
};

// Alternative approach: Return filtered data directly
export const searchQuotes = (quotes: Quote[], searchTerm: string): Quote[] => {
  if (!searchTerm.trim()) {
    return quotes;
  }

  const { search } = useEnhancedSearch(quotes);
  const results = search(searchTerm);

  return results.map(result => result.item);
};