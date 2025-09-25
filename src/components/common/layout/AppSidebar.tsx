import { BarChart3, Home, Users, FileText, MoreVertical, LogOut, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { QwohterLogo } from "@/components/common/QwohterLogo";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  user: string;
  onLogout: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    path: "/dashboard"
  },
  {
    title: "Quotes",
    icon: FileText,
    path: "/quotes"
  },
  {
    title: "Analytics",
    icon: BarChart3,
    path: "/analytics"
  },
  {
    title: "Team",
    icon: Users,
    path: "/team"
  }
];

export function AppSidebar({
  onLogout
}: AppSidebarProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { profile } = useUserProfile(currentUser?.id);
  const { currentUserRole } = useOrganizations();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    };
    getCurrentUser();
  }, []);

  // Generate user initials
  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const userDisplayName = profile?.full_name || currentUser?.email || 'User';
  const userInitials = getUserInitials(profile?.full_name ?? undefined, currentUser?.email);

  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    // Remember current sidebar state
    const wasCollapsed = isCollapsed;

    // Navigate
    navigate(path);

    // Force sidebar to stay in same state after navigation
    if (wasCollapsed) {
      setTimeout(() => setOpen(false), 0);
    }
  };

  return (
    <Sidebar
      className="bg-sidebar-bg"
      collapsible="icon"
    >
      {/* Header with Logo and Collapse Toggle */}
      <SidebarHeader className={`${isCollapsed ? 'px-2 pt-3 pb-0' : 'px-4 pt-4 pb-1 pl-6'}`}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <QwohterLogo size={isCollapsed ? "xsm" : "md"} />
          </div>
          {/* Collapsible trigger */}
          {!isCollapsed && (
            <SidebarTrigger className="h-8 w-8 rounded-lg text-accent-primary hover:bg-sidebar-hover hover:text-accent-primary transition-colors" />
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className={`px-2 ${isCollapsed ? 'pt-2' : 'pt-4'} pb-6 flex-1`}>
        <SidebarGroup>
          <div
            className={`px-0 pl-0 mb-1 flex items-center ${
              isCollapsed ? 'justify-center flex-col space-y-1' : 'justify-between'
            }`}
          >
            {/* Show collapse trigger when collapsed */}
            {isCollapsed && (
              <SidebarTrigger className="h-7 w-7 rounded-lg text-accent-primary hover:bg-sidebar-hover hover:text-accent-primary transition-colors" />
            )}

            {!isCollapsed && (
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                General
              </p>
            )}
            <ThemeToggleButton />
          </div>

          <SidebarGroupContent>
            <SidebarMenu className={`space-y-0 ${isCollapsed ? 'space-y-1' : 'space-y-0'}`}>
              {menuItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={`h-11 rounded-xl font-medium transition-all duration-200 group flex items-center ${
                        isCollapsed ? 'justify-center w-full px-0' : 'px-3'
                      } ${
                        isActive
                          ? 'bg-sidebar-active text-white shadow-sm'
                          : 'bg-sidebar-inactive hover:bg-sidebar-hover hover:text-text-primary'
                      }`}
                      onClick={(e) => handleNavigate(item.path, e)}
                    >
                      <item.icon
                        className={`h-5 w-5 ${
                          isActive ? 'text-white' : 'text-gray-500 group-hover:text-accent-primary'
                        }`}
                      />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Theme Toggle and User Profile */}
      <SidebarFooter className="p-2 pb-4">
        {!isCollapsed ? (
          <div className="space-y-4">
            {/* User Profile Section */}
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-sidebar-hover transition-colors group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-accent-primary text-white text-sm font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {userDisplayName}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {currentUserRole || 'Member'}
                  </p>
                </div>
              </div>

              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-accent-primary hover:text-accent-primary hover:bg-sidebar-hover opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => handleNavigate('/settings', e)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-error hover:text-error hover:bg-error/10 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* User Avatar Collapsed */}
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-0 rounded-xl hover:bg-sidebar-hover"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-sidebar-border">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-accent-primary text-white text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 border-b">
                    <p className="text-sm font-semibold text-text-primary">
                      {userDisplayName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {currentUserRole || 'Member'}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={(e) => handleNavigate('/settings', e)}
                    className="flex items-center gap-2 cursor-pointer mt-1"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-error hover:text-error hover:bg-error/10 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}