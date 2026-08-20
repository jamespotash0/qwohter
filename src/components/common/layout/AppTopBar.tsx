import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Gear, SignOut, UserCircle } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { NotificationBell } from "@/components/common/NotificationBell";
import { useUser, useProfile, useAuthStatus } from "@/auth";
import { useCurrentOrganization, useOrganizationMembers } from "@/hooks/queries/useOrganization";

interface AppTopBarProps {
  onLogout: () => void;
}

/**
 * App Top Bar
 *
 * Sits above the main content area with the notification bell and the profile
 * menu on the right. The profile menu owns Settings and Sign out.
 */
export function AppTopBar({ onLogout }: AppTopBarProps) {
  const navigate = useNavigate();
  const user = useUser();
  const { data: userProfile } = useProfile(user?.id);
  const { isInitialized } = useAuthStatus();

  const { organization, role } = useCurrentOrganization(user?.id || "");
  const { data: members = [] } = useOrganizationMembers(organization?.id || "", !!organization?.id);

  const userInitials = useMemo(() => {
    const name = userProfile?.full_name;
    const email = user?.email;
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [userProfile?.full_name, user?.email]);

  const userDisplayName = useMemo(
    () => userProfile?.full_name || user?.email || "User",
    [userProfile?.full_name, user?.email]
  );

  const currentMember = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user?.id]
  );

  // Department is the more specific label when set, otherwise fall back to role
  const roleLabel = currentMember?.department || role || "Member";
  const userEmail = userProfile?.email || user?.email || "";

  const { trialDaysRemaining, inGracePeriod, graceDaysRemaining } = useTrialStatus(organization?.id);
  const canManageBilling = role === "Owner" || role === "Admin";

  return (
    <header className="flex items-center justify-end gap-1 h-14 px-4 flex-shrink-0">
      <NotificationBell />

      {!isInitialized ? (
        <Skeleton className="h-9 w-9 rounded-full" />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center p-1 rounded-full hover:bg-[var(--sidebar-nav-bg-hover)] transition-colors focus:outline-none focus-visible:outline-none"
              aria-label="Account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-[var(--sidebar-user-avatar-bg)] text-white text-sm font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-medium truncate">{userDisplayName}</p>
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-[var(--content-table-row-selected)] text-[var(--sidebar-icon-active)]">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-xs text-[var(--content-muted-text)] truncate">{userEmail}</p>
              </div>
            </div>
            <DropdownMenuSeparator />

            {/* Trial / grace period status (Owner and Admin only) */}
            {canManageBilling && trialDaysRemaining !== null && (
              <>
                <div className="px-2 py-2">
                  <div className="rounded-lg bg-gradient-to-r from-[var(--brand-orange-600)] to-[var(--brand-orange-800)] p-3 text-white shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} />
                      <span className="text-xs font-semibold">Free Trial</span>
                    </div>
                    <p className="text-xs opacity-90">
                      {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"} remaining
                    </p>
                    <button
                      onClick={() => navigate("/settings?tab=billing")}
                      className="w-full mt-2 h-7 rounded-md text-xs bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      Manage Plan
                    </button>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {canManageBilling && inGracePeriod && (
              <>
                <div className="px-2 py-2">
                  <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-3 text-white shadow-sm border border-red-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} className="animate-pulse" />
                      <span className="text-xs font-semibold">Trial Expired!</span>
                    </div>
                    <p className="text-xs opacity-90">
                      Grace period: {graceDaysRemaining} {graceDaysRemaining === 1 ? "day" : "days"} left
                    </p>
                    <button
                      onClick={() => navigate("/settings?tab=billing&upgrade=true")}
                      className="w-full mt-2 h-7 rounded-md text-xs font-semibold bg-white/30 hover:bg-white/40 transition-colors"
                    >
                      Add Payment Method
                    </button>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings?tab=profile")}>
              <UserCircle size={16} className="mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
              <Gear size={16} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400"
              onClick={onLogout}
            >
              <SignOut size={16} className="mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
