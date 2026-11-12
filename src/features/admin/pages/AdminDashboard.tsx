import { NavLink } from 'react-router-dom';
import { ArrowRight, UserPlus } from 'lucide-react';

/**
 * Super admin dashboard.
 *
 * This page used to front the product catalog hierarchy — domains,
 * manufacturers, lines, series, models, option groups, and business rules. That
 * catalog was removed: specification tools (CET, Giza, 2020) already resolve
 * part numbers, options, and list price before a line reaches the app, so
 * maintaining a parallel catalog was a permanent cost with nothing to show for
 * it. Products a dealer curates for labor, freight, and ancillary items live in
 * the ordinary Products page, not here.
 */

interface QuickLink {
  title: string;
  description: string;
  path: string;
  icon: typeof UserPlus;
  color: string;
}

const quickLinks: QuickLink[] = [
  {
    title: 'Send App Invite',
    description: 'Invite someone to create an organization',
    path: '/admin/appinvite',
    icon: UserPlus,
    color: 'bg-blue-500',
  },
];

export function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Platform administration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`${link.color} p-3 rounded-lg text-white flex-shrink-0`}>
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
    </div>
  );
}

export default AdminDashboard;
