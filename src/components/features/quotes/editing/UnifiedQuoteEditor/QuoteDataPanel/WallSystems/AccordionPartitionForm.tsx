import React from 'react';
import { Label } from '@/components/ui/label';
import { WallTypeFormProps } from './types';

export const AccordionPartitionForm: React.FC<WallTypeFormProps> = () => (
  <div className="mt-4 pt-4 border-t border-gray-200">
    <div className="space-y-2">
      <Label className="text-xs font-medium text-gray-600">
        Accordion Partitions Configuration
      </Label>
      <div className="text-xs text-gray-500 italic">
        Additional configuration options for Accordion Partitions will be available in a future update.
      </div>
    </div>
  </div>
);