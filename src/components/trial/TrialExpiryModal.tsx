import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, CheckCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TrialExpiryModalProps {
  /** Days remaining in trial */
  daysRemaining: number;
  /** Whether to show the modal */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional: metrics to show user value */
  metrics?: {
    proposalsCreated?: number;
    totalRevenue?: number;
    teamMembers?: number;
  };
}

/**
 * Modal shown at 3-day warning before trial expiration
 * Shows value metrics and encourages payment method addition
 */
export const TrialExpiryModal: React.FC<TrialExpiryModalProps> = ({
  daysRemaining,
  open,
  onClose,
  metrics,
}) => {
  const navigate = useNavigate();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if we should show this modal
    // Only show once when hitting 3-day threshold
    const lastShown = localStorage.getItem('trial_expiry_modal_shown');
    const now = Date.now();

    if (daysRemaining === 3 && open) {
      // Show once per day at 3-day mark
      if (!lastShown || (now - parseInt(lastShown)) > 24 * 60 * 60 * 1000) {
        setShouldShow(true);
        localStorage.setItem('trial_expiry_modal_shown', now.toString());
      }
    }
  }, [daysRemaining, open]);

  const handleAddPayment = () => {
    navigate('/settings?tab=billing');
    onClose();
  };

  const handleRemindLater = () => {
    // Set reminder for tomorrow
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('trial_expiry_modal_remind_at', tomorrow.toString());
    onClose();
  };

  if (!shouldShow || !open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <DialogTitle className="text-2xl font-bold text-gray-900">
            Your Trial Ends in {daysRemaining} Days
          </DialogTitle>

          <DialogDescription className="text-base text-gray-600 mt-2">
            You've made great progress! Add a payment method now to ensure uninterrupted access to all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Value Metrics */}
          {metrics && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Your Progress So Far
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {metrics.proposalsCreated !== undefined && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {metrics.proposalsCreated}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Proposals Created
                    </div>
                  </div>
                )}
                {metrics.totalRevenue !== undefined && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      ${metrics.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Total Value
                    </div>
                  </div>
                )}
                {metrics.teamMembers !== undefined && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {metrics.teamMembers}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Team Members
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Benefits Reminder */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              What You'll Keep With Your Subscription:
            </h3>
            <div className="space-y-2">
              {[
                'Unlimited proposals',
                'Full team collaboration features',
                'Advanced analytics and reporting',
                'Priority customer support',
                'All your data and history',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* No Charge Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium text-center">
              💳 No charge until your trial ends on Day 14
            </p>
            <p className="text-xs text-green-700 text-center mt-1">
              Cancel anytime, no questions asked
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAddPayment}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-6 text-base"
            >
              Add Payment Method Now
            </Button>
            <Button
              onClick={handleRemindLater}
              variant="outline"
              className="flex-1 py-6"
            >
              Remind Me Tomorrow
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-gray-500">
            Questions? Contact our support team anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
