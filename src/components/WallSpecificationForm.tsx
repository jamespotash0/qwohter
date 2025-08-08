// Wall Specification Form - MVVM Architecture  
// Refactored to use the new ViewModel pattern while maintaining backwards compatibility

import React from 'react';
import { WallDetails } from '@/types/quote';
import { WallSpecificationView } from '@/views/WallConfiguration';
import { useWallSpecification } from '@/hooks/useWallSpecification';

interface WallSpecificationFormProps {
  walls: WallDetails;
  onUpdate: (walls: WallDetails) => void;
  className?: string;
}

/**
 * Wall Specification Form - Container Component
 * 
 * This component now acts as a smart container that:
 * 1. Uses the useWallSpecification hook for business logic
 * 2. Passes the ViewModel to the pure WallSpecificationView
 * 3. Maintains the same props interface for backwards compatibility
 * 
 * Benefits of the refactor:
 * - Separation of concerns (UI vs Business Logic)
 * - Easier testing (can test ViewModel independently) 
 * - Better maintainability and readability
 * - Reusable business logic across different UIs
 * - Centralized validation and state management
 */
const WallSpecificationForm: React.FC<WallSpecificationFormProps> = ({ 
  walls, 
  onUpdate,
  className = ""
}) => {
  
  // Use the custom hook to get the ViewModel with all business logic
  const viewModel = useWallSpecification({
    walls,
    onUpdate
  });
  
  // Simply pass the ViewModel to the pure View component
  return (
    <WallSpecificationView 
      viewModel={viewModel}
      className={className}
    />
  );
};

export default WallSpecificationForm;