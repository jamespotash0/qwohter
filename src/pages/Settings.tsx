import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
import { CrewsTab } from "@/components/features/settings/CrewsTab";
import { PaymentsTab } from "@/components/features/settings/PaymentsTab";
import { useAvailableSettingsTabs } from "@/components/features/settings/settingsTabs";

/**
 * Settings page — content only.
 *
 * The section list lives in the secondary sidebar, which MainLayout renders
 * outside this page so it can sit flush against the main app sidebar. The two
 * agree on the visible sections via `useAvailableSettingsTabs`.
 */
const Settings = () => {
  const [searchParams] = useSearchParams();
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

  const availableTabs = useAvailableSettingsTabs();
  const requestedTab = searchParams.get('tab') || 'profile';

  // Fall back to the first reachable section if the URL names one this user
  // cannot see (revoked permission, lapsed subscription, stale bookmark)
  const activeTab = availableTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : availableTabs[0]?.id;

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <ProfileTab user={user as any} profile={profile} />;
      case 'notifications':
        return (
          <NotificationsTab
            userId={user?.id}
            organizationId={organization?.id}
            userEmail={profile?.email}
            userRole={userRole || 'Member'}
          />
        );
      case 'appearance':
        return <AppearanceTab />;
      case 'organization':
        return (
          <OrganizationTab
            organization={organization}
            userRole={userRole || 'Member'}
            onOrganizationUpdate={refetchOrganization}
          />
        );
      case 'team':
        return <TeamTab />;
      case 'security':
        return (
          <SecurityTab
            organization={organization}
            userRole={userRole || 'Member'}
            onOrganizationUpdate={refetchOrganization}
          />
        );
      case 'integrations':
        return (
          <IntegrationsTab
            organization={organization}
            userRole={userRole || 'Member'}
            onOrganizationUpdate={refetchOrganization}
          />
        );
      case 'crews':
        // The dealer's own install crews — the cost side of self-performed work,
        // and a prerequisite for scheduling anything.
        return <CrewsTab organizationId={organization?.id} />;
      case 'payments':
        return (
          <PaymentsTab
            organization={organization}
            userRole={userRole || 'Member'}
            onOrganizationUpdate={refetchOrganization}
          />
        );
      case 'billing':
        return <BillingTab organization={organization} userRole={userRole || 'Member'} />;
      default:
        return null;
    }
  };

  return <div>{renderTab()}</div>;
};

export default Settings;
