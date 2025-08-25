/**
 * Team Stats Cards Component
 * 
 * Extracted from Team.tsx - displays team member statistics cards
 */

import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar } from "lucide-react";
import { teamDisplayHelpers } from "@/utils/teamDisplayHelpers";

interface TeamStatsCardsProps {
  activeMembersCount: number;
  pendingMembersCount: number;
  currentUserRole: string | null;
}

export const TeamStatsCards: React.FC<TeamStatsCardsProps> = ({
  activeMembersCount,
  pendingMembersCount,
  currentUserRole
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Members</p>
              <p className="text-3xl font-bold text-foreground">{activeMembersCount}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
              <p className="text-3xl font-bold text-foreground">{pendingMembersCount}</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Role</p>
              <p className="text-lg font-semibold text-foreground capitalize">{currentUserRole}</p>
            </div>
            <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
              {teamDisplayHelpers.getRoleIcon(currentUserRole || 'member')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};