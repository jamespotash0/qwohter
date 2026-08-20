import { useSearchParams } from "react-router-dom";
import { useSettingsGroups } from "./settingsTabs";
import { trackEvent } from "@/lib/analytics";

/**
 * Settings Secondary Sidebar
 *
 * A full-height panel flush against the main app sidebar — it sits beside it
 * rather than replacing it. Rendered by MainLayout (not by the Settings page)
 * so it can reach the edge of the shell instead of floating inside the page's
 * padding.
 *
 * Sections are bold headers with an icon; the entries under them are plain text
 * with the active one filled. Hover and active states reuse the main sidebar's
 * tokens, but the rows are deliberately smaller and tighter than the main nav —
 * this is a long list of sections, not a primary destination list. There is no
 * back button; the main app sidebar stays visible alongside.
 */
export function SettingsSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const groups = useSettingsGroups();

  const activeTab = searchParams.get("tab") || "profile";

  const handleTabChange = (tabId: string) => {
    trackEvent("settings_tab_viewed", { tab: tabId });
    setSearchParams({ tab: tabId });
  };

  return (
    <aside className="w-56 flex-shrink-0 h-full overflow-y-auto rounded-tl-lg bg-[var(--content-card-bg)] pb-6">
      <nav className="px-2 pt-3 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 px-3 pb-1.5 text-[var(--content-header-text)]">
              <span className="text-[var(--sidebar-icon-default)]">{group.icon}</span>
              <span className="text-[13px] font-semibold">{group.label}</span>
            </div>

            <div className="space-y-px">
              {group.tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full h-8 flex items-center text-left px-3 text-[13px] tracking-tight transition-colors duration-200 ${
                      isActive
                        ? "text-[var(--sidebar-nav-text-active)] font-medium"
                        : "text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)]"
                    }`}
                    style={{
                      borderRadius: "var(--sidebar-nav-border-radius)",
                      ...(isActive ? { backgroundColor: "var(--sidebar-nav-bg-active)" } : {}),
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
