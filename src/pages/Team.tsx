import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/layout";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { authStateHelpers } from "@/utils/authStateHelpers";
import { getAppUrl } from "@/utils/environment";
import { createInviteToken } from "@/utils/inviteTokens";
import { hasAdminPermissions, canManageTeam } from "@/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserCheck, Clock, Shield, Plus, Search, Filter, MoreVertical, Trash2, Link2, Send, Copy, X, RotateCcw, Mail, CheckCircle, XCircle } from "lucide-react";
import type { Role } from "@/utils/teamManagementHelpers";

const Team = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [inviteEmails, setInviteEmails] = useState([{ email: "", role: "Member" as Role }]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("members");
  const [currentPage, setCurrentPage] = useState(1);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const itemsPerPage = 10;
  const { toast } = useToast();

  const {
    currentOrganization,
    members,
    inviteTokens,
    currentUserRole,
    loading,
    inviteMember,
    removeMember,
    resendInvite,
    revokeInvite,
    approveMember,
    rejectMember
  } = useOrganizations();

  // Authentication check
  useEffect(() => {
    const initAuth = async () => {
      const result = await authStateHelpers.initializePageAuth({
        onRedirectToAuth: () => navigate("/auth"),
        onAuthStateChange: (user, session) => {
          if (session) {
            setUser(user?.email || "");
            setUserId(user?.id || "");
          } else {
            navigate("/auth");
          }
        }
      });

      if (result?.user) {
        setUser(result.user.email);
        setUserId(result.user.id);
      }
    };

    initAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await authStateHelpers.handleLogout();
    navigate("/auth");
  };

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

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-bg-primary">
          <AppSidebar user={user} onLogout={handleLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading team...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        <AppSidebar user={user} onLogout={handleLogout} />

        <main className="flex-1 p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your team members and their permissions</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Members</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Sent Invitations</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingInvites}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                    <UserCheck className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Approvals</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invite New Team Member Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Invite New Team Member
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={invite.email}
                      onChange={(e) => updateInviteField(index, "email", e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <div className="flex gap-2">
                      <Select
                        value={invite.role}
                        onValueChange={(value) => updateInviteField(index, "role", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                <Button variant="outline" onClick={addInviteField}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add another member
                </Button>

                <Button onClick={handleSendInvitations} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>


          {/* Team Members Table */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <TabsList className="grid grid-cols-3 w-fit">
                    <TabsTrigger value="members">
                      Team Members ({members.filter(m => m.status === "Active").length})
                    </TabsTrigger>
                    <TabsTrigger value="invitations">
                      Sent Invitations ({inviteTokens.length})
                    </TabsTrigger>
                    <TabsTrigger value="approvals">
                      Pending Approvals ({stats.pendingApprovals})
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              <CardContent>
                <TabsContent value="members" className="mt-0">
                  <div className="space-y-3">
                    {members.filter(m => m.status === "Active").filter(member => {
                      const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
                      return matchesSearch && matchesRole;
                    }).slice(startIndex, startIndex + itemsPerPage).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {member.full_name
                                ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : member.email.slice(0, 2).toUpperCase()
                              }
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {member.full_name || member.email}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            variant={member.role === 'Admin' ? 'default' : 'secondary'}
                            className="capitalize"
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
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No team members found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Start by inviting your first team member
                        </p>
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
                </TabsContent>

                <TabsContent value="invitations" className="mt-0">
                  <div className="space-y-3">
                    {inviteTokens.filter(token => {
                      const matchesSearch = token.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesRole = roleFilter === "all" || token.role.toLowerCase() === roleFilter.toLowerCase();
                      return matchesSearch && matchesRole;
                    }).slice(startIndex, startIndex + itemsPerPage).map((token) => (
                      <div
                        key={token.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {token.email}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Expires: {new Date(token.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Invitation Sent
                          </Badge>
                          <Badge
                            variant={token.role === 'Admin' ? 'default' : 'secondary'}
                            className="capitalize"
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
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No sent invitations
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Invitations you send will appear here
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
                </TabsContent>

                <TabsContent value="approvals" className="mt-0">
                  <div className="space-y-3">
                    {members.filter(m => m.status === "Pending").filter(member => {
                      const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
                      return matchesSearch && matchesRole;
                    }).slice(startIndex, startIndex + itemsPerPage).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {member.full_name
                                ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : member.email.slice(0, 2).toUpperCase()
                              }
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {member.full_name || member.email}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                            <p className="text-xs text-gray-400">Signed up and waiting for approval</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Awaiting Approval
                          </Badge>
                          <Badge
                            variant={member.role === 'Admin' ? 'default' : 'secondary'}
                            className="capitalize"
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
                      <div className="text-center py-12">
                        <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No pending approvals
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          When someone signs up from an invite link, they'll appear here for approval
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
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </main>

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
    </SidebarProvider>
  );
};

export default Team;