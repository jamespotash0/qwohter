/**
 * Invite Member Dialog Component
 * 
 * Extracted from Team.tsx - handles member invitation modal
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Mail } from "lucide-react";
import { sanitizeInput } from "@/utils/security";
import type { Role } from "@/utils/teamManagementHelpers";

interface InviteMemberDialogProps {
  isOpen: boolean;
  inviteEmail: string;
  inviteRole: Role;
  onOpenChange: (open: boolean) => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: Role) => void;
  onInvite: () => void;
  canInvite: boolean;
}

export const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  isOpen,
  inviteEmail,
  inviteRole,
  onOpenChange,
  onEmailChange,
  onRoleChange,
  onInvite,
  canInvite
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {canInvite && (
          <Button className="bg-gradient-to-r from-primary to-primary/90 btn-floating">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="card-floating">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => onEmailChange(sanitizeInput.email(e.target.value))}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={inviteRole} onValueChange={(value: Role) => onRoleChange(value)}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onInvite}
              disabled={!inviteEmail}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};