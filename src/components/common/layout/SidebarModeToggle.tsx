import { Sidebar as SidebarFilled, SidebarSimple } from "@phosphor-icons/react";
import { useSidebar, type SidebarMode } from "@/components/ui/sidebar";

const MODE_LABELS: Record<SidebarMode, string> = {
  expanded: "Sidebar stays open",
  hover: "Sidebar opens on hover",
};

const NEXT_MODE_LABELS: Record<SidebarMode, string> = {
  expanded: "Click to open on hover instead",
  hover: "Click to keep it open",
};

/**
 * Both modes stay on the panel metaphor rather than mixing in a pin: a solid
 * panel with its rail filled in for "stays open", a plain outline for "opens
 * on hover".
 */
const MODE_ICONS: Record<SidebarMode, typeof SidebarSimple> = {
  expanded: SidebarFilled,
  hover: SidebarSimple,
};

/**
 * Toggles the sidebar between its two display modes: stays open, or collapsed
 * until hovered.
 *
 * Deliberately has no tooltip. It lives inside the logo slot, and a tooltip
 * trigger wrapping it interfered with the hover that opens the sidebar.
 * The state is carried by the icon; the label is left to assistive tech.
 */
export function SidebarModeToggle({ className = "" }: { className?: string }) {
  const { mode, cycleMode } = useSidebar();
  const Icon = MODE_ICONS[mode];

  return (
    <button
      type="button"
      onClick={cycleMode}
      aria-label={`${MODE_LABELS[mode]}. ${NEXT_MODE_LABELS[mode]}`}
      className={`h-10 w-10 flex items-center justify-center text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] transition-all duration-[120ms] focus:outline-none focus-visible:outline-none ${className}`}
      style={{ borderRadius: "var(--sidebar-nav-border-radius)" }}
    >
      <Icon
        size={18}
        weight={mode === "expanded" ? "fill" : "regular"}
        className="text-[var(--sidebar-icon-default)] hover:text-[var(--sidebar-icon-hover)] transition-all duration-[120ms]"
      />
    </button>
  );
}
