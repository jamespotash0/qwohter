# Product Requirements Document: Tiered Seat-Based Pricing with Stripe

**Project:** Qwohter Wall Quote Wizard
**Feature:** Graduated Per-User Tiered Pricing System
**Version:** 1.0
**Date:** 2025-10-24
**Status:** Ready for Implementation

---

## Executive Summary

Implement a tiered, seat-based pricing model using Stripe's graduated pricing to offer volume discounts as organizations grow. The system automatically calculates the appropriate tier based on active user count and handles upgrades/downgrades seamlessly.

---

## Pricing Model (Option B: Graduated Per-User Pricing)

### Tier Structure

| Tier | Users | Price/User/Month | Monthly Total (Example) | Yearly Price/User | Features |
|------|-------|------------------|-------------------------|-------------------|----------|
| **Starter** | 1-2 | $15/user | 1 user = $15<br>2 users = $30 | $150/user/year (save 17%) | All features |
| **Team** | 3-5 | $12/user | 3 users = $36<br>5 users = $60 | $120/user/year (save 17%) | All features + Priority support |
| **Business** | 6+ | $10/user | 10 users = $100<br>20 users = $200 | $100/user/year (save 17%) | All features + Dedicated support + Advanced analytics |

### Graduated Pricing Logic

Stripe's graduated pricing means:
- Users 1-2: $15 each
- Users 3-5: $12 each
- Users 6+: $10 each

**Example:** Organization with 7 users
```
(2 users × $15) + (3 users × $12) + (2 users × $10) = $30 + $36 + $20 = $86/month
```

---

## Database Changes

### 1. New Migration: Add Tier Field to Subscription Plans

**File:** `supabase/migrations/20251024000001_add_tier_to_subscription_plans.sql`

```sql
-- Add tier classification to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN tier_name text,
ADD COLUMN min_users integer DEFAULT 1,
ADD COLUMN max_users integer;

-- Add index for tier lookups
CREATE INDEX idx_subscription_plans_tier ON public.subscription_plans(tier_name);

-- Add comments
COMMENT ON COLUMN public.subscription_plans.tier_name IS 'Tier classification: Starter, Team, Business';
COMMENT ON COLUMN public.subscription_plans.min_users IS 'Minimum users for this tier';
COMMENT ON COLUMN public.subscription_plans.max_users IS 'Maximum users for this tier (null = unlimited)';
```

### 2. Subscription Plans to Insert

**File:** `supabase/migrations/20251024000002_insert_tiered_plans.sql`

```sql
-- Clear existing plans (except Free trial)
DELETE FROM public.subscription_plans WHERE name != 'Free';

-- Insert tiered plans
INSERT INTO public.subscription_plans (
  name,
  display_name,
  description,
  tier_name,
  min_users,
  max_users,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  is_active,
  sort_order
) VALUES
(
  'Starter',
  'Starter Plan',
  'Perfect for small teams getting started',
  'Starter',
  1,
  2,
  'prod_STARTER_ID', -- Replace with actual Stripe Product ID
  'price_STARTER_MONTHLY_ID', -- Replace with actual Stripe Price ID
  'price_STARTER_YEARLY_ID', -- Replace with actual Stripe Price ID
  '[
    "Up to 2 users",
    "Unlimited quotes",
    "All templates",
    "Custom branding",
    "Logo upload",
    "Email support (24hr response)"
  ]',
  true,
  1
),
(
  'Team',
  'Team Plan',
  'Best for growing teams and collaboration',
  'Team',
  3,
  5,
  'prod_TEAM_ID', -- Replace with actual Stripe Product ID
  'price_TEAM_MONTHLY_ID', -- Replace with actual Stripe Price ID
  'price_TEAM_YEARLY_ID', -- Replace with actual Stripe Price ID
  '[
    "Up to 5 users",
    "Everything in Starter",
    "Priority support (4hr response)",
    "Team usage analytics",
    "Advanced reporting",
    "Email reminders"
  ]',
  true,
  2
),
(
  'Business',
  'Business Plan',
  'Unlimited scale for large organizations',
  'Business',
  6,
  NULL, -- Unlimited
  'prod_BUSINESS_ID', -- Replace with actual Stripe Product ID
  'price_BUSINESS_MONTHLY_ID', -- Replace with actual Stripe Price ID
  'price_BUSINESS_YEARLY_ID', -- Replace with actual Stripe Price ID
  '[
    "Unlimited users",
    "Everything in Team",
    "Dedicated account manager",
    "Custom onboarding & training",
    "99.9% uptime SLA",
    "API access",
    "Custom integrations"
  ]',
  true,
  3
);

-- Verify
SELECT tier_name, name, min_users, max_users, display_name FROM subscription_plans ORDER BY sort_order;
```

### 3. Add Notifications Table for Tier Change Alerts

**File:** `supabase/migrations/20251024000003_create_subscription_notifications.sql`

```sql
-- Table to track subscription-related notifications
CREATE TABLE IF NOT EXISTS public.subscription_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL, -- 'tier_upgrade_pending', 'tier_upgraded', 'tier_downgraded', 'payment_required'

  -- Notification details
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}', -- { old_tier, new_tier, user_count, triggered_by_user_id, etc }

  -- Delivery tracking
  is_read boolean DEFAULT false,
  sent_to_user_ids uuid[] DEFAULT '{}', -- Array of user IDs who should see this notification
  dismissed_by_user_ids uuid[] DEFAULT '{}', -- Array of user IDs who dismissed this

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- Auto-dismiss after this date

  CONSTRAINT valid_notification_type CHECK (
    notification_type IN (
      'tier_upgrade_pending',
      'tier_upgraded',
      'tier_downgraded',
      'payment_required',
      'trial_ending',
      'subscription_canceled'
    )
  )
);

-- Indexes
CREATE INDEX idx_subscription_notifications_org ON public.subscription_notifications(organization_id);
CREATE INDEX idx_subscription_notifications_type ON public.subscription_notifications(notification_type);
CREATE INDEX idx_subscription_notifications_created ON public.subscription_notifications(created_at DESC);

-- RLS Policies
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their organization
CREATE POLICY "subscription_notifications_select_policy" ON public.subscription_notifications
FOR SELECT USING (
  organization_id IN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
  )
);

-- Owners/Admins can insert notifications
CREATE POLICY "subscription_notifications_insert_policy" ON public.subscription_notifications
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('Owner', 'Admin')
    AND m.status = 'Active'
  )
);

-- Users can update their own dismissal status
CREATE POLICY "subscription_notifications_update_policy" ON public.subscription_notifications
FOR UPDATE USING (
  organization_id IN (
    SELECT m.organization_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.status = 'Active'
  )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.subscription_notifications TO authenticated;
```

---

## Files to Create/Update

### 1. TypeScript Types

#### **File:** `src/lib/types/subscription.ts` (NEW)

```typescript
export type TierName = 'Starter' | 'Team' | 'Business';

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  tier_name: TierName;
  min_users: number;
  max_users: number | null; // null = unlimited
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface TierChangeNotification {
  id: string;
  organization_id: string;
  notification_type: 'tier_upgrade_pending' | 'tier_upgraded' | 'tier_downgraded' | 'payment_required' | 'trial_ending' | 'subscription_canceled';
  title: string;
  message: string;
  metadata: {
    old_tier?: TierName;
    new_tier?: TierName;
    user_count?: number;
    triggered_by_user_id?: string;
    triggered_by_user_name?: string;
    estimated_new_price?: number;
  };
  is_read: boolean;
  sent_to_user_ids: string[];
  dismissed_by_user_ids: string[];
  created_at: string;
  expires_at: string | null;
}

export interface TierCalculationResult {
  recommendedTier: TierName;
  userCount: number;
  estimatedMonthlyPrice: number;
  estimatedYearlyPrice: number;
  willRequireUpgrade: boolean;
  currentTier?: TierName;
}
```

### 2. Stripe Service Updates

#### **File:** `src/services/stripeService.ts` (UPDATE)

Add these new functions:

```typescript
/**
 * Get recommended tier based on user count
 */
export const getRecommendedTier = async (organizationId: string): Promise<{
  tier: TierName;
  plan: SubscriptionPlan | null;
  error: string | null;
}> => {
  const { quantity, error: countError } = await calculateSubscriptionQuantity(organizationId);

  if (countError) {
    return { tier: 'Starter', plan: null, error: countError };
  }

  // Determine tier based on user count
  let tierName: TierName = 'Starter';
  if (quantity >= 6) tierName = 'Business';
  else if (quantity >= 3) tierName = 'Team';

  // Get the plan for this tier
  const { data: plan, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('tier_name', tierName)
    .eq('is_active', true)
    .single();

  if (error) {
    return { tier: tierName, plan: null, error: error.message };
  }

  return { tier: tierName, plan, error: null };
};

/**
 * Check if adding a user will trigger a tier upgrade
 */
export const checkTierUpgradeRequired = async (organizationId: string): Promise<{
  required: boolean;
  currentTier: TierName | null;
  newTier: TierName | null;
  currentUserCount: number;
  newUserCount: number;
  error: string | null;
}> => {
  try {
    // Get current subscription
    const { data: subscription, error: subError } = await getSubscription(organizationId);
    if (subError || !subscription) {
      return {
        required: false,
        currentTier: null,
        newTier: null,
        currentUserCount: 0,
        newUserCount: 0,
        error: subError || 'No subscription found',
      };
    }

    // Get current user count
    const { quantity: currentUserCount, error: countError } = await calculateSubscriptionQuantity(organizationId);
    if (countError) {
      return {
        required: false,
        currentTier: null,
        newTier: null,
        currentUserCount: 0,
        newUserCount: 0,
        error: countError,
      };
    }

    // Calculate new user count (adding 1)
    const newUserCount = currentUserCount + 1;

    // Get current tier
    const { data: currentPlan } = await supabase
      .from('subscription_plans')
      .select('tier_name')
      .eq('id', subscription.plan_id)
      .single();

    const currentTier = currentPlan?.tier_name as TierName;

    // Determine new tier based on new user count
    let newTier: TierName = 'Starter';
    if (newUserCount >= 6) newTier = 'Business';
    else if (newUserCount >= 3) newTier = 'Team';

    return {
      required: currentTier !== newTier,
      currentTier,
      newTier,
      currentUserCount,
      newUserCount,
      error: null,
    };
  } catch (error) {
    return {
      required: false,
      currentTier: null,
      newTier: null,
      currentUserCount: 0,
      newUserCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Create notification for tier change
 */
export const createTierChangeNotification = async (params: {
  organizationId: string;
  type: 'tier_upgrade_pending' | 'tier_upgraded' | 'tier_downgraded';
  oldTier: TierName;
  newTier: TierName;
  userCount: number;
  triggeredByUserId?: string;
  triggeredByUserName?: string;
}): Promise<{ success: boolean; error: string | null }> => {
  try {
    const notificationMessages = {
      tier_upgrade_pending: {
        title: '⚠️ Tier Upgrade Required',
        message: `Adding another user will upgrade your plan from ${params.oldTier} to ${params.newTier}. Your subscription will be automatically updated and prorated.`,
      },
      tier_upgraded: {
        title: '🎉 Plan Upgraded!',
        message: `Your plan has been upgraded from ${params.oldTier} to ${params.newTier} to accommodate ${params.userCount} users.`,
      },
      tier_downgraded: {
        title: '📉 Plan Downgraded',
        message: `Your plan has been downgraded from ${params.oldTier} to ${params.newTier} based on your current user count (${params.userCount} users).`,
      },
    };

    const notification = notificationMessages[params.type];

    // Get all owners and admins to notify
    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('organization_id', params.organizationId)
      .in('role', ['Owner', 'Admin'])
      .eq('status', 'Active');

    const userIds = members?.map(m => m.user_id) || [];

    const { error } = await supabase
      .from('subscription_notifications')
      .insert({
        organization_id: params.organizationId,
        notification_type: params.type,
        title: notification.title,
        message: notification.message,
        metadata: {
          old_tier: params.oldTier,
          new_tier: params.newTier,
          user_count: params.userCount,
          triggered_by_user_id: params.triggeredByUserId,
          triggered_by_user_name: params.triggeredByUserName,
        },
        sent_to_user_ids: userIds,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create notification',
    };
  }
};

// Add to exports
export const stripeService = {
  // ... existing exports
  getRecommendedTier,
  checkTierUpgradeRequired,
  createTierChangeNotification,
};
```

### 3. Tier Upgrade Confirmation Dialog

#### **File:** `src/components/common/TierUpgradeDialog.tsx` (NEW)

```typescript
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUp, DollarSign, Users, Info } from 'lucide-react';
import type { TierName } from '@/lib/types/subscription';

interface TierUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentTier: TierName;
  newTier: TierName;
  currentUserCount: number;
  newUserCount: number;
  isLoading?: boolean;
}

export const TierUpgradeDialog: React.FC<TierUpgradeDialogProps> = ({
  open,
  onClose,
  onConfirm,
  currentTier,
  newTier,
  currentUserCount,
  newUserCount,
  isLoading = false,
}) => {
  // Price per user for each tier (from pricing model)
  const tierPrices: Record<TierName, number> = {
    Starter: 15,
    Team: 12,
    Business: 10,
  };

  const estimateNewPrice = () => {
    const price = tierPrices[newTier] || 10;
    return newUserCount * price;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-orange-600" />
            Tier Upgrade Required
          </DialogTitle>
          <DialogDescription>
            Adding this user will upgrade your subscription plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tier Change */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="font-semibold text-gray-900">{currentTier}</p>
            </div>
            <ArrowUp className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">New Plan</p>
              <p className="font-semibold text-orange-600">{newTier}</p>
            </div>
          </div>

          {/* User Count */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-900">
              <strong>{currentUserCount} users</strong> → <strong>{newUserCount} users</strong>
            </span>
          </div>

          {/* Estimated Price */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-900">
              Estimated new price: <strong>${estimateNewPrice()}/month</strong>
            </span>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your subscription will be automatically upgraded and prorated. You'll only pay for the additional time remaining in your billing period.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Processing...' : 'Confirm & Add User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 4. Subscription Notifications Component

#### **File:** `src/components/features/notifications/SubscriptionNotifications.tsx` (NEW)

```typescript
import React, { useEffect, useState } from 'react';
import { Bell, X, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/auth/authStore';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import type { TierChangeNotification } from '@/lib/types/subscription';
import { toast } from 'sonner';

export const SubscriptionNotifications: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const [notifications, setNotifications] = useState<TierChangeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentOrganization?.id || !user?.id) return;

    fetchNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('subscription_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'subscription_notifications',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          const newNotification = payload.new as TierChangeNotification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast for new notification
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentOrganization?.id, user?.id]);

  const fetchNotifications = async () => {
    if (!currentOrganization?.id) return;

    const { data, error } = await supabase
      .from('subscription_notifications')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data as TierChangeNotification[]);

    // Count unread notifications for current user
    const unread = data.filter(
      (n) => !n.dismissed_by_user_ids?.includes(user?.id || '')
    ).length;
    setUnreadCount(unread);
  };

  const dismissNotification = async (notificationId: string) => {
    if (!user?.id) return;

    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification) return;

    const updatedDismissedBy = [
      ...(notification.dismissed_by_user_ids || []),
      user.id,
    ];

    const { error } = await supabase
      .from('subscription_notifications')
      .update({ dismissed_by_user_ids: updatedDismissedBy })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: TierChangeNotification['notification_type']) => {
    switch (type) {
      case 'tier_upgraded':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'tier_downgraded':
        return <TrendingDown className="w-5 h-5 text-orange-600" />;
      case 'tier_upgrade_pending':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'payment_required':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto shadow-xl z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Subscription Updates</h3>
          </div>
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.notification_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dismissNotification(notification.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
```

### 5. Update Team Page to Check Tier Before Adding Users

#### **File:** `src/pages/Team.tsx` (UPDATE)

Add tier upgrade check before inviting users:

```typescript
import { TierUpgradeDialog } from '@/components/common/TierUpgradeDialog';
import { stripeService } from '@/services/stripeService';

// Add state for tier upgrade dialog
const [tierUpgradeDialog, setTierUpgradeDialog] = useState({
  open: false,
  currentTier: null as TierName | null,
  newTier: null as TierName | null,
  currentUserCount: 0,
  newUserCount: 0,
  pendingInviteEmail: '',
});

// Before sending invite, check if tier upgrade is needed
const handleInviteUser = async (email: string, role: string) => {
  const { required, currentTier, newTier, currentUserCount, newUserCount } =
    await stripeService.checkTierUpgradeRequired(currentOrganization.id);

  if (required) {
    // Show confirmation dialog
    setTierUpgradeDialog({
      open: true,
      currentTier,
      newTier,
      currentUserCount,
      newUserCount,
      pendingInviteEmail: email,
    });
    return;
  }

  // Proceed with invite
  await sendInvite(email, role);
};

const handleConfirmTierUpgrade = async () => {
  // Create notification
  await stripeService.createTierChangeNotification({
    organizationId: currentOrganization.id,
    type: 'tier_upgrade_pending',
    oldTier: tierUpgradeDialog.currentTier!,
    newTier: tierUpgradeDialog.newTier!,
    userCount: tierUpgradeDialog.newUserCount,
    triggeredByUserId: user?.id,
    triggeredByUserName: user?.email,
  });

  // Proceed with invite
  await sendInvite(tierUpgradeDialog.pendingInviteEmail, 'Member');

  // Close dialog
  setTierUpgradeDialog({ ...tierUpgradeDialog, open: false });
};

// In render
<TierUpgradeDialog
  open={tierUpgradeDialog.open}
  onClose={() => setTierUpgradeDialog({ ...tierUpgradeDialog, open: false })}
  onConfirm={handleConfirmTierUpgrade}
  currentTier={tierUpgradeDialog.currentTier!}
  newTier={tierUpgradeDialog.newTier!}
  currentUserCount={tierUpgradeDialog.currentUserCount}
  newUserCount={tierUpgradeDialog.newUserCount}
/>
```

### 6. Update MainLayout to Show Notifications

#### **File:** `src/components/common/layout/MainLayout.tsx` (UPDATE)

Add notifications to header:

```typescript
import { SubscriptionNotifications } from '@/components/features/notifications/SubscriptionNotifications';

// In header render
<div className="flex items-center gap-4">
  <SubscriptionNotifications />
  {/* ... existing header items */}
</div>
```

### 7. Update Landing Page Pricing Section

#### **File:** `src/pages/LandingEnhanced.tsx` (UPDATE)

Replace pricing section with new tiered pricing:

```typescript
{/* Pricing Section */}
<section id="pricing" ref={pricingRef} className="py-24 px-6 bg-[var(--landing-bg-light)]">
  <div className="max-w-7xl mx-auto">
    <div className="text-center mb-16">
      <h2 className="text-4xl md:text-5xl font-bold text-[var(--landing-text-on-light)] mb-4">
        Simple, Transparent Pricing
      </h2>
      <p className="text-xl text-[var(--landing-text-muted)] max-w-2xl mx-auto">
        Pay only for what you use. Volume discounts automatically applied as you grow.
      </p>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <span className={`text-sm font-medium ${!isAnnual ? 'text-[var(--landing-primary)]' : 'text-gray-500'}`}>
          Monthly
        </span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className="relative w-14 h-7 bg-gray-300 rounded-full transition-colors duration-300"
          style={{ backgroundColor: isAnnual ? 'var(--landing-primary)' : undefined }}
        >
          <span
            className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300"
            style={{ transform: isAnnual ? 'translateX(28px)' : 'translateX(0)' }}
          />
        </button>
        <span className={`text-sm font-medium ${isAnnual ? 'text-[var(--landing-primary)]' : 'text-gray-500'}`}>
          Annual
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Save 17%
          </span>
        </span>
      </div>
    </div>

    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {/* Starter Tier */}
      <div className="pricing-card bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:border-[var(--landing-primary)] transition-all duration-300">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
          <p className="text-gray-600 mb-6">Perfect for small teams</p>
          <div className="mb-6">
            <span className="text-5xl font-bold text-gray-900">
              ${isAnnual ? '150' : '15'}
            </span>
            <span className="text-gray-600 ml-2">
              /user/{isAnnual ? 'year' : 'month'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">1-2 users</p>
        </div>
        <ul className="space-y-3 mb-8">
          {[
            'Unlimited quotes',
            'All templates',
            'Custom branding',
            'Logo upload',
            'Email support (24hr)',
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => navigate('/create-account')}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
        >
          Get Started
        </Button>
      </div>

      {/* Team Tier - MOST POPULAR */}
      <div className="pricing-card bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-xl p-8 border-2 border-[var(--landing-primary)] transform md:scale-105 relative">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-[var(--landing-primary)] text-white text-xs font-bold px-4 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Team</h3>
          <p className="text-gray-600 mb-6">Best for growing teams</p>
          <div className="mb-6">
            <span className="text-5xl font-bold text-gray-900">
              ${isAnnual ? '120' : '12'}
            </span>
            <span className="text-gray-600 ml-2">
              /user/{isAnnual ? 'year' : 'month'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">3-5 users</p>
        </div>
        <ul className="space-y-3 mb-8">
          {[
            'Everything in Starter',
            'Priority support (4hr)',
            'Team usage analytics',
            'Advanced reporting',
            'Email reminders',
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--landing-primary)] flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 font-medium">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => navigate('/create-account')}
          className="w-full bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white shadow-lg"
        >
          Get Started
        </Button>
      </div>

      {/* Business Tier - BEST VALUE */}
      <div className="pricing-card bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:border-[var(--landing-primary)] transition-all duration-300 relative">
        <div className="absolute -top-4 right-4">
          <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            BEST VALUE
          </span>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
          <p className="text-gray-600 mb-6">Unlimited scale</p>
          <div className="mb-6">
            <span className="text-5xl font-bold text-gray-900">
              ${isAnnual ? '100' : '10'}
            </span>
            <span className="text-gray-600 ml-2">
              /user/{isAnnual ? 'year' : 'month'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">6+ users</p>
        </div>
        <ul className="space-y-3 mb-8">
          {[
            'Everything in Team',
            'Dedicated account manager',
            'Custom onboarding',
            '99.9% uptime SLA',
            'API access',
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => navigate('/create-account')}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
        >
          Get Started
        </Button>
      </div>
    </div>

    {/* Pricing Note */}
    <div className="text-center mt-12">
      <p className="text-sm text-gray-600">
        All plans include a <span className="font-semibold text-[var(--landing-primary)]">30-day free trial</span>. No credit card required.
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Volume discounts automatically applied. Cancel anytime.
      </p>
    </div>
  </div>
</section>
```

### 8. Update Subscription Page with Tier Selection

#### **File:** `src/pages/Subscription.tsx` (UPDATE)

Update to show tier-based pricing instead of simple plan selection:

```typescript
// Show recommended tier based on current user count
useEffect(() => {
  const loadRecommendedTier = async () => {
    if (!currentOrganization?.id) return;

    const { tier, plan } = await stripeService.getRecommendedTier(currentOrganization.id);
    setRecommendedTier(tier);
    setRecommendedPlan(plan);
  };

  loadRecommendedTier();
}, [currentOrganization?.id]);

// Show all tiers with recommended one highlighted
```

### 9. Stripe Webhook Handler Updates

#### **File:** `supabase/functions/stripe-webhook/index.ts` (UPDATE)

Add tier detection when subscription is updated:

```typescript
case 'customer.subscription.updated':
  const subscription = event.data.object;
  const quantity = subscription.items.data[0].quantity;

  // Determine correct tier based on quantity
  let newTierName = 'Starter';
  if (quantity >= 6) newTierName = 'Business';
  else if (quantity >= 3) newTierName = 'Team';

  // Get plan ID for new tier
  const { data: newPlan, error: planError } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, tier_name')
    .eq('tier_name', newTierName)
    .eq('is_active', true)
    .single();

  if (planError) {
    console.error('Error finding plan for tier:', newTierName, planError);
    break;
  }

  // Get current subscription to check if tier changed
  const { data: currentSub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id, subscription_plans!inner(tier_name)')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  const oldTierName = currentSub?.subscription_plans?.tier_name;

  // Update subscription with new tier
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan_id: newPlan.id,
      stripe_subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // If tier changed, create notification
  if (oldTierName && oldTierName !== newTierName) {
    const { data: org } = await supabaseAdmin
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (org) {
      // Create tier change notification
      await createTierChangeNotification({
        organizationId: org.organization_id,
        type: 'tier_upgraded',
        oldTier: oldTierName,
        newTier: newTierName,
        userCount: quantity,
      });
    }
  }
  break;
```

---

## Page Routing & Paywall Strategy

### Routing Updates

**No routing changes needed.** Current routing structure supports subscription flows.

### Paywall Implementation Strategy

#### Level 1: Soft Paywall (Recommended)
- Allow users to browse all pages
- Show subscription status banner at top
- Block critical actions (create quote, invite users) with upgrade prompts
- Use `SubscriptionPaywall` component to wrap action buttons

#### Level 2: Hard Paywall (Optional)
- Redirect to `/subscription` if no valid subscription
- Implemented in `MainLayout` component
- Only allow access to `/subscription`, `/settings?tab=billing`, and `/sign-out`

**Recommended: Level 1** - Better UX, users can explore before paying

### Where to Apply Paywalls

1. **Quote Creation** (`/quotes/new`)
   - Wrap "Create Quote" button with paywall check
   - Show upgrade prompt if subscription invalid

2. **Team Management** (`/team`)
   - Wrap "Invite User" button with tier upgrade check
   - Show dialog if adding user requires tier upgrade

3. **Advanced Features** (future)
   - API access
   - Custom integrations
   - Advanced analytics

---

## Upgrade Flow & Error Handling

### Automatic Upgrade Flow

1. **User attempts to invite new team member**
2. **System calculates new user count** → Determines if tier upgrade needed
3. **If upgrade needed:**
   - Show `TierUpgradeDialog` with pricing info
   - User confirms or cancels
4. **On confirmation:**
   - Create notification for org owners/admins
   - Send invite to new user
   - User accepts invite → Triggers webhook
5. **Webhook handler:**
   - Updates Stripe subscription quantity
   - Stripe calculates prorated charge
   - Detects tier change → Updates local subscription record
   - Creates "tier_upgraded" notification

### Error Handling

#### Scenario 1: Stripe Checkout Session Fails
```typescript
// In createCheckoutSession
try {
  const { sessionId, error } = await stripeService.createCheckoutSession({...});

  if (error) {
    toast.error('Failed to start checkout', {
      description: error,
    });
    return;
  }
} catch (error) {
  toast.error('Unexpected error', {
    description: 'Please try again or contact support.',
  });
}
```

#### Scenario 2: Tier Upgrade Calculation Fails
```typescript
const { required, error } = await stripeService.checkTierUpgradeRequired(orgId);

if (error) {
  toast.error('Unable to verify subscription', {
    description: 'Please refresh and try again.',
  });
  return;
}
```

#### Scenario 3: Webhook Processing Fails
```typescript
// In webhook handler - use try/catch and log errors
try {
  // Process webhook
} catch (error) {
  console.error('Webhook processing failed:', error);
  // Return 200 to prevent Stripe retries
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

#### Scenario 4: Payment Fails During Upgrade
```typescript
// Stripe webhook: invoice.payment_failed
case 'invoice.payment_failed':
  const invoice = event.data.object;

  // Create notification for org owners
  await createNotification({
    organizationId: orgId,
    type: 'payment_required',
    title: 'Payment Failed',
    message: 'Please update your payment method to continue using Qwohter.',
  });

  // After 3 failed attempts, block access
  if (invoice.attempt_count >= 3) {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        access_blocked: true,
        access_blocked_reason: 'Payment method failed. Please update billing.',
      })
      .eq('stripe_customer_id', invoice.customer);
  }
  break;
```

---

## Owner Notifications for Tier Changes

### Notification Triggers

1. **Before adding user (tier_upgrade_pending)**
   - Shown in `TierUpgradeDialog`
   - Created when owner confirms upgrade
   - Shows estimated new price

2. **After successful upgrade (tier_upgraded)**
   - Triggered by Stripe webhook
   - Sent to all org owners/admins
   - Shows old tier → new tier, new user count

3. **After downgrade (tier_downgraded)**
   - Triggered when users are removed
   - Automatic tier recalculation
   - Notifies owners of new pricing

### Notification Delivery

- **In-App**: `SubscriptionNotifications` component in header (bell icon)
- **Email** (future): Send via Supabase Edge Function using Resend/SendGrid
- **Dismissible**: Users can dismiss notifications
- **Auto-expire**: Notifications auto-dismiss after 7 days

---

## Implementation Checklist

### Phase 1: Database & Backend (Day 1-2)

- [ ] Create migration: Add `tier_name`, `min_users`, `max_users` to `subscription_plans`
- [ ] Create migration: Insert Starter, Team, Business plans
- [ ] Create migration: Create `subscription_notifications` table
- [ ] Create Stripe Products & Prices in Stripe Dashboard (graduated pricing)
- [ ] Update `subscription_plans` with Stripe Product/Price IDs
- [ ] Test Stripe webhook with tier detection logic

### Phase 2: Frontend Services & Types (Day 2-3)

- [ ] Create `src/lib/types/subscription.ts`
- [ ] Update `src/services/stripeService.ts`:
  - [ ] Add `getRecommendedTier()`
  - [ ] Add `checkTierUpgradeRequired()`
  - [ ] Add `createTierChangeNotification()`
- [ ] Test tier calculation logic

### Phase 3: UI Components (Day 3-4)

- [ ] Create `TierUpgradeDialog.tsx`
- [ ] Create `SubscriptionNotifications.tsx`
- [ ] Update `Team.tsx` with tier upgrade check
- [ ] Update `MainLayout.tsx` to show notifications
- [ ] Test tier upgrade flow end-to-end

### Phase 4: Landing Page & Marketing (Day 4-5)

- [ ] Update `LandingEnhanced.tsx` pricing section
- [ ] Add monthly/annual toggle
- [ ] Add tier comparison table
- [ ] Update marketing copy for value-based positioning
- [ ] Test pricing display on mobile

### Phase 5: Subscription Page (Day 5)

- [ ] Update `Subscription.tsx` with tier-based selection
- [ ] Show recommended tier based on user count
- [ ] Add tier comparison matrix
- [ ] Test checkout flow for each tier

### Phase 6: Testing & QA (Day 6-7)

- [ ] Test tier upgrade when adding 3rd user (Starter → Team)
- [ ] Test tier upgrade when adding 6th user (Team → Business)
- [ ] Test tier downgrade when removing users
- [ ] Test notifications appear in header
- [ ] Test webhook tier detection
- [ ] Test proration calculation in Stripe Dashboard
- [ ] Test error handling (payment failures, API errors)

### Phase 7: Documentation & Launch (Day 7)

- [ ] Update user documentation
- [ ] Create internal runbook for tier management
- [ ] Test in production with test mode
- [ ] Switch to live mode
- [ ] Monitor Stripe Dashboard for subscriptions

---

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Conversion Rate**: % of free trial users who convert to paid
2. **Average Revenue Per Organization (ARPO)**: Total MRR / Active Orgs
3. **Tier Distribution**: % of customers in each tier
4. **Upgrade Rate**: % of customers who upgrade tiers
5. **Churn Rate**: % of customers who cancel per month

### Target Metrics (3-month horizon)

- Conversion Rate: >20%
- ARPO: $50-75/month
- Tier Distribution: 40% Starter, 40% Team, 20% Business
- Upgrade Rate: 15% per quarter
- Churn Rate: <5% per month

---

## Future Enhancements

### V2 Features (Post-Launch)

1. **Custom Enterprise Pricing**
   - Manual pricing for 50+ users
   - Custom contracts
   - Volume discounts

2. **Add-On Features**
   - Premium templates ($10/month)
   - API access ($25/month)
   - White-label branding ($50/month)

3. **Usage-Based Pricing Components**
   - Charge per quote sent (above quota)
   - Charge per API call (above quota)

4. **Annual Billing Incentives**
   - Increase discount to 20% for annual
   - Offer 2 months free

5. **Referral Program**
   - Give 1 month free for successful referral
   - Referred customer gets 10% off first year

---

## Appendix

### Stripe Setup Checklist

1. **Create Products in Stripe Dashboard**
   ```
   Product: Professional Plan (Graduated Pricing)
   - Monthly Price: Graduated tiers
     - Tier 1 (1-2 users): $15/user
     - Tier 2 (3-5 users): $12/user
     - Tier 3 (6+ users): $10/user

   - Yearly Price: Graduated tiers
     - Tier 1 (1-2 users): $150/user/year
     - Tier 2 (3-5 users): $120/user/year
     - Tier 3 (6+ users): $100/user/year
   ```

2. **Configure Webhook**
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
   - Endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`

3. **Test Mode**
   - Use test credit card: 4242 4242 4242 4242
   - Test all tier upgrades
   - Verify proration charges

### Contact & Support

**Questions?** Contact the development team or refer to:
- Stripe Documentation: https://stripe.com/docs
- Supabase Functions: https://supabase.com/docs/guides/functions
- This PRD: `PRD_TIERED_SEAT_BASED_PRICING.md`

---

**End of PRD**
