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
import { MoreVertical, UserMinus, Crown, AlertTriangle, RotateCcw, Plus, X } from "lucide-react";
import type { Role } from "@/utils/teamManagementHelpers";
import { cleanupExpiredTokens } from "@/utils/inviteTokens";
import { InviteBillingConfirmDialog } from "./InviteBillingConfirmDialog";
import { trackEvent } from "@/lib/analytics";

interface InviteRow {
  id: string;
  email: string;
  role: string | undefined;
  department: string | undefined;
}

const createEmptyInviteRow = (): InviteRow => ({
  id: crypto.randomUUID(),
  email: '',
  role: undefined,
  department: undefined,
});

export function TeamTab() {
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([createEmptyInviteRow()]);
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; memberId: string; memberName: string }>({ open: false, memberId: "", memberName: "" });
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; memberId: string; memberName: string }>({ open: false, memberId: "", memberName: "" });
  const [inviteSentDialog, setInviteSentDialog] = useState<{ open: boolean; emails: string[] }>({ open: false, emails: [] });
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; token: string; email: string }>({ open: false, token: "", email: "" });
  const [isSending, setIsSending] = useState(false);

  // Billing confirmation dialog state
  const [billingConfirmDialog, setBillingConfirmDialog] = useState<{
    open: boolean;
    invites: Array<{ email: string; role: 'Admin' | 'Member'; department?: string }>;
  }>({ open: false, invites: [] });
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

  // Row management handlers
  const updateInviteRow = (id: string, field: keyof InviteRow, value: string | undefined) => {
    setInviteRows(rows => rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addInviteRow = () => {
    setInviteRows(rows => [...rows, createEmptyInviteRow()]);
  };

  const removeInviteRow = (id: string) => {
    setInviteRows(rows => {
      if (rows.length === 1) {
        // Keep at least one row, just clear it
        return [createEmptyInviteRow()];
      }
      return rows.filter(row => row.id !== id);
    });
  };

  // Get valid invites from all rows
  const getValidInvites = () => {
    return inviteRows
      .filter(row => row.email && row.role && row.department)
      .map(row => ({
        email: row.email,
        role: (row.role === 'Owner' || row.role === 'Admin' ? 'Admin' : 'Member') as 'Admin' | 'Member',
        department: row.department
      }));
  };

  const hasValidInvites = getValidInvites().length > 0;

  // Show billing confirmation dialog for invites
  const handleSendInvites = () => {
    const validInvites = getValidInvites();
    if (validInvites.length === 0) return;

    // Check for duplicate emails within the list
    const emails = validInvites.map(i => i.email);
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      toast({
        title: "Duplicate emails",
        description: "Please remove duplicate email addresses",
        variant: "destructive",
      });
      return;
    }

    // Show billing confirmation dialog
    setBillingConfirmDialog({
      open: true,
      invites: validInvites,
    });
  };

  // Actually send invites after billing confirmation
  const handleConfirmInvites = async (invitesToSend: Array<{ email: string; role: 'Admin' | 'Member'; department?: string }>) => {
    if (invitesToSend.length === 0) return;

    setIsSending(true);

    const successfulEmails: string[] = [];
    const failedEmails: string[] = [];

    try {
      for (const invite of invitesToSend) {
        try {
          await inviteMemberMutation({
            email: invite.email,
            role: invite.role,
            department: invite.department
          });
          trackEvent('team_member_invited', { role: invite.role });
          successfulEmails.push(invite.email);
        } catch (error: any) {
          failedEmails.push(invite.email);
        }
      }

      // Close billing dialog
      setBillingConfirmDialog({ open: false, invites: [] });

      // Show success dialog if any succeeded
      if (successfulEmails.length > 0) {
        setInviteSentDialog({ open: true, emails: successfulEmails });
      }

      // Show error toast if any failed
      if (failedEmails.length > 0) {
        toast({
          title: `Failed to send ${failedEmails.length} invitation(s)`,
          description: `Could not send invites to: ${failedEmails.join(', ')}`,
          variant: "destructive",
        });
      }

      // Reset to single empty row
      setInviteRows([createEmptyInviteRow()]);
    } catch (error: any) {
      console.error('Failed to send invites:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRevokeInvite = async () => {
    try {
      await revokeInviteMutation(revokeDialog.token);
      setRevokeDialog({ open: false, token: "", email: "" });
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

  const handleDeactivateMember = async () => {
    if (!currentOrganization) return;

    // Close dialog immediately for responsive feel
    setRemoveDialog({ open: false, memberId: "", memberName: "" });

    try {
      await removeMemberMutation(removeDialog.memberId);

      // Success confirmation
      toast({
        title: "Member deactivated",
        description: `${removeDialog.memberName} has been deactivated. Their access has been revoked.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to deactivate member",
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
      // Use atomic RPC function for secure ownership transfer
      // This ensures both role changes succeed or both fail
      const { error } = await (supabase.rpc as any)('transfer_ownership', {
        p_new_owner_id: transferDialog.memberId, // This is user_id — RPC expects a user UUID, not membership ID
        p_organization_id: currentOrganization.id,
      });

      if (error) throw error;

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
      {/* Invite New Members Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Invite New Members</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        <div className="mb-6">
          {/* Column Headers */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
            </div>
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Department
              </label>
            </div>
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Role
              </label>
            </div>
            <div className="w-9"></div>
          </div>

          {/* Invite Rows */}
          <div className="space-y-2">
            {inviteRows.map((row) => (
              <div key={row.id} className="flex gap-2 items-center">
                <Input
                  type="email"
                  placeholder="john@emailaddress.com"
                  value={row.email}
                  onChange={(e) => updateInviteRow(row.id, 'email', e.target.value)}
                  className="flex-1 placeholder:text-gray-400"
                />
                <Select value={row.department} onValueChange={(value) => updateInviteRow(row.id, 'department', value)}>
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
                <Select value={row.role} onValueChange={(value) => updateInviteRow(row.id, 'role', value as Role)}>
                  <SelectTrigger className="w-44 [&>span[data-placeholder]]:text-gray-400">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInviteRow(row.id)}
                  className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add More & Invite Buttons */}
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={addInviteRow}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-[var(--sidebar-icon-active)] flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add more
            </button>
            <Button
              onClick={handleSendInvites}
              disabled={!hasValidInvites || isSending}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              {isSending ? 'Sending...' : 'Invite'}
            </Button>
          </div>
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
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
                            Invitation sent at {new Date(invite.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              timeZoneName: 'short'
                            })}
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
                          onClick={() => setRevokeDialog({ open: true, token: invite.token, email: invite.email })}
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Team Members</h2>
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
                              onValueChange={(value) => handleRoleChange(member.id, value as Role)}
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
                          onClick={() => handleReactivateMember(member.id, member.full_name || member.email || 'Unknown User')}
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
                              onClick={() => setTransferDialog({ open: true, memberId: member.user_id, memberName: member.full_name || member.email || 'Unknown User' })}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <Crown className="w-4 h-4 mr-2" />
                              Transfer Ownership
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRemoveDialog({ open: true, memberId: member.id, memberName: member.full_name || member.email || 'Unknown User' })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Deactivate
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
                              onClick={() => setRemoveDialog({ open: true, memberId: member.id, memberName: member.full_name || member.email || 'Unknown User' })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Deactivate
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

      {/* Deactivate Member Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ ...removeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-600" />
              Deactivate Team Member
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to deactivate <span className="font-semibold">{removeDialog.memberName}</span>?</p>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">What happens when you deactivate:</p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 ml-4 list-disc">
                    <li>Their access is revoked immediately</li>
                    <li>They cannot log in or access any organization data</li>
                    <li>All their proposals and data are preserved</li>
                    <li>Their name shows as "Deactivated User" on their work</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>This can be undone.</strong> You can reactivate this member at any time from the Team page.
                  </p>
                </div>

                {/* Billing Impact Notice */}
                <div className="flex items-start gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm text-green-800 dark:text-green-200">
                    Your next monthly bill will <span className="font-semibold">decrease by $20</span>.
                  </span>
                </div>
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
              onClick={handleDeactivateMember}
            >
              Deactivate Member
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

      {/* Billing Confirmation Dialog */}
      <InviteBillingConfirmDialog
        open={billingConfirmDialog.open}
        onOpenChange={(open) => setBillingConfirmDialog({ ...billingConfirmDialog, open })}
        initialInvites={billingConfirmDialog.invites}
        onConfirm={handleConfirmInvites}
        onCancel={() => setBillingConfirmDialog({ open: false, invites: [] })}
        isLoading={isSending}
        pricePerUser={20}
      />

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

      {/* Revoke Invitation Dialog */}
      <Dialog open={revokeDialog.open} onOpenChange={(open) => setRevokeDialog({ ...revokeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to revoke the invitation for{' '}
                  <span className="font-semibold">{revokeDialog.email}</span>?
                </p>
                <p className="text-sm">This will:</p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                  <li>Immediately invalidate their invitation link</li>
                  <li>Prevent them from joining with this invitation</li>
                  <li>Keep the invitation record for 30 days</li>
                </ul>
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mt-2">
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    You can resend a new invitation to this email at any time.
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeDialog({ open: false, token: "", email: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeInvite}
            >
              Revoke Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
