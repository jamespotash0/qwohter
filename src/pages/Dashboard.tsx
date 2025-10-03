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
  BellRing,
  X,
  MoreVertical,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openCalendarQuoteId, setOpenCalendarQuoteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
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
  const updateQuote = useQuotesStore((state) => state.updateQuote);

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
        limit: 100
      });

      if (data) {
        setRecentActivities(data);
      }
    };

    fetchRecentActivities();
  }, [organizationId]);

  // Update current time every second for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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

    const wonQuotesLastMonth = quotes.filter(q => {
      if (q.status !== 'Won' && q.status !== 'Completed') return false;

      const dateToUse = q.won_date || q.status_last_updated || q.created_at;
      if (!dateToUse) return false;

      const wonDate = new Date(dateToUse);
      return wonDate >= lastMonth && wonDate <= lastMonthEnd;
    });

    const totalRevenue = wonQuotesThisMonth.reduce((sum, q) =>
      sum + (q.price_details?.final_selling_price || 0), 0
    );

    const lastMonthRevenue = wonQuotesLastMonth.reduce((sum, q) =>
      sum + (q.price_details?.final_selling_price || 0), 0
    );

    const activeQuotes = quotes.filter(q =>
      ['Pending', 'Submitted'].includes(q.status || '')
    ).length;

    // Current overall win rate (all time)
    const wonQuotes = quotes.filter(q => q.status === 'Won').length;
    const rejectedQuotes = quotes.filter(q => q.status === 'Rejected').length;
    const totalDecidedQuotes = wonQuotes + rejectedQuotes;
    const winRate = totalDecidedQuotes > 0 ? ((wonQuotes / totalDecidedQuotes) * 100).toFixed(1) : '0';

    // This month's win rate
    const wonThisMonth = wonQuotesThisMonth.length;
    const rejectedThisMonth = quotes.filter(q => {
      if (q.status !== 'Rejected') return false;
      const dateToUse = q.status_last_updated || q.created_at;
      if (!dateToUse) return false;
      const statusDate = new Date(dateToUse);
      return statusDate >= thisMonth;
    }).length;
    const decidedThisMonth = wonThisMonth + rejectedThisMonth;
    const winRateThisMonth = decidedThisMonth > 0 ? ((wonThisMonth / decidedThisMonth) * 100).toFixed(1) : '0';

    // Last month's win rate
    const wonLastMonth = wonQuotesLastMonth.length;
    const rejectedLastMonth = quotes.filter(q => {
      if (q.status !== 'Rejected') return false;
      const dateToUse = q.status_last_updated || q.created_at;
      if (!dateToUse) return false;
      const statusDate = new Date(dateToUse);
      return statusDate >= lastMonth && statusDate <= lastMonthEnd;
    }).length;
    const decidedLastMonth = wonLastMonth + rejectedLastMonth;
    const winRateLastMonth = decidedLastMonth > 0 ? ((wonLastMonth / decidedLastMonth) * 100).toFixed(1) : '0';

    // Calculate overdue follow-ups
    const today = new Date();
    const overdueFollowups = quotes.filter(q => {
      if (!q.follow_up_date) return false;
      const followUpDate = new Date(q.follow_up_date);
      return followUpDate < today;
    }).length;

    return {
      totalRevenue,
      lastMonthRevenue,
      activeQuotes,
      winRate,
      winRateThisMonth,
      winRateLastMonth,
      wonQuotes,
      rejectedQuotes,
      overdueFollowups
    };
  }, [quotes]);

  // Get reminders (all quotes with follow-up date set)
  // Uses currentTime for real-time countdown updates
  const reminders = useMemo(() => {
    return quotes
      .filter(q => q.follow_up_date)
      .map(q => {
        const followUpDate = new Date(q.follow_up_date!);
        const timeDiff = followUpDate.getTime() - currentTime.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return {
          quote: q,
          followUpDate,
          daysRemaining,
          timeDiff,
          isOverdue: timeDiff < 0,
          isUpcoming: timeDiff >= 0
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [quotes, currentTime]);

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
        message = `${userName} created a New Quote called ${projectName} (#${quoteNumber})`;
        eventText = 'Created';
        type = 'created';
      } else if (activity.activity_type === 'status_changed') {
        const newStatus = activity.activity_details?.new_status || 'Unknown';
        message = `${userName} marked ${projectName} (#${quoteNumber}) as ${newStatus}`;
        eventText = newStatus;

        // Map status to type for icon coloring
        if (newStatus === 'Won') type = 'won';
        else if (newStatus === 'Rejected') type = 'lost';
        else if (newStatus === 'Submitted') type = 'submitted';
        else if (newStatus === 'Pending') type = 'pending';
        else if (newStatus === 'Completed') type = 'completed';
        else if (newStatus === 'Incomplete') type = 'incomplete';
      } else if (activity.activity_type === 'archived') {
        message = `${userName} Archived ${projectName} (#${quoteNumber})`;
        eventText = 'Archived';
        type = 'archived';
      } else if (activity.activity_type === 'unarchived') {
        message = `${userName} Unarchived ${projectName} (#${quoteNumber})`;
        eventText = 'Unarchived';
        type = 'unarchived';
      } else if (activity.activity_type === 'updated') {
        const changedFields = activity.activity_details?.changed_fields || [];
        // Format field names: capitalize and replace underscores with spaces
        const formattedFields = changedFields.map(field =>
          field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        );
        const fieldList = formattedFields.length > 0
          ? ` ${formattedFields.join(', ')}`
          : '';
        message = `${userName} updated ${projectName} ${quoteNumber}${fieldList}`;
        eventText = 'Updated';
        type = 'updated';
      } else if (activity.activity_type === 'deleted') {
        message = `${userName} deleted ${projectName} (Quote #${quoteNumber})`;
        eventText = 'Deleted';
        type = 'deleted';
      } else if (activity.activity_type === 'reminder_set') {
        const followUpDate = activity.activity_details?.follow_up_date;
        let timeDescription = '';

        if (followUpDate) {
          const targetDate = new Date(followUpDate);
          const now = new Date();
          const timeDiff = targetDate.getTime() - now.getTime();
          const isOverdue = timeDiff < 0;
          const absTimeDiff = Math.abs(timeDiff);

          const days = Math.floor(absTimeDiff / (1000 * 3600 * 24));
          const hours = Math.floor((absTimeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
          const minutes = Math.floor((absTimeDiff % (1000 * 3600)) / (1000 * 60));
          const seconds = Math.floor((absTimeDiff % (1000 * 60)) / 1000);

          if (days > 0) {
            timeDescription = `${days}d ${isOverdue ? 'overdue' : 'remaining'}`;
          } else if (hours > 0) {
            timeDescription = `${hours}h ${minutes}m ${isOverdue ? 'overdue' : 'remaining'}`;
          } else if (minutes > 0) {
            timeDescription = `${minutes}m ${seconds}s ${isOverdue ? 'overdue' : 'remaining'}`;
          } else {
            timeDescription = `${seconds}s ${isOverdue ? 'overdue' : 'remaining'}`;
          }
        }

        message = `${userName} set reminder for ${projectName} (Quote #${quoteNumber})${timeDescription ? ` - ${timeDescription}` : ''}`;
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

  const handleClearFollowUp = async (e: React.MouseEvent, quoteId: string) => {
    e.stopPropagation(); // Prevent navigating to quotes page
    try {
      await updateQuote(quoteId, {
        follow_up_date: null
      });
    } catch (error) {
      console.error('Failed to clear follow-up:', error);
    }
  };

  const handleUpdateFollowUpDate = async (quoteId: string, date: Date) => {
    try {
      await updateQuote(quoteId, {
        follow_up_date: date.toISOString()
      });
      setOpenCalendarQuoteId(null);
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Failed to update follow-up date:', error);
    }
  };

  const getTimeAgo = (date: string) => {
    const past = new Date(date);
    const diffMs = currentTime.getTime() - past.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
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
        {/* Main Layout: Left Column (Quick Actions + Reminders & Alerts) and Right Column (Recent Activity) */}
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

            {/* Reminders & Alerts Card */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                  <Bell className="w-5 h-5" />
                  Reminders & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {quotesLoading ? (
                  <div className="space-y-2 h-[600px]">
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
                  <div className="space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto pr-2 -mr-2">
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
                          className={`p-4 rounded-lg border transition-colors relative group ${
                            reminder.isOverdue
                              ? 'bg-red-50 hover:bg-red-100 border-red-200'
                              : 'bg-white hover:bg-blue-50 border-gray-200'
                          }`}
                        >
                          <div
                            onClick={() => navigate('/quotes')}
                            className="cursor-pointer"
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
                              <div className="flex flex-col items-end gap-0.5 flex-shrink-0 relative">
                                {/* Countdown and date - hidden on hover */}
                                <div className="group-hover:opacity-0 transition-opacity">
                                  <p className={`text-xs font-semibold ${reminder.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                    {(() => {
                                      const absTimeDiff = Math.abs(reminder.timeDiff);
                                      const days = Math.floor(absTimeDiff / (1000 * 3600 * 24));
                                      const hours = Math.floor((absTimeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
                                      const minutes = Math.floor((absTimeDiff % (1000 * 3600)) / (1000 * 60));
                                      const seconds = Math.floor((absTimeDiff % (1000 * 60)) / 1000);

                                      let timeText = '';
                                      if (days > 0) {
                                        timeText = `${days}d`;
                                      } else if (hours > 0) {
                                        timeText = `${hours}h ${minutes}m`;
                                      } else if (minutes > 0) {
                                        timeText = `${minutes}m ${seconds}s`;
                                      } else {
                                        timeText = `${seconds}s`;
                                      }

                                      return reminder.isOverdue ? `${timeText} overdue` : reminder.daysRemaining === 0 ? 'Due today' : `${timeText} left`;
                                    })()}
                                  </p>
                                  <span className="text-xs text-[var(--content-muted-text)]">{formattedDate}</span>
                                </div>

                                {/* Actions menu - shown on hover in place of countdown */}
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className={`p-2 rounded-md ${
                                          reminder.isOverdue
                                            ? 'bg-red-200 hover:bg-red-300 text-red-700'
                                            : 'bg-blue-200 hover:bg-blue-300 text-blue-700'
                                        }`}
                                        title="Reminder actions"
                                      >
                                        <MoreVertical className="w-5 h-5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <Popover
                                        open={openCalendarQuoteId === reminder.quote.id}
                                        onOpenChange={(open) => {
                                          if (!open) {
                                            setOpenCalendarQuoteId(null);
                                            setSelectedDate(undefined);
                                          }
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <DropdownMenuItem
                                            onSelect={(e) => {
                                              e.preventDefault();
                                              setOpenCalendarQuoteId(reminder.quote.id);
                                              setSelectedDate(reminder.followUpDate);
                                            }}
                                          >
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Update Date
                                          </DropdownMenuItem>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end" side="left">
                                          <CalendarComponent
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => {
                                              if (date) {
                                                handleUpdateFollowUpDate(reminder.quote.id, date);
                                              }
                                            }}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearFollowUp(e as any, reminder.quote.id);
                                        }}
                                        className="text-red-600"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Clear Reminder
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="text-center">
                      <Bell className="w-12 h-12 text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mx-auto mb-4 opacity-50" />
                      <p className="text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)]">
                        No reminders or alerts
                      </p>
                      <p className="text-sm text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mt-1">
                        All caught up!
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pb-4">
              {quotesLoading ? (
                <div className="space-y-2 h-[600px]">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto pr-2 -mr-2">
                  {recentActivity.map((activity) => {
                    const getActivityIcon = () => {
                      switch (activity.type) {
                        case 'created':
                          return <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                        case 'won':
                          return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
                        case 'lost':
                          return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
                        case 'submitted':
                          return <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
                        case 'pending':
                          return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
                        case 'updated':
                          return <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                        case 'archived':
                          return <Archive className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        case 'unarchived':
                          return <ArchiveRestore className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        case 'deleted':
                          return <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />;
                        case 'reminder':
                          return <BellRing className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
                        case 'completed':
                          return <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400" />;
                        default:
                          return <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                      }
                    };

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
                      >
                        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {getActivityIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                            <p className="text-sm text-[var(--content-text)] break-words flex-1">
                              {activity.message}
                            </p>
                            <p className="text-xs text-[var(--content-muted-text)] sm:flex-shrink-0 sm:whitespace-nowrap">
                              {getTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mx-auto mb-3 opacity-50" />
                    <p className="text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)]">
                      No recent activity
                    </p>
                    <p className="text-sm text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] mt-1">
                      Activities will appear here
                    </p>
                  </div>
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
