import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContent } from "@/components/common/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CurrencyDollar,
  TrendUp,
  ChartLineUp,
  CheckCircle,
  XCircle,
  Bell,
  Archive,
  CheckSquare,
  PencilSimple,
  Trash,
  BellRinging,
  Plus,
  Checks,
  Clock,
  UploadSimple,
  FileText,
  BoxArrowUp,
  DotsThreeVertical
} from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useQuotes } from "@/hooks/queries/useQuotes";
import { useUser, useProfile } from "@/auth";
import { quoteActivityService, type QuoteActivity } from "@/services/quoteActivityService";
import { AddReminderModal } from "@/components/features/reminders/AddReminderModal";
import { reminderService, type Reminder } from "@/services/reminderService";
import { formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import { groupQuotesByVersion } from "@/utils/quoteVersionGrouping";

/**
 * Dashboard - Executive Overview
 *
 * Shows key metrics, quick actions, reminders, and recent activity
 */
const Dashboard = () => {
  const navigate = useNavigate();

  // Use auth and React Query hooks
  const user = useUser();
  const { data: profile } = useProfile(user?.id);

  // React Query hooks for organization and quotes
  const { organization: currentOrganization, isLoading: orgLoading } = useCurrentOrganization(user?.id);
  const organizationId = currentOrganization?.id || null;
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes(user?.id);

  console.log('[Dashboard] Using organization:', { id: organizationId, name: currentOrganization?.name });

  const [recentActivities, setRecentActivities] = useState<QuoteActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
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

  // Update cache when profile loads (sidebar already does this, but just in case)
  useEffect(() => {
    if (profile && profile.id && JSON.stringify(profile) !== JSON.stringify(cachedProfile)) {
      setCachedProfile(profile);
      localStorage.setItem('sidebar_cached_profile', JSON.stringify(profile));
    }
  }, [profile, cachedProfile]);

  // Always prefer cached data to prevent flashing
  const effectiveProfile = cachedProfile || (profile?.id ? profile : null);

  // React Query automatically fetches quotes - no manual fetching needed!

  // Fetch recent activities from database and subscribe to real-time updates
  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!user || !organizationId) {
        console.log('[Dashboard] Skipping activities fetch - no user or org');
        setActivitiesLoading(false);
        return;
      }

      console.log('[Dashboard] Fetching activities for org:', organizationId);
      setActivitiesLoading(true);
      const { data, error } = await quoteActivityService.getRecentActivities({
        organizationId,
        limit: 100
      });

      console.log('[Dashboard] Activities fetch result:', { data, error, count: data?.length });

      if (data) {
        setRecentActivities(data);
      }
      setActivitiesLoading(false);
    };

    fetchRecentActivities();

    // Subscribe to real-time quote_activities updates
    if (!user || !organizationId) return;


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
  }, [user, organizationId]);

  // Fetch reminders and subscribe to real-time updates
  useEffect(() => {
    const fetchReminders = async () => {
      if (!user || !organizationId) {
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
          if (reminder.reminder_status === 'Completed') { //reminder_status formerly status
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
    if (!user || !organizationId) return;


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
              if (reminder.reminder_status === 'Completed') { //reminder_status formerly status
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
  }, [user, organizationId]);

  // Reminder action handlers
  const handleCompleteReminder = async (reminderId: string, quoteId?: string, quoteNumber?: string, projectName?: string) => {
    if (!user?.id || !organizationId) return;

    // Get the reminder details before completing
    const reminder = reminders.find(r => r.id === reminderId);

    const { error } = await reminderService.completeReminder(reminderId, {
      reminder_status: 'Completed', //reminder_status formerly status
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
        if (reminder.reminder_status === 'Completed') { //reminder_status formerly status
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
        if (reminder.status === 'Completed') { //reminder_status
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

    // Group quotes by version to avoid counting duplicates
    const quoteGroups = groupQuotesByVersion(quotes);

    // Track when quote groups were marked as Won using won_at timestamp
    // Use the won version if exists, otherwise use latest version
    const wonQuoteGroupsThisMonth = quoteGroups.filter(group => {
      const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
      if (!wonVersion) return false;
      const wonDate = new Date(wonVersion.won_at!);
      return wonDate >= thisMonth;
    });

    const wonQuoteGroupsLastMonth = quoteGroups.filter(group => {
      const wonVersion = group.versions.find(v => v.status === 'Won' && v.won_at);
      if (!wonVersion) return false;
      const wonDate = new Date(wonVersion.won_at!);
      return wonDate >= lastMonth && wonDate <= lastMonthEnd;
    });

    const totalRevenue = wonQuoteGroupsThisMonth.reduce((sum, group) => {
      const wonVersion = group.versions.find(v => v.status === 'Won');
      return sum + (wonVersion?.price_details?.final_selling_price || 0);
    }, 0);

    const lastMonthRevenue = wonQuoteGroupsLastMonth.reduce((sum, group) => {
      const wonVersion = group.versions.find(v => v.status === 'Won');
      return sum + (wonVersion?.price_details?.final_selling_price || 0);
    }, 0);

    const activeQuotes = quoteGroups.filter(group =>
      group.versions.some(v => ['Pending', 'Submitted'].includes(v.status || ''))
    ).length;

    // Current overall win rate (all time) - count groups not individual quotes
    const wonQuotes = quoteGroups.filter(g => g.versions.some(v => v.status === 'Won')).length;
    const rejectedQuotes = quoteGroups.filter(g =>
      g.versions.some(v => v.status === 'Rejected') && !g.versions.some(v => v.status === 'Won')
    ).length;
    const totalDecidedQuotes = wonQuotes + rejectedQuotes;
    const winRate = totalDecidedQuotes > 0 ? ((wonQuotes / totalDecidedQuotes) * 100).toFixed(1) : '0';

    // This month's win rate
    const wonThisMonth = wonQuoteGroupsThisMonth.length;
    const rejectedThisMonth = quoteGroups.filter(group => {
      const rejectedVersion = group.versions.find(v => v.status === 'Rejected' && v.rejected_at);
      if (!rejectedVersion || !rejectedVersion.rejected_at) return false;
      const rejectedDate = new Date(rejectedVersion.rejected_at);
      return rejectedDate >= thisMonth && !group.versions.some(v => v.status === 'Won');
    }).length;
    const decidedThisMonth = wonThisMonth + rejectedThisMonth;
    const winRateThisMonth = decidedThisMonth > 0 ? ((wonThisMonth / decidedThisMonth) * 100).toFixed(1) : '0';

    // Last month's win rate
    const wonLastMonth = wonQuoteGroupsLastMonth.length;
    const rejectedLastMonth = quoteGroups.filter(group => {
      const rejectedVersion = group.versions.find(v => v.status === 'Rejected' && v.rejected_at);
      if (!rejectedVersion || !rejectedVersion.rejected_at) return false;
      const rejectedDate = new Date(rejectedVersion.rejected_at);
      return rejectedDate >= lastMonth && rejectedDate <= lastMonthEnd && !group.versions.some(v => v.status === 'Won');
    }).length;
    const decidedLastMonth = wonLastMonth + rejectedLastMonth;
    const winRateLastMonth = decidedLastMonth > 0 ? ((wonLastMonth / decidedLastMonth) * 100).toFixed(1) : '0';

    // Calculate overdue reminders (not completed/dismissed and past due date)
    const today = new Date();
    const overdueReminders = reminders.filter(r => {
      if (r.reminder_status === 'Completed' || r.reminder_status === 'Dismissed') return false; //reminder_status formerly status
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

  // Quote of the Day - Fetch from API or use fallback
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string }>({
    text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
    author: "Stephen Covey"
  });

  useEffect(() => {
    const fetchDailyQuote = async () => {
      // Fallback quotes in case API fails
      const fallbackQuotes = [
        { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
        { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
        { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
        { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
        { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" }
      ];

      try {
        // Check localStorage cache
        const today = new Date().toISOString().split('T')[0];
        const cachedDate = localStorage.getItem('daily_quote_date');
        const cachedQuote = localStorage.getItem('daily_quote');

        if (cachedDate === today && cachedQuote) {
          setDailyQuote(JSON.parse(cachedQuote));
          return;
        }

        // Fetch from QuoteSlate API (free, no key required)
        const response = await fetch('https://quoteslate.vercel.app/api/quotes/random?categories=motivational,business,success');

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();

        if (data && data.quote) {
          const newQuote = {
            text: data.quote,
            author: data.author || 'Unknown'
          };
          setDailyQuote(newQuote);

          // Cache for today
          localStorage.setItem('daily_quote', JSON.stringify(newQuote));
          localStorage.setItem('daily_quote_date', today as string);
        } else {
          throw new Error('Invalid API response');
        }
      } catch (error) {
        // Use rotating fallback quotes on error
        const today = new Date();
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
        const quoteIndex = dayOfYear % fallbackQuotes.length;
        const fallbackQuote = fallbackQuotes[quoteIndex];
        if (fallbackQuote) {
          setDailyQuote(fallbackQuote);
        }
      }
    };

    fetchDailyQuote();
  }, []);

  return (
    <PageContent>
      {/* Dashboard Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1 max-w-3xl">
          <h1 className="text-3xl font-semibold text-[var(--content-header-text)] dark:text-[var(--content-header-text)]">
            Hello, {effectiveProfile?.full_name || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <div className="mt-3">
            <p className="text-[15px] text-[var(--content-header-text)] italic leading-relaxed">
              &ldquo;{dailyQuote?.text}&rdquo; <span className="text-[14px] text-[var(--content-header-text)] not-italic font-bold">— {dailyQuote?.author}</span>
            </p>
          </div>
        </div>
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

            {/* Active Quotes */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <FileText weight="duotone" className="w-6 h-6 text-blue-600 dark:text-blue-300" />
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

            {/* Overdue Reminders */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full bg-gradient-to-br ${metrics.overdueReminders > 0 ? 'from-red-100 to-red-200 dark:from-red-900 dark:to-red-800' : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'}`}>
                    <BellRinging weight="duotone" className={`w-6 h-6 ${metrics.overdueReminders > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`} />
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
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Use Template</span>
                </Button>

                <Button
                  disabled
                  className="w-full h-12 flex items-center justify-start gap-4 px-6 bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                >
                  <UploadSimple className="w-5 h-5" />
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
 
                      const isCompleted = reminder.reminder_status === 'Completed'; //reminder_status formerly status

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
                                      <DotsThreeVertical className="h-4 w-4" />
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
                                        <PencilSimple className="w-4 h-4 mr-2" />
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
                                    <Trash className="w-4 h-4 mr-2" />
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
              {activitiesLoading ? (
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
                          return <UploadSimple className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
                        case 'Pending':
                          return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
                        case 'Updated':
                          return <PencilSimple className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                        case 'Archived':
                          return <Archive className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        case 'Unarchived':
                          return <BoxArrowUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        case 'Deleted':
                          return <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />;
                        case 'Reminder':
                          return <BellRinging className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
                        case 'Completed':
                          return <Checks className="w-4 h-4 text-green-600 dark:text-green-400" />;
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
                if (reminder.reminder_status === 'Completed') { //reminder_status formerly status
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
        onCreateQuote={(quoteName) => {
          setShowNewQuoteDialog(false);
          navigate(`/quotes/new?name=${encodeURIComponent(quoteName)}`);
        }}
      />
    </PageContent>
  );
};

export default Dashboard;
