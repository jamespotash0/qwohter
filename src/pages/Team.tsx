import { useState, useEffect } from "react";
import { PageContent } from "@/components/common/layout";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth/authStore";
import { getAppUrl } from "@/utils/environment";
import { createInviteToken } from "@/utils/inviteTokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserCheck, Clock, Plus, MoreVertical, Trash2, Link2, Send, Copy, X, RotateCcw, Mail, CheckCircle, XCircle } from "lucide-react";
import type { Role } from "@/utils/teamManagementHelpers";

const Team = () => {
  const navigate = useNavigate();
  const [inviteEmails, setInviteEmails] = useState([{ email: "", role: "Member" as Role }]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("members");
  const [currentPage, setCurrentPage] = useState(1);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Get user from auth store (already initialized in App.tsx)
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || "";

  const {
    currentOrganization,
    members,
    inviteTokens,
    currentUserRole,
    inviteMember,
    removeMember,
    resendInvite,
    revokeInvite,
    approveMember,
    rejectMember
  } = useOrganizations();

  const addInviteField = () => {
    setInviteEmails([...inviteEmails, { email: "", role: "Member" }]);
  };

  const removeInviteField = (index: number) => {
    if (inviteEmails.length > 1) {
      const updated = inviteEmails.filter((_, i) => i !== index);
      setInviteEmails(updated);
    }
  };


  const generateInviteLink = async () => {
    if (!currentOrganization || !userId) return;

    try {
      // Create a secure token that expires in 7 days
      const { token } = await createInviteToken(
        currentOrganization.id,
        currentOrganization.organization_code,
        'Member', // Default role for link invites
        userId,
        7 // 7 days expiry
      );

      const baseUrl = getAppUrl();
      const link = `${baseUrl}/auth?invite=${token}`;
      setInviteLink(link);
      setShowInviteLink(true);

      toast({
        title: "Invite link generated",
        description: "This link will expire in 7 days for security.",
      });
    } catch (error) {
      toast({
        title: "Error generating invite link",
        description: "Failed to create secure invite link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link copied!",
        description: "Invite link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const updateInviteField = (index: number, field: "email" | "role", value: string) => {
    const updated = [...inviteEmails];
    updated[index]![field] = value as Role;
    setInviteEmails(updated);
  };

  const handleSendInvitations = async () => {
    if (!currentOrganization) return;

    const validInvites = inviteEmails.filter(invite => invite.email.trim());
    if (validInvites.length === 0) return;

    try {
      for (const invite of validInvites) {
        await inviteMember(
          currentOrganization.id,
          invite.email,
          invite.role.toLowerCase() as "admin" | "member"
        );
      }

      setInviteEmails([{ email: "", role: "Member" as Role }]);
      toast({
        title: "Invitations sent!",
        description: `${validInvites.length} invitation(s) sent successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitations",
        variant: "destructive",
      });
    }
  };



  const startIndex = (currentPage - 1) * itemsPerPage;

  // Stats calculations
  const stats = {
    total: members.length,
    active: members.filter(m => m.status === "Active").length,
    pendingInvites: inviteTokens.length,
    pendingApprovals: members.filter(m => m.status === "Pending").length,
    userRole: currentUserRole || "Member"
  };

  return (
    <PageContent title="Team Management" subtitle="Manage your team members and their permissions" showPageHeader={true}>
      <div className="max-w-7xl mx-auto space-y-8">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Total Members</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                    <UserCheck className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Active Users</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Sent Invitations</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.pendingInvites}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-bg)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800">
                    <UserCheck className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Pending Approvals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.pendingApprovals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invite New Team Member Card */}
          <Card id="invite-section" className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                  <Plus className="w-5 h-5" />
                  Invite New Team Member
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={generateInviteLink}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Invite link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteEmails.map((invite, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  <div>
                    <label className="block text-sm font-medium text-[var(--content-body-text)] mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={invite.email}
                      onChange={(e) => updateInviteField(index, "email", e.target.value)}
                      className="w-full bg-white focus-visible:ring-[var(--sidebar-icon-active)] focus-visible:border-[var(--sidebar-icon-active)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--content-body-text)] mb-2">
                      Role
                    </label>
                    <div className="flex gap-2">
                      <Select
                        value={invite.role}
                        onValueChange={(value) => updateInviteField(index, "role", value)}
                      >
                        <SelectTrigger className="bg-white focus:ring-[var(--sidebar-icon-active)] focus:border-[var(--sidebar-icon-active)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Member">Member</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {inviteEmails.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInviteField(index)}
                          className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={addInviteField}
                  className="bg-white hover:bg-[var(--sidebar-nav-bg-hover)]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add another member
                </Button>

                <Button
                  onClick={handleSendInvitations}
                  className="bg-[var(--content-button-primary-bg)] hover:bg-[var(--content-button-primary-hover)] text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>


          {/* Team Members Table */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="bg-[var(--content-card-bg)] p-2 rounded-t-lg w-fit">
                <TabsList
                  className="grid grid-cols-3 w-fit bg-white p-1 mb-0"
                  style={{
                    borderRadius: 'var(--sidebar-nav-border-radius)'
                  }}
                >
                <TabsTrigger
                  value="members"
                  className="bg-transparent text-[var(--content-header-text)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)] data-[state=active]:bg-[var(--sidebar-nav-bg-active)] data-[state=active]:text-[var(--sidebar-nav-text-active)] data-[state=active]:shadow-sm transition-all duration-200"
                  style={{
                    borderRadius: 'var(--sidebar-nav-border-radius)'
                  }}
                >
                  Team Members ({members.filter(m => m.status === "Active").length})
                </TabsTrigger>
                <TabsTrigger
                  value="invitations"
                  className="bg-transparent text-[var(--content-header-text)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)] data-[state=active]:bg-[var(--sidebar-nav-bg-active)] data-[state=active]:text-[var(--sidebar-nav-text-active)] data-[state=active]:shadow-sm transition-all duration-200"
                  style={{
                    borderRadius: 'var(--sidebar-nav-border-radius)'
                  }}
                >
                  Sent Invitations ({inviteTokens.length})
                </TabsTrigger>
                <TabsTrigger
                  value="approvals"
                  className="bg-transparent text-[var(--content-header-text)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)] data-[state=active]:bg-[var(--sidebar-nav-bg-active)] data-[state=active]:text-[var(--sidebar-nav-text-active)] data-[state=active]:shadow-sm transition-all duration-200"
                  style={{
                    borderRadius: 'var(--sidebar-nav-border-radius)'
                  }}
                >
                  Pending Approvals ({stats.pendingApprovals})
                </TabsTrigger>
              </TabsList>
              </div>

              <TabsContent value="members" className="mt-0 animate-in fade-in-50 duration-300">
                <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 rounded-t-none">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                    {members.filter(m => m.status === "Active").filter(member => {
                      const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
                      return matchesSearch && matchesRole;
                    }).slice(startIndex, startIndex + itemsPerPage).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-[var(--content-card-border)] rounded-lg bg-white"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[var(--sidebar-icon-active)] rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {member.full_name
                                ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : member.email.slice(0, 2).toUpperCase()
                              }
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-[var(--content-header-text)]">
                              {member.full_name || member.email}
                            </h4>
                            <p className="text-sm text-[var(--content-muted-text)]">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`capitalize font-medium ${
                              member.role === 'Admin'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {member.role.toLowerCase()}
                          </Badge>

                          {(currentUserRole === 'Admin' || currentUserRole === 'Owner') && member.id !== userId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => removeMember(member.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}

                    {members.filter(m => m.status === "Active").length === 0 && (
                      <div className="text-center py-16 px-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Users className="w-10 h-10 text-[var(--content-muted-text)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--content-header-text)] mb-3">
                          No team members yet
                        </h3>
                        <p className="text-[var(--content-muted-text)] mb-6 max-w-md mx-auto">
                          Start building your team by inviting members. They'll appear here once they accept your invitation.
                        </p>
                        <Button
                          onClick={() => {
                            document.getElementById('invite-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="bg-[var(--content-button-primary-bg)] hover:bg-[var(--content-button-primary-hover)] text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Invite Team Member
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Pagination for Members */}
                  {Math.ceil(members.filter(m => m.status === "Active").length / itemsPerPage) > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, members.filter(m => m.status === "Active").length)} of {members.filter(m => m.status === "Active").length} members
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          {currentPage} of {Math.ceil(members.filter(m => m.status === "Active").length / itemsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(Math.ceil(members.filter(m => m.status === "Active").length / itemsPerPage), currentPage + 1))}
                          disabled={currentPage === Math.ceil(members.filter(m => m.status === "Active").length / itemsPerPage)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invitations" className="mt-0 animate-in fade-in-50 duration-300">
                <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 rounded-t-none">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                    {inviteTokens.filter(token => {
                      const matchesSearch = token.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesRole = roleFilter === "all" || token.role.toLowerCase() === roleFilter.toLowerCase();
                      return matchesSearch && matchesRole;
                    }).slice(startIndex, startIndex + itemsPerPage).map((token) => (
                      <div
                        key={token.id}
                        className="flex items-center justify-between p-4 border border-[var(--content-card-border)] rounded-lg bg-white"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[var(--sidebar-icon-active)] rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-[var(--content-header-text)]">
                              {token.email}
                            </h4>
                            <p className="text-sm text-[var(--content-muted-text)]">
                              Expires: {new Date(token.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                            Invitation Sent
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`capitalize font-medium ${
                              token.role === 'Admin'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {token.role.toLowerCase()}
                          </Badge>

                          {(currentUserRole === 'Admin' || currentUserRole === 'Owner') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => resendInvite(token.id, token.email)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => revokeInvite(token.id, token.email)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Revoke Invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}

                    {inviteTokens.length === 0 && (
                      <div className="text-center py-16 px-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Clock className="w-10 h-10 text-[var(--content-muted-text)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--content-header-text)] mb-3">
                          No pending invitations
                        </h3>
                        <p className="text-[var(--content-muted-text)] mb-6 max-w-md mx-auto">
                          When you invite team members, their pending invitations will be tracked here until they sign up.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pagination for Pending */}
                  {Math.ceil(inviteTokens.length / itemsPerPage) > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, inviteTokens.length)} of {inviteTokens.length} sent invitations
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          {currentPage} of {Math.ceil(inviteTokens.length / itemsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(Math.ceil(inviteTokens.length / itemsPerPage), currentPage + 1))}
                          disabled={currentPage === Math.ceil(inviteTokens.length / itemsPerPage)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approvals" className="mt-0 animate-in fade-in-50 duration-300">
                <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 rounded-t-none">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                    {members.filter(m => m.status === "Pending").filter(member => {
                      const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
                      return matchesSearch && matchesRole;
                    }).slice(startIndex, startIndex + itemsPerPage).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-[var(--content-card-border)] rounded-lg bg-white"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[var(--sidebar-icon-active)] rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {member.full_name
                                ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : member.email.slice(0, 2).toUpperCase()
                              }
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-[var(--content-header-text)]">
                              {member.full_name || member.email}
                            </h4>
                            <p className="text-sm text-[var(--content-muted-text)]">{member.email}</p>
                            <p className="text-xs text-[var(--content-muted-text)]">Signed up and waiting for approval</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-medium">
                            Awaiting Approval
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`capitalize font-medium ${
                              member.role === 'Admin'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {member.role.toLowerCase()}
                          </Badge>

                          {(currentUserRole === 'Admin' || currentUserRole === 'Owner') && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveMember(member.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectMember(member.id)}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {members.filter(m => m.status === "Pending").length === 0 && (
                      <div className="text-center py-16 px-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                          <UserCheck className="w-10 h-10 text-[var(--content-muted-text)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--content-header-text)] mb-3">
                          No pending approvals
                        </h3>
                        <p className="text-[var(--content-muted-text)] mb-6 max-w-md mx-auto">
                          Team members who sign up using an invite link will appear here waiting for your approval before they can access the system.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pagination for Pending Approvals */}
                  {Math.ceil(members.filter(m => m.status === "Pending").length / itemsPerPage) > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, members.filter(m => m.status === "Pending").length)} of {members.filter(m => m.status === "Pending").length} pending approvals
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          {currentPage} of {Math.ceil(members.filter(m => m.status === "Pending").length / itemsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(Math.ceil(members.filter(m => m.status === "Pending").length / itemsPerPage), currentPage + 1))}
                          disabled={currentPage === Math.ceil(members.filter(m => m.status === "Pending").length / itemsPerPage)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

        {/* Invite Link Dialog */}
        <Dialog open={showInviteLink} onOpenChange={setShowInviteLink}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Organization Invite Link</DialogTitle>
              <DialogDescription>
                Share this link with people you want to invite to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 text-sm font-mono break-all">
                  {inviteLink}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteLink}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowInviteLink(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageContent>
  );
};

export default Team;