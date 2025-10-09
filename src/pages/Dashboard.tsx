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
  Archive,
  ArchiveRestore,
  CheckCheck,
  Edit3,
  Trash2,
  BellRing,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import { useAuthStore } from "@/stores/auth/authStore";
import { quoteActivityService, type QuoteActivity } from "@/services/quoteActivityService";
import { AddReminderModal } from "@/components/features/reminders/AddReminderModal";
import { reminderService, type Reminder } from "@/services/reminderService";
import { formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";

/**
 * Dashboard - Executive Overview
 *
 * Shows key metrics, quick actions, reminders, and recent activity
 */
const Dashboard = () => {
  const navigate = useNavigate();

  // Use auth store instead of local state
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [recentActivities, setRecentActivities] = useState<QuoteActivity[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
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
    console.log('🎬 useEffect [GET ORG ID] TRIGGERED', { userId: user?.id });
    const getOrganizationId = async () => {
      if (!user?.id) {
        console.log('⏭️ No user ID, skipping org fetch');
        return;
      }

      console.log('🔍 Fetching organization for user:', user.id);
      const { data } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (data && 'organization_id' in data) {
        console.log('🏢 Setting organizationId:', (data as any).organization_id);
        setOrganizationId((data as any).organization_id);
      }
    };
    getOrganizationId();
  }, [user?.id]);

  // Initialize quotes store
  useEffect(() => {
    if (user?.id && !isInitialized) {
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isInitialized]);

  // Fetch recent activities from database and subscribe to real-time updates
  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!organizationId) {
        return;
      }

      const { data } = await quoteActivityService.getRecentActivities({
        organizationId,
        limit: 100
      });

      if (data) {
        setRecentActivities(data);
      }
    };

    fetchRecentActivities();

    // Subscribe to real-time quote_activities updates
    if (!organizationId) return;


    const channel = supabase
      .channel('quote-activities-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quote_activities',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {

          if (payload.new) {
            setRecentActivities((prev) => {
              // Add new activity to the beginning, keep only latest 100
              const newActivity = payload.new as QuoteActivity;
              const updated = [newActivity, ...prev];
              return updated.slice(0, 100);
            });
          }
        }
      )
      .subscribe((status) => {
      });

    // Cleanup: unsubscribe on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  // Fetch reminders and subscribe to real-time updates
  useEffect(() => {
    const fetchReminders = async () => {
      if (!organizationId) {
        return;
      }

      const { data, error } = await reminderService.getReminders({
        organizationId,
        includeCompleted: true
      });

      if (error) {
        console.error('Failed to fetch reminders:', error);
        return;
      }

      if (data) {

        // Filter out completed reminders older than 3 days
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        const filteredReminders = data.filter(reminder => {
          if (reminder.status === 'Completed') {
            // Use updated_at as the completion date
            const completedDate = new Date(reminder.updated_at);
            return completedDate > threeDaysAgo;
          }
          return true; // Keep all non-completed reminders
        });

        setReminders(filteredReminders);
      } else {
      }
    };

    fetchReminders();

    // Subscribe to real-time reminders updates
    if (!organizationId) return;


    const channel = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {

          // Refetch all reminders to ensure we have complete data with joins
          const { data } = await reminderService.getReminders({
            organizationId,
            includeCompleted: true
          });
          if (data) {
            // Filter out completed reminders older than 3 days
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

            const filteredReminders = data.filter(reminder => {
              if (reminder.status === 'Completed') {
                const completedDate = new Date(reminder.updated_at);
                return completedDate > threeDaysAgo;
              }
              return true;
            });

            setReminders(filteredReminders);
          }
        }
      )
      .subscribe((status) => {
      });

    // Cleanup: unsubscribe on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  // Reminder action handlers
  const handleCompleteReminder = async (reminderId: string, quoteId?: string, quoteNumber?: string, projectName?: string) => {
    if (!user?.id || !organizationId) return;

    // Get the reminder details before completing
    const reminder = reminders.find(r => r.id === reminderId);

    const { error } = await reminderService.completeReminder(reminderId, {
      status: 'Completed',
      completed_by: user.id,
    });

    if (error) {
      toast.error('Failed to complete reminder');
      return;
    }

    toast.success('Reminder marked as completed');

    // Log activity (always, even without quote)
    await quoteActivityService.logActivity({
      quoteId: quoteId || null,
      quoteNumber: quoteNumber || 'N/A',
      projectName: projectName || reminder?.title || 'General Reminder',
      userId: user.id,
      userName: effectiveProfile?.full_name || 'Unknown User',
      activityType: 'Reminder_Set',
      activityDetails: {
        action: 'completed',
        reminderTitle: reminder?.title,
        reminderType: reminder?.reminder_type
      },
      organizationId: organizationId,
    });

    // Refresh reminders list
    const { data } = await reminderService.getReminders({
      organizationId,
      includeCompleted: true
    });
    if (data) {
      // Filter out completed reminders older than 3 days
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

      const filteredReminders = data.filter(reminder => {
        if (reminder.status === 'Completed') {
          const completedDate = new Date(reminder.updated_at);
          return completedDate > threeDaysAgo;
        }
        return true;
      });

      setReminders(filteredReminders);
    }
  };

  const handleDeleteReminder = async (reminderId: string, quoteId?: string, quoteNumber?: string, projectName?: string) => {
    if (!user?.id || !organizationId) return;

    // Get the reminder details before deleting
    const reminder = reminders.find(r => r.id === reminderId);

    const { success } = await reminderService.deleteReminder(reminderId);

    if (!success) {
      toast.error('Failed to delete reminder');
      return;
    }

    toast.success('Reminder deleted');

    // Log activity (always, even without quote)
    await quoteActivityService.logActivity({
      quoteId: quoteId || null,
      quoteNumber: quoteNumber || 'N/A',
      projectName: projectName || reminder?.title || 'General Reminder',
      userId: user.id,
      userName: effectiveProfile?.full_name || 'Unknown User',
      activityType: 'Reminder_Set',
      activityDetails: {
        action: 'deleted',
        reminderTitle: reminder?.title,
        reminderType: reminder?.reminder_type
      },
      organizationId: organizationId,
    });

    // Refresh reminders list
    const { data } = await reminderService.getReminders({
      organizationId,
      includeCompleted: true
    });
    if (data) {
      // Filter out completed reminders older than 3 days
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

      const filteredReminders = data.filter(reminder => {
        if (reminder.status === 'Completed') {
          const completedDate = new Date(reminder.updated_at);
          return completedDate > threeDaysAgo;
        }
        return true;
      });

      setReminders(filteredReminders);
    }
  };

  // Calculate key metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Track when quotes were marked as Won using status_last_updated or created_at
    const wonQuotesThisMonth = quotes.filter(q => {
      if (q.status !== 'Won') return false;

      const dateToUse = q.status_last_updated || q.created_at;
      if (!dateToUse) return false;

      const wonDate = new Date(dateToUse);
      return wonDate >= thisMonth;
    });

    const wonQuotesLastMonth = quotes.filter(q => {
      if (q.status !== 'Won') return false;

      const dateToUse = q.status_last_updated || q.created_at;
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

    // Calculate overdue reminders (not completed/dismissed and past due date)
    const today = new Date();
    const overdueReminders = reminders.filter(r => {
      if (r.status === 'Completed' || r.status === 'Dismissed') return false;
      const dueDate = new Date(r.due_date);
      return dueDate < today;
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
      overdueReminders
    };
  }, [quotes, reminders]);


  // Format activities from database for display
  const recentActivity = useMemo(() => {
    return recentActivities.map(activity => {
      const projectName = activity.project_name || 'Untitled';
      const userName = activity.user_name || 'Unknown';
      const quoteNumber = activity.quote_number;

      let message = '';
      let eventText = '';
      let type = 'Created';

      if (activity.activity_type === 'Created') {
        const status = activity.activity_details?.status || 'Draft';
        message = `${userName} created a new ${status} Quote called ${projectName} (#${quoteNumber})`;
        eventText = 'Created';
        type = 'Created';
      } else if (activity.activity_type === 'Status_Changed') {
        const newStatus = activity.activity_details?.new_status || 'Unknown';
        message = `${userName} marked ${projectName} (#${quoteNumber}) as ${newStatus}`;
        eventText = newStatus;

        // Map status to type for icon coloring
        if (newStatus === 'Won') type = 'Won';
        else if (newStatus === 'Rejected') type = 'Lost';
        else if (newStatus === 'Submitted') type = 'Submitted';
        else if (newStatus === 'Pending') type = 'Pending';
        else if (newStatus === 'Completed') type = 'Completed';
        else if (newStatus === 'Incomplete') type = 'Incomplete';
      } else if (activity.activity_type === 'Archived') {
        message = `${userName} Archived ${projectName} (#${quoteNumber})`;
        eventText = 'Archived';
        type = 'Archived';
      } else if (activity.activity_type === 'Unarchived') {
        message = `${userName} Unarchived ${projectName} (#${quoteNumber})`;
        eventText = 'Unarchived';
        type = 'Unarchived';
      } else if (activity.activity_type === 'Updated') {
        const changedFields = activity.activity_details?.changed_fields || [];
        // Format field names: capitalize and replace underscores with spaces
        const formattedFields = changedFields.map((field: string) =>
          field.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        );
        const fieldList = formattedFields.length > 0
          ? ` ${formattedFields.join(', ')}`
          : '';
        message = `${userName} updated ${projectName} ${quoteNumber}${fieldList}`;
        eventText = 'Updated';
        type = 'Updated';
      } else if (activity.activity_type === 'Deleted') {
        message = `${userName} deleted ${projectName} (#${quoteNumber})`;
        eventText = 'Deleted';
        type = 'Deleted';
      } else if (activity.activity_type === 'Reminder_Set') {
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
            timeDescription = `${days}d ${isOverdue ? 'Overdue' : 'Remaining'}`;
          } else if (hours > 0) {
            timeDescription = `${hours}h ${minutes}m ${isOverdue ? 'Overdue' : 'Remaining'}`;
          } else if (minutes > 0) {
            timeDescription = `${minutes}m ${seconds}s ${isOverdue ? 'Overdue' : 'Remaining'}`;
          } else {
            timeDescription = `${seconds}s ${isOverdue ? 'Overdue' : 'Remaining'}`;
          }
        }

        message = `${userName} set reminder for ${projectName} (#${quoteNumber})${timeDescription ? ` - ${timeDescription}` : ''}`;
        eventText = 'Reminder Set';
        type = 'Reminder';
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

  // Real-time update ticker - updates every second to keep timestamps fresh
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

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
          Hello, {effectiveProfile?.full_name || user?.email?.split('@')[0] || 'User'}!
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

            {/* Overdue Reminders */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full bg-gradient-to-br ${metrics.overdueReminders > 0 ? 'from-red-100 to-red-200 dark:from-red-900 dark:to-red-800' : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'}`}>
                    <AlertCircle className={`w-6 h-6 ${metrics.overdueReminders > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`} />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Overdue Reminders</h3>
                    <p className={`text-2xl font-bold ${metrics.overdueReminders > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--content-header-text)]'}`}>{metrics.overdueReminders}</p>
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
            {quotesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowNewQuoteDialog(true)}
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Quote</span>
                </Button>

                <Button
                  disabled
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">Use Template</span>
                </Button>

                <Button
                  disabled
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Import from Form</span>
                </Button>
              </div>
            )}
            </CardContent>
            </Card>

            {/* Reminders & Alerts Card */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 flex flex-col h-[600px]">
              <CardHeader className="pb-4 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-[var(--content-header-text)]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Reminders & Alerts
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddReminderModal(true)}
                    className="h-8 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-0 flex-1 flex flex-col">
                {(() => {
                  return null;
                })()}
                {reminders.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Bell className="w-12 h-12 text-[var(--content-muted-text)] mx-auto mb-4 opacity-50" />
                      <p className="text-[var(--content-muted-text)]">
                        No reminders
                      </p>
                      <p className="text-sm text-[var(--content-muted-text)] mt-1">
                        Click "Add" to create a reminder
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto pr-2 -mr-2">
                    {reminders.map((reminder) => {
                      const dueDate = new Date(reminder.due_date);
                      const isOverdue = isPast(dueDate) && !isToday(dueDate);
                      const isDueToday = isToday(dueDate);
                      const isDueTomorrow = isTomorrow(dueDate);

                      const getTypeColor = (type: string) => {
                        switch (type) {
                          case 'Quote_Follow_Up':
                            return 'text-blue-600 bg-blue-50';
                          case 'Meeting':
                            return 'text-purple-600 bg-purple-50';
                          case 'Deadline':
                            return 'text-red-600 bg-red-50';
                          case 'Task':
                            return 'text-green-600 bg-green-50';
                          default:
                            return 'text-gray-600 bg-gray-50';
                        }
                      };

                      const isCompleted = reminder.status === 'Completed';

                      return (
                        <div
                          key={reminder.id}
                          className={`p-4 rounded-lg border transition-all group ${
                            isCompleted
                              ? 'border-green-200 bg-green-50 opacity-75'
                              : 'border-gray-200 bg-white hover:bg-blue-50 cursor-pointer'
                          }`}
                        >
                          {/* Header: Title, Time, and Ellipsis */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isCompleted && (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                )}
                                <h4 className={`font-semibold ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                  {reminder.title}
                                </h4>
                              </div>

                              {/* Quote Reference (no spacing) */}
                              {reminder.quote_number && (
                                <p className={`text-xs ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
                                  #{reminder.quote_number}{reminder.project_name ? ` - ${reminder.project_name}` : ''}
                                </p>
                              )}

                              {/* Description with spacing from quote */}
                              {reminder.description && (
                                <p className={`text-sm mt-2 line-clamp-2 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {reminder.description}
                                </p>
                              )}
                            </div>

                            {/* Time and Ellipsis on right side */}
                            <div className="flex flex-col items-end flex-shrink-0">
                              {/* Time in top right */}
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                isOverdue
                                  ? 'text-red-600'
                                  : isDueToday
                                  ? 'text-yellow-600'
                                  : 'text-gray-500'
                              }`}>
                                {isOverdue && `Overdue by ${formatDistanceToNow(dueDate)}`}
                                {isDueToday && 'Due today'}
                                {isDueTomorrow && 'Due tomorrow'}
                                {!isOverdue && !isDueToday && !isDueTomorrow &&
                                  `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`}
                              </span>

                              {/* Ellipsis in middle right with custom spacing */}
                              <div className="mt-6">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!isCompleted && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingReminder(reminder);
                                          setShowAddReminderModal(true);
                                        }}
                                      >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleCompleteReminder(
                                          reminder.id,
                                          reminder.quote_id,
                                          reminder.quote_number,
                                          reminder.project_name || undefined
                                        )}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Complete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteReminder(
                                      reminder.id,
                                      reminder.quote_id,
                                      reminder.quote_number,
                                      reminder.project_name || undefined
                                    )}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </div>
                          </div>

                          {/* Footer: Type Badge + Creator */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              Created by {reminder.creator_name || 'Unknown'}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(
                                reminder.reminder_type
                              )}`}
                            >
                              {reminder.reminder_type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 flex flex-col self-start" style={{ height: '900px' }}>
            <CardHeader className="pb-4 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-[var(--content-header-text)]">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pb-4 flex-1 flex flex-col overflow-hidden">
              {quotesLoading ? (
                <div className="space-y-2 flex-1 overflow-y-auto">
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
                <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                  {recentActivity.map((activity) => {
                    const getActivityIcon = () => {
                      switch (activity.type) {
                        case 'Created':
                          return <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                        case 'Won':
                          return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
                        case 'Lost':
                          return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
                        case 'Submitted':
                          return <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
                        case 'Pending':
                          return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
                        case 'Updated':
                          return <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                        case 'Archived':
                          return <Archive className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        case 'Unarchived':
                          return <ArchiveRestore className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        case 'Deleted':
                          return <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />;
                        case 'Reminder':
                          return <BellRing className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
                        case 'Completed':
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
                <div className="flex-1 flex items-center justify-center">
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

      {/* Add Reminder Modal */}
      <AddReminderModal
        open={showAddReminderModal}
        editingReminder={editingReminder}
        onClose={() => {
          setShowAddReminderModal(false);
          setEditingReminder(null);
        }}
        onReminderCreated={async () => {
          // Refresh reminders list
          if (organizationId) {
            const { data } = await reminderService.getReminders({
              organizationId,
              includeCompleted: true
            });
            if (data) {
              // Filter out completed reminders older than 3 days
              const now = new Date();
              const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

              const filteredReminders = data.filter(reminder => {
                if (reminder.status === 'Completed') {
                  const completedDate = new Date(reminder.updated_at);
                  return completedDate > threeDaysAgo;
                }
                return true;
              });

              setReminders(filteredReminders);
            }
          }
          setEditingReminder(null);
        }}
      />

      {/* Create Quote Dialog */}
      <CreateQuoteDialog
        open={showNewQuoteDialog}
        onOpenChange={setShowNewQuoteDialog}
        onCreateQuote={(quoteId) => {
          // Navigate to the new quote
          navigate(`/quotes/${quoteId}`);
        }}
      />
    </PageContent>
  );
};

export default Dashboard;
