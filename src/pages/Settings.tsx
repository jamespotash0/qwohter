import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { User as UserIcon, Building, Shield, CreditCard, Palette, Users } from "lucide-react";
import { useCurrentOrganization, useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";
import { ProfileTab } from "@/components/features/settings/ProfileTab";
import { OrganizationTab } from "@/components/features/settings/OrganizationTab";
import { SecurityTab } from "@/components/features/settings/SecurityTab";
import { BillingTab } from "@/components/features/settings/BillingTab";
import { AppearanceTab } from "@/components/features/settings/AppearanceTab";
import { TeamTab } from "@/components/features/settings/TeamTab";
import { canAccessSettingsTab } from "@/utils/permissions";
import { stripeService } from "@/services/stripeService";
import { supabase } from "@/integrations/supabase/client";

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

  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const organization = useCurrentOrganization();
  const refetchOrganization = useOrganizationStore((state) => state.fetchOrganization);
  const userRole = useOrganizationStore((state) => state.currentUserRole);

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

    // Set up realtime subscription to detect subscription changes
    if (organization?.id) {
      const channel = supabase
        .channel(`settings-subscription-${organization.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `organization_id=eq.${organization.id}`,
          },
          async () => {
            console.log('Subscription changed in settings, rechecking access');
            // Re-check and update cache
            const { isValid } = await stripeService.hasValidSubscription(organization.id);
            setHasValidSubscription(isValid);
            try {
              localStorage.setItem('settings_subscription_valid', JSON.stringify(isValid));
            } catch (e) {
              console.error('Failed to cache subscription status:', e);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    return undefined;
  }, [organization?.id]);

  // Sync activeTab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Don't show loading spinner - organization and role should be cached
  // If they're not available, show settings anyway with default values

  // Memoize tabs to prevent recreation on every render
  const availableTabs = useMemo(() => {
    const allTabs = [
      {
        id: "profile",
        label: "Account",
        icon: <UserIcon className="w-4 h-4" />,
        component: <ProfileTab user={user as any} profile={profile} userRole={userRole || 'Member'} />,
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
        id: "team",
        label: "Team",
        icon: <Users className="w-4 h-4" />,
        component: <TeamTab />,
        requiresPermission: "team",
        requiresSubscription: true
      },
      {
        id: "security",
        label: "Security & Permissions",
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
  }, [activeTab, availableTabs]);

  const handleTabChange = (tabId: string) => {
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
              ref={(el) => (tabRefs.current[tab.id] = el)}
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
