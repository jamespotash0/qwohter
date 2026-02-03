import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContent } from "@/components/common/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CurrencyDollar,
  ChartLineUp,
  Bell,
  Plus,
  Clock,
  FileText,
} from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useProposals } from "@/hooks/queries/useProposals";
import { useUser, useProfile } from "@/auth";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, useMarkNotificationAsRead } from "@/hooks/useNotifications";
import type { Notification } from "@/lib/types/notifications";
import { useUpcomingReminders, type TaskReminder } from "@/hooks/useUpcomingReminders";
import { toast } from "sonner";
import CreateProposalDialog, { type ProposalInitialData } from "@/components/features/proposals/creation/CreateProposalDialog";
import { groupProposalsByVersion } from "@/utils/proposalVersionGrouping";
import { TrialExpiryModal } from "@/components/trial/TrialExpiryModal";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real-time clock component - isolated to prevent parent re-renders
 */
const DashboardClock = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end gap-1 ml-6">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[var(--content-header-text)] tabular-nums">
          {currentTime.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}
        </span>
        <span className="text-lg font-medium text-[var(--content-muted-text)]">
          {currentTime.toLocaleDateString('en-US', {
            year: 'numeric'
          })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--content-muted-text)]">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long'
          })}
        </span>
        <span className="text-sm text-[var(--content-muted-text)]">•</span>
        <span className="text-sm font-medium text-[var(--content-header-text)] tabular-nums">
          {currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </span>
        <span className="text-xs text-[var(--content-muted-text)]">
          {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
});

DashboardClock.displayName = 'DashboardClock';

/**
 * Dashboard - Executive Overview
 *
 * Shows key metrics, quick actions, reminders
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Use auth and React Query hooks
  const user = useUser();
  const { data: profile } = useProfile(user?.id);

  // React Query hooks for organization and proposals
  const { organization: currentOrganization } = useCurrentOrganization(user?.id ?? '', !!user?.id);
  const organizationId = currentOrganization?.id || null;
  const { data: proposals = [], isLoading: proposalsLoading } = useProposals(organizationId || undefined);

  // Notifications hooks
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(user?.id);
  const markNotificationAsRead = useMarkNotificationAsRead(user?.id || '');

  // Upcoming reminders from scheduled_notifications
  const { data: upcomingReminders = [], isLoading: remindersLoading } = useUpcomingReminders(user?.id);

  const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [trialStatus, setTrialStatus] = useState<{
    daysRemaining: number;
    trialEnd: string | null;
    hasPaymentMethod: boolean;
    inGracePeriod: boolean;
    graceDaysRemaining: number;
  } | null>(null);
  const [cachedProfile, setCachedProfile] = useState<any>(() => {
    // Read from localStorage cache (same as sidebar)
    try {
      const stored = localStorage.getItem('sidebar_cached_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Update cache when profile loads (sidebar already does this, but just in case)
  useEffect(() => {
    if (profile && profile.id && JSON.stringify(profile) !== JSON.stringify(cachedProfile)) {
      setCachedProfile(profile);
      localStorage.setItem('sidebar_cached_profile', JSON.stringify(profile));
    }
  }, [profile, cachedProfile]);

  // Handle welcome overlay for new users
  useEffect(() => {
    const welcome = searchParams.get('welcome');
    if (welcome === 'true') {
      // Remove welcome param from URL immediately
      setSearchParams({});
      // Show the welcome overlay
      setShowWelcomeOverlay(true);
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setShowWelcomeOverlay(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [searchParams, setSearchParams]);

  // Fetch trial status from subscription
  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!organizationId) {
        setTrialStatus(null);
        return;
      }

      try {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('stripe_subscription_status, trial_end, has_payment_method')
          .eq('organization_id', organizationId)
          .single() as { data: { stripe_subscription_status: string | null; trial_end: string | null; has_payment_method: boolean | null } | null };

        if (!subscription) {
          setTrialStatus(null);
          return;
        }

        const isTrialing = subscription.stripe_subscription_status?.toLowerCase() === 'trialing';
        const trialEnd = subscription.trial_end;

        if (!isTrialing || !trialEnd) {
          setTrialStatus(null);
          return;
        }

        const now = new Date();
        const trialEndDate = new Date(trialEnd);
        // Use calendar day comparison for consistent day count
        const todayMidnight = new Date(now);
        todayMidnight.setHours(0, 0, 0, 0);
        const trialEndMidnight = new Date(trialEndDate);
        trialEndMidnight.setHours(0, 0, 0, 0);
        const daysRemaining = Math.round((trialEndMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
        const inGracePeriod = daysRemaining < 0;
        const gracePeriodEnd = new Date(trialEndDate.getTime() + (3 * 24 * 60 * 60 * 1000));
        const graceEndMidnight = new Date(gracePeriodEnd);
        graceEndMidnight.setHours(0, 0, 0, 0);
        const graceDaysRemaining = Math.round((graceEndMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

        setTrialStatus({
          daysRemaining: Math.max(0, daysRemaining),
          trialEnd,
          hasPaymentMethod: subscription.has_payment_method || false,
          inGracePeriod,
          graceDaysRemaining: Math.max(0, graceDaysRemaining),
        });
      } catch (error) {
        console.error('Error fetching trial status:', error);
        setTrialStatus(null);
      }
    };

    fetchTrialStatus();
  }, [organizationId]);

  // Always prefer cached data to prevent flashing
  const effectiveProfile = cachedProfile || (profile?.id ? profile : null);

  // React Query automatically fetches proposals - no manual fetching needed!

  // Calculate key metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Group proposals by version to avoid counting duplicates
    const proposalGroups = groupProposalsByVersion(proposals);

    // Track when proposal groups were marked as Won using won_at timestamp
    // Use the won version if exists, otherwise use latest version
    const wonProposalGroupsThisMonth = proposalGroups.filter(group => {
      const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
      if (!wonVersion) return false;
      const wonDate = new Date(wonVersion.won_at!);
      return wonDate >= thisMonth;
    });

    const wonProposalGroupsLastMonth = proposalGroups.filter(group => {
      const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
      if (!wonVersion) return false;
      const wonDate = new Date(wonVersion.won_at!);
      return wonDate >= lastMonth && wonDate <= lastMonthEnd;
    });

    const totalRevenue = wonProposalGroupsThisMonth.reduce((sum, group) => {
      const wonVersion = group.versions.find(v => v.status === 'Won');
      return sum + (wonVersion?.total_value || 0);
    }, 0);

    const lastMonthRevenue = wonProposalGroupsLastMonth.reduce((sum, group) => {
      const wonVersion = group.versions.find(v => v.status === 'Won');
      return sum + (wonVersion?.total_value || 0);
    }, 0);

    const activeProposals = proposalGroups.filter(group =>
      group.versions.some(v => ['Submitted'].includes(v.status || ''))
    ).length;

    // Current overall win rate (all time) - count groups not individual proposals
    const wonProposals = proposalGroups.filter(g => g.versions.some(v => v.status === 'Won')).length;
    const rejectedProposals = proposalGroups.filter(g =>
      g.versions.some(v => v.status === 'Rejected') && !g.versions.some(v => v.status === 'Won')
    ).length;
    const totalDecidedProposals = wonProposals + rejectedProposals;
    const winRate = totalDecidedProposals > 0 ? ((wonProposals / totalDecidedProposals) * 100).toFixed(1) : '0';

    // This month's win rate
    const wonThisMonth = wonProposalGroupsThisMonth.length;
    const rejectedThisMonth = proposalGroups.filter(group => {
      const rejectedVersion = group.versions.find(v => v.status === 'Rejected' && v.rejected_at);
      if (!rejectedVersion || !rejectedVersion.rejected_at) return false;
      const rejectedDate = new Date(rejectedVersion.rejected_at);
      return rejectedDate >= thisMonth && !group.versions.some(v => v.status === 'Won');
    }).length;
    const decidedThisMonth = wonThisMonth + rejectedThisMonth;
    const winRateThisMonth = decidedThisMonth > 0 ? ((wonThisMonth / decidedThisMonth) * 100).toFixed(1) : '0';

    // Last month's win rate
    const wonLastMonth = wonProposalGroupsLastMonth.length;
    const rejectedLastMonth = proposalGroups.filter(group => {
      const rejectedVersion = group.versions.find(v => v.status === 'Rejected' && v.rejected_at);
      if (!rejectedVersion || !rejectedVersion.rejected_at) return false;
      const rejectedDate = new Date(rejectedVersion.rejected_at);
      return rejectedDate >= lastMonth && rejectedDate <= lastMonthEnd && !group.versions.some(v => v.status === 'Won');
    }).length;
    const decidedLastMonth = wonLastMonth + rejectedLastMonth;
    const winRateLastMonth = decidedLastMonth > 0 ? ((wonLastMonth / decidedLastMonth) * 100).toFixed(1) : '0';

    return {
      totalRevenue,
      lastMonthRevenue,
      activeProposals,
      winRate,
      winRateThisMonth,
      winRateLastMonth,
      wonProposals,
      rejectedProposals,
    };
  }, [proposals]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  return (
    <PageContent>
      {/* Welcome Overlay for New Users */}
      {showWelcomeOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowWelcomeOverlay(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mx-4 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Qwohter!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your 14-day free trial has started.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enjoy full access to all features!
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-[var(--content-header-text)]">
            Hello, {effectiveProfile?.full_name || user?.email?.split('@')[0] || 'User'}
          </h1>
        </div>
        <DashboardClock />
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {proposalsLoading ? (
          <>
            {/* Loading Skeletons for Metrics */}
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="ml-4 flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {/* Total Revenue */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                    <CurrencyDollar weight="duotone" className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Revenue This Month</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{formatCurrency(metrics.totalRevenue)}</p>
                    <p className={`text-xs mt-1 ${
                      metrics.totalRevenue > metrics.lastMonthRevenue
                        ? 'text-green-600 dark:text-green-400'
                        : metrics.totalRevenue < metrics.lastMonthRevenue
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {metrics.lastMonthRevenue > 0 ? (
                        <>
                          {metrics.totalRevenue > metrics.lastMonthRevenue ? '+' : ''}
                          {(((metrics.totalRevenue - metrics.lastMonthRevenue) / metrics.lastMonthRevenue) * 100).toFixed(1)}% vs last month
                        </>
                      ) : (
                        'No data last month'
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Proposals */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <FileText weight="duotone" className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Active Proposals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.activeProposals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Win Rate */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800">
                    <ChartLineUp weight="duotone" className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Win Rate</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">
                      {metrics.winRate}%
                    </p>
                    <p className="text-xs mt-1 text-[var(--content-muted-text)]">
                      Won / Rejected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card
              className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/task-board')}
            >
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800">
                    <Clock weight="duotone" className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Task Board</h3>
                    <p className="text-sm text-[var(--content-muted-text)]">View & manage tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="space-y-8">
        {/* Main Layout: Left Column (Quick Actions + Reminders & Alerts) */}
        <div className="grid grid-cols-1 lg:grid-cols-[520px_600px] xl:grid-cols-[540px_1fr] gap-8 items-start">
          {/* Left Column */}
          <div className="space-y-8 flex flex-col">
            {/* Quick Actions Card */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                <Plus className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            {proposalsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowNewProposalDialog(true)}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-coral hover:bg-coral-dark text-white"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Proposal</span>
                </Button>

                <Button
                  onClick={() => navigate('/task-board')}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Create New Task</span>
                </Button>

                <Button
                  onClick={() => navigate('/forms/new')}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Create Form</span>
                </Button>
              </div>
            )}
            </CardContent>
            </Card>

            {/* Reminders Card - Shows upcoming scheduled reminders */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 flex flex-col h-[300px]">
              <CardHeader className="pb-4 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                  <Clock className="w-5 h-5" />
                  Upcoming Reminders
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {(() => {
                  if (remindersLoading) {
                    return (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="animate-pulse">
                          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3"></div>
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
                        </div>
                      </div>
                    );
                  }

                  if (upcomingReminders.length === 0) {
                    return (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <Clock className="w-12 h-12 text-[var(--content-muted-text)] mx-auto mb-4 opacity-50" />
                          <p className="text-[var(--content-muted-text)]">
                            No upcoming reminders
                          </p>
                          <p className="text-sm text-[var(--content-muted-text)] mt-1">
                            Set reminders on tasks to see them here
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
                      {upcomingReminders.map((reminder: TaskReminder) => {
                        // Extract task reference for navigation
                        const taskReference = reminder.metadata?.task_reference as string | undefined;

                        const handleReminderClick = () => {
                          // Navigate to task board with task reference (preferred) or task id
                          const taskParam = taskReference || reminder.taskId;
                          navigate(`/task-board?task=${taskParam}`);
                        };

                        const scheduledDate = new Date(reminder.scheduledFor);
                        const isPast = scheduledDate < new Date();

                        // Extract task title from "Reminder: {title}" format
                        const taskTitle = (reminder.title || 'Task Reminder').replace(/^Reminder:\s*/i, '') || 'Task';

                        return (
                          <div
                            key={reminder.id}
                            onClick={handleReminderClick}
                            className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 ${
                              isPast
                                ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                                : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <Clock className={`w-4 h-4 ${isPast ? 'text-red-500' : 'text-amber-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                                  {taskReference && <span>{taskReference} - </span>}
                                  {taskTitle}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                                  {reminder.recurrence !== 'Once' && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 mr-1">
                                      {reminder.recurrence}
                                    </span>
                                  )}
                                  {scheduledDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications */}
          <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 flex flex-col self-start" style={{ height: '900px' }}>
            <CardHeader className="pb-4 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pb-4 flex-1 flex flex-col overflow-hidden">
              {notificationsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-pulse">
                      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3"></div>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
                    </div>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Bell className="w-12 h-12 text-[var(--content-muted-text)] mx-auto mb-3 opacity-50" />
                    <p className="text-[var(--content-muted-text)]">
                      No notifications
                    </p>
                    <p className="text-sm text-[var(--content-muted-text)] mt-1">
                      Notifications will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
                  {notifications.map((notification: Notification) => {
                    // Notification types that require action (should show "View" button)
                    const ACTION_REQUIRED_TYPES = ['approval_requested', 'task_assigned'];
                    const requiresAction = ACTION_REQUIRED_TYPES.includes(notification.type) && notification.link;

                    // Mark as read when clicking on the notification
                    const handleMarkAsRead = () => {
                      if (!notification.is_read) {
                        markNotificationAsRead.mutate(notification.id);
                      }
                    };

                    // Navigate to the linked page (separate action)
                    const handleViewAction = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (notification.link) {
                        handleMarkAsRead();
                        navigate(notification.link);
                      }
                    };

                    return (
                      <div
                        key={notification.id}
                        onClick={handleMarkAsRead}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          !notification.is_read
                            ? 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
                            : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Red dot for unread, invisible placeholder for read */}
                          <div className="flex-shrink-0 mt-1.5">
                            {!notification.is_read ? (
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            ) : (
                              <div className="w-2 h-2"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              {requiresAction && (
                                <button
                                  onClick={handleViewAction}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Proposal Dialog */}
      <CreateProposalDialog
        open={showNewProposalDialog}
        onOpenChange={setShowNewProposalDialog}
        onCreateProposal={async (data: ProposalInitialData) => {
          setShowNewProposalDialog(false);
          try {
            // document_type is inherited from the form automatically
            const { createProposal } = await import('@/services/proposalsService');
            const proposal = await createProposal({
              form_id: data.formId,
              project_name: data.projectName,
              status: 'Draft',
            });
            toast.success('Created successfully');
            navigate(`/proposals/${proposal.id}/edit`);
          } catch (error) {
            console.error('Failed to create:', error);
            toast.error('Failed to create');
          }
        }}
      />

      {/* Trial Expiry Modal - 3-day warning */}
      {trialStatus && (
        <TrialExpiryModal
          daysRemaining={trialStatus.daysRemaining}
          open={showExpiryModal}
          onClose={() => setShowExpiryModal(false)}
          metrics={{
            proposalsCreated: proposals.length,
            totalRevenue: metrics.totalRevenue,
            teamMembers: 1,
          }}
        />
      )}
    </PageContent>
  );
};

export default Dashboard;
