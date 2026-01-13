import React, { useState } from 'react';
import { Shield, Users, FileText, Edit3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

interface SecurityTabProps {
  organization: any;
  userRole: string;
  onOrganizationUpdate: () => void;
}

type RoleType = 'Owner' | 'Admin' | 'Member';

interface Permission {
  id: string;
  label: string;
  owner: boolean;
  admin: boolean;
  member: boolean;
}

interface PermissionCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  permissions: Permission[];
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  organization,
  userRole,
  onOrganizationUpdate
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [permissions, setPermissions] = useState<PermissionCategory[]>([
    {
      id: 'org',
      label: 'Organization Management',
      icon: <Shield className="w-5 h-5" />,
      permissions: [
        { id: 'org_view', label: 'View organization details and settings', owner: true, admin: true, member: true },
        { id: 'org_edit', label: 'Edit organization name and configuration', owner: true, admin: true, member: false },
        { id: 'org_transfer', label: 'Transfer organization ownership', owner: true, admin: false, member: false },
        { id: 'org_delete', label: 'Delete organization', owner: true, admin: false, member: false }
      ]
    },
    {
      id: 'team',
      label: 'Team Management',
      icon: <Users className="w-5 h-5" />,
      permissions: [
        { id: 'team_view', label: 'View all team members', owner: true, admin: true, member: true },
        { id: 'team_invite', label: 'Invite new team members', owner: true, admin: true, member: false },
        { id: 'team_roles', label: 'Change member roles', owner: true, admin: true, member: false },
        { id: 'team_remove', label: 'Remove team members', owner: true, admin: true, member: false }
      ]
    },
    {
      id: 'proposals',
      label: 'Proposal Management',
      icon: <FileText className="w-5 h-5" />,
      permissions: [
        { id: 'proposal_view', label: 'View all organization proposals', owner: true, admin: true, member: true },
        { id: 'proposal_create', label: 'Create new proposals', owner: true, admin: true, member: true },
        { id: 'proposal_edit_all', label: 'Edit any proposal in the organization', owner: true, admin: true, member: false },
        { id: 'proposal_edit_own', label: 'Edit own proposals', owner: true, admin: true, member: true },
        { id: 'proposal_delete_all', label: 'Delete any proposal', owner: true, admin: true, member: false },
        { id: 'proposal_delete_own', label: 'Delete own proposals', owner: true, admin: true, member: true },
        { id: 'proposal_templates', label: 'Manage proposal templates', owner: true, admin: true, member: false }
      ]
    }
  ]);

  const togglePermission = (categoryId: string, permissionId: string, role: RoleType) => {
    setPermissions(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          permissions: category.permissions.map(permission => {
            if (permission.id === permissionId) {
              return { ...permission, [role.toLowerCase()]: !permission[role.toLowerCase() as keyof Omit<Permission, 'id' | 'label'>] };
            }
            return permission;
          })
        };
      }
      return category;
    }));
  };

  const handleSavePermissions = () => {
    // TODO: Save permissions to backend
    console.log('Saving permissions:', permissions);
    setIsEditMode(false);
    toast({
      title: "Permissions Updated",
      description: "Role permissions have been saved successfully.",
    });
  };

  const handleCancelEdit = () => {
    // TODO: Reset to original permissions from backend
    setIsEditMode(false);
  };

  const canEditPermissions = userRole === 'Owner';

  return (
    <div className="w-full max-w-5xl min-w-[640px] space-y-12">
      {/* Roles Permissions Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Roles Permissions</h2>
          {canEditPermissions && (
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePermissions}
                    className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white"
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2"
                  disabled
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Permissions
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        {/* Permissions Table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white min-w-[300px]">
                  Actions
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-24 min-w-[80px]">
                  Member
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-24 min-w-[80px]">
                  Admin
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-24 min-w-[80px]">
                  Owner
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {permissions.map((category) => (
                <React.Fragment key={category.id}>
                  {/* Category Header */}
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        {category.icon}
                        <span className="font-semibold text-sm">{category.label}</span>
                      </div>
                    </td>
                  </tr>
                  {/* Permissions */}
                  {category.permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {permission.label}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.member}
                            onCheckedChange={() => isEditMode && togglePermission(category.id, permission.id, 'Member')}
                            disabled={!isEditMode}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.admin}
                            onCheckedChange={() => isEditMode && togglePermission(category.id, permission.id, 'Admin')}
                            disabled={!isEditMode}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission.owner}
                            onCheckedChange={() => isEditMode && togglePermission(category.id, permission.id, 'Owner')}
                            disabled={!isEditMode}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
