import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarContext } from "./SidebarContext";
import {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_MODE_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_KEYBOARD_SHORTCUT
} from "./constants";
import type { SidebarContext as SidebarContextType, SidebarMode } from "./types";

/**
 * SidebarProvider Props
 */
export interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean;
  defaultMode?: SidebarMode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MODE_CYCLE: SidebarMode[] = ["expanded", "hover"];

/**
 * Grace period before an un-hover collapses the sidebar. The panel animates its
 * own width, so its edge moves under a stationary pointer; without a short
 * delay a cursor resting near the rail edge can flicker it open and shut.
 */
const HOVER_LEAVE_DELAY_MS = 80;

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));
  return match?.split("=")[1];
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
}

/**
 * SidebarProvider Component
 * Manages sidebar state, keyboard shortcuts, and provides context to children
 *
 * Features:
 * - Three display modes: expanded (pinned open), hover (opens on hover), collapsed (pinned closed)
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
      defaultMode,
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
    const [isHovered, _setIsHovered] = React.useState(false);
    const hoverLeaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Enter wins immediately; leave is deferred so a moving panel edge does
    // not read as an intentional leave.
    const setIsHovered = React.useCallback((hovered: boolean) => {
      if (hoverLeaveTimer.current) {
        clearTimeout(hoverLeaveTimer.current);
        hoverLeaveTimer.current = null;
      }
      if (hovered) {
        _setIsHovered(true);
      } else {
        hoverLeaveTimer.current = setTimeout(() => _setIsHovered(false), HOVER_LEAVE_DELAY_MS);
      }
    }, []);

    React.useEffect(() => () => {
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    }, []);

    // Resolve the initial mode: mode cookie wins, then the legacy boolean
    // cookie, then the defaults passed in by the caller.
    const getInitialMode = (): SidebarMode => {
      const storedMode = readCookie(SIDEBAR_MODE_COOKIE_NAME);
      if (storedMode === "expanded" || storedMode === "hover") {
        return storedMode;
      }
      // "collapsed" was a third mode that has since been removed
      if (storedMode === "collapsed") return "hover";
      const legacyOpen = readCookie(SIDEBAR_COOKIE_NAME);
      if (legacyOpen === "true") return "expanded";
      if (legacyOpen === "false") return "hover";
      if (defaultMode) return defaultMode;
      return defaultOpen ? "expanded" : "hover";
    };

    const [mode, _setMode] = React.useState<SidebarMode>(getInitialMode);

    const setMode = React.useCallback((value: SidebarMode) => {
      _setMode(value);
      writeCookie(SIDEBAR_MODE_COOKIE_NAME, value);
      // Keep the legacy cookie roughly in sync for anything still reading it
      writeCookie(SIDEBAR_COOKIE_NAME, String(value === "expanded"));
    }, []);

    const cycleMode = React.useCallback(() => {
      _setMode((current) => {
        const next = MODE_CYCLE[(MODE_CYCLE.indexOf(current) + 1) % MODE_CYCLE.length];
        writeCookie(SIDEBAR_MODE_COOKIE_NAME, next);
        writeCookie(SIDEBAR_COOKIE_NAME, String(next === "expanded"));
        return next;
      });
    }, []);

    // Derived open state — "hover" mode only reads as open while hovered
    const derivedOpen = mode === "expanded" || (mode === "hover" && isHovered);
    const open = openProp ?? derivedOpen;

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;

        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          setMode(openState ? "expanded" : "hover");
        }
      },
      [setOpenProp, open, setMode]
    );

    // Toggle sidebar based on device type
    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((openState) => !openState)
        : setOpen((openState) => !openState);
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
        mode,
        setMode,
        cycleMode,
        isHovered,
        setIsHovered,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, mode, setMode, cycleMode, isHovered, setIsHovered]
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
