import { create } from 'zustand';
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed' | 'hidden';

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