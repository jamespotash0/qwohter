import { useState, useEffect } from "react";
import {
  useOrganizationContext,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateMemberStatus,
  useInviteTokens,
  useRevokeInvitation
} from "@/hooks/queries/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreVertical, Trash2, Crown, AlertTriangle, RotateCcw, Plus, X } from "lucide-react";
import type { Role } from "@/utils/teamManagementHelpers";
import { cleanupExpiredTokens } from "@/utils/inviteTokens";

interface PendingInvite {
  email: string;
  role: 'Admin' | 'Member';
  department: string;
}

export function TeamTab() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string | undefined>(undefined);
  const [inviteDepartment, setInviteDepartment] = useState<string | undefined>(undefined);
  const [pendingInvitesList, setPendingInvitesList] = useState<PendingInvite[]>([]);
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; memberId: string; memberName: string }>({ open: false, memberId: "", memberName: "" });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; memberId: string; memberName: string }>({ open: false, memberId: "", memberName: "" });
  const [inviteSentDialog, setInviteSentDialog] = useState<{ open: boolean; emails: string[] }>({ open: false, emails: [] });
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user and organization context from React Query
  const user = useUser();
  const {
    organization: currentOrganization,
    organizationId,
    members,
    role: currentUserRole
  } = useOrganizationContext(user?.id || '');

  // React Query mutation hooks
  const { mutateAsync: inviteMemberMutation, isPending: isInviting } = useInviteMember(organizationId || '');
  const { mutateAsync: removeMemberMutation } = useRemoveMember(organizationId || '');
  const { mutateAsync: updateRoleMutation } = useUpdateMemberRole(organizationId || '');
  const { mutateAsync: updateStatusMutation } = useUpdateMemberStatus(organizationId || '');

  // Fetch pending invites
  const { data: inviteTokens = [] } = useInviteTokens(organizationId || '', !!organizationId);
  const { mutateAsync: revokeInviteMutation } = useRevokeInvitation(organizationId || '');

  // Filter for all pending invites (not used, includes revoked and expired for resending)
  const pendingInvites = inviteTokens.filter(invite => !invite.is_used);


  // Realtime subscription for invite tokens
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`invite_tokens:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invite_tokens',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          // Invalidate invite tokens query to refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.organization.invites(organizationId)
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  // Automatic cleanup of expired tokens
  useEffect(() => {
    if (!organizationId) return;

    const cleanup = async () => {
      try {
        const deletedCount = await cleanupExpiredTokens();
        if (deletedCount > 0) {
          console.log(`Cleaned up ${deletedCount} expired invite tokens`);
          // Refresh the invite tokens list
          queryClient.invalidateQueries({
            queryKey: queryKeys.organization.invites(organizationId)
          });
        }
      } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
      }
    };

    cleanup();
  }, [organizationId, queryClient]);

  const handleAddToList = () => {
    if (!inviteEmail || !inviteRole || !inviteDepartment) return;
    if (inviteRole === 'placeholder' || inviteDepartment === 'placeholder') return;

    // Check if email already in list
    if (pendingInvitesList.some(invite => invite.email === inviteEmail)) {
      toast({
        title: "Duplicate email",
        description: "This email is already in the invite list",
        variant: "destructive",
      });
      return;
    }

    // Add to pending list
    setPendingInvitesList([...pendingInvitesList, {
      email: inviteEmail,
      role: inviteRole === 'Owner' || inviteRole === 'Admin' ? 'Admin' : 'Member',
      department: inviteDepartment
    }]);

    // Clear form and reset to placeholder
    setInviteEmail("");
    setInviteRole(undefined);
    setInviteDepartment(undefined);
  };

  const handleSendSingleInvite = async () => {
    if (!inviteEmail || !inviteRole || !inviteDepartment) return;
    if (inviteRole === 'placeholder' || inviteDepartment === 'placeholder') return;

    setIsSendingSingle(true);
    try {
      await inviteMemberMutation({
        email: inviteEmail,
        role: inviteRole === 'Owner' || inviteRole === 'Admin' ? 'Admin' : 'Member',
        department: inviteDepartment
      });

      // Show success dialog
      setInviteSentDialog({ open: true, emails: [inviteEmail] });

      // Clear form and reset to placeholder
      setInviteEmail("");
      setInviteRole(undefined);
      setInviteDepartment(undefined);
    } catch (error: any) {
      // Error handling is done in the mutation
      console.error('Failed to send invite:', error);
    } finally {
      setIsSendingSingle(false);
    }
  };

  const handleRemoveFromList = (email: string) => {
    setPendingInvitesList(pendingInvitesList.filter(invite => invite.email !== email));
  };

  const handleSendAllInvites = async () => {
    if (pendingInvitesList.length === 0) return;

    setIsSendingBatch(true);
    const successfulEmails: string[] = [];
    const failedEmails: string[] = [];

    for (const invite of pendingInvitesList) {
      try {
        await inviteMemberMutation({
          email: invite.email,
          role: invite.role,
          department: invite.department
        });
        successfulEmails.push(invite.email);
      } catch (error: any) {
        failedEmails.push(invite.email);
      }
    }

    setIsSendingBatch(false);

    // Clear the list
    setPendingInvitesList([]);

    // Show results
    if (successfulEmails.length > 0) {
      setInviteSentDialog({ open: true, emails: successfulEmails });
    }

    if (failedEmails.length > 0) {
      toast({
        title: `Failed to send ${failedEmails.length} invitation(s)`,
        description: `Could not send invites to: ${failedEmails.join(', ')}`,
        variant: "destructive",
      });
    }
  };

  const handleRevokeInvite = async (token: string) => {
    try {
      await revokeInviteMutation(token);
    } catch (error: any) {
      toast({
        title: "Failed to revoke invitation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResendInvite = async (email: string, role: 'Admin' | 'Member', department?: string) => {
    try {
      await inviteMemberMutation({
        email,
        role,
        department
      });

      // Show success dialog
      setInviteSentDialog({ open: true, emails: [email] });
    } catch (error: any) {
      // Error already shown by mutation
      console.error('Failed to resend invite:', error);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentOrganization) return;

    // Close dialog immediately for responsive feel
    setRemoveDialog({ open: false, memberId: "", memberName: "" });

    try {
      // Show immediate feedback
      toast({
        title: "Removing member...",
        description: `Deactivating ${removeDialog.memberName}`,
      });

      await removeMemberMutation(removeDialog.memberId);

      // Success confirmation
      toast({
        title: "Member removed",
        description: `${removeDialog.memberName} has been removed from the organization.`,
      });
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
      await updateStatusMutation({ membershipId: memberId, status: 'Active' }); //membership_status
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
      await updateRoleMutation({ membershipId: memberId, role: newRole });
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
      // Convert "none" string to null for database
      const departmentValue = newDepartment === 'none' ? null : newDepartment;

      // Direct Supabase update since we don't have a dedicated hook for department
      const { error } = await (supabase.from('memberships') as any)
        .update({ department: departmentValue, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Department updated",
        description: "Member department has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update department",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentOrganization || !user?.id) return;

    try {
      // Transfer ownership: Set new member to Owner and current user to Admin
      const { error: newOwnerError } = await (supabase.from('memberships') as any)
        .update({ role: 'Owner', updated_at: new Date().toISOString() })
        .eq('id', transferDialog.memberId);

      if (newOwnerError) throw newOwnerError;

      const { error: currentUserError } = await (supabase.from('memberships') as any)
        .update({ role: 'Admin', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id);

      if (currentUserError) throw currentUserError;

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
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Department
              </label>
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Role
              </label>
            </div>
            <div className="w-[88px]"></div>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="john@emailaddress.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 placeholder:text-gray-400"
            />
            <Select value={inviteDepartment} onValueChange={setInviteDepartment}>
              <SelectTrigger className="w-44 [&>span[data-placeholder]]:text-gray-400">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className="w-48 max-h-80 [&>*]:scroll-smooth">
                <SelectItem value="Customer Success">Customer Success</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
              <SelectTrigger className="w-44 [&>span[data-placeholder]]:text-gray-400">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleSendSingleInvite}
              disabled={!inviteEmail || !inviteDepartment || !inviteRole || isSendingSingle}
              className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white px-6"
            >
              {isSendingSingle ? 'Sending...' : 'Invite'}
            </Button>
          </div>

          {/* Add to Batch Button */}
          <button
            onClick={handleAddToList}
            disabled={!inviteEmail || !inviteDepartment || !inviteRole}
            className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[var(--sidebar-icon-active)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add another to batch send
          </button>
        </div>

        {/* Pending Invites to Send */}
        {pendingInvitesList.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {pendingInvitesList.length} pending invite{pendingInvitesList.length !== 1 ? 's' : ''}
              </p>
              <Button
                onClick={handleSendAllInvites}
                disabled={isSendingBatch}
                className="bg-green-600 hover:bg-green-700 text-white px-4"
              >
                {isSendingBatch ? 'Sending...' : `Send ${pendingInvitesList.length} Invite${pendingInvitesList.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
              {pendingInvitesList.map((invite, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[200px]">
                      {invite.email}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[120px]">
                      {invite.department}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      {invite.role}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFromList(invite.email)}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pending Invitations</h3>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {pendingInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs">
                            {invite.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {invite.email}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Invitation sent
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {invite.department || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        {invite.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {invite.revoked_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          Revoked
                        </span>
                      ) : new Date(invite.expires_at) < new Date() ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {invite.revoked_at || new Date(invite.expires_at) < new Date() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvite(invite.email, invite.role, invite.department || undefined)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Resend
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.token)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
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
                [...members].sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()).map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
                            {getInitials(member.full_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.full_name || member.email || 'Unknown User'}
                          </p>
                          {member.full_name && member.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-44">
                        {member.status === 'Active' ? ( //membership_status
                          currentUserRole === 'Member' ? (
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {member.department || <span className="text-gray-400">—</span>}
                            </span>
                          ) : (
                            <Select
                              value={member.department || 'none'}
                              onValueChange={(value) => handleDepartmentChange(member.user_id, value)}
                            >
                              <SelectTrigger className="w-auto min-w-[100px] h-8 text-sm border-0 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 px-0 pr-1 gap-1 [&>svg]:bg-gray-100 [&>svg]:dark:bg-gray-800 [&>svg]:rounded [&>svg]:p-0.75">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent className="w-48 max-h-80 [&>*]:scroll-smooth">
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="Customer Success">Customer Success</SelectItem>
                                <SelectItem value="Engineering">Engineering</SelectItem>
                                <SelectItem value="Executive">Executive</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                                <SelectItem value="IT">IT</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Operations">Operations</SelectItem>
                                <SelectItem value="Product">Product</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
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
                      <div className="w-16">
                        {member.status === 'Active' ? ( //membership_status
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            Active
                          </span>
                        ) : member.status === 'Inactive' ? ( //membership_status
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            Inactive
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
                        {member.status === 'Active' ? ( //membership_status
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(member.joined_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {member.status === 'Inactive' ? ( //membership_status
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
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to remove <span className="font-semibold">{removeDialog.memberName}</span> from the organization?</p>
                <p className="text-sm">This action will:</p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                  <li>Deactivate their account and revoke access</li>
                  <li>Preserve their quotes and data</li>
                  <li>Display their name as "Deactivated User" on quotes</li>
                  <li>Allow reactivation later if needed</li>
                </ul>
              </div>
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
              Remove Member
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
            <DialogDescription asChild>
              <div className="space-y-2 pt-2">
                <p>You are about to transfer ownership of <strong>"{currentOrganization?.name}"</strong> to <strong>{transferDialog.memberName}</strong>.</p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">After this action:</p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 ml-4 list-disc">
                    <li>{transferDialog.memberName} will become the Owner</li>
                    <li>You will become an Admin</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
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

      {/* Invite Sent Dialog */}
      <Dialog open={inviteSentDialog.open} onOpenChange={(open) => setInviteSentDialog({ ...inviteSentDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {inviteSentDialog.emails.length === 1 ? 'Invitation Sent!' : 'Invitations Sent!'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center pt-4 space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {inviteSentDialog.emails.length === 1
                      ? "We've sent an invitation to:"
                      : `We've sent ${inviteSentDialog.emails.length} invitations to:`}
                  </p>
                  {inviteSentDialog.emails.length === 1 ? (
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {inviteSentDialog.emails[0]}
                    </p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1">
                      {inviteSentDialog.emails.map((email, i) => (
                        <p key={i} className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          • {email}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                    Please ask them to:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                    <li>Check their inbox for the invitation email</li>
                    <li>Check their spam/junk folder if not found</li>
                    <li>Click the invitation link to join your organization</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setInviteSentDialog({ open: false, emails: [] })}
              className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white px-8"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
