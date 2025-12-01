/**
 * ThemeContext - Thin wrapper around UIStore for theme management
 *
 * v4.0.0 CONSOLIDATION:
 * - This now uses Zustand UIStore as the single source of truth
 * - Maintains backward compatibility with existing components
 * - All theme logic is handled in uiStore.ts
 * - ThemeProvider is now a passthrough wrapper (no state management)
 * - useTheme() hook redirects to uiStore's useTheme selector
 *
 * Migration from v3.x:
 * - Components using useTheme() will see no API changes
 * - All theme state, localStorage, and DOM manipulation now unified in uiStore
 * - System preference listener now runs globally (not per component)
 */

import React from 'react';
import { useTheme as useUIStoreTheme } from '@/stores/ui/uiStore';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  effectiveTheme: 'light' | 'dark'; // The actual theme being applied
}

/**
 * Hook to access theme state and actions
 *
 * @returns {ThemeContextType} Theme state and control functions
 *
 * @example
 * ```tsx
 * const { theme, setTheme, toggleTheme, effectiveTheme } = useTheme();
 *
 * // Set specific theme
 * setTheme('dark');
 *
 * // Cycle through themes: light → dark → system
 * toggleTheme();
 *
 * // Check actual applied theme (resolves 'system' to 'light' or 'dark')
 * console.log(effectiveTheme); // 'dark'
 * ```
 */
export const useTheme = (): ThemeContextType => {
  // Delegate to Zustand store - single source of truth
  return useUIStoreTheme();
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider - Maintains backward compatibility
 *
 * This is now a passthrough component. Theme state is managed entirely
 * by Zustand UIStore, which handles:
 * - State persistence (localStorage)
 * - DOM manipulation (adding/removing .dark class)
 * - System preference monitoring
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // No local state - all theme management happens in uiStore
  // This component exists solely for backward compatibility
  // Components can still wrap with <ThemeProvider> without breaking
  return <>{children}</>;
};