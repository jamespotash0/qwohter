import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CollapsibleSectionProps } from './types';

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  headerAction
}) => (
  <Card className="mb-4">
    <CardHeader 
      className="p-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <CardTitle 
          className="flex items-center gap-2 text-sm cursor-pointer"
          onClick={onToggle}
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {icon}
          {title}
        </CardTitle>
        {headerAction && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        )}
      </div>
    </CardHeader>
    {isOpen && (
      <CardContent className="p-3 pt-0">
        {children}
      </CardContent>
    )}
  </Card>
);