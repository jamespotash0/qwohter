import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeService } from '@/services/stripeService';
import { useSignOut } from '@/auth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionPaywallProps {
  organizationId: string;
  children: React.ReactNode;
}

/**
 * Paywall component that checks subscription status
 * Blocks access if subscription is invalid and shows upgrade prompt
 */
export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  organizationId,
  children,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: signOut, isPending: isLoggingOut } = useSignOut();

  // TODO: Get user role from React Query (useUserOrganization)
  // For now, we'll check role from membership data
  const isOwner = true; // Placeholder - should come from useUserOrganization

  // Get cached subscription status from localStorage only
  const [cachedStatus, setCachedStatus] = useState<{ hasAccess: boolean; reason: string } | null>(null);

  // Try to get from localStorage if Zustand store is empty (e.g., after page reload)
  const getInitialStatus = () => {
    if (cachedStatus) return cachedStatus;

    try {
      const stored = localStorage.getItem(`subscription_${organizationId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if cache is less than 5 minutes old
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return { hasAccess: parsed.hasAccess, reason: parsed.reason };
        }
      }
    } catch (e) {
      console.error('Failed to parse cached subscription:', e);
    }
    return null;
  };

  const initialStatus = getInitialStatus();

  // Validate-first approach: ALWAYS validate before showing UI
  // - Show loading spinner until validation completes (~200ms)
  // - Show definitive UI (never wrong, never flashes)
  // - Realtime handles all future updates (instant, no revalidation needed)
  // - Simple, secure, no false UI ever
  const [loading, setLoading] = useState(true); // Always validate first
  const [hasAccess, setHasAccess] = useState(false); // Fail closed by default
  const [blockReason, setBlockReason] = useState<string>('');

  // Race condition fix: Track request versions
  // Ensures only the most recent subscription check result is applied
  const requestVersionRef = useRef(0);

  console.log('🎫 Paywall initialized:', {
    initialStatus,
    loading,
    hasAccess,
    blockReason
  });

  useEffect(() => {
    // VALIDATE-FIRST APPROACH: Simple, secure, never shows wrong UI
    // 1. Always validate subscription on mount (200ms)
    // 2. Show loading spinner during validation (clear feedback)
    // 3. Show definitive UI after validation (never wrong)
    // 4. Realtime handles all future changes (instant, no revalidation)

    console.log('🔄 Validating subscription before showing UI...');

    // ALWAYS validate first - show loading until complete
    checkSubscription();

    // Set up realtime subscription to detect subscription changes
    const channel = supabase
      .channel(`subscription-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          console.log('🔔 Subscription changed, rechecking access:', payload);

          // Get the new subscription status
          const { isValid, reason } = await stripeService.hasValidSubscription(organizationId);

          // Check if status actually changed (to avoid unnecessary reloads)
          const statusChanged = isValid !== hasAccess;

          if (statusChanged) {
            console.log('✨ Subscription status changed:', { from: hasAccess, to: isValid });

            // Update state immediately
            setHasAccess(isValid);
            setBlockReason(reason || '');

            // Update cache in localStorage
            localStorage.setItem(`subscription_${organizationId}`, JSON.stringify({
              hasAccess: isValid,
              reason: reason || '',
              timestamp: Date.now(),
            }));

            // Show toast and reload for critical changes
            if (isValid && !hasAccess) {
              // Inactive → Active: Show success message and reload
              toast.success('Subscription activated! Reloading...', { duration: 2000 });
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else if (!isValid && hasAccess) {
              // Active → Inactive: Show warning and reload immediately
              toast.error('Subscription expired. Redirecting...', { duration: 1500 });
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          }
          // Removed recursive checkSubscription() call that was causing race conditions
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime connection status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected and listening for subscription changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Realtime connection failed:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const checkSubscription = async () => {
    // Race condition fix: Increment request version
    // Only the latest request's response will be applied
    const currentRequestVersion = ++requestVersionRef.current;

    try {
      // Always show loading while validating
      setLoading(true);

      console.log(`🔄 Starting subscription check (version ${currentRequestVersion})...`);

      const { isValid, reason } = await stripeService.hasValidSubscription(organizationId);

      console.log(`💳 Subscription check result (version ${currentRequestVersion}):`, { isValid, reason, organizationId });

      // Race condition fix: Only apply if this is still the latest request
      if (currentRequestVersion === requestVersionRef.current) {
        console.log(`✅ Applying subscription check result (version ${currentRequestVersion} is current)`);

        setHasAccess(isValid);
        setBlockReason(reason || '');

        console.log('💳 State updated:', { hasAccess: isValid, blockReason: reason });

        // Persist to localStorage with timestamp
        localStorage.setItem(`subscription_${organizationId}`, JSON.stringify({
          hasAccess: isValid,
          reason: reason || '',
          timestamp: Date.now(),
        }));
      } else {
        console.log(`⏭️ Skipping stale subscription check result (version ${currentRequestVersion}, current is ${requestVersionRef.current})`);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);

      // Race condition fix: Only apply if this is still the latest request
      if (currentRequestVersion === requestVersionRef.current) {
        console.log(`✅ Applying subscription error (version ${currentRequestVersion} is current)`);

        setHasAccess(false);
        setBlockReason('Unable to verify subscription status');
      } else {
        console.log(`⏭️ Skipping stale subscription error (version ${currentRequestVersion}, current is ${requestVersionRef.current})`);
      }
    } finally {
      // Race condition fix: Only update loading if this is still the latest request
      if (currentRequestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    // Clear React Query cache
    queryClient.clear();

    // Sign out using auth hook
    signOut(undefined, {
      onSuccess: () => {
        navigate('/sign-in', { replace: true });
      }
    });
  };

  // Show full-screen loading spinner while checking subscription
  // Note: isLoggingOut is handled by MainLayout's overlay, so we don't need to check it here
  if (loading) {
    console.log('⏳ Showing loading spinner...');
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-[var(--content-muted-text)]">Checking subscription...</p>
        </div>
      </div>
    );
  }

  console.log('🚦 Paywall check:', { hasAccess, blockReason, loading });

  if (!hasAccess) {
    console.log('🚫 Blocking access - showing paywall');
    // Non-owner users see simplified message
    if (!isOwner) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--content-bg)]">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-gray-200">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Subscription Required</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Please contact your organization administrator to upgrade your subscription plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="ghost"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Logging out...' : 'Sign Out'}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Owner users see full paywall with billing options
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--content-bg)]">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-gray-200">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Subscription Required</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {blockReason || 'A valid subscription is required to access this feature'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <p className="text-sm text-gray-600 text-center">
                Please go to billing settings to manage your subscription and restore access.
              </p>
              <Button
                onClick={() => navigate('/settings?tab=billing')}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Go to Billing Settings
              </Button>
              <div className="pt-2 border-t border-gray-200">
                <Button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Sign Out'}
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    );
  }

  return <>{children}</>;
};
