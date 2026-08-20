/**
 * Settings tab metadata.
 *
 * Kept apart from the tab components so the secondary sidebar (rendered by
 * MainLayout, outside the page) and the Settings page itself agree on the same
 * filtered list without either owning the other.
 */

import { useMemo, type ReactNode } from "react";
import { User as UserIcon, Users } from "lucide-react";
import { useUser } from "@/auth";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { canAccessSettingsTab } from "@/utils/permissions";
import { useHasValidSubscription } from "@/hooks/useHasValidSubscription";

export interface SettingsTab {
  id: string;
  label: string;
  group: string;
  requiresPermission?: string;
  requiresSubscription?: boolean;
}

export interface SettingsGroup {
  label: string;
  icon: ReactNode;
  tabs: SettingsTab[];
}

const GROUP_MY_ACCOUNT = "My Account";
const GROUP_ORGANIZATION = "Organization";

export const SETTINGS_GROUP_ICONS: Record<string, ReactNode> = {
  [GROUP_MY_ACCOUNT]: <UserIcon className="w-4 h-4" />,
  [GROUP_ORGANIZATION]: <Users className="w-4 h-4" />,
};

const ALL_TABS: SettingsTab[] = [
  { id: "profile", label: "Profile", group: GROUP_MY_ACCOUNT },
  { id: "notifications", label: "Notifications", group: GROUP_MY_ACCOUNT },
  { id: "appearance", label: "Appearance", group: GROUP_MY_ACCOUNT },
  { id: "organization", label: "Organization", group: GROUP_ORGANIZATION, requiresPermission: "organization", requiresSubscription: true },
  { id: "team", label: "Team", group: GROUP_ORGANIZATION, requiresPermission: "team", requiresSubscription: true },
  { id: "security", label: "Permissions", group: GROUP_ORGANIZATION, requiresPermission: "security", requiresSubscription: true },
  { id: "integrations", label: "Integrations", group: GROUP_ORGANIZATION, requiresPermission: "organization", requiresSubscription: true },
  { id: "vendors", label: "Vendors", group: GROUP_ORGANIZATION, requiresPermission: "vendors", requiresSubscription: true },
  { id: "payments", label: "Payments", group: GROUP_ORGANIZATION, requiresPermission: "payments", requiresSubscription: true },
  { id: "billing", label: "Plan & Billing", group: GROUP_ORGANIZATION, requiresPermission: "billing" },
];

/** The tabs this user can actually reach, in display order */
export function useAvailableSettingsTabs(): SettingsTab[] {
  const user = useUser();
  const { role } = useCurrentOrganization(user?.id || "");
  const hasValidSubscription = useHasValidSubscription();

  return useMemo(
    () =>
      ALL_TABS.filter((tab) => {
        if (tab.requiresPermission && !canAccessSettingsTab(tab.requiresPermission, role || "Member")) {
          return false;
        }
        if (tab.requiresSubscription && !hasValidSubscription) {
          return false;
        }
        return true;
      }),
    [role, hasValidSubscription]
  );
}

/** The same tabs, bucketed into their groups (empty groups dropped) */
export function useSettingsGroups(): SettingsGroup[] {
  const tabs = useAvailableSettingsTabs();

  return useMemo(() => {
    const order = [GROUP_MY_ACCOUNT, GROUP_ORGANIZATION];
    return order
      .map((label) => ({
        label,
        icon: SETTINGS_GROUP_ICONS[label],
        tabs: tabs.filter((tab) => tab.group === label),
      }))
      .filter((group) => group.tabs.length > 0);
  }, [tabs]);
}
