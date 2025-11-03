import { Clock, Check, ChevronDown, LogOut } from "lucide-react";
import { House, FileText, ChartBar, Users, List, Gear, Kanban, Sidebar as SidebarIcon, Lock, SquaresFour, Article, Buildings } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
// import { Card, CardContent } from "@/components/ui/card";
import { QwohterLogo } from "@/components/common/QwohterLogo";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";
import { stripeService } from "@/services/stripeService";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { TrialProgressRing } from "@/components/trial/TrialProgressRing";

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

interface UserOrganization {
  id: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Member';
}

export function AppSidebar({
  onLogout
}: AppSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const previousPathRef = useRef<string>('');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState<number>(0);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  // Use Zustand stores directly - they're already cached and won't cause re-fetches
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.profile);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const currentUserRole = useOrganizationStore((state) => state.currentUserRole);
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const members = useOrganizationStore((state) => state.members);
  const setOrganization = useOrganizationStore((state) => state.setOrganization);
  const setCurrentUserRole = useOrganizationStore((state) => state.setCurrentUserRole); 

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
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      // Reset clicked item after navigation completes
      const timer = setTimeout(() => setClickedItem(null), 500);
      return () => clearTimeout(timer);
    }
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
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'Active');

        if (error) throw error;

        const orgs = data
          ?.filter((m: any) => m.organizations)
          .map((m: any) => ({
            id: m.organizations.id,
            name: m.organizations.name,
            role: m.role as 'Owner' | 'Admin' | 'Member',
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

  // Check for trial status and grace period
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!currentOrganization?.id) return;

      const { data: subscription } = await stripeService.getSubscription(currentOrganization.id);

      const status = subscription?.stripe_subscription_status?.toLowerCase();
      if (status === 'trialing' && subscription?.trial_end) {
        const trialEndDate = new Date(subscription.trial_end);
        const now = new Date();
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft >= 0) {
          // Active trial
          setTrialDaysRemaining(daysLeft);
          setInGracePeriod(false);
          setGraceDaysRemaining(0);
        } else if (!subscription.has_payment_method) {
          // Trial expired, check grace period (3 days)
          const gracePeriodEnd = new Date(trialEndDate.getTime() + (3 * 24 * 60 * 60 * 1000));
          const graceDays = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (graceDays > 0) {
            // In grace period
            setTrialDaysRemaining(null);
            setInGracePeriod(true);
            setGraceDaysRemaining(graceDays);
          } else {
            // Grace period expired
            setTrialDaysRemaining(null);
            setInGracePeriod(false);
            setGraceDaysRemaining(0);
          }
        } else {
          // Has payment method
          setTrialDaysRemaining(null);
          setInGracePeriod(false);
          setGraceDaysRemaining(0);
        }
      } else {
        setTrialDaysRemaining(null);
        setInGracePeriod(false);
        setGraceDaysRemaining(0);
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
            organization_code,
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
        .eq('status', 'Active')
        .single();

      if (error) throw error;

      if (membershipData?.organizations) {
        const org = membershipData.organizations as any;
        const role = membershipData.role as 'Owner' | 'Admin' | 'Member';

        // Update organization store
        setOrganization(org);
        setCurrentUserRole(role);

        // Refresh the page to reload all organization-specific data
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
      <SidebarHeader className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'px-0 pt-5 pb-0' : 'px-4 pt-6 pb-1 pl-6'}`}>
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

      {/* Enhanced Trial Banner with Progress Ring */}
      {(trialDaysRemaining !== null || inGracePeriod) && !isCollapsed && (
        <div className="px-4 pt-3 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`rounded-lg p-4 text-white shadow-lg ${
            inGracePeriod
              ? 'bg-gradient-to-r from-red-700 via-red-600 to-pink-700 animate-pulse'
              : trialDaysRemaining !== null && trialDaysRemaining <= 3
              ? 'bg-gradient-to-r from-red-600 to-pink-600'
              : trialDaysRemaining !== null && trialDaysRemaining <= 7
              ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
              : 'bg-gradient-to-r from-emerald-600 to-green-600'
          } ${trialDaysRemaining !== null && trialDaysRemaining <= 3 ? 'animate-pulse' : ''}`}>
            <div className="flex items-start gap-3">
              {/* Progress Ring or Grace Period Display */}
              <div className="flex-shrink-0">
                {inGracePeriod ? (
                  <div className="w-[50px] h-[50px] flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-white">
                      {graceDaysRemaining}
                    </div>
                  </div>
                ) : (
                  <TrialProgressRing
                    daysRemaining={trialDaysRemaining || 0}
                    size={50}
                    strokeWidth={4}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold">
                    {inGracePeriod ? 'GRACE PERIOD' : 'Free Trial'}
                  </span>
                  {(inGracePeriod || (trialDaysRemaining !== null && trialDaysRemaining <= 3)) && (
                    <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded font-semibold">
                      {inGracePeriod ? 'URGENT!' : trialDaysRemaining !== null && trialDaysRemaining <= 1 ? 'URGENT' : 'ENDING SOON'}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium opacity-95 mb-2">
                  {inGracePeriod
                    ? `${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'day' : 'days'} until access ends`
                    : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} left`
                  }
                </p>
                {!inGracePeriod && trialDaysRemaining !== null && (
                  <div className="text-xs opacity-90 mb-1">
                    {Math.round((trialDaysRemaining / 14) * 100)}% of trial remaining
                  </div>
                )}
                {inGracePeriod && (
                  <div className="text-xs opacity-95 font-semibold">
                    Trial expired - Add payment NOW!
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => navigate('/settings?tab=billing')}
              variant="ghost"
              size="sm"
              className="w-full mt-3 h-8 text-xs bg-white/25 hover:bg-white/40 text-white border-0 font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {inGracePeriod ? 'Add Payment NOW' : trialDaysRemaining !== null && trialDaysRemaining <= 3 ? 'Add Payment Now' : 'Add Payment Method'}
            </Button>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <SidebarContent className={`px-2 ${isCollapsed ? 'pt-2' : 'pt-4'} pb-6 flex-1 transition-all duration-300`}>
        <SidebarGroup>
          {/* Organization Switcher */}
          {!isCollapsed ? (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-full h-11 px-3 flex items-center justify-between gap-3 shadow-sm transition-colors group focus:outline-none focus-visible:outline-none bg-gray-50 dark:bg-gray-800"
                    style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--sidebar-nav-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      const isDark = document.documentElement.classList.contains('dark');
                      e.currentTarget.style.backgroundColor = isDark ? 'rgb(31, 41, 55)' : 'rgb(249, 250, 251)';
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sidebar-nav-bg-hover)' }}>
                        <Buildings size={16} weight="fill" className="text-orange-800 dark:text-orange-700" />
                      </div>
                      <p
                        className={`font-medium text-gray-900 dark:text-gray-100 flex-1 text-left leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                          (currentOrganization?.name || '').length > 25 ? 'text-[10px]' :
                          (currentOrganization?.name || '').length > 20 ? 'text-[11px]' :
                          (currentOrganization?.name || '').length > 15 ? 'text-xs' : 'text-sm'
                        }`}
                      >
                        {currentOrganization?.name || 'Select Organization'}
                      </p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
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

          <div
            className={`px-0 pl-0 mb-2 flex items-center transition-all duration-300 ${
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

      <SidebarFooter className="p-2 pb-4 transition-all duration-300">
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
                <div className="flex items-center justify-between p-3 rounded-xl group transition-all duration-200">
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