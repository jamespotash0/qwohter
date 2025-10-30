/**
 * 📊 KPI Card Component
 *
 * Displays key performance indicators with:
 * - Blue-tint theme matching main app
 * - Trend indicators (up/down arrows with %)
 * - Icon with colored background
 * - Hover effects
 * - Click-through functionality
 */

import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { TrendBadge } from './TrendBadge';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: 'blue' | 'green' | 'orange' | 'purple' | 'gray';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string; // e.g., "vs last month"
  };
  onClick?: () => void;
  className?: string;
}

export const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
  trend,
  onClick,
  className
}: KPICardProps) => {
  // Icon background gradients matching your brand (coral #EE6C4D, etc.)
  const iconBgClasses = {
    blue: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
    green: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30',
    orange: 'from-[#FEF3F1] to-[#FED7D0] dark:from-[#EE6C4D]/20 dark:to-[#EE6C4D]/10', // Coral theme
    purple: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30',
    gray: 'from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30',
  };

  // Icon colors matching your brand
  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    orange: 'text-[#EE6C4D] dark:text-[#EE6C4D]', // Your brand coral
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <Card
      className={cn(
        // Your custom styling: white background, light shadows
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left side: Icon + Content */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Icon with colored background */}
            <div className={cn(
              'flex-shrink-0 p-3 rounded-xl bg-gradient-to-br',
              iconBgClasses[iconColor]
            )}>
              <Icon className={cn('w-5 h-5', iconColorClasses[iconColor])} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {title}
              </h3>

              {/* Value - Large and bold */}
              <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {value}
              </p>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Trend badge */}
          {trend && (
            <div className="flex-shrink-0 ml-2">
              <TrendBadge {...trend} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
