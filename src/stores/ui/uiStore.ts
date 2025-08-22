import { create } from 'zustand';
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface UIState {
  // Theme and appearance
  theme: Theme;
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

const initialState = {
  theme: 'system' as Theme,
  sidebarState: 'expanded' as SidebarState,
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
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        // Theme management
        setTheme: (theme: Theme) => {
          set({ theme });
          
          // Apply theme to document
          if (typeof window !== 'undefined') {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            
            if (theme === 'system') {
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              root.classList.add(systemTheme);
            } else {
              root.classList.add(theme);
            }
          }
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

// Selectors for common UI patterns
export const useTheme = () => useUIStore((state) => state.theme);
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