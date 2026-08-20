import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { User as UserIcon, Building, Shield, CreditCard, Palette, Users, Plug, Bell, Banknote, Truck } from "lucide-react";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser, useProfile } from "@/auth";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { ProfileTab } from "@/components/features/settings/ProfileTab";
import { OrganizationTab } from "@/components/features/settings/OrganizationTab";
import { SecurityTab } from "@/components/features/settings/SecurityTab";
import { BillingTab } from "@/components/features/settings/BillingTab";
import { AppearanceTab } from "@/components/features/settings/AppearanceTab";
import { TeamTab } from "@/components/features/settings/TeamTab";
import { IntegrationsTab } from "@/components/features/settings/IntegrationsTab";
import { NotificationsTab } from "@/components/features/settings/NotificationsTab";
import { PaymentsTab } from "@/components/features/settings/PaymentsTab";
import { VendorsTab } from "@/components/features/settings/VendorsTab";
import { canAccessSettingsTab } from "@/utils/permissions";
import { stripeService } from "@/services/stripeService";
import { useRealtimeSubscription } from "@/lib/realtimeSubscriptions";
import { trackEvent } from "@/lib/analytics";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Initialize hasValidSubscription from localStorage to prevent flicker
  const [hasValidSubscription, setHasValidSubscription] = useState(() => {
    try {
      const cached = localStorage.getItem('settings_subscription_valid');
      return cached ? JSON.parse(cached) : true; // Default to true to show tabs initially
    } catch {
      return true;
    }
  });

  const user = useUser();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();

  // Get current organization and role from React Query
  const { organization, role: userRole } = useCurrentOrganization(user?.id || '');

  // Function to refetch organization data (memoized to prevent recreating on every render)
  const refetchOrganization = useCallback(async (userId?: string, forceRefresh?: boolean) => {
    const targetUserId = userId || user?.id;
    if (targetUserId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.organization.byUser(targetUserId) });
      if (forceRefresh) {
        await queryClient.refetchQueries({ queryKey: queryKeys.organization.byUser(targetUserId) });
      }
    }
  }, [user?.id, queryClient]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!organization?.id) return;

      // Always fetch fresh to ensure we have current status
      const { isValid } = await stripeService.hasValidSubscription(organization.id);
      setHasValidSubscription(isValid);

      // Cache the result in localStorage
      try {
        localStorage.setItem('settings_subscription_valid', JSON.stringify(isValid));
      } catch (e) {
        console.error('Failed to cache subscription status:', e);
      }

      console.log('Settings page: subscription valid =', isValid);
    };

    checkSubscription();
  }, [organization?.id]);

  // Set up centralized realtime subscription for subscriptions table
  useRealtimeSubscription(
    'subscriptions',
    ['subscriptions', organization?.id || ''],
    { filter: `organization_id=eq.${organization?.id}` },
    !!organization?.id
  );

  // Watch for subscription changes via query invalidation
  useEffect(() => {
    if (!organization?.id) return;

    // When queries are invalidated by real-time, re-check subscription
    const recheckSubscription = async () => {
      console.log('Subscription changed in settings, rechecking access');
      const { isValid } = await stripeService.hasValidSubscription(organization.id);
      setHasValidSubscription(isValid);
      try {
        localStorage.setItem('settings_subscription_valid', JSON.stringify(isValid));
      } catch (e) {
        console.error('Failed to cache subscription status:', e);
      }
    };

    // Listen for query invalidations
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === 'subscriptions' && event?.query.queryKey[1] === organization.id) {
        recheckSubscription();
      }
    });

    return unsubscribe;
  }, [organization?.id, queryClient]);

  // Sync activeTab with URL (only when URL changes, not when activeTab changes)
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]); // Removed activeTab from dependencies to prevent infinite loop

  // Don't show loading spinner - organization and role should be cached
  // If they're not available, show settings anyway with default values

  // Memoize tabs to prevent recreation on every render
  const availableTabs = useMemo(() => {
    const allTabs = [
      {
        id: "profile",
        label: "Account",
        icon: <UserIcon className="w-4 h-4" />,
        component: <ProfileTab user={user as any} profile={profile} />,
        alwaysAvailable: true
      },
      {
        id: "organization",
        label: "Organization",
        icon: <Building className="w-4 h-4" />,
        component: <OrganizationTab
          organization={organization}
          userRole={userRole || 'Member'}
          onOrganizationUpdate={refetchOrganization}
        />,
        requiresPermission: "organization",
        requiresSubscription: true
      },
      {
        id: "team",
        label: "Team",
        icon: <Users className="w-4 h-4" />,
        component: <TeamTab />,
        requiresPermission: "team",
        requiresSubscription: true
      },
      {
        // The buy side: who the dealer purchases from, and the discount
        // agreements that turn a manufacturer list price into dealer cost.
        id: "vendors",
        label: "Vendors",
        icon: <Truck className="w-4 h-4" />,
        component: <VendorsTab organizationId={organization?.id} />,
        requiresPermission: "vendors",
        requiresSubscription: true
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: <Bell className="w-4 h-4" />,
        component: <NotificationsTab userId={user?.id} organizationId={organization?.id} userEmail={profile?.email} userRole={userRole || 'Member'} />,
        alwaysAvailable: true
      },
      {
        id: "integrations",
        label: "Integrations",
        icon: <Plug className="w-4 h-4" />,
        component: <IntegrationsTab
          organization={organization}
          userRole={userRole || 'Member'}
          onOrganizationUpdate={refetchOrganization}
        />,
        requiresPermission: "organization",
        requiresSubscription: true
      },
      {
        id: "payments",
        label: "Payments",
        icon: <Banknote className="w-4 h-4" />,
        component: <PaymentsTab
          organization={organization}
          userRole={userRole || 'Member'}
          onOrganizationUpdate={refetchOrganization}
        />,
        requiresPermission: "payments",
        requiresSubscription: true
      },
      {
        id: "billing",
        label: "Plan & Billing",
        icon: <CreditCard className="w-4 h-4" />,
        component: <BillingTab
          organization={organization}
          userRole={userRole || 'Member'}
        />,
        requiresPermission: "billing",
        alwaysAvailable: true
      },
      {
        id: "security",
        label: "Permissions",
        icon: <Shield className="w-4 h-4" />,
        component: <SecurityTab
          organization={organization}
          userRole={userRole || 'Member'}
          onOrganizationUpdate={refetchOrganization}
        />,
        requiresPermission: "security",
        requiresSubscription: true
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: <Palette className="w-4 h-4" />,
        component: <AppearanceTab />,
        alwaysAvailable: true
      }
    ];

    return allTabs.filter(tab => {
      // Check permission first
      if (tab.requiresPermission && !canAccessSettingsTab(tab.requiresPermission, userRole || 'Member')) {
        return false;
      }

      // If tab requires subscription and user doesn't have valid subscription, hide it
      if (tab.requiresSubscription && !hasValidSubscription) {
        return false;
      }

      return true;
    });
  }, [user, organization, userRole, profile, refetchOrganization, hasValidSubscription]);

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeTab]); // Only depend on activeTab - availableTabs not needed

  const handleTabChange = (tabId: string) => {
    trackEvent('settings_tab_viewed', { tab: tabId });
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Manage your account, organization, and preferences</p>
      </div>

      {/* Horizontal Tab Navigation with Background Slider */}
      <div className="mb-8 overflow-x-auto">
        <div className="relative inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5 min-w-max">
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 shadow-sm rounded-md transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              onClick={() => handleTabChange(tab.id)}
              className={`relative z-10 px-6 py-2 text-sm font-medium transition-all duration-200 rounded-md whitespace-nowrap min-w-[140px] text-center ${
                activeTab === tab.id
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div>
        {availableTabs.map((tab) => (
          activeTab === tab.id && (
            <div key={tab.id}>
              {tab.component}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default Settings;
