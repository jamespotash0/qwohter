import { Clock, Check, ChevronDown, LogOut } from "lucide-react";
import { House, FileText, ChartBar, Gear, Kanban, Sidebar as SidebarIcon, Lock, SquaresFour, Article, Buildings, AddressBook, CheckSquare, CaretDown } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
// import { Card, CardContent } from "@/components/ui/card";
import { QwohterLogo } from "@/components/common/QwohterLogo";
import { useCurrentOrganization, useOrganizationMembers } from "@/hooks/queries/useOrganization";
import { useUser, useProfile, useAuthStatus, useSignOut } from "@/auth";
import { stripeService } from "@/services/stripeService";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";

interface AppSidebarProps {
  user: string;
  onLogout: () => void;
}

interface SubMenuItem {
  title: string;
  path: string;
  icon?: React.ComponentType<{ size?: number; weight?: 'regular' | 'fill'; className?: string }>;
}

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'fill'; className?: string }>;
  path: string;
  roles: string[];
  disabled?: boolean;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: House,
    path: "/dashboard",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Board",
    icon: Kanban,
    path: "/board",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
    subItems: [
      { title: "Task Board", path: "/task-board", icon: CheckSquare },
      { title: "Project Board", path: "/board", icon: Kanban },
    ],
  },
  {
    title: "Proposals",
    icon: FileText,
    path: "/quotes",
    roles: ['Owner', 'Admin', 'Member'], // Available to all
  },
  {
    title: "Contacts",
    icon: AddressBook,
    path: "/contacts",
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

interface UserOrganization {
  id: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Member';
  logo_data?: {
    logo_url?: string;
    logo_public_url?: string;
  } | null;
}

export function AppSidebar({
  onLogout
}: AppSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const previousPathRef = useRef<string>('');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  // Toggle expanded state for menu items with subItems
  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Use React Query hooks for organization data
  const user = useUser();
  const { data: userProfile } = useProfile(user?.id);
  const { isInitialized: isAuthInitialized } = useAuthStatus();
  const { isPending: isLoggingOut } = useSignOut();

  // Get current organization and role from React Query
  const { organization: currentOrganization, role: currentUserRole } = useCurrentOrganization(user?.id || '');
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id || '', !!currentOrganization?.id); 

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

  // Get current user's department from members (will be available after members load)
  const currentMember = members.find(m => m.user_id === user?.id);
  const userDepartment = currentMember?.department;

  // Display department if available, otherwise show role
  const displayText = userDepartment || effectiveRole;

  // Wait for members to load before showing profile (prevents role→department flip)
  const hasMembersData = members.length > 0;
  const shouldShowProfile = isAuthInitialized && hasMembersData;

  // Debug: Log render state
  console.log('[AppSidebar Footer] Render state:', {
    isAuthInitialized,
    hasMembersData,
    shouldShowProfile,
    user: !!user,
    userProfile: !!userProfile,
    currentOrganization: !!currentOrganization,
    membersCount: members.length,
    displayText,
  });

  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  // Track path changes for animations
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      // Reset clicked item after navigation completes
      timer = setTimeout(() => setClickedItem(null), 500);
    }
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [location.pathname]);

  // Fetch all user organizations on mount
  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!user?.id) return;

      setIsLoadingOrgs(true);
      try {
        const { data, error } = await supabase
          .from('memberships')
          .select(`
            role,
            organizations (
              id,
              name,
              logo_data
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'Active'); //membership_status

        if (error) throw error;

        const orgs = data
          ?.filter((m: any) => m.organizations)
          .map((m: any) => ({
            id: m.organizations.id,
            name: m.organizations.name,
            role: m.role as 'Owner' | 'Admin' | 'Member',
            logo_data: m.organizations.logo_data,
          })) || [];

        setUserOrganizations(orgs);
      } catch (error) {
        console.error('Failed to fetch user organizations:', error);
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    fetchUserOrganizations();
  }, [user?.id]);

  // Check for trial status
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!currentOrganization?.id) return;

      const { data: subscription } = await stripeService.getSubscription(currentOrganization.id);

      const status = subscription?.stripe_subscription_status?.toLowerCase();
      if (status === 'trialing' && subscription?.current_period_end) {
        const daysLeft = stripeService.getDaysRemaining(subscription.current_period_end);
        setTrialDaysRemaining(daysLeft);
      } else {
        setTrialDaysRemaining(null);
      }
    };

    checkTrialStatus();
  }, [currentOrganization?.id]);

  const handleNavigate = (path: string, title: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setClickedItem(title);
    navigate(path);
  };

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return;

    try {
      // Fetch the full organization data with the selected org
      const { data: membershipData, error } = await supabase
        .from('memberships')
        .select(`
          role,
          joined_at,
          organizations (
            id,
            name,
            created_at,
            updated_at,
            phone_number,
            fax_number,
            company_address,
            website,
            industry,
            found_via,
            quote_start_number,
            logo_data
          )
        `)
        .eq('user_id', user?.id)
        .eq('organization_id', orgId)
        .eq('status', 'Active') //membership_status
        .single();

      if (error) throw error;

      if (membershipData?.organizations) {
        // Refresh the page to reload all organization-specific data with the new organization
        // React Query will automatically fetch the new organization data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  return (
    <Sidebar
      className="bg-sidebar-bg transition-all duration-200 ease-in-out"
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Logo and Collapse Toggle */}
      <SidebarHeader className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'px-0 pt-5 pb-0' : 'pl-5 pr-5 pt-6 pb-1'}`}>
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
      <SidebarContent className={`px-2 ${isCollapsed ? 'pt-2' : 'pt-2'} pb-6 flex-1 transition-all duration-300`}>
        <SidebarGroup>
          {/* Organization Switcher */}
          {!isCollapsed ? (
            <div className="mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-[6px] py-1 group focus:outline-none focus-visible:outline-none hover:opacity-80 transition-opacity max-w-[182px]">
                    <Buildings size={16} weight="fill" className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate min-w-0 flex-1">
                      {currentOrganization?.name || 'Select Organization'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-[var(--sidebar-section-label)] uppercase tracking-wide">
                      Organizations
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {isLoadingOrgs ? (
                    <div className="px-2 py-2 text-sm text-[var(--sidebar-section-label)]">
                      Loading...
                    </div>
                  ) : (
                    <>
                      {userOrganizations.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => handleSwitchOrganization(org.id)}
                          className="flex items-center justify-between cursor-pointer py-2"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sidebar-nav-bg-hover)' }}>
                              <Buildings size={14} weight="fill" className="text-orange-800 dark:text-orange-700" />
                            </div>
                            <p className="text-sm font-medium truncate">{org.name}</p>
                          </div>
                          {org.id === currentOrganization?.id && (
                            <Check className="h-4 w-4 text-[var(--sidebar-icon-active)] flex-shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="mb-4 flex justify-center animate-in fade-in zoom-in-50 duration-300">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-0 rounded-lg transition-all duration-200 focus:outline-none focus-visible:outline-none" style={{ backgroundColor: 'transparent' }}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--sidebar-nav-bg-hover)' }}>
                      <Buildings size={18} weight="fill" className="text-orange-800 dark:text-orange-700" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-[var(--sidebar-section-label)] uppercase tracking-wide">
                      Organizations
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {isLoadingOrgs ? (
                    <div className="px-2 py-2 text-sm text-[var(--sidebar-section-label)]">
                      Loading...
                    </div>
                  ) : (
                    <>
                      {userOrganizations.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => handleSwitchOrganization(org.id)}
                          className="flex items-center justify-between cursor-pointer py-2"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sidebar-nav-bg-hover)' }}>
                              <Buildings size={14} weight="fill" className="text-orange-800 dark:text-orange-700" />
                            </div>
                            <p className="text-sm font-medium truncate">{org.name}</p>
                          </div>
                          {org.id === currentOrganization?.id && (
                            <Check className="h-4 w-4 text-[var(--sidebar-icon-active)] flex-shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {!isCollapsed && (
            <div className="flex justify-center mb-2">
              <div className="w-[95%] h-px bg-gray-200 dark:bg-gray-700" />
            </div>
          )}

          <SidebarGroupContent>
            <SidebarMenu className={`space-y-0 ${isCollapsed ? 'space-y-1' : 'space-y-0'}`}>
              {menuItems
                .filter(item => !currentUserRole || item.roles.includes(currentUserRole))
                .map((item, index) => {
                const isActive = location.pathname === item.path ||
                  (item.subItems?.some(sub => location.pathname === sub.path) ?? false);
                const Icon = item.icon;
                const isDisabled = item.disabled || false;
                const hasSubItems = item.subItems && item.subItems.length > 0;

                const isClicked = clickedItem === item.title;

                // Render expandable menu for items with subItems
                // Option 4: Click navigates to default path, separate caret toggles expand
                if (hasSubItems) {
                  const isExpanded = expandedItems.includes(item.title);

                  return (
                    <div key={item.title}>
                      <SidebarMenuItem
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
                        {/* Split button: main area navigates, caret toggles expand */}
                        <div
                          className={`h-10 flex items-center relative group/item overflow-hidden ${
                            isCollapsed ? 'justify-center w-full px-0' : 'ml-[-2px] mr-[-10px] pl-[8px] pr-[2px]'
                          } ${
                            isActive
                              ? 'text-[var(--sidebar-nav-text-active)] shadow-sm scale-[1.01]'
                              : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)]'
                          } transition-all duration-300 ease-out`}
                          style={{
                            borderRadius: 'var(--sidebar-nav-border-radius)',
                            ...(isActive
                              ? {
                                  backgroundColor: 'var(--sidebar-nav-bg-active)',
                                  color: 'var(--sidebar-nav-text-active)',
                                }
                              : {})
                          }}
                        >
                          {/* Main clickable area - navigates to default path */}
                          <button
                            className="flex items-center gap-3 flex-1 h-full cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => handleNavigate(item.path, item.title, e)}
                          >
                            <div className={`transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                              <Icon
                                size={18}
                                weight={isActive ? 'fill' : 'regular'}
                                className={`transition-all duration-300 ${
                                  isActive
                                    ? 'text-[var(--sidebar-icon-active)]'
                                    : 'text-[var(--sidebar-icon-default)] group-hover/item:text-[var(--sidebar-icon-hover)]'
                                }`}
                              />
                            </div>
                            {!isCollapsed && (
                              <span className={`font-inter font-normal tracking-tight transition-all duration-300 whitespace-nowrap ${
                                isActive ? 'font-medium' : ''
                              }`}>
                                {item.title}
                              </span>
                            )}
                          </button>

                          {/* Separate caret button - toggles expand */}
                          {!isCollapsed && (
                            <button
                              className="h-full px-2.5 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(item.title);
                              }}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <CaretDown
                                size={14}
                                weight="bold"
                                className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                      </SidebarMenuItem>

                      {/* Expandable sub-items */}
                      {!isCollapsed && isExpanded && (
                        <div className="ml-6 mt-1 space-y-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
                          {item.subItems?.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = location.pathname === subItem.path;
                            return (
                              <SidebarMenuItem key={subItem.path}>
                                <SidebarMenuButton
                                  className={`h-9 flex items-center pl-2 pr-3 group/subitem ${
                                    isSubActive
                                      ? 'text-[var(--sidebar-nav-text-active)] bg-[var(--sidebar-nav-bg-active)]'
                                      : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)]'
                                  } transition-all duration-200`}
                                  style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
                                  onClick={(e) => handleNavigate(subItem.path, subItem.title, e)}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {SubIcon && (
                                      <SubIcon
                                        size={16}
                                        weight={isSubActive ? 'fill' : 'regular'}
                                        className={`transition-all duration-200 ${
                                          isSubActive
                                            ? 'text-[var(--sidebar-icon-active)]'
                                            : 'text-[var(--sidebar-icon-default)] group-hover/subitem:text-[var(--sidebar-icon-hover)]'
                                        }`}
                                      />
                                    )}
                                    <span className={`text-sm ${isSubActive ? 'font-medium' : ''}`}>
                                      {subItem.title}
                                    </span>
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </div>
                      )}

                      {/* Collapsed view - show dropdown on click */}
                      {isCollapsed && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="absolute inset-0 cursor-pointer" style={{ marginTop: '-40px' }} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-[180px]">
                            {item.subItems?.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = location.pathname === subItem.path;
                              return (
                                <DropdownMenuItem
                                  key={subItem.path}
                                  onClick={() => handleNavigate(subItem.path, subItem.title)}
                                  className={`cursor-pointer ${isSubActive ? 'bg-gray-100' : ''}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {SubIcon && <SubIcon size={16} weight={isSubActive ? 'fill' : 'regular'} />}
                                    <span className={isSubActive ? 'font-medium' : ''}>{subItem.title}</span>
                                  </div>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                }

                // Regular menu item (no subItems)
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
                      className={`h-10 flex items-center relative group/item overflow-hidden ${
                        isCollapsed ? 'justify-center w-full px-0' : 'ml-[-2px] mr-[-10px] pl-[8px] pr-[13px]'
                      } ${
                        isDisabled
                          ? 'text-[var(--sidebar-nav-text)] opacity-50 cursor-not-allowed'
                          : isActive
                          ? 'text-[var(--sidebar-nav-text-active)] shadow-sm [&:hover]:text-[var(--sidebar-nav-text-active)] scale-[1.01]'
                          : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:scale-[1.02] active:scale-[0.98]'
                      } transition-all duration-300 ease-out`}
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

      {/* Trial Banner - positioned above profile, below navigation */}
      {trialDaysRemaining !== null && !isCollapsed && (
        <div className="px-4 pb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-gradient-to-r from-[#EE6C4D] to-orange-600 rounded-lg p-3 text-white shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">Free Trial</span>
            </div>
            <p className="text-xs opacity-90">
              {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
            </p>
            <Button
              onClick={() => navigate('/settings?tab=billing&upgrade=true')}
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      <SidebarFooter className="pl-2 pr-5 pb-4 pt-2 transition-all duration-300">
        {!isLoggingOut && (
          <>
            {!shouldShowProfile ? (
              // Loading skeleton while waiting for auth and members to load
              !isCollapsed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center p-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              )
            ) : !isCollapsed ? (
              <div className="space-y-3 animate-in fade-in duration-300 delay-150">
              {/* User Profile Section */}
                <div className="flex items-center justify-between pl-3 pr-0 py-3 rounded-xl group transition-all duration-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-9 w-9 ring-2 ring-[var(--sidebar-user-avatar-bg)] transition-all duration-300">
                      <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-sm font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-inter font-medium text-[var(--sidebar-user-text)] truncate transition-all duration-200">
                        {userDisplayName}
                      </p>
                      <p className="text-xs font-inter text-[var(--sidebar-user-subtitle)] truncate transition-all duration-200">
                        {displayText}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="h-8 w-8 p-0 rounded-lg transition-all duration-200 group/logout"
                    style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--sidebar-nav-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4 text-red-600 dark:text-red-400 group-hover/logout:scale-110 transition-all duration-200" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative flex justify-center items-center h-12 animate-in fade-in zoom-in-50 duration-300">
                {/* User Avatar Collapsed - Visible by default, hidden on hover */}
                <div className={`transition-all duration-200 ease-in-out ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                  <Avatar className="h-8 w-8 ring-2 ring-[var(--sidebar-user-avatar-bg)]">
                    <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {/* Logout Button Collapsed - Visible on hover, replaces avatar */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="h-8 w-8 p-0 rounded-lg transition-all duration-200 group/logout"
                    style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--sidebar-nav-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4 text-red-600 dark:text-red-400 group-hover/logout:scale-110 transition-all duration-200" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}