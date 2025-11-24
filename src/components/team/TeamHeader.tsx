/**
 * Team Header Component
 *
 * Extracted from Team.tsx - displays organization name and user info
 */

import { Building2, User } from "lucide-react";

interface TeamHeaderProps {
  organizationName: string;
  userDisplayName: string;
  userRole: string;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({
  organizationName,
  userDisplayName,
  userRole
}) => {
  return (
    <div className="p-6 pb-0">
      <header className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg rounded-[22px] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center justify-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-lg">{organizationName}</span>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
        <p className="text-muted-foreground mt-1">Manage your organization members and permissions.</p>
      </div>
    </div>
  );
};