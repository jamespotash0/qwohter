/**
 * Sidebar - Refactored Component System
 * 
 * This file maintains backward compatibility while using the new modular structure.
 * The original 761-line component has been decomposed into focused, maintainable modules.
 * 
 * Refactoring Benefits:
 * - Single Responsibility Principle compliance
 * - Improved testability
 * - Better code organization
 * - Enhanced maintainability
 * - Clearer separation of concerns
 * 
 * Architecture:
 * - constants.ts: Configuration values
 * - types.ts: TypeScript definitions
 * - SidebarContext.tsx: Context and hooks
 * - SidebarProvider.tsx: State management and provider
 * - SidebarComponents.tsx: Core sidebar components
 * - SidebarMenu.tsx: Menu system components
 * - index.ts: Public API exports
 */

// Re-export all components for backward compatibility
export * from './sidebar/index';