import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContent } from "@/components/common/layout";
import { User as UserIcon, Building, Key, Shield, CreditCard } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMembership } from "@/hooks/useMembership";
import { useAuthStore } from "@/stores/auth/authStore";
import { ProfileTab } from "@/components/features/settings/ProfileTab";
import { OrganizationTab } from "@/components/features/settings/OrganizationTab";
import { PermissionsTab } from "@/components/features/settings/PermissionsTab";
import { SecurityTab } from "@/components/features/settings/SecurityTab";
import { BillingTab } from "@/components/features/settings/BillingTab";
import { canAccessSettingsTab } from "@/utils/permissions";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const user = useAuthStore((state) => state.user);
  const { organization, fetchOrganization: refetchOrganization } = useOrganizationSettings();
  const { profile } = useUserProfile(user?.id);
  const { currentMembership, loading: membershipLoading } = useMembership();
  const userRole = currentMembership?.role;

  // Wait for membership to load to get correct role
  if (membershipLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading settings...</p>
        </div>
      </div>
    );
  }


  const availableTabs = [
    {
      id: "profile",
      label: "Profile",
      icon: <UserIcon className="w-4 h-4" />,
      component: <ProfileTab user={user} profile={profile} userRole={userRole || 'Member'} />
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
  ].filter(tab => !tab.requiresPermission || canAccessSettingsTab(tab.requiresPermission, userRole || 'Member'));

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
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'text-[var(--sidebar-nav-text-active)] shadow-sm'
                : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)]'
            }`}
            style={{
              borderRadius: 'var(--sidebar-nav-border-radius)',
              ...(activeTab === tab.id
                ? {
                    backgroundColor: 'var(--sidebar-nav-bg-active)',
                  }
                : {})
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'var(--sidebar-nav-bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
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