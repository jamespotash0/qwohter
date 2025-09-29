import React from 'react';
import { Key, Shield, Users, Settings, Eye, Edit3, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPermissionLevel, hasAdminPermissions, canManageTeam, canManageOrganization } from "@/utils/permissions";

interface PermissionsTabProps {
  userRole: string;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({ userRole }) => {
  const permissionSections = [
    {
      title: "Organization Management",
      icon: <Shield className="w-5 h-5" />,
      permissions: [
        {
          name: "View Organization Details",
          description: "Access to organization information and settings",
          hasPermission: true,
          icon: <Eye className="w-4 h-4" />
        },
        {
          name: "Edit Organization Settings",
          description: "Modify organization name, settings, and configuration",
          hasPermission: canManageOrganization(userRole),
          icon: <Edit3 className="w-4 h-4" />
        },
        {
          name: "Regenerate Organization Code",
          description: "Create new organization codes and invalidate existing ones",
          hasPermission: canManageOrganization(userRole),
          icon: <Key className="w-4 h-4" />
        }
      ]
    },
    {
      title: "Team Management",
      icon: <Users className="w-5 h-5" />,
      permissions: [
        {
          name: "View Team Members",
          description: "See all organization members and their roles",
          hasPermission: true,
          icon: <Eye className="w-4 h-4" />
        },
        {
          name: "Invite Team Members",
          description: "Send invitations to new team members",
          hasPermission: canManageTeam(userRole),
          icon: <UserPlus className="w-4 h-4" />
        },
        {
          name: "Manage Member Roles",
          description: "Change member roles and permissions",
          hasPermission: canManageTeam(userRole),
          icon: <Settings className="w-4 h-4" />
        },
        {
          name: "Remove Team Members",
          description: "Remove members from the organization",
          hasPermission: canManageTeam(userRole),
          icon: <Trash2 className="w-4 h-4" />
        }
      ]
    },
    {
      title: "Quote Management",
      icon: <Edit3 className="w-5 h-5" />,
      permissions: [
        {
          name: "View All Quotes",
          description: "Access to view all organization quotes",
          hasPermission: true,
          icon: <Eye className="w-4 h-4" />
        },
        {
          name: "Create Quotes",
          description: "Create new quotes and proposals",
          hasPermission: true,
          icon: <Edit3 className="w-4 h-4" />
        },
        {
          name: "Edit All Quotes",
          description: "Modify any quote in the organization",
          hasPermission: hasAdminPermissions(userRole),
          icon: <Edit3 className="w-4 h-4" />
        },
        {
          name: "Delete Quotes",
          description: "Remove quotes from the system",
          hasPermission: hasAdminPermissions(userRole),
          icon: <Trash2 className="w-4 h-4" />
        }
      ]
    }
  ];

  const getStatusColor = (hasPermission: boolean) => {
    return hasPermission
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="space-y-6">
      {/* Current Role Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Your Access Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-semibold text-blue-900">Current Role: {userRole}</h3>
              <p className="text-sm text-blue-700">{getPermissionLevel(userRole)}</p>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              {userRole}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Breakdown */}
      {permissionSections.map((section, sectionIndex) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {section.permissions.map((permission, index) => (
                <div key={permission.name}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 text-gray-500">
                        {permission.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{permission.name}</h4>
                        <p className="text-sm text-gray-600">{permission.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={getStatusColor(permission.hasPermission)}
                    >
                      {permission.hasPermission ? 'Granted' : 'Denied'}
                    </Badge>
                  </div>
                  {index < section.permissions.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};