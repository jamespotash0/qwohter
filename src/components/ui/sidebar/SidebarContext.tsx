import * as React from "react";
import type { SidebarContext as SidebarContextType } from "./types";


/**
 * Sidebar Context
 * Provides sidebar state and actions to child components
 */
export const SidebarContext = React.createContext<SidebarContextType | null>(null);

/**
 * useSidebar Hook
 * Provides access to sidebar context with proper error handling
 */
export function useSidebar(): SidebarContextType {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}