// Main Form Component
export { GlassWallFormRefactored as GlassWallFormBuilder } from './GlassWallFormRefactored';
export { default as GlassWallFormRefactored } from './GlassWallFormRefactored';

// Types
export type { 
  GlassWallConfiguration, 
  GlassWallConfigurationFormProps,
  ModelType 
} from './types';

// Components (for advanced use cases)
export { FormRow, SelectField, FrameThicknessField, PanelWidthField, ModelSelector } from './components';

// Hook (for custom implementations)
export { useGlassWallForm } from './hooks/useGlassWallForm';

// Data utilities
export { MODEL_CONFIGURATIONS, getFrameThickness, getPanelWidth } from './data/modelConfigurations';