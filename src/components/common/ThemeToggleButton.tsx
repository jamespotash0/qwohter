import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg hover:bg-[var(--sidebar-nav-bg-hover)] transition-colors flex items-center justify-center"
    >
      {theme === 'dark' ? (
        <Moon className="h-[18px] w-[18px] text-[var(--sidebar-icon-moon)]" />
      ) : (
        <Sun className="h-[18px] w-[18px] text-[var(--sidebar-icon-sun)]" />
      )}
    </button>
  );
}
