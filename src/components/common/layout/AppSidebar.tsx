import { MoreVertical, LogOut, CreditCard } from "lucide-react";
import { House, FileText, ChartBar, Users, List, Gear } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { QwohterLogo } from "@/components/common/QwohterLogo";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";
import { useState } from "react";

interface AppSidebarProps {
  user: string;
  onLogout: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    icon: House,
    path: "/dashboard",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Quotes",
    icon: FileText,
    path: "/quotes",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Analytics",
    icon: ChartBar,
    path: "/analytics",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Team",
    icon: Users,
    path: "/team",
    roles: ['Owner', 'Admin'], // Only Owner and Admin
  },
  {
    title: "Settings",
    icon: Gear,
    path: "/settings",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  }
];

export function AppSidebar({
  onLogout
}: AppSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Use Zustand stores directly - they're already cached and won't cause re-fetches
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.profile);
  const currentUserRole = useOrganizationStore((state) => state.currentUserRole);

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

  const userDisplayName = userProfile?.full_name || user?.email || 'User';
  const userInitials = getUserInitials(userProfile?.full_name ?? undefined, user?.email);
  const effectiveRole = currentUserRole || 'Member';

  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();


  const handleNavigate = (path: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    navigate(path);
  };

  return (
    <Sidebar
      className="bg-sidebar-bg"
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Logo and Collapse Toggle */}
      <SidebarHeader className={`${isCollapsed ? 'px-2 pt-3 pb-0' : 'px-4 pt-4 pb-1 pl-6'}`}>
        <div className="flex items-center justify-between">
          {/* Logo or Menu Icon Toggle */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
            {isCollapsed ? (
              <div className="relative">
                {/* Logo shown by default when collapsed */}
                <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                <QwohterLogo size="sm" />
                </div>
                {/* Menu icon shown on hover when collapsed */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  <SidebarTrigger className="h-8 w-8 rounded-lg text-[var(--sidebar-section-label)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] transition-colors">
                    <List size={20} weight="regular" />
                  </SidebarTrigger>
                </div>
              </div>
            ) : (
              <QwohterLogo size="sm" />
            )}
          </div>
          {/* Collapsible trigger */}
          {!isCollapsed && (
            <SidebarTrigger className="h-8 w-8 rounded-lg text-[var(--sidebar-section-label)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] transition-colors">
              <List size={20} weight="regular" />
            </SidebarTrigger>
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className={`px-2 ${isCollapsed ? 'pt-2' : 'pt-4'} pb-6 flex-1`}>
        <SidebarGroup>
          <div
            className={`px-0 pl-0 mb-1 flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isCollapsed && (
              <p className="text-xs font-medium text-[var(--sidebar-section-label)] uppercase tracking-wide">
                General
              </p>
            )}
            <ThemeToggleButton />
          </div>

          <SidebarGroupContent>
            <SidebarMenu className={`space-y-0 ${isCollapsed ? 'space-y-1' : 'space-y-0'}`}>
              {menuItems
                .filter(item => !currentUserRole || item.roles.includes(currentUserRole))
                .map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={`h-11 font-medium flex items-center relative group/item ${
                        isCollapsed ? 'justify-center w-full px-0' : 'px-3'
                      } ${
                        isActive
                          ? 'text-[var(--sidebar-nav-text-active)] shadow-sm [&:hover]:text-[var(--sidebar-nav-text-active)]'
                          : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] transition-all duration-200'
                      }`}
                      style={{
                        borderRadius: 'var(--sidebar-nav-border-radius)',
                        ...(isActive
                          ? {
                              backgroundColor: 'var(--sidebar-nav-bg-active)',
                              color: 'var(--sidebar-nav-text-active)',
                            }
                          : {})
                      }}
                      onClick={(e) => handleNavigate(item.path, e)}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          const target = e.currentTarget;
                          target.style.backgroundColor = 'var(--sidebar-nav-bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          const target = e.currentTarget;
                          target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon
                        size={18}
                        weight="regular"
                        className={`${
                          isActive
                            ? 'text-[var(--sidebar-icon-active)] [&:hover]:text-[var(--sidebar-icon-active)]'
                            : 'text-[var(--sidebar-icon-default)] hover:text-[var(--sidebar-icon-hover)] transition-colors'
                        }`}
                        style={isActive ? { color: 'var(--sidebar-icon-active)' } : {}}
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
          <div className="space-y-3">
          {/* User Profile Section */}
            <div className="flex items-center justify-between p-3 rounded-xl group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-9 w-9 ring-2 ring-[var(--sidebar-user-avatar-bg)]">
                  <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-sm font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--sidebar-user-text)] truncate">
                    {userDisplayName}
                  </p>
                  <p className="text-xs text-[var(--sidebar-user-subtitle)] truncate">
                    {effectiveRole}
                  </p>
                </div>
              </div>

              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[var(--sidebar-user-text)] hover:text-[var(--sidebar-user-text)] hover:bg-[var(--sidebar-user-hover-bg)] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-destructive hover:bg-[var(--sidebar-nav-bg-hover)] cursor-pointer"
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
                    className="h-10 w-10 p-0 rounded-xl hover:bg-[var(--sidebar-user-hover-bg)]"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-[var(--sidebar-user-avatar-bg)]">
                      <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-xs font-semibold">
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
                      {effectiveRole}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-destructive hover:bg-[var(--sidebar-nav-bg-hover)] cursor-pointer mt-1"
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