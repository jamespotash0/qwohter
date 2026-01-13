/**
 * Admin Header
 * Top header bar for admin panel with breadcrumbs and actions
 */

import { useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

// Map paths to breadcrumb labels
const pathLabels: Record<string, string> = {
  admin: 'Admin',
  products: 'Products',
  domains: 'Domains',
  manufacturers: 'Manufacturers',
  lines: 'Product Lines',
  series: 'Series',
  models: 'Models',
  variants: 'Variants',
  options: 'Options',
  groups: 'Option Groups',
  values: 'Option Values',
  config: 'Configuration',
  'model-options': 'Model Options',
  rules: 'Business Rules',
};

export function AdminHeader() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs = pathParts.map((part, index) => ({
    label: pathLabels[part] || part,
    path: '/' + pathParts.slice(0, index + 1).join('/'),
    isLast: index === pathParts.length - 1,
  }));

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm">
        <Home className="w-4 h-4 text-gray-400" />
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
            <span
              className={
                crumb.isLast
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              {crumb.label}
            </span>
          </div>
        ))}
      </nav>

      {/* Actions placeholder */}
      <div className="flex items-center gap-2">
        {/* Future: Add global actions like search, user menu, etc. */}
      </div>
    </header>
  );
}
