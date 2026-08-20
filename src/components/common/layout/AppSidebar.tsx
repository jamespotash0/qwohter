import {
  House,
  FileText,
  ChartBar,
  Kanban,
  AddressBook,
  CheckSquare,
  SquaresFour,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";
import { useMemo, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";

interface MenuItem {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  path: string;
  roles: string[];
}

const ALL_ROLES = ['Owner', 'Admin', 'Member'];

/**
 * One flat list — no groups, no accordions. Settings lives in the profile menu.
 */
const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: House, path: "/dashboard", roles: ALL_ROLES },
  { title: "Proposals", icon: FileText, path: "/proposals", roles: ALL_ROLES },
  { title: "Projects", icon: Kanban, path: "/project-board", roles: ALL_ROLES },
  { title: "Tasks", icon: CheckSquare, path: "/task-board", roles: ALL_ROLES },
  { title: "Calendar", icon: CalendarBlankIcon, path: "/calendar", roles: ALL_ROLES },
  { title: "Contacts", icon: AddressBook, path: "/contacts", roles: ALL_ROLES },
  { title: "Forms", icon: SquaresFour, path: "/forms", roles: ALL_ROLES },
  { title: "Analytics", icon: ChartBar, path: "/analytics", roles: ALL_ROLES },
  // Products - HIDDEN for now
  // { title: "Products", icon: Package, path: "/products", roles: ALL_ROLES },
];

/**
 * Shared easing/duration for everything that moves when the sidebar opens.
 * Keeping the panel width, the labels and the header on one curve is what
 * makes the slide read as a single motion rather than several.
 */
const SLIDE = "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]";

export function AppSidebar() {
  const user = useUser();
  const { role: currentUserRole } = useCurrentOrganization(user?.id || '');

  const visibleItems = useMemo(
    () => menuItems.filter(item => !currentUserRole || item.roles.includes(currentUserRole)),
    [currentUserRole]
  );

  const { state, setIsHovered } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = useCallback((path: string, title: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    trackEvent('navigation_clicked', { item: title.toLowerCase().replace(/\s+/g, '_') });
    navigate(path);
  }, [navigate]);

  return (
    <Sidebar
      className="bg-sidebar-bg"
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SidebarContent className="px-0 pt-3 pb-6 flex-1">
        <SidebarGroup className="px-2 py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      /*
                        Three things in the shared cva have to be overridden:
                        !size-8 and !p-2 when collapsed, which snap the row to a
                        different shape mid-slide, and [&>svg]:size-4, which
                        pins every icon to 16px no matter what `size` the Icon
                        is given.

                        [&>svg]:!size-[18px] is the icon size dial. The left
                        inset must stay in step with it, since centring in the
                        collapsed rail is:
                          pl = (rail - 2*groupPadding - icon) / 2
                             = (64 - 16 - 18) / 2 = 15px
                        which also puts the icon centre on 32px — the centre of
                        the rail and of the logo slot above it.
                      */
                      className={`group/item h-12 w-full justify-start gap-3.5 overflow-hidden pl-[15px] pr-[15px] [&>svg]:!size-[18px] group-data-[collapsible=icon]:!size-auto group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!pl-[15px] transition-colors duration-200 ${
                        isActive
                          ? 'text-[var(--sidebar-nav-text-active)] [&:hover]:text-[var(--sidebar-nav-text-active)]'
                          : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)]'
                      }`}
                      style={{
                        borderRadius: 'var(--sidebar-nav-border-radius)',
                        ...(isActive
                          ? {
                              backgroundColor: 'var(--sidebar-nav-bg-active)',
                              color: 'var(--sidebar-nav-text-active)',
                            }
                          : {})
                      }}
                      onClick={(e) => handleNavigate(item.path, item.title, e)}
                    >
                      {/* Icon sits at a fixed x in both states, so it never moves */}
                      <Icon
                        size={18}
                        weight={isActive ? 'fill' : 'regular'}
                        className={`flex-shrink-0 transition-colors duration-200 ${
                          isActive
                            ? 'text-[var(--sidebar-icon-active)]'
                            : 'text-[var(--sidebar-icon-default)] group-hover/item:text-[var(--sidebar-icon-hover)]'
                        }`}
                        style={isActive ? { color: 'var(--sidebar-icon-active)' } : {}}
                      />
                      {/* Label stays mounted and fades, so it reveals with the panel */}
                      <span
                        className={`font-inter text-[15px] tracking-tight whitespace-nowrap ${SLIDE} ${
                          isActive ? 'font-medium' : 'font-normal'
                        } ${isCollapsed ? 'opacity-0 -translate-x-1' : 'opacity-100 translate-x-0'}`}
                      >
                        {item.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
