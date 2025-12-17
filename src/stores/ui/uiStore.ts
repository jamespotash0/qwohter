import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed' | 'hidden';
type DataDensity = 'compact' | 'comfortable' | 'spacious';

// Page-specific preferences (persisted per page)
interface PagePreferences {
  expandedRows?: Record<string, boolean>;     // Expanded table rows/accordions
  columnVisibility?: Record<string, boolean>; // Table column visibility
  columnSizing?: Record<string, number>;      // Table column widths
  dataDensity?: DataDensity;                  // Table row density
  sorting?: Array<{ id: string; desc: boolean }>; // Table sorting
  pageSize?: number;                          // Pagination size
}

interface UIState {
  // Theme and appearance
  theme: Theme;
  effectiveTheme: 'light' | 'dark'; // The actual theme being applied (resolves 'system' to light/dark)
  sidebarState: SidebarState;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Modal and dialog state
  modals: {
    createQuote: boolean;
    editQuote: boolean;
    deleteQuote: boolean;
    wallSystemEditor: boolean;
    userProfile: boolean;
  };

  // Toast notifications
  toasts: Array<{
    id: string;
    title: string;
    description?: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    timestamp: number;
  }>;

  // Navigation and routing
  currentPage: string;
  previousPage: string | null;
  breadcrumbs: Array<{ label: string; href?: string }>;

  // Form state
  unsavedChanges: boolean;
  formErrors: Record<string, string[]>;

  // Page-specific preferences (persisted to localStorage)
  pagePreferences: Record<string, PagePreferences>;

  // Sidebar section expansion states
  sidebarSections: Record<string, boolean>;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void; // Cycles through: light → dark → system → light
  setSidebarState: (state: SidebarState) => void;

  setGlobalLoading: (loading: boolean, message?: string | null) => void;

  openModal: (modalKey: keyof UIState['modals']) => void;
  closeModal: (modalKey: keyof UIState['modals']) => void;
  closeAllModals: () => void;

  addToast: (toast: Omit<UIState['toasts'][0], 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  setCurrentPage: (page: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => void;

  setUnsavedChanges: (hasChanges: boolean) => void;
  setFormErrors: (errors: Record<string, string[]>) => void;
  clearFormErrors: () => void;

  // Page preferences management
  getPagePreferences: (pageId: string) => PagePreferences;
  setPagePreferences: (pageId: string, preferences: Partial<PagePreferences>) => void;
  setExpandedRows: (pageId: string, expanded: Record<string, boolean>) => void;
  toggleExpandedRow: (pageId: string, rowId: string) => void;
  setColumnVisibility: (pageId: string, visibility: Record<string, boolean>) => void;
  setDataDensity: (pageId: string, density: DataDensity) => void;
  setPageSize: (pageId: string, size: number) => void;

  // Sidebar section management
  toggleSidebarSection: (sectionId: string) => void;
  setSidebarSection: (sectionId: string, expanded: boolean) => void;
  getSidebarSection: (sectionId: string) => boolean;

  // Utilities
  toggleSidebar: () => void;
  resetUI: () => void;
}

// Helper function to get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const initialState: UIState = {
  theme: 'light', // TEMP: Force light mode until dark mode is fully implemented
  effectiveTheme: 'light', // TEMP: Force light mode until dark mode is fully implemented
  sidebarState: 'expanded',
  globalLoading: false,
  loadingMessage: null,
  modals: {
    createQuote: false,
    editQuote: false,
    deleteQuote: false,
    wallSystemEditor: false,
    userProfile: false,
  },
  toasts: [],
  currentPage: '/',
  previousPage: null,
  breadcrumbs: [],
  unsavedChanges: false,
  formErrors: {},
  pagePreferences: {},
  sidebarSections: {},
  // added below to fix infers any error
  setTheme: () => {},
  toggleTheme: () => {},
  setSidebarState: () => {},
  setGlobalLoading: () => {},
  openModal: () => {},
  closeModal: () => {},
  closeAllModals: () => {},
  addToast: () => {},
  removeToast: () => {},
  clearToasts: () => {},
  setCurrentPage: () => {},
  setBreadcrumbs: () => {},
  setUnsavedChanges: () => {},
  setFormErrors: () => {},
  clearFormErrors: () => {},
  getPagePreferences: () => ({}),
  setPagePreferences: () => {},
  setExpandedRows: () => {},
  toggleExpandedRow: () => {},
  setColumnVisibility: () => {},
  setDataDensity: () => {},
  setPageSize: () => {},
  toggleSidebarSection: () => {},
  setSidebarSection: () => {},
  getSidebarSection: () => false,
  toggleSidebar: () => {},
  resetUI: () => {},
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        // Theme management
        setTheme: (theme: Theme) => {
          // TEMP: Force light mode until dark mode is fully implemented
          const effectiveTheme = 'light';
          const forcedTheme = 'light';

          set({ theme: forcedTheme, effectiveTheme });

          // Apply theme to document
          if (typeof window !== 'undefined') {
            const root = window.document.documentElement;

            // Remove existing theme classes
            root.classList.remove('light', 'dark');

            // Add light theme class only
            root.classList.add('light');
          }
        },

        // Toggle through themes: light → dark → system → light
        toggleTheme: () => {
          // TEMP: Disabled until dark mode is fully implemented
          // Force light mode always
          get().setTheme('light');
        },

        // Sidebar management
        setSidebarState: (sidebarState: SidebarState) => {
          set({ sidebarState });
        },

        toggleSidebar: () => {
          const { sidebarState } = get();
          const newState = sidebarState === 'expanded' ? 'collapsed' : 'expanded';
          set({ sidebarState: newState });
        },

        // Loading management
        setGlobalLoading: (globalLoading: boolean, loadingMessage: string | null = null) => {
          set({ globalLoading, loadingMessage });
        },

        // Modal management
        openModal: (modalKey: keyof UIState['modals']) => {
          set((state) => ({
            modals: { ...state.modals, [modalKey]: true }
          }));
        },

        closeModal: (modalKey: keyof UIState['modals']) => {
          set((state) => ({
            modals: { ...state.modals, [modalKey]: false }
          }));
        },

        closeAllModals: () => {
          set({ modals: { ...initialState.modals } });
        },

        // Toast management
        addToast: (toast: Omit<UIState['toasts'][0], 'id' | 'timestamp'>) => {
          const newToast = {
            ...toast,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            duration: toast.duration ?? 5000,
          };
          
          set((state) => ({
            toasts: [...state.toasts, newToast]
          }));
          
          // Auto-remove toast after duration
          if (newToast.duration > 0) {
            setTimeout(() => {
              get().removeToast(newToast.id);
            }, newToast.duration);
          }
        },

        removeToast: (id: string) => {
          set((state) => ({
            toasts: state.toasts.filter(toast => toast.id !== id)
          }));
        },

        clearToasts: () => {
          set({ toasts: [] });
        },

        // Navigation management
        setCurrentPage: (currentPage: string) => {
          set((state) => ({
            previousPage: state.currentPage,
            currentPage
          }));
        },

        setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => {
          set({ breadcrumbs });
        },

        // Form state management
        setUnsavedChanges: (unsavedChanges: boolean) => {
          set({ unsavedChanges });
        },

        setFormErrors: (formErrors: Record<string, string[]>) => {
          set({ formErrors });
        },

        clearFormErrors: () => {
          set({ formErrors: {} });
        },

        // Page preferences management
        getPagePreferences: (pageId: string): PagePreferences => {
          return get().pagePreferences[pageId] || {};
        },

        setPagePreferences: (pageId: string, preferences: Partial<PagePreferences>) => {
          set((state) => ({
            pagePreferences: {
              ...state.pagePreferences,
              [pageId]: {
                ...state.pagePreferences[pageId],
                ...preferences,
              },
            },
          }));
        },

        setExpandedRows: (pageId: string, expanded: Record<string, boolean>) => {
          set((state) => ({
            pagePreferences: {
              ...state.pagePreferences,
              [pageId]: {
                ...state.pagePreferences[pageId],
                expandedRows: expanded,
              },
            },
          }));
        },

        toggleExpandedRow: (pageId: string, rowId: string) => {
          set((state) => {
            const current = state.pagePreferences[pageId]?.expandedRows || {};
            return {
              pagePreferences: {
                ...state.pagePreferences,
                [pageId]: {
                  ...state.pagePreferences[pageId],
                  expandedRows: {
                    ...current,
                    [rowId]: !current[rowId],
                  },
                },
              },
            };
          });
        },

        setColumnVisibility: (pageId: string, visibility: Record<string, boolean>) => {
          set((state) => ({
            pagePreferences: {
              ...state.pagePreferences,
              [pageId]: {
                ...state.pagePreferences[pageId],
                columnVisibility: visibility,
              },
            },
          }));
        },

        setDataDensity: (pageId: string, density: DataDensity) => {
          set((state) => ({
            pagePreferences: {
              ...state.pagePreferences,
              [pageId]: {
                ...state.pagePreferences[pageId],
                dataDensity: density,
              },
            },
          }));
        },

        setPageSize: (pageId: string, size: number) => {
          set((state) => ({
            pagePreferences: {
              ...state.pagePreferences,
              [pageId]: {
                ...state.pagePreferences[pageId],
                pageSize: size,
              },
            },
          }));
        },

        // Sidebar section management
        toggleSidebarSection: (sectionId: string) => {
          set((state) => ({
            sidebarSections: {
              ...state.sidebarSections,
              [sectionId]: !state.sidebarSections[sectionId],
            },
          }));
        },

        setSidebarSection: (sectionId: string, expanded: boolean) => {
          set((state) => ({
            sidebarSections: {
              ...state.sidebarSections,
              [sectionId]: expanded,
            },
          }));
        },

        getSidebarSection: (sectionId: string): boolean => {
          return get().sidebarSections[sectionId] ?? true; // Default to expanded
        },

        // Reset UI to initial state
        resetUI: () => {
          set(initialState);
        },
      })),
      {
        name: 'wall-quote-wizard-ui',
        partialize: (state) => ({
          theme: state.theme,
          sidebarState: state.sidebarState,
          pagePreferences: state.pagePreferences,
          sidebarSections: state.sidebarSections,
        }),
      }
    )
  )
);

// TEMP: System theme preference listener disabled until dark mode is fully implemented
// Initialize theme on first load - force light mode
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add('light');
}

/* DISABLED UNTIL DARK MODE IS COMPLETE:
// Initialize system theme preference listener
// This watches for OS theme changes and updates effectiveTheme when theme is set to 'system'
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    const state = useUIStore.getState();

    // Only update if theme is set to 'system'
    if (state.theme === 'system') {
      const newEffectiveTheme = e.matches ? 'dark' : 'light';

      // Update state
      useUIStore.setState({ effectiveTheme: newEffectiveTheme });

      // Update DOM
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newEffectiveTheme);
    }
  };

  // Listen for system theme changes
  mediaQuery.addEventListener('change', handleSystemThemeChange);

  // Initialize theme on first load (apply to DOM)
  const initialTheme = useUIStore.getState().effectiveTheme;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(initialTheme);
  }
}
*/

// Selectors for common UI patterns
export const useTheme = () => useUIStore(useShallow((state) => ({
  theme: state.theme,
  effectiveTheme: state.effectiveTheme,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
})));
export const useSidebarState = () => useUIStore((state) => state.sidebarState);
export const useGlobalLoading = () => useUIStore((state) => ({
  loading: state.globalLoading,
  message: state.loadingMessage
}));
export const useModals = () => useUIStore((state) => state.modals);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useBreadcrumbs = () => useUIStore((state) => state.breadcrumbs);
export const useUnsavedChanges = () => useUIStore((state) => state.unsavedChanges);
export const useFormErrors = () => useUIStore((state) => state.formErrors);

