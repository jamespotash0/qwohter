import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface SettingsSidebarProps {
  items: SettingsNavItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * Settings Inner Sidebar
 *
 * Sits alongside the main app sidebar (it does not replace it) and lists the
 * settings sections vertically. The back button returns to wherever the user
 * came from, falling back to the dashboard on a cold deep-link.
 */
export function SettingsSidebar({ items, activeTab, onTabChange }: SettingsSidebarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <aside className="w-56 flex-shrink-0 rounded-tl-lg bg-[var(--content-card-bg)] p-2 self-start sticky top-0">
      {/* Back to the rest of the app */}
      <button
        onClick={handleBack}
        className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-xl text-sm font-medium text-[var(--content-muted-text)] hover:text-[var(--content-header-text)] hover:bg-[var(--content-table-row-hover)] transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="h-px bg-[var(--content-card-border)] mx-2 mb-1" />

      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-[var(--content-table-row-selected)] text-[var(--content-header-text)] font-medium"
                  : "text-[var(--content-body-text)] hover:bg-[var(--content-table-row-hover)]"
              }`}
            >
              <span className={isActive ? "text-[var(--sidebar-icon-active)]" : "text-[var(--content-muted-text)]"}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
