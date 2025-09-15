/**
 * Team Header Component
 * 
 * Extracted from Team.tsx - displays organization name, user info, and org code
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, User, Copy, Check } from "lucide-react";

interface TeamHeaderProps {
  organizationName: string;
  userDisplayName: string;
  userRole: string;
  orgCode: string | null;
  copiedCode: boolean;
  onCopyOrgCode: () => void;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({
  organizationName,
  userDisplayName,
  userRole,
  orgCode,
  copiedCode,
  onCopyOrgCode
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

      <div className="flex items-center justify-between mt-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage your organization members and permissions.</p>
        </div>
        
        {/* Organization Code */}
        {orgCode && (
          <div className="flex items-center gap-3">
            <Card className="px-4 py-2 bg-secondary/50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Org Code:</span>
                <code className="font-mono font-semibold text-foreground">{orgCode}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCopyOrgCode}
                  className="h-6 w-6 p-0"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};