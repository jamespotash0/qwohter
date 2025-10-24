import { LogOut, CreditCard } from "lucide-react";
import { House, FileText, ChartBar, Users, List, Gear, Kanban, Sidebar as SidebarIcon, DotsThree, Lock, SquaresFour, Article } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
import { QwohterLogo } from "@/components/common/QwohterLogo";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";
import { useState, useEffect, useRef } from "react";

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
    title: "Project Board",
    icon: Kanban,
    path: "/board",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Proposals",
    icon: FileText,
    path: "/quotes",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Forms",
    icon: SquaresFour,
    path: "/forms",
    roles: ['Owner', 'Admin', 'Member'],
    disabled: true, // DISABLED: Enable when form builder is complete
  },
  {
    title: "Templates",
    icon: Article,
    path: "/templates",
    roles: ['Owner', 'Admin', 'Member'],
    disabled: true, // DISABLED: Enable when template system is complete
  },
  {
    title: "Analytics",
    icon: ChartBar,
    path: "/analytics",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
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
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const previousPathRef = useRef<string>('');

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

  // Track path changes for animations
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      // Reset clicked item after navigation completes
      const timer = setTimeout(() => setClickedItem(null), 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleNavigate = (path: string, title: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setClickedItem(title);
    navigate(path);
  };

  return (
    <Sidebar
      className="bg-sidebar-bg transition-all duration-300 ease-in-out"
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Logo and Collapse Toggle */}
      <SidebarHeader className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'px-2 pt-3 pb-0' : 'px-4 pt-4 pb-1 pl-6'}`}>
        <div className="flex items-center justify-between">
          {/* Logo or Menu Icon Toggle */}
          <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            {isCollapsed ? (
              <div className="relative">
                {/* Logo shown by default when collapsed */}
                <div className={`transition-all duration-300 ease-in-out ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                <QwohterLogo size="sm" />
                </div>
                {/* Menu icon shown on hover when collapsed */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isHovered ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-90 rotate-90'}`}>
                  <SidebarTrigger className="h-8 w-8 rounded-lg text-[var(--sidebar-section-label)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] transition-all duration-200">
                    <SidebarIcon size={20} weight="regular" />
                  </SidebarTrigger>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <QwohterLogo size="sm" />
              </div>
            )}
          </div>
          {/* Collapsible trigger */}
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <SidebarTrigger className="h-8 w-8 rounded-lg text-[var(--sidebar-section-label)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:scale-110 active:scale-95 active:rotate-12 transition-all duration-200 group/trigger">
                <SidebarIcon size={20} weight="regular" className="group-active/trigger:rotate-90 transition-transform duration-200" />
              </SidebarTrigger>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className={`px-2 ${isCollapsed ? 'pt-2' : 'pt-4'} pb-6 flex-1 transition-all duration-300`}>
        <SidebarGroup>
          <div
            className={`px-0 pl-0 mb-1 flex items-center transition-all duration-300 ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isCollapsed && (
              <p className="text-xs font-inter font-medium text-[var(--sidebar-section-label)] uppercase tracking-wide animate-in fade-in slide-in-from-left-2 duration-300">
                Menu
              </p>
            )}
            <div className="transition-all duration-300 hover:scale-110 active:scale-95">
              <ThemeToggleButton />
            </div>
          </div>

          <SidebarGroupContent>
            <SidebarMenu className={`space-y-0 ${isCollapsed ? 'space-y-1' : 'space-y-0'}`}>
              {menuItems
                .filter(item => !currentUserRole || item.roles.includes(currentUserRole))
                .map((item, index) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                const isDisabled = item.disabled || false;

                const isClicked = clickedItem === item.title;

                return (
                  <SidebarMenuItem
                    key={item.title}
                    className={`${
                      isCollapsed
                        ? 'animate-in fade-in zoom-in-95 duration-200'
                        : 'animate-in fade-in slide-in-from-left-3 duration-300'
                    }`}
                    style={{
                      animationDelay: `${index * 40}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <SidebarMenuButton
                      className={`h-11 flex items-center relative group/item overflow-hidden ${
                        isCollapsed ? 'justify-center w-full px-0' : 'px-3'
                      } ${
                        isDisabled
                          ? 'text-[var(--sidebar-nav-text)] opacity-50 cursor-not-allowed'
                          : isActive
                          ? 'text-[var(--sidebar-nav-text-active)] shadow-sm [&:hover]:text-[var(--sidebar-nav-text-active)]'
                          : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      style={{
                        borderRadius: 'var(--sidebar-nav-border-radius)',
                        ...(isActive && !isDisabled
                          ? {
                              backgroundColor: 'var(--sidebar-nav-bg-active)',
                              color: 'var(--sidebar-nav-text-active)',
                            }
                          : {})
                      }}
                      onClick={(e) => {
                        if (!isDisabled) {
                          handleNavigate(item.path, item.title, e);
                        } else {
                          e.preventDefault();
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive && !isDisabled) {
                          const target = e.currentTarget;
                          target.style.backgroundColor = 'var(--sidebar-nav-bg-hover)';
                          target.style.transform = 'translateX(2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive && !isDisabled) {
                          const target = e.currentTarget;
                          target.style.backgroundColor = 'transparent';
                          target.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      {/* Ripple effect on click */}
                      {isClicked && (
                        <div
                          className="absolute inset-0 rounded-[var(--sidebar-nav-border-radius)] bg-[var(--sidebar-icon-active)] opacity-20 animate-ping"
                          style={{ animationDuration: '600ms', animationIterationCount: '1' }}
                        />
                      )}

                      <div className="relative flex items-center gap-3 z-10">
                        <div className={`transition-all duration-300 ${
                          isActive && !isDisabled ? 'scale-110' : isClicked ? 'scale-95' : 'scale-100'
                        }`}>
                          <Icon
                            size={18}
                            weight={isActive && !isDisabled ? 'fill' : 'regular'}
                            className={`transition-all duration-300 ${
                              isDisabled
                                ? 'opacity-50 group-hover/item:opacity-0'
                                : isActive
                                ? 'text-[var(--sidebar-icon-active)] [&:hover]:text-[var(--sidebar-icon-active)]'
                                : 'text-[var(--sidebar-icon-default)] group-hover/item:text-[var(--sidebar-icon-hover)] group-hover/item:scale-125'
                            }`}
                            style={isActive && !isDisabled ? { color: 'var(--sidebar-icon-active)' } : {}}
                          />
                        </div>
                        {isDisabled && (
                          <Lock
                            size={18}
                            weight="regular"
                            className="absolute left-0 opacity-0 group-hover/item:opacity-100 transition-all duration-200 text-[var(--sidebar-icon-default)]"
                          />
                        )}
                        {!isCollapsed && (
                          <span className={`font-inter font-normal tracking-tight transition-all duration-300 whitespace-nowrap group-hover/item:scale-105 origin-left ${
                            isActive ? 'font-medium' : ''
                          }`}>
                            {item.title}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 pb-4 transition-all duration-300">
        {!isCollapsed ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* User Profile Section */}
            <div className="flex items-center justify-between p-3 rounded-xl group hover:bg-[var(--sidebar-user-hover-bg)] transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-9 w-9 ring-2 ring-[var(--sidebar-user-avatar-bg)] transition-all duration-300 group-hover:ring-4 group-hover:scale-105">
                  <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-sm font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-inter font-medium text-[var(--sidebar-user-text)] truncate transition-all duration-200">
                    {userDisplayName}
                  </p>
                  <p className="text-xs font-inter text-[var(--sidebar-user-subtitle)] truncate transition-all duration-200">
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
                    className="h-8 w-8 p-0 text-[var(--sidebar-user-text)] hover:text-[var(--sidebar-user-text)] hover:bg-[var(--sidebar-user-hover-bg)] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95"
                  >
                    <DotsThree size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-destructive hover:bg-[var(--sidebar-nav-bg-hover)] cursor-pointer transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in zoom-in-50 duration-300">
            {/* User Avatar Collapsed */}
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-0 rounded-xl hover:bg-[var(--sidebar-user-hover-bg)] transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-[var(--sidebar-user-avatar-bg)] transition-all duration-300 hover:ring-4">
                      <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 border-b">
                    <p className="text-sm font-inter font-medium text-text-primary">
                      {userDisplayName}
                    </p>
                    <p className="text-xs font-inter text-text-muted">
                      {effectiveRole}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-destructive hover:bg-[var(--sidebar-nav-bg-hover)] cursor-pointer mt-1 transition-all duration-200"
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