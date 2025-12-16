import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/stores';

interface ThemeToggleProps {
  variant?: 'default' | 'icon';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'default',
  className = '' 
}) => {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={`w-10 h-10 p-0 hover:bg-sidebar-hover ${className}`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon className="h-4 w-4 text-muted" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-500" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={`flex items-center gap-2 hover:bg-sidebar-hover border-content-card-border bg-content-card-bg text-body-text-primary ${className}`}
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-4 w-4" />
          Dark Mode
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          Light Mode
        </>
      )}
    </Button>
  );
};