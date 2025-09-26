import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/layout";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { authStateHelpers } from "@/utils/authStateHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserCheck, Clock, Shield, Plus, Search, Filter, MoreVertical, Trash2, Link2, Send, Copy } from "lucide-react";
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
    currentUserRole,
    loading,
    inviteMember,
    removeMember
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


  const generateInviteLink = () => {
    if (!currentOrganization) return;

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join/${currentOrganization.organization_code}`;
    setInviteLink(link);
    setShowInviteLink(true);
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
    pending: members.filter(m => m.status === "Pending").length,
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Role</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">{stats.userRole}</p>
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
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <TabsList>
                    <TabsTrigger value="members">
                      Team Members ({members.filter(m => m.status === "Active").length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Sent Invitations ({members.filter(m => m.status === "Pending").length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                    </SelectContent>
                  </Select>
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

                          {currentUserRole === 'Admin' && member.id !== userId && (
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

                <TabsContent value="pending" className="mt-0">
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
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Invitation Sent
                          </Badge>
                          <Badge
                            variant={member.role === 'Admin' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {member.role.toLowerCase()}
                          </Badge>

                          {currentUserRole === 'Admin' && (
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
                                  Cancel Invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}

                    {members.filter(m => m.status === "Pending").length === 0 && (
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
                  {Math.ceil(members.filter(m => m.status === "Pending").length / itemsPerPage) > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, members.filter(m => m.status === "Pending").length)} of {members.filter(m => m.status === "Pending").length} sent invitations
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