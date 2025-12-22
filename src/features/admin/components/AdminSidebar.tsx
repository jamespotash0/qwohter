/**
 * Admin Sidebar
 * Navigation sidebar for admin panel
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Factory,
  Layers,
  BoxesIcon,
  Package,
  Tags,
  Settings2,
  ListTree,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAdmin } from './AdminPasswordGate';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Product Hierarchy',
    items: [
      { label: 'Domains', path: '/admin/products/domains', icon: LayoutGrid },
      { label: 'Manufacturers', path: '/admin/products/manufacturers', icon: Factory },
      { label: 'Product Lines', path: '/admin/products/lines', icon: Layers },
      { label: 'Series', path: '/admin/products/series', icon: ListTree },
      { label: 'Models', path: '/admin/products/models', icon: BoxesIcon },
      { label: 'Variants', path: '/admin/products/variants', icon: Package },
    ],
  },
  {
    title: 'Option Library',
    items: [
      { label: 'Option Groups', path: '/admin/options/groups', icon: Tags },
      { label: 'Option Values', path: '/admin/options/values', icon: Settings2 },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Model Options', path: '/admin/config/model-options', icon: Settings2 },
      { label: 'Business Rules', path: '/admin/config/rules', icon: ListTree },
    ],
  },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Product Admin
        </h1>
        <NavLink
          to="/"
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Back to App"
        >
          <ChevronLeft className="w-5 h-5" />
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {section.title}
            </h2>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <button
          onClick={logoutAdmin}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Lock Admin Panel
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Session protected
        </p>
      </div>
    </aside>
  );
}
