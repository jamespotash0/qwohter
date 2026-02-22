/**
 * Editor Sidebar
 *
 * Icon rail that expands on hover to reveal labels.
 * Defaults to icon-only (~44px), expands to ~136px on hover.
 */

import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface TabDefinition {
  id: string;
  label: string;
  icon: Icon;
}

interface EditorSidebarProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function EditorSidebar({ tabs, activeTab, onTabChange }: EditorSidebarProps) {
  return (
    <aside
      className={cn(
        'group/sidebar flex-shrink-0 border-r border-gray-200/60 dark:border-gray-800/80',
        'flex flex-col pt-4 pb-4 gap-1 bg-gray-50/50 dark:bg-gray-950/30',
        'w-12 hover:w-[136px] transition-[width] duration-200 ease-in-out overflow-hidden',
        'px-1.5 hover:px-2'
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => {
              trackEvent('proposal_tab_switched', { tab: tab.id, previous_tab: activeTab });
              onTabChange(tab.id);
            }}
            className={cn(
              'relative flex items-center gap-2.5 w-full rounded transition-all duration-150',
              'px-1.5 py-1.5',
              isActive
                ? 'text-coral bg-gray-200/80 dark:bg-gray-700/80'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/40'
            )}
          >
            <TabIcon
              className={cn(
                'w-[16px] h-[16px] flex-shrink-0 transition-colors duration-150',
                isActive ? 'text-coral' : 'text-gray-400 dark:text-gray-600'
              )}
              weight={isActive ? 'fill' : 'regular'}
            />
            <span className="text-xs font-medium tracking-wide truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
              {tab.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
