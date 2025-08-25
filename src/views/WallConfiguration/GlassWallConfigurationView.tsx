// COMMENTED OUT - Potentially redundant glass wall configuration view
// This file is only used by GlassWallSection.tsx and might be part of an alternative approach
// The main glass wall functionality is handled by GlassWallForm.tsx and GlassWallSpecs.tsx
// Keeping commented for potential future reference.

import React from 'react';
import type { useGlassWallConfiguration } from '@/hooks/useGlassWallConfiguration';

interface GlassWallConfigurationViewProps {
  viewModel: ReturnType<typeof useGlassWallConfiguration>;
  className?: string;
}

// Placeholder export to prevent build errors
export const GlassWallConfigurationView: React.FC<GlassWallConfigurationViewProps> = () => {
  return null;
};

/*
ORIGINAL CONTENT COMMENTED OUT:

// Glass Wall Configuration View - Pure UI Component
// Separated from business logic for better maintainability and testing

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { useGlassWallConfiguration } from '@/hooks/useGlassWallConfiguration';

interface GlassWallConfigurationViewProps {
  viewModel: ReturnType<typeof useGlassWallConfiguration>;
  className?: string;
}

// Pure UI component for Glass Wall Configuration
// This component is responsible only for rendering the UI based on the viewModel state.
// All business logic, state management, and data processing is handled by the viewModel.
export const GlassWallConfigurationView: React.FC<GlassWallConfigurationViewProps> = ({
  viewModel,
  className = ""
}) => {
  
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="space-y-8">
        
        // Row 1: Glass Wall Model, Panel Configuration, Panel Count
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          // ... rest of original UI implementation was here
        </div>
        
        // ... more rows of form fields were here
        
      </CardContent>
    </Card>
  );
};

*/