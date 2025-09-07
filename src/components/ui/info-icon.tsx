import React, { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoIconProps {
  title: string;
  description: string;
  className?: string;
  size?: number;
  useDialog?: boolean; // If true, use dialog; if false, use tooltip
}

export const InfoIcon: React.FC<InfoIconProps> = ({
  title,
  description,
  className = "",
  size = 16,
  useDialog = true
}) => {
  const [open, setOpen] = useState(false);

  const iconElement = (
    <Info 
      size={size} 
      className={`cursor-help text-gray-400 hover:text-blue-500 transition-colors ${className}`}
    />
  );

  if (useDialog) {
    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
          className="cursor-help"
        >
          {iconElement}
        </div>
        {open && (
          <div className="absolute z-50 w-80 p-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg -left-40">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">
                {title}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {description}
              </p>
            </div>
            <div className="absolute -top-1 left-40 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {iconElement}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-xs text-gray-300">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};