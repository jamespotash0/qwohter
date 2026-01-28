import React from 'react';

interface SecurityTabProps {
  organization: any;
  userRole: string;
  onOrganizationUpdate: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  // organization,
  // userRole,
  // onOrganizationUpdate
}) => {
  return (
    <div className="w-full max-w-5xl min-w-[640px] space-y-12">
      {/* Roles Permissions Section - Coming Soon */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Roles Permissions</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        <div className="max-w-4xl">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Custom Role Permissions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Configure what each role can access and modify</p>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};
