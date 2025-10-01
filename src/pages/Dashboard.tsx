import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContent } from "@/components/common/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Plus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Upload,
  Bell,
  ArrowUpRight,
  Archive,
  ArchiveRestore,
  CheckCheck,
  Edit3,
  Trash2,
  BellRing
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { quoteActivityService, type QuoteActivity } from "@/services/quoteActivityService";

/**
 * Dashboard - Executive Overview
 *
 * Shows key metrics, quick actions, reminders, and recent activity
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<QuoteActivity[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [cachedProfile, setCachedProfile] = useState<any>(() => {
    // Read from localStorage cache (same as sidebar)
    try {
      const stored = localStorage.getItem('sidebar_cached_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);

  useOrganizations();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getCurrentUser();
  }, []);

  const { profile } = useUserProfile(user?.id);

  // Update cache when profile loads (sidebar already does this, but just in case)
  useEffect(() => {
    if (profile && profile.id && JSON.stringify(profile) !== JSON.stringify(cachedProfile)) {
      setCachedProfile(profile);
      localStorage.setItem('sidebar_cached_profile', JSON.stringify(profile));
    }
  }, [profile, cachedProfile]);

  // Always prefer cached data to prevent flashing
  const effectiveProfile = cachedProfile || (profile?.id ? profile : null);

  // Get organization ID for activity fetching
  useEffect(() => {
    const getOrganizationId = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (data?.organization_id) {
        setOrganizationId(data.organization_id);
      }
    };
    getOrganizationId();
  }, [user?.id]);

  // Initialize quotes store
  useEffect(() => {
    if (user?.id && !isInitialized) {
      console.log('🔑 Dashboard: User authenticated, initializing quotes store...');
      initialize();
    }
  }, [user?.id, isInitialized, initialize]);

  // Fetch recent activities from database
  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!organizationId) return;

      const { data } = await quoteActivityService.getRecentActivities({
        organizationId,
        limit: 10
      });

      if (data) {
        setRecentActivities(data);
      }
    };

    fetchRecentActivities();
  }, [organizationId]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Use won_date to track when quotes were first marked as Won
    // Falls back to status_last_updated or created_at for quotes without won_date
    const wonQuotesThisMonth = quotes.filter(q => {
      if (q.status !== 'Won' && q.status !== 'Completed') return false;

      // Use won_date if available, otherwise fall back to status_last_updated or created_at
      const dateToUse = q.won_date || q.status_last_updated || q.created_at;
      if (!dateToUse) return false;

      const wonDate = new Date(dateToUse);
      return wonDate >= thisMonth;
    });

    const totalRevenue = wonQuotesThisMonth.reduce((sum, q) =>
      sum + (q.price_details?.final_selling_price || 0), 0
    );

    const activeQuotes = quotes.filter(q =>
      ['Pending', 'Submitted'].includes(q.status || '')
    ).length;

    const wonQuotes = quotes.filter(q => q.status === 'Won').length;
    const rejectedQuotes = quotes.filter(q => q.status === 'Rejected').length;
    const totalDecidedQuotes = wonQuotes + rejectedQuotes;
    const winRate = totalDecidedQuotes > 0 ? ((wonQuotes / totalDecidedQuotes) * 100).toFixed(1) : '0';

    // Calculate overdue follow-ups
    const today = new Date();
    const overdueFollowups = quotes.filter(q => {
      if (!q.follow_up_days || q.follow_up_days <= 0) return false;
      const baseDate = q.status_last_updated ? new Date(q.status_last_updated) : new Date(q.created_at);
      const followUpDate = new Date(baseDate);
      followUpDate.setDate(followUpDate.getDate() + q.follow_up_days);
      return followUpDate < today;
    }).length;

    return {
      totalRevenue,
      activeQuotes,
      winRate,
      overdueFollowups
    };
  }, [quotes]);

  // Get reminders (all quotes with follow-up days set)
  const reminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return quotes
      .filter(q => q.follow_up_days && q.follow_up_days > 0)
      .map(q => {
        const baseDate = q.status_last_updated ? new Date(q.status_last_updated) : new Date(q.created_at);
        baseDate.setHours(0, 0, 0, 0);
        const followUpDate = new Date(baseDate);
        followUpDate.setDate(followUpDate.getDate() + (q.follow_up_days || 0));
        const daysRemaining = Math.ceil((followUpDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return {
          quote: q,
          followUpDate,
          daysRemaining,
          isOverdue: daysRemaining < 0,
          isUpcoming: daysRemaining >= 0
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [quotes]);

  // Format activities from database for display
  const recentActivity = useMemo(() => {
    return recentActivities.map(activity => {
      const projectName = activity.project_name || 'Untitled';
      const userName = activity.user_name || 'Unknown';
      const quoteNumber = activity.quote_number;

      let message = '';
      let eventText = '';
      let type = 'created';

      if (activity.activity_type === 'created') {
        message = `${userName} created a ${projectName} (Quote #${quoteNumber})`;
        eventText = 'Created';
        type = 'created';
      } else if (activity.activity_type === 'status_changed') {
        const newStatus = activity.activity_details?.new_status || 'Unknown';
        message = `${userName} marked ${projectName} (Quote #${quoteNumber}) as ${newStatus}`;
        eventText = newStatus;

        // Map status to type for icon coloring
        if (newStatus === 'Won') type = 'won';
        else if (newStatus === 'Rejected') type = 'lost';
        else if (newStatus === 'Submitted') type = 'submitted';
        else if (newStatus === 'Pending') type = 'pending';
        else if (newStatus === 'Completed') type = 'completed';
        else if (newStatus === 'Incomplete') type = 'incomplete';
      } else if (activity.activity_type === 'archived') {
        message = `${userName} Archived ${projectName} (Quote #${quoteNumber})`;
        eventText = 'Archived';
        type = 'archived';
      } else if (activity.activity_type === 'unarchived') {
        message = `${userName} Unarchived ${projectName} (Quote #${quoteNumber})`;
        eventText = 'Unarchived';
        type = 'unarchived';
      } else if (activity.activity_type === 'updated') {
        const changedFields = activity.activity_details?.changed_fields || [];
        const fieldList = changedFields.length > 0
          ? ` (${changedFields.join(', ')})`
          : '';
        message = `${userName} updated ${projectName} (Quote #${quoteNumber})${fieldList}`;
        eventText = 'Updated';
        type = 'updated';
      } else if (activity.activity_type === 'deleted') {
        message = `${userName} deleted ${projectName} (Quote #${quoteNumber})`;
        eventText = 'Deleted';
        type = 'deleted';
      } else if (activity.activity_type === 'reminder_set') {
        const days = activity.activity_details?.follow_up_days || 0;
        message = `${userName} set ${days}d reminder for ${projectName} (Quote #${quoteNumber})`;
        eventText = 'Reminder Set';
        type = 'reminder';
      }

      return {
        id: activity.id,
        type,
        timestamp: activity.created_at,
        message,
        eventText
      };
    });
  }, [recentActivities]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <PageContent>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--content-header-text)] dark:text-[var(--content-header-text)]">
          Welcome back, {effectiveProfile?.full_name || user?.email?.split('@')[0] || 'User'}
        </h1>
        <p className="mt-2 text-base text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)]">
          Here's what's happening with your quotes today
        </p>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quotesLoading ? (
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
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Revenue This Month</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{formatCurrency(metrics.totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Quotes */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Active Quotes</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.activeQuotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Win Rate */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Win Rate</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.winRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue Follow-ups */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full bg-gradient-to-br ${metrics.overdueFollowups > 0 ? 'from-red-100 to-red-200 dark:from-red-900 dark:to-red-800' : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'}`}>
                    <AlertCircle className={`w-6 h-6 ${metrics.overdueFollowups > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`} />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Overdue Follow-ups</h3>
                    <p className={`text-2xl font-bold ${metrics.overdueFollowups > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--content-header-text)]'}`}>{metrics.overdueFollowups}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="space-y-8">
        {/* Main Layout: Left Column (Quick Actions + Recent Activity) and Right Column (Reminders & Alerts) */}
        <div className="grid grid-cols-1 lg:grid-cols-[480px_600px] xl:grid-cols-[480px_1fr] gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Quick Actions Card */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                <Plus className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            {quotesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/newquote')}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Quote</span>
                </Button>

                <Button
                  onClick={() => navigate('/quotes')}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-white hover:bg-blue-50 text-[var(--content-header-text)] border border-gray-200"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">Use Template</span>
                </Button>

                <Button
                  onClick={() => navigate('/quotes')}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-white hover:bg-blue-50 text-[var(--content-header-text)] border border-gray-200"
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Import from Form</span>
                </Button>
              </div>
            )}
            </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {quotesLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3 p-4 bg-white rounded-lg border border-gray-200">
                        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 -mr-2 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                    {recentActivity.map((activity) => {
                      const activityTime = getTimeAgo(activity.timestamp);

                      return (
                        <div
                          key={activity.id}
                          className="relative flex gap-3 p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            activity.type === 'won'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : activity.type === 'lost'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : activity.type === 'submitted'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : activity.type === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : activity.type === 'completed'
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : activity.type === 'archived'
                              ? 'bg-slate-100 dark:bg-slate-900/30'
                              : activity.type === 'unarchived'
                              ? 'bg-sky-100 dark:bg-sky-900/30'
                              : activity.type === 'updated'
                              ? 'bg-indigo-100 dark:bg-indigo-900/30'
                              : activity.type === 'deleted'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : activity.type === 'reminder'
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-gray-100 dark:bg-gray-800/30'
                          }`}>
                            {activity.type === 'won' && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                            {activity.type === 'lost' && <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                            {activity.type === 'submitted' && <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            {activity.type === 'pending' && <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                            {activity.type === 'completed' && <CheckCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                            {activity.type === 'archived' && <Archive className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                            {activity.type === 'unarchived' && <ArchiveRestore className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                            {activity.type === 'updated' && <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                            {activity.type === 'deleted' && <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />}
                            {activity.type === 'reminder' && <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                            {activity.type === 'created' && <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                            {activity.type === 'incomplete' && <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="absolute top-2 right-2 text-xs text-[var(--content-muted-text)] whitespace-nowrap">
                              {activityTime}
                            </div>
                            <p className="text-sm text-[var(--content-header-text)] pr-20 break-words">
                              {activity.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    {recentActivity.length > 3 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--content-card-bg)] to-transparent pointer-events-none" />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mx-auto mb-4 opacity-50" />
                    <p className="text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)]">
                      No recent activity
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Reminders & Alerts */}
          <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                <Bell className="w-5 h-5" />
                Reminders & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
            {quotesLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : reminders.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 -mr-2">
                {reminders.map((reminder) => {
                  const followUpDate = reminder.followUpDate;
                  const formattedDate = followUpDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={reminder.quote.id}
                      onClick={() => navigate('/quotes')}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        reminder.isOverdue
                          ? 'bg-red-50 hover:bg-red-100 border-red-200'
                          : 'bg-white hover:bg-blue-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[var(--content-header-text)] truncate mb-1">
                            {reminder.quote.project_name || reminder.quote.quote_details?.project_name || 'Untitled Project'} - #{reminder.quote.proposal_number}
                          </p>
                          <div className="space-y-0.5 text-xs text-[var(--content-muted-text)]">
                            {(reminder.quote.job_details?.client_company || reminder.quote.job_details?.client_name) && (
                              <p className="truncate">{reminder.quote.job_details?.client_company || reminder.quote.job_details?.client_name}</p>
                            )}
                            {reminder.quote.creator_name && (
                              <p>Created by {reminder.quote.creator_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <p className={`text-xs font-semibold ${reminder.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {reminder.isOverdue ? `${Math.abs(reminder.daysRemaining)}d overdue` : reminder.daysRemaining === 0 ? 'Due today' : `${reminder.daysRemaining}d left`}
                          </p>
                          <span className="text-xs text-[var(--content-muted-text)]">{formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mx-auto mb-4 opacity-50" />
                <p className="text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)]">
                  No reminders or alerts
                </p>
                <p className="text-sm text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mt-1">
                  All caught up!
                </p>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContent>
  );
};

export default Dashboard;
