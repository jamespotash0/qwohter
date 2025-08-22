import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * WizardStep Props
 */
interface WizardStepProps {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

/**
 * WizardStep Component
 * Generic wrapper for individual wizard steps with consistent styling
 * 
 * Features:
 * - Consistent card-based layout
 * - Active state styling
 * - Optional title and description
 * - Smooth transitions
 * - Responsive design
 */
export const WizardStep: React.FC<WizardStepProps> = ({
  children,
  isActive = true,
  className,
  title,
  description,
}) => {
  return (
    <div
      className={cn(
        "transition-all duration-300",
        isActive ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {(title || description) && (
            <div className="mb-6">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-gray-600 text-sm">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </CardContent>
      </Card>
    </div>
  );
};