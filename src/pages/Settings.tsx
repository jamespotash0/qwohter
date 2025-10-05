import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { User as UserIcon, Building, Key, Shield, CreditCard } from "lucide-react";
import { useCurrentOrganization, useOrganizationStore } from "@/stores/organization/organizationStore";
import { useAuthStore } from "@/stores/auth/authStore";
import { ProfileTab } from "@/components/features/settings/ProfileTab";
import { OrganizationTab } from "@/components/features/settings/OrganizationTab";
import { PermissionsTab } from "@/components/features/settings/PermissionsTab";
import { SecurityTab } from "@/components/features/settings/SecurityTab";
import { BillingTab } from "@/components/features/settings/BillingTab";
import { canAccessSettingsTab } from "@/utils/permissions";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Don't show loading spinner - organization and role should be cached
  // If they're not available, show settings anyway with default values

  // Memoize tabs to prevent recreation on every render
  const availableTabs = useMemo(() => [
    {
      id: "profile",
      label: "Profile",
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
      label: "Billing",
      icon: <CreditCard className="w-4 h-4" />,
      component: <BillingTab
        organization={organization}
        userRole={userRole || 'Member'}
      />,
      requiresPermission: "billing"
    },
    {
      id: "security",
      label: "Security",
      icon: <Shield className="w-4 h-4" />,
      component: <SecurityTab
        organization={organization}
        userRole={userRole || 'Member'}
        onOrganizationUpdate={refetchOrganization}
      />,
      requiresPermission: "security"
    },
    {
      id: "permissions",
      label: "Permissions",
      icon: <Key className="w-4 h-4" />,
      component: <PermissionsTab userRole={userRole || 'Member'} />,
      requiresPermission: "permissions"
    }
  ].filter(tab => !tab.requiresPermission || canAccessSettingsTab(tab.requiresPermission, userRole || 'Member')), [user, organization, userRole, profile, refetchOrganization]);

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-[var(--content-card-border)]">
        <h1 className="text-2xl font-bold text-[var(--content-header-text)] mb-1">Settings</h1>
        <p className="text-[var(--content-muted-text)]">Manage your profile, organization, and permissions</p>
      </div>

      {/* Header Navigation Bar */}
      <nav className="flex gap-1 px-6 mb-6">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
              activeTab === tab.id
                ? 'text-[var(--sidebar-nav-text-active)] shadow-sm bg-[var(--sidebar-nav-bg-active)]'
                : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="px-6">
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