export const useUIActions = () => useUIStore((state) => ({
  setTheme: state.setTheme,
  setSidebarState: state.setSidebarState,
  toggleSidebar: state.toggleSidebar,
  setGlobalLoading: state.setGlobalLoading,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  addToast: state.addToast,
  removeToast: state.removeToast,
  clearToasts: state.clearToasts,
  setCurrentPage: state.setCurrentPage,
  setBreadcrumbs: state.setBreadcrumbs,
  setUnsavedChanges: state.setUnsavedChanges,
  setFormErrors: state.setFormErrors,
  clearFormErrors: state.clearFormErrors,
  resetUI: state.resetUI,
}));

// Stable empty object to avoid creating new references
const EMPTY_PREFERENCES: PagePreferences = {};

// Page preferences hook - returns preferences and actions for a specific page
export const usePagePreferences = (pageId: string) => {
  // Get preferences with stable fallback
  const preferences = useUIStore((state) => state.pagePreferences[pageId] ?? EMPTY_PREFERENCES);

  // Get stable action references from store
  const setPagePreferencesStore = useUIStore((state) => state.setPagePreferences);
  const setExpandedRowsStore = useUIStore((state) => state.setExpandedRows);
  const toggleExpandedRowStore = useUIStore((state) => state.toggleExpandedRow);
  const setColumnVisibilityStore = useUIStore((state) => state.setColumnVisibility);
  const setDataDensityStore = useUIStore((state) => state.setDataDensity);
  const setPageSizeStore = useUIStore((state) => state.setPageSize);

  // Memoize curried actions to prevent new references on every render
  const setPreferences = React.useCallback(
    (prefs: Partial<PagePreferences>) => setPagePreferencesStore(pageId, prefs),
    [pageId, setPagePreferencesStore]
  );
  const setExpandedRows = React.useCallback(
    (expanded: Record<string, boolean>) => setExpandedRowsStore(pageId, expanded),
    [pageId, setExpandedRowsStore]
  );
  const toggleExpandedRow = React.useCallback(
    (rowId: string) => toggleExpandedRowStore(pageId, rowId),
    [pageId, toggleExpandedRowStore]
  );
  const setColumnVisibility = React.useCallback(
    (visibility: Record<string, boolean>) => setColumnVisibilityStore(pageId, visibility),
    [pageId, setColumnVisibilityStore]
  );
  const setDataDensity = React.useCallback(
    (density: DataDensity) => setDataDensityStore(pageId, density),
    [pageId, setDataDensityStore]
  );
  const setPageSize = React.useCallback(
    (size: number) => setPageSizeStore(pageId, size),
    [pageId, setPageSizeStore]
  );

  // Return preferences and curried actions (pageId is baked in)
  return {
    // Spread individual preference values to avoid object reference issues
    expandedRows: preferences.expandedRows,
    columnVisibility: preferences.columnVisibility,
    columnSizing: preferences.columnSizing,
    dataDensity: preferences.dataDensity,
    sorting: preferences.sorting,
    pageSize: preferences.pageSize,
    // Memoized actions
    setPreferences,
    setExpandedRows,
    toggleExpandedRow,
    setColumnVisibility,
    setDataDensity,
    setPageSize,
  };
};

// Sidebar sections hook
export const useSidebarSections = () => useUIStore(useShallow((state) => ({
  sections: state.sidebarSections,
  toggleSection: state.toggleSidebarSection,
  setSection: state.setSidebarSection,
  getSection: state.getSidebarSection,
})));

// Export types for consumers
export type { PagePreferences, DataDensity };