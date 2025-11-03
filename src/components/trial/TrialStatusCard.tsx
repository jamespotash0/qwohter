import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, X, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrialProgressRing } from './TrialProgressRing';

interface TrialStatusCardProps {
  /** Days remaining in trial */
  daysRemaining: number;
  /** Trial end date */
  trialEnd: string;
  /** Callback when card is dismissed */
  onDismiss?: () => void;
  /** Whether user has payment method */
  hasPaymentMethod?: boolean;
  /** Whether in grace period */
  inGracePeriod?: boolean;
  /** Grace period days remaining */
  graceDaysRemaining?: number;
}

/**
 * Hero card shown on dashboard during trial period
 * Displays progress, features to try, and CTA
 */
export const TrialStatusCard: React.FC<TrialStatusCardProps> = ({
  daysRemaining,
  trialEnd,
  onDismiss,
  hasPaymentMethod = false,
  inGracePeriod = false,
  graceDaysRemaining = 0,
}) => {
  const navigate = useNavigate();
  const [isDismissing, setIsDismissing] = useState(false);

  // Features checklist - encourage feature adoption
  const features = [
    { name: 'Create your first proposal', path: '/quotes/new', completed: false },
    { name: 'Customize your company settings', path: '/settings?tab=company', completed: false },
    { name: 'Invite team members', path: '/settings?tab=team', completed: false },
    { name: 'View analytics dashboard', path: '/analytics', completed: false },
  ];

  const handleDismiss = () => {
    setIsDismissing(true);
    // Store dismissal in localStorage with timestamp
    const dismissUntil = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem('trial_card_dismissed_until', dismissUntil.toString());

    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const handleUpgrade = () => {
    navigate('/settings?tab=billing');
  };

  const handleFeatureClick = (path: string) => {
    navigate(path);
  };

  // Determine urgency messaging
  const getUrgencyMessage = () => {
    if (inGracePeriod) {
      // GRACE PERIOD - Maximum urgency
      return {
        title: `🚨 GRACE PERIOD: ${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'Day' : 'Days'} Left!`,
        subtitle: 'Your trial has expired. Add payment NOW to keep your access.',
        urgency: 'critical',
      };
    } else if (daysRemaining <= 1) {
      return {
        title: '🚨 Last Day of Your Free Trial!',
        subtitle: 'Add a payment method today to continue uninterrupted access',
        urgency: 'critical',
      };
    } else if (daysRemaining <= 3) {
      return {
        title: '⚠️ Your Trial is Ending Soon',
        subtitle: `Only ${daysRemaining} days left to explore all features`,
        urgency: 'high',
      };
    } else if (daysRemaining <= 7) {
      return {
        title: '⏰ Trial Halfway Point',
        subtitle: `${daysRemaining} days remaining to experience everything`,
        urgency: 'medium',
      };
    } else {
      return {
        title: '✨ Welcome to Your Free Trial!',
        subtitle: `${daysRemaining} days to explore all premium features`,
        urgency: 'low',
      };
    }
  };

  const message = getUrgencyMessage();

  // Get gradient based on urgency
  const getGradient = () => {
    switch (message.urgency) {
      case 'critical':
        return 'from-red-500 via-pink-500 to-purple-600';
      case 'high':
        return 'from-orange-500 via-red-500 to-pink-600';
      case 'medium':
        return 'from-yellow-400 via-orange-500 to-red-500';
      default:
        return 'from-blue-500 via-purple-500 to-pink-500';
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-2xl transition-all duration-300 ${
        isDismissing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-95`} />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <CardContent className="relative p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">
              {message.title}
            </h2>
            <p className="text-white/90 text-lg">
              {message.subtitle}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            aria-label="Dismiss for 24 hours"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-8 items-start">
          {/* Progress Ring */}
          <div className="flex flex-col items-center justify-center">
            {inGracePeriod ? (
              <div className="w-[140px] flex flex-col items-center justify-center">
                <div className="text-6xl font-bold text-white animate-pulse">
                  {graceDaysRemaining}
                </div>
                <div className="text-white/90 text-sm font-bold mt-2 text-center">
                  GRACE {graceDaysRemaining === 1 ? 'DAY' : 'DAYS'}
                </div>
                <div className="text-white/70 text-xs mt-1">
                  Then access ends
                </div>
              </div>
            ) : (
              <>
                <TrialProgressRing
                  daysRemaining={daysRemaining}
                  size={140}
                  strokeWidth={10}
                  showPercentage={false}
                />
                <div className="mt-4 text-center">
                  <div className="text-4xl font-bold text-white">
                    {daysRemaining}
                  </div>
                  <div className="text-white/80 text-sm font-medium">
                    {daysRemaining === 1 ? 'day left' : 'days left'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Features to Try */}
          <div>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Features to Try
            </h3>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => handleFeatureClick(feature.path)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all group"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-white/50 flex items-center justify-center flex-shrink-0">
                    {feature.completed && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-white text-sm font-medium flex-1">
                    {feature.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="flex flex-col gap-4 lg:min-w-[200px]">
            {!hasPaymentMethod ? (
              <>
                <Button
                  onClick={handleUpgrade}
                  size="lg"
                  className="w-full bg-white text-purple-600 hover:bg-gray-50 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
                <p className="text-white/70 text-xs text-center">
                  No charge until trial ends
                </p>
              </>
            ) : (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-white mx-auto mb-2" />
                <p className="text-white font-semibold">
                  Payment method added!
                </p>
                <p className="text-white/70 text-sm mt-1">
                  You're all set
                </p>
              </div>
            )}

            {/* Trial end date */}
            <div className="text-center">
              <p className="text-white/60 text-xs">
                Trial ends on
              </p>
              <p className="text-white text-sm font-medium">
                {new Date(trialEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
