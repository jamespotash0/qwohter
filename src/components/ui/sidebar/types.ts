/**
 * Sidebar Type Definitions
 * TypeScript interfaces and types for sidebar components
 */

export type SidebarState = "expanded" | "collapsed";

/**
 * Sidebar display mode (user preference, persisted):
 * - "expanded" → stays open
 * - "hover"    → collapsed, expands while the pointer is over it
 */
export type SidebarMode = "expanded" | "hover";

export type SidebarContext = {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  /** Persisted display mode */
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  /** Toggle between expanded and hover */
  cycleMode: () => void;
  /** Whether the pointer is currently over the sidebar (drives "hover" mode) */
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
};
