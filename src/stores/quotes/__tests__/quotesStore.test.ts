import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQuotesStore } from '../quotesStore';
import type { Quote } from '@/hooks/useQuotes';
import type { WallSpecification } from '@/types/quote';

// Mock data - Supabase is already mocked in setup.ts

describe('QuotesStore', () => {
  beforeEach(() => {
    // Reset store state
    useQuotesStore.setState({
      quotes: [],
      currentQuote: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      filters: {
        search: '',
        status: '',
        dateRange: [null, null],
      },
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
      },
    });
    vi.clearAllMocks();
  });

  describe('State Management', () => {
    it('should have correct initial state', () => {
      const state = useQuotesStore.getState();
      
      expect(state.quotes).toEqual([]);
      expect(state.currentQuote).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filters.search).toBe('');
      expect(state.pagination.page).toBe(1);
    });

    it('should set current quote correctly', () => {
      const mockQuote: Quote = {
        id: 'quote-1',
        quote_name: 'Test Quote',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        wall_details: {},
      } as Quote;

      useQuotesStore.getState().setCurrentQuote(mockQuote);
      
      expect(useQuotesStore.getState().currentQuote).toEqual(mockQuote);
    });
  });

  describe('Filter Management', () => {
    it('should update filters correctly', () => {
      const newFilters = {
        search: 'test query',
        status: 'active',
      };

      useQuotesStore.getState().setFilters(newFilters);
      const state = useQuotesStore.getState();
      
      expect(state.filters.search).toBe('test query');
      expect(state.filters.status).toBe('active');
    });

    it('should clear filters correctly', () => {
      // Set some filters first
      useQuotesStore.getState().setFilters({
        search: 'test',
        status: 'active',
      });

      // Clear filters
      useQuotesStore.getState().clearFilters();
      const state = useQuotesStore.getState();
      
      expect(state.filters.search).toBe('');
      expect(state.filters.status).toBe('');
      expect(state.filters.dateRange).toEqual([null, null]);
    });

    it('should filter quotes correctly', () => {
      const mockQuotes: Quote[] = [
        { id: '1', quote_name: 'Office Project', created_at: '2024-01-01' } as Quote,
        { id: '2', quote_name: 'Warehouse Renovation', created_at: '2024-01-02' } as Quote,
        { id: '3', quote_name: 'School Building', created_at: '2024-01-03' } as Quote,
      ];

      // Set quotes and search filter
      useQuotesStore.setState({ quotes: mockQuotes });
      useQuotesStore.getState().setFilters({ search: 'office' });

      const filteredQuotes = useQuotesStore.getState().getFilteredQuotes();
      
      expect(filteredQuotes).toHaveLength(1);
      expect(filteredQuotes[0].quote_name).toBe('Office Project');
    });
  });

  describe('Pagination Management', () => {
    it('should update pagination correctly', () => {
      const newPagination = {
        page: 2,
        pageSize: 20,
        total: 100,
      };

      useQuotesStore.getState().setPagination(newPagination);
      const state = useQuotesStore.getState();
      
      expect(state.pagination.page).toBe(2);
      expect(state.pagination.pageSize).toBe(20);
      expect(state.pagination.total).toBe(100);
    });
  });

  describe('Quote Utilities', () => {
    it('should get quote by ID correctly', () => {
      const mockQuotes: Quote[] = [
        { id: 'quote-1', quote_name: 'Quote 1' } as Quote,
        { id: 'quote-2', quote_name: 'Quote 2' } as Quote,
      ];

      useQuotesStore.setState({ quotes: mockQuotes });
      
      const foundQuote = useQuotesStore.getState().getQuoteById('quote-2');
      const notFoundQuote = useQuotesStore.getState().getQuoteById('non-existent');
      
      expect(foundQuote?.quote_name).toBe('Quote 2');
      expect(notFoundQuote).toBeUndefined();
    });
  });

  describe('Wall System Management', () => {
    it('should validate wall system operations', () => {
      const mockWallSpec: WallSpecification = {
        width: 120,
        height: 96,
        quantity: 2,
        wallSystemType: 'operable_wall',
        specifications: {},
      };

      // Mock the wall system functions that would be called
      const mockQuote: Quote = {
        id: 'quote-1',
        quote_name: 'Test Quote',
        wall_details: {
          walls: {
            'Wall A': mockWallSpec,
          },
        },
      } as Quote;

      useQuotesStore.setState({
        quotes: [mockQuote],
        currentQuote: mockQuote,
      });

      // Test that quote exists before wall operations
      const quote = useQuotesStore.getState().getQuoteById('quote-1');
      expect(quote).toBeDefined();
      expect(quote?.wall_details?.walls?.['Wall A']).toEqual(mockWallSpec);
    });
  });

  describe('Error Handling', () => {
    it('should clear error correctly', () => {
      useQuotesStore.setState({ error: 'Some error message' });
      
      useQuotesStore.getState().clearError();
      
      expect(useQuotesStore.getState().error).toBeNull();
    });
  });
});