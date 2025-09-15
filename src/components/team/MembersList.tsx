/**
 * Members List Component
 * 
 * Extracted from Team.tsx - displays team members list with management actions
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, 
  User,
  MoreVertical,
  Trash2,
  Settings,
  UserCheck,
  UserX
} from "lucide-react";
import { teamDisplayHelpers } from "@/utils/teamDisplayHelpers";

interface Member {
  id: string;
  full_name?: string | null;
  email: string;
  role: string;
  status: string;
}

interface MembersListProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: string | null;
  onApproveMember: (memberId: string) => void;
  onRejectMember: (memberId: string) => void;
  onUpdateMemberRole: (memberId: string, newRole: string) => void;
  onRemoveMember: (memberId: string) => void;
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  currentUserId,
  currentUserRole,
  onApproveMember,
  onRejectMember,
  onUpdateMemberRole,
  onRemoveMember
}) => {
  const canManageMember = (member: Member): boolean => {
    return ['admin', 'owner'].includes(currentUserRole || '') && member.id !== currentUserId;
  };

  return (
    <Card className="card-floating">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your team members and their permissions
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {teamDisplayHelpers.formatUserDisplayName(member)}
                    </p>
                    {member.status === 'pending' && (
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {teamDisplayHelpers.getRoleIcon(member.role)}
                  <Badge variant={teamDisplayHelpers.getRoleBadgeVariant(member.role)} className="capitalize">
                    {teamDisplayHelpers.formatRoleDisplay(member.role)}
                  </Badge>
                </div>
                
                {canManageMember(member) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {member.status === 'pending' ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onApproveMember(member.id)}
                            className="text-green-600"
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRejectMember(member.id)}
                            className="text-red-600"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          {member.role !== 'owner' && (
                            <DropdownMenuItem
                              onClick={() => onUpdateMemberRole(
                                member.id, 
                                member.role === 'admin' ? 'member' : 'admin'
                              )}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onRemoveMember(member.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
          
          {members.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1">Invite your first team member to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};