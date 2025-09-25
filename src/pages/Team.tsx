import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, HeaderNav } from "@/components/common/layout";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { authStateHelpers } from "@/utils/authStateHelpers";
import { teamManagementHelpers } from "@/utils/teamManagementHelpers";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamStatsCards } from "@/components/team/TeamStatsCards";
import { MembersList } from "@/components/team/MembersList";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import type { Role } from "@/utils/teamManagementHelpers";

const Team = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();

  const {
    currentOrganization,
    members,
    currentUserRole,
    loading,
    inviteMember,
    removeMember,
    updateMemberRole,
    approveMember,
    rejectMember,
    // refreshOrganizations
  } = useOrganizations();

  const { profile } = useUserProfile(userId);

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


  const [orgCode, setOrgCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndSetOrgCode = async () => {
      const code = await teamManagementHelpers.getOrganizationCode(userId, currentOrganization, currentUserRole);
      setOrgCode(code);
    };
    fetchAndSetOrgCode();
  }, [userId, currentOrganization, currentUserRole]);

  const handleLogout = async () => {
    await authStateHelpers.handleLogout();
    navigate("/auth");
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !currentOrganization) return;

    const result = await teamManagementHelpers.inviteMember(
      { organizationId: currentOrganization.id, email: inviteEmail, role: inviteRole },
      inviteMember
    );
    
    if (result.success) {
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteDialog(false);
      toast({
        title: "Invitation sent!",
        description: result.data?.message,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };



  const copyOrganizationCode = async () => {
    if (!orgCode) return;
    
    const result = await teamManagementHelpers.copyOrganizationCode(orgCode);
    
    if (result.success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast({
        title: "Copied!",
        description: (result.data as any)?.message,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };


  const { activeMembersCount, pendingMembersCount } = teamManagementHelpers.calculateTeamStats(members);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-theme-primary">
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
      <div className="min-h-screen flex w-full bg-theme-primary">
        <AppSidebar user={user} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Header Nav Bar */}
          <HeaderNav 
            user={user} 
            userProfile={profile as any}
            organizationName={currentOrganization?.name || 'Loading...'}
            onLogout={handleLogout} 
          />
          
          {/* Organization Header */}
          <div className="p-6 pb-0">
            
            {/* Team Management Header with Org Code */}
            <div className="flex items-center justify-between mt-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
                <p className="text-muted-foreground mt-1">Manage your organization members and permissions.</p>
              </div>
              
              {/* Organization Code */}
              {orgCode && (
                <div className="flex items-center gap-3">
                  <Card className="px-4 py-2 bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Org Code:</span>
                      <code className="font-mono font-semibold text-foreground">{orgCode}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyOrganizationCode}
                        className="h-6 w-6 p-0"
                      >
                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 pt-4 space-y-6">

            <TeamStatsCards
              activeMembersCount={activeMembersCount}
              pendingMembersCount={pendingMembersCount}
              currentUserRole={currentUserRole}
            />

            <div className="flex items-center justify-between mb-4">
              <div></div>
              <InviteMemberDialog
                isOpen={showInviteDialog}
                inviteEmail={inviteEmail}
                inviteRole={inviteRole}
                onOpenChange={setShowInviteDialog}
                onEmailChange={setInviteEmail}
                onRoleChange={setInviteRole}
                onInvite={handleInviteMember}
                canInvite={['admin'].includes(currentUserRole || '')}
              />
            </div>
            
            <MembersList
              members={members}
              currentUserId={userId}
              currentUserRole={currentUserRole}
              onApproveMember={approveMember}
              onRejectMember={rejectMember}
              onUpdateMemberRole={(memberId: string, newRole: string) => {
                updateMemberRole(memberId, newRole as 'admin' | 'member').catch(console.error);
              }}
              onRemoveMember={removeMember}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Team;