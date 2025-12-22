/**
 * Admin Dashboard
 * Overview page for the product admin panel
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
  ArrowRight,
} from 'lucide-react';

interface QuickLink {
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  color: string;
}

const quickLinks: QuickLink[] = [
  {
    title: 'Domains',
    description: 'Manage product domains (e.g., Operable Walls)',
    path: '/admin/products/domains',
    icon: LayoutGrid,
    color: 'bg-blue-500',
  },
  {
    title: 'Manufacturers',
    description: 'Manage manufacturers and their domain associations',
    path: '/admin/products/manufacturers',
    icon: Factory,
    color: 'bg-purple-500',
  },
  {
    title: 'Models',
    description: 'Configure product models and their options',
    path: '/admin/products/models',
    icon: BoxesIcon,
    color: 'bg-emerald-500',
  },
  {
    title: 'Option Groups',
    description: 'Manage shared option definitions',
    path: '/admin/options/groups',
    icon: Tags,
    color: 'bg-orange-500',
  },
  {
    title: 'Model Options',
    description: 'Configure which options are available per model',
    path: '/admin/config/model-options',
    icon: Settings2,
    color: 'bg-pink-500',
  },
  {
    title: 'Business Rules',
    description: 'Set up conditional logic and validation',
    path: '/admin/config/rules',
    icon: ListTree,
    color: 'bg-indigo-500',
  },
];

export function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Product Catalog Admin
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your product hierarchy, options, and configuration rules.
        </p>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div
                className={`${link.color} p-3 rounded-lg text-white flex-shrink-0`}
              >
                <link.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {link.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {link.description}
                </p>
              </div>
            </div>
          </NavLink>
        ))}
      </div>

      {/* Hierarchy Overview */}
      <div className="mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Product Hierarchy Structure
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
            Domain
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
            Manufacturer
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full">
            Product Line
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full">
            Series
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
            Model
          </span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
            Variant
          </span>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Products are organized in a cascading hierarchy. Each model can have multiple
          configuration options and business rules that control their behavior.
        </p>
      </div>
    </div>
  );
}
