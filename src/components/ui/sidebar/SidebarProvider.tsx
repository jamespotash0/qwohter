import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarContext } from "./SidebarContext";
import { 
  SIDEBAR_COOKIE_NAME, 
  SIDEBAR_COOKIE_MAX_AGE, 
  SIDEBAR_WIDTH, 
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_KEYBOARD_SHORTCUT 
} from "./constants";
import type { SidebarContext as SidebarContextType } from "./types";

/**
 * SidebarProvider Props
 */
export interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * SidebarProvider Component
 * Manages sidebar state, keyboard shortcuts, and provides context to children
 * 
 * Features:
 * - Controlled/uncontrolled mode support
 * - Mobile-responsive behavior
 * - Keyboard shortcut (Cmd/Ctrl + B)
 * - Cookie-based state persistence
 * - Tooltip provider integration
 */
export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    // Read initial state from cookie if available
    const getInitialOpenState = () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split('; ');
        const sidebarCookie = cookies.find(cookie => cookie.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
        if (sidebarCookie) {
          const value = sidebarCookie.split('=')[1];
          return value === 'true';
        }
      }
      return defaultOpen;
    };

    // Internal state for uncontrolled mode
    const [_open, _setOpen] = React.useState(getInitialOpenState);
    const open = openProp ?? _open;
    
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        // Persist sidebar state in cookie
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );

    // Toggle sidebar based on device type
    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    // Keyboard shortcut handler
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    // Compute current state for styling
    const state = open ? "expanded" : "collapsed";

    // Memoized context value
    const contextValue = React.useMemo<SidebarContextType>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);

SidebarProvider.displayName = "SidebarProvider";