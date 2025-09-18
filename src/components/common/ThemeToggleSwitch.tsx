import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggleSwitch() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 p-2">
      <Sun 
        className="h-4 w-4" 
        style={{ 
          color: theme === 'light' ? 'var(--sidebar-active)' : 'var(--text-secondary)',
          opacity: theme === 'light' ? 1 : 0.5
        }} 
      />
      
      <button
        onClick={toggleTheme}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: theme === 'dark' ? 'var(--sidebar-active)' : 'rgba(255, 255, 255, 0.3)',
          focusRingColor: 'var(--sidebar-active)'
        }}
        aria-label="Toggle theme"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      
      <Moon 
        className="h-4 w-4" 
        style={{ 
          color: theme === 'dark' ? 'var(--sidebar-active)' : 'var(--text-secondary)',
          opacity: theme === 'dark' ? 1 : 0.5
        }} 
      />
    </div>
  );
}