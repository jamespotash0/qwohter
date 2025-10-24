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

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const organization = useCurrentOrganization();
  const refetchOrganization = useOrganizationStore((state) => state.fetchOrganization);
  const userRole = useOrganizationStore((state) => state.currentUserRole);

  // Sync activeTab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Don't show loading spinner - organization and role should be cached
  // If they're not available, show settings anyway with default values

  // Memoize tabs to prevent recreation on every render
  const availableTabs = useMemo(() => [
    {
      id: "profile",
      label: "Account",
      icon: <UserIcon className="w-4 h-4" />,
      component: <ProfileTab user={user as any} profile={profile} userRole={userRole || 'Member'} />
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
      requiresPermission: "organization"
    },
    {
      id: "billing",
      label: "Plans & Billing",
      icon: <CreditCard className="w-4 h-4" />,
      component: <BillingTab
        organization={organization}
        userRole={userRole || 'Member'}
      />,
      requiresPermission: "billing"
    },
    {
      id: "team",
      label: "Team",
      icon: <Users className="w-4 h-4" />,
      component: <TeamTab />,
      requiresPermission: "team"
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
      requiresPermission: "security"
    },
    {
      id: "appearance",
      label: "Appearance & Themes",
      icon: <Palette className="w-4 h-4" />,
      component: <AppearanceTab />
    }
  ].filter(tab => !tab.requiresPermission || canAccessSettingsTab(tab.requiresPermission, userRole || 'Member')), [user, organization, userRole, profile, refetchOrganization]);

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
