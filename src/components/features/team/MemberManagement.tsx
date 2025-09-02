import { useState } from "react";
import { Users, Mail, MoreHorizontal, UserPlus, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { /*useOrganizations,*/ OrganizationMember, Organization } from "@/hooks/useOrganizations";
// import { useToast } from "@/hooks/use-toast";

interface MemberManagementProps {
  organization: Organization;
  members: OrganizationMember[];
  onInviteMember: (email: string, role: 'admin' | 'member') => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateRole: (memberId: string, role: 'admin' | 'member') => void;
  onApproveMember: (memberId: string) => void;
  onRejectMember: (memberId: string) => void;
  onRefresh: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <Shield className="w-4 h-4 text-blue-500" />;
    case 'member':
      return <UserIcon className="w-4 h-4 text-gray-500" />;
    default:
      return <UserIcon className="w-4 h-4 text-gray-500" />;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'secondary';
    case 'member':
      return 'outline';
    default:
      return 'outline';
  }
};

export const MemberManagement = ({
  // organization,
  members,
  onInviteMember,
  onRemoveMember,
  onUpdateRole,
  // onApproveMember,
  // onRejectMember,
  // onRefresh
}: MemberManagementProps) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  // const { toast } = useToast();

  // const activeMembers = members.filter(m => m.status === 'active');
  // const pendingMembers = members.filter(m => m.status === 'pending');

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    setIsInviting(true);
    try {
      await onInviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole('member');
      setShowInviteDialog(false);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members ({members.length})
        </CardTitle>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(value: 'admin' | 'member') => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim() || isInviting}
                >
                  {isInviting ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members?.filter(member => member && member.id).map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {member?.full_name || member?.email || 'Unknown User'}
                  </p>
                  <p className="text-xs text-slate-500">{member?.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(member?.role || 'member')} className="flex items-center gap-1">
                  {getRoleIcon(member?.role || 'member')}
                  {member?.role || 'member'}
                </Badge>
                {member && member.role !== 'admin' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onUpdateRole(member.id, 'admin')}
                      >
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onRemoveMember(member.id)}
                        className="text-red-600"
                      >
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Invite your first team member to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default MemberManagement;