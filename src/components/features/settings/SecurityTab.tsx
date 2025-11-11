import React, { useState } from 'react';
import { Shield, AlertTriangle, RotateCcw, Copy, Eye, EyeOff, Users, FileText, Edit3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { regenerateOrganizationCode } from "@/utils/organizationCodeManagement";
import { canRegenerateOrgCode } from "@/utils/permissions";

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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [permissions, setPermissions] = useState<PermissionCategory[]>([
    {
      id: 'org',
      label: 'Organization Management',
      icon: <Shield className="w-5 h-5" />,
      permissions: [
        { id: 'org_view', label: 'View organization details and settings', owner: true, admin: true, member: true },
        { id: 'org_edit', label: 'Edit organization name and configuration', owner: true, admin: true, member: false },
        { id: 'org_regen', label: 'Regenerate organization code and invite links', owner: true, admin: true, member: false },
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
        { id: 'team_remove', label: 'Remove team members', owner: true, admin: true, member: false },
        { id: 'team_approve', label: 'Approve or reject join requests', owner: true, admin: true, member: false }
      ]
    },
    {
      id: 'quotes',
      label: 'Quote Management',
      icon: <FileText className="w-5 h-5" />,
      permissions: [
        { id: 'quote_view', label: 'View all organization quotes', owner: true, admin: true, member: true },
        { id: 'quote_create', label: 'Create new quotes and proposals', owner: true, admin: true, member: true },
        { id: 'quote_edit_all', label: 'Edit any quote in the organization', owner: true, admin: true, member: false },
        { id: 'quote_edit_own', label: 'Edit own quotes', owner: true, admin: true, member: true },
        { id: 'quote_delete_all', label: 'Delete any quote', owner: true, admin: true, member: false },
        { id: 'quote_delete_own', label: 'Delete own quotes', owner: true, admin: true, member: true },
        { id: 'quote_templates', label: 'Manage quote templates', owner: true, admin: true, member: false }
      ]
    }
  ]);

  const handleRegenerateOrgCode = async () => {
    if (!organization?.id || !canRegenerateOrgCode(userRole)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to regenerate the organization code.",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);

    try {
      const result = await regenerateOrganizationCode(organization.id, userRole);

      toast({
        title: "Organization Code Regenerated",
        description: `New code: ${result.newCode}. ${result.invalidatedTokens} invite tokens were invalidated for security.`,
      });

      if (typeof onOrganizationUpdate === 'function') {
        onOrganizationUpdate();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate organization code",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyOrgCode = () => {
    if (organization?.organization_code) {
      navigator.clipboard.writeText(organization.organization_code);
      toast({
        title: "Copied!",
        description: "Organization code copied to clipboard.",
      });
    }
  };

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

  const displayedCode = isCodeVisible
    ? organization?.organization_code
    : '••••••••';

  const canEditPermissions = userRole === 'Owner';

  return (
    <div className="w-full max-w-5xl min-w-[640px] space-y-12">
      {/* Organization Code Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Security</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        {canRegenerateOrgCode(userRole) ? (
          <div className="space-y-6">
            {/* Organization Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Organization Code</h3>
                  <div className="relative group">
                    <button className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                      <AlertTriangle className="w-3 h-3" />
                    </button>
                    {/* Hover tooltip */}
                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <p className="text-sm text-amber-900 dark:text-amber-200">
                        If compromised, regenerate this code to invalidate all existing invite links.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateOrgCode}
                  disabled={isRegenerating}
                  className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  {isRegenerating ? (
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Share this code with team members to allow them to join your organization.
              </p>

              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                  {displayedCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCodeVisible(!isCodeVisible)}
                  className="h-10 w-10 p-0"
                >
                  {isCodeVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyOrgCode}
                  className="h-10 w-10 p-0"
                  disabled={!isCodeVisible}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Access Restricted</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You need Admin or Owner permissions to manage organization security settings.
            </p>
          </div>
        )}
      </div>

      {/* Roles & Permissions Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Roles & Permissions</h2>
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
                    <tr key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
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
