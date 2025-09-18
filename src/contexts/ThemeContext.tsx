import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply CSS custom properties for theme colors
    const themeColors = theme === 'dark' ? {
      // Dark mode: Light sidebar, complementary dark main content
      '--bg-primary': '#1a1d29',
      '--bg-secondary': '#242938',
      '--bg-tertiary': '#2e3445',
      '--text-primary': '#F79149',
      '--text-secondary': '#1a1d29',
      '--text-muted': '#b8bcc8',
      '--border-primary': '#3d4457',
      '--border-secondary': '#4a5068',
      '--accent-primary': '#DE8964',
      '--accent-hover': 'rgba(222, 137, 100, 0.3)',
      '--sidebar-bg': '#f7f2e9',
      '--sidebar-active': '#DE8964',
      '--sidebar-hover': 'rgba(222, 137, 100, 0.2)',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    } : {
      // Light mode: Blue sidebar, light main content
      '--bg-primary': '#f7f2e9',
      '--bg-secondary': '#FFFFFF',
      '--bg-tertiary': '#f9fafb',
      '--text-primary': '#000000',
      '--text-secondary': '#E8E8E8',
      '--text-muted': '#6b7280',
      '--border-primary': '#e5e7eb',
      '--border-secondary': '#d1d5db',
      '--accent-primary': '#DE8964',
      '--accent-hover': 'rgba(222, 137, 100, 0.3)',
      '--sidebar-bg': '#4761c2',
      '--sidebar-active': '#DE8964',
      '--sidebar-hover': 'rgba(222, 137, 100, 0.3)',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    };

    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};