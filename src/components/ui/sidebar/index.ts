/**
 * Sidebar Component System
 * 
 * A complete sidebar implementation with:
 * - Context-based state management
 * - Responsive behavior (desktop/mobile)
 * - Keyboard shortcuts
 * - Tooltip integration
 * - Collapsible functionality
 * - Menu system with variants
 * 
 * Usage:
 * ```tsx
 * import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
 * 
 * <SidebarProvider>
 *   <Sidebar>
 *     <SidebarContent>
 *       <SidebarMenu>
 *         <SidebarMenuItem>
 *           <SidebarMenuButton>Home</SidebarMenuButton>
 *         </SidebarMenuItem>
 *       </SidebarMenu>
 *     </SidebarContent>
 *   </Sidebar>
 * </SidebarProvider>
 * ```
 */

// Core Provider and Context
export { SidebarProvider } from './SidebarProvider';
export type { SidebarProviderProps } from './SidebarProvider';
export { SidebarContext, useSidebar } from './SidebarContext';

// Main Components
export {
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
} from './SidebarComponents';

// Menu System
export {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  sidebarMenuButtonVariants,
} from './SidebarMenu';

// Types and Constants
export type { SidebarState, SidebarMode, SidebarContext as SidebarContextType } from './types';
export * from './constants';