// Re-export the refactored WallSystemsSection component
// This maintains backward compatibility while using the new modular structure

export { WallSystemsSection, WallSystemsSection as default } from './WallSystems/';
export type { WallSystemsSectionProps, WallCardProps, WallTypeFormProps, WallSystemType } from './WallSystems/';