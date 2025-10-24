import { useState } from "react";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreVertical, Trash2, Crown, AlertTriangle, RotateCcw } from "lucide-react";
import type { Role } from "@/utils/teamManagementHelpers";

export function TeamTab() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Member");
  const [inviteDepartment, setInviteDepartment] = useState<string>("");
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; memberId: string; memberName: string }>({ open: false, memberId: "", memberName: "" });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; memberId: string; memberName: string }>({ open: false, memberId: "", memberName: "" });
  const { toast } = useToast();

  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const members = useOrganizationStore((state) => state.members);
  
  const currentUserRole = useOrganizationStore((state) => state.currentUserRole);

  // Helper to get display text for member type
  const getMemberType = (member: any) => {
    // Always return the join_type from database
    return member.join_type || 'Direct';
  };

  const {
    inviteMember,
    removeMember,
    reactivateMember,
    updateMemberRole,
    updateMemberDepartment,
    approveMember,
    rejectMember,
    transferOwnership
  } = useOrganizations();

  const handleInvite = async () => {
    if (!currentOrganization || !inviteEmail) return;

    try {
      await inviteMember(currentOrganization.id, inviteEmail, inviteRole, inviteDepartment || null);
      toast({
        title: "Invitation sent",
        description: `Invite sent to ${inviteEmail}`,
      });
      setInviteEmail("");
      setInviteRole("Member");
      setInviteDepartment("");
    } catch (error: any) {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!currentOrganization) return;

    try {
      await removeMember(removeDialog.memberId);
      toast({
        title: "Member removed",
        description: `${removeDialog.memberName} has been removed from the organization.`,
      });
      setRemoveDialog({ open: false, memberId: "", memberName: "" });
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReactivateMember = async (memberId: string, memberName: string) => {
    if (!currentOrganization) return;

    try {
      await reactivateMember(memberId);
      toast({
        title: "Member reactivated",
        description: `${memberName} has been reactivated.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to reactivate member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (!currentOrganization) return;

    try {
      await updateMemberRole(memberId, newRole);
      toast({
        title: "Role updated",
        description: `Member role changed to ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDepartmentChange = async (memberId: string, newDepartment: string) => {
    if (!currentOrganization) return;

    try {
      await updateMemberDepartment(memberId, newDepartment || null);
    } catch (error: any) {
      toast({
        title: "Failed to update department",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (memberId: string, memberName: string) => {
    if (!currentOrganization) return;

    try {
      await approveMember(memberId);
      toast({
        title: "Member approved",
        description: `${memberName} has been approved.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to approve member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (memberId: string, memberName: string) => {
    if (!currentOrganization) return;

    try {
      await rejectMember(memberId);
      toast({
        title: "Request rejected",
        description: `${memberName}'s request has been rejected.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentOrganization) return;

    try {
      await transferOwnership(transferDialog.memberId);
      toast({
        title: "Ownership transferred",
        description: `${transferDialog.memberName} is now the owner of this organization. You are now an Admin.`,
      });
      setTransferDialog({ open: false, memberId: "", memberName: "" });
    } catch (error: any) {
      toast({
        title: "Failed to transfer ownership",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="w-full max-w-5xl min-w-[640px]">
      {/* Team Members Header & Invite Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Team Members</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <div className="flex gap-2 mb-4">
            <Input
              type="email"
              placeholder="john@emailaddress.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 placeholder:text-gray-400"
            />
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail}
              className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white px-6"
            >
              Invite
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department (Optional)
            </label>
            <Select value={inviteDepartment} onValueChange={setInviteDepartment}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="Customer Success">Customer Success</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="mb-8">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No team members yet. Invite someone to get started!
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
                            {getInitials(member.full_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          {member.status === 'Pending' ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.full_name || member.email}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {getMemberType(member) === 'Invited'
                                  ? 'has been invited, waiting for response'
                                  : 'has requested access'}
                              </span>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.full_name || member.email || 'Unknown User'}
                              </p>
                              {member.full_name && member.email && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-16">
                        {member.status === 'Active' ? (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            Active
                          </span>
                        ) : member.status === 'Inactive' ? (
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            Inactive
                          </span>
                        ) : member.status === 'Pending' ? (
                          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            Pending
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-20">
                        {member.status === 'Active' ? (
                          member.role === 'Owner' || currentUserRole === 'Member' ? (
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {member.role}
                            </span>
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleRoleChange(member.user_id, value as Role)}
                            >
                              <SelectTrigger className="w-full h-8 text-sm border-0 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 px-0 gap-2 [&>svg]:bg-gray-100 [&>svg]:dark:bg-gray-800 [&>svg]:rounded [&>svg]:p-0.75">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Member">Member</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-32">
                        {member.status === 'Active' ? (
                          currentUserRole === 'Member' ? (
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {member.department || <span className="text-gray-400">—</span>}
                            </span>
                          ) : (
                            <Select
                              value={member.department || ''}
                              onValueChange={(value) => handleDepartmentChange(member.user_id, value)}
                            >
                              <SelectTrigger className="w-full h-8 text-sm border-0 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 px-0 gap-2 [&>svg]:bg-gray-100 [&>svg]:dark:bg-gray-800 [&>svg]:rounded [&>svg]:p-0.75">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Operations">Operations</SelectItem>
                                <SelectItem value="IT">IT</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                                <SelectItem value="Customer Success">Customer Success</SelectItem>
                                <SelectItem value="Product">Product</SelectItem>
                                <SelectItem value="Engineering">Engineering</SelectItem>
                                <SelectItem value="Executive">Executive</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(member.joined_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {member.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(member.user_id, member.full_name || member.email)}
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(member.user_id, member.full_name || member.email)}
                            className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : member.status === 'Inactive' ? (
                        <Button
                          size="sm"
                          onClick={() => handleReactivateMember(member.user_id, member.full_name || member.email)}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reactivate
                        </Button>
                      ) : member.role !== 'Owner' && currentUserRole === 'Owner' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setTransferDialog({ open: true, memberId: member.user_id, memberName: member.full_name || member.email })}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <Crown className="w-4 h-4 mr-2" />
                              Transfer Ownership
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRemoveDialog({ open: true, memberId: member.user_id, memberName: member.full_name || member.email })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : member.role !== 'Owner' && currentUserRole !== 'Member' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setRemoveDialog({ open: true, memberId: member.user_id, memberName: member.full_name || member.email })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ ...removeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeDialog.memberName} from the organization?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialog({ open: false, memberId: "", memberName: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog({ ...transferDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <DialogTitle>Transfer Ownership</DialogTitle>
            </div>
            <DialogDescription className="space-y-2 pt-2">
              <p>You are about to transfer ownership of <strong>"{currentOrganization?.name}"</strong> to <strong>{transferDialog.memberName}</strong>.</p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-1">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">After this action:</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 ml-4 list-disc">
                  <li>{transferDialog.memberName} will become the Owner</li>
                  <li>You will become an Admin</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialog({ open: false, memberId: "", memberName: "" })}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleTransferOwnership}
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
