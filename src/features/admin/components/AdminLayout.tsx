/**
 * Admin Layout
 * Main layout wrapper for admin pages with sidebar navigation
 * Protected by password gate
 */

import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminPasswordGate } from './AdminPasswordGate';

export function AdminLayout() {
  return (
    <AdminPasswordGate>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminPasswordGate>
  );
}
