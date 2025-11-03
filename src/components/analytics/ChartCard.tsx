/**
 * 📊 Chart Card Component
 *
 * Wrapper for charts with:
 * - Title and subtitle
 * - Expand button for full-screen view
 * - Clean white background
 * - Consistent padding and spacing
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Download } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onExpand?: () => void;
  onExport?: () => void;
  className?: string;
  height?: string;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  onExpand,
  onExport,
  className,
  height = 'h-80'
}: ChartCardProps) => {
  return (
    <Card
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
        'shadow-sm',
        className
      )}
    >
      <CardHeader className="relative pb-2">
        <div className="pr-20">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Export chart"
            >
              <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          )}
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Expand chart"
            >
              <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('pt-4', height)}>
        {children}
      </CardContent>
    </Card>
  );
};
