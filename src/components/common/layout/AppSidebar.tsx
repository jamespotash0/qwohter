import {
  House,
  FileText,
  ChartBar,
  Kanban,
  AddressBook,
  CheckSquare,
  CaretDown,
  Stack,
  CalendarBlankIcon,
  SquaresFour,
  Lock,
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
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QwohterLogo } from "@/components/common/QwohterLogo";
import { SidebarModeToggle } from "./SidebarModeToggle";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";

interface SubMenuItem {
  title: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>;
}

interface MenuItem {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  path: string;
  roles: string[];
  disabled?: boolean;
  subItems?: SubMenuItem[];
}

interface MenuSection {
  /** Shown above the group when the sidebar is expanded */
  label?: string;
  items: MenuItem[];
}

const ALL_ROLES = ['Owner', 'Admin', 'Member'];

/**
 * A single flat group. Settings lives in the profile menu, not here.
 */
const menuSections: MenuSection[] = [
  {
    items: [
      { title: "Dashboard", icon: House, path: "/dashboard", roles: ALL_ROLES },
      { title: "Proposals", icon: FileText, path: "/proposals", roles: ALL_ROLES },
      {
        title: "Board",
        icon: Stack,
        path: "/project-board",
        roles: ALL_ROLES,
        subItems: [
          { title: "Task Board", path: "/task-board", icon: CheckSquare },
          { title: "Project Board", path: "/project-board", icon: Kanban },
        ],
      },
      { title: "Calendar", icon: CalendarBlankIcon, path: "/calendar", roles: ALL_ROLES },
      { title: "Contacts", icon: AddressBook, path: "/contacts", roles: ALL_ROLES },
      { title: "Forms", icon: SquaresFour, path: "/forms", roles: ALL_ROLES },
      { title: "Analytics", icon: ChartBar, path: "/analytics", roles: ALL_ROLES },
      // Products - HIDDEN for now
      // { title: "Products", icon: Package, path: "/products", roles: ALL_ROLES },
    ],
  },
];

export function AppSidebar() {
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const previousPathRef = useRef<string>('');

  // Toggle expanded state for menu items with subItems
  const toggleExpanded = useCallback((title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  }, []);

  const user = useUser();
  const { role: currentUserRole } = useCurrentOrganization(user?.id || '');

  // Filter each section by role, then drop sections left with nothing in them
  const visibleSections = useMemo(
    () =>
      menuSections
        .map(section => ({
          ...section,
          items: section.items.filter(item => !currentUserRole || item.roles.includes(currentUserRole)),
        }))
        .filter(section => section.items.length > 0),
    [currentUserRole]
  );

  const { state, isHovered, setIsHovered } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  // Track path changes for animations
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      // Reset clicked item after navigation completes
      timer = setTimeout(() => setClickedItem(null), 500);
    }
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [location.pathname]);

  const handleNavigate = useCallback((path: string, title: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    trackEvent('navigation_clicked', { item: title.toLowerCase().replace(/\s+/g, '_') });
    setClickedItem(title);
    navigate(path);
  }, [navigate]);

  const renderMenuItem = (item: MenuItem, index: number) => {
    const isActive = location.pathname === item.path ||
      (item.subItems?.some(sub => location.pathname === sub.path) ?? false);
    const Icon = item.icon;
    const isDisabled = item.disabled || false;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isClicked = clickedItem === item.title;

    // Render expandable menu for items with subItems
    // Click toggles expand - parent item never shows active state
    if (hasSubItems) {
      const isExpanded = expandedItems.includes(item.title);

      // Collapsed view - use dropdown menu
      if (isCollapsed) {
        return (
          <SidebarMenuItem
            key={item.title}
            className="animate-in fade-in zoom-in-95 duration-200"
            style={{
              animationDelay: `${index * 40}ms`,
              animationFillMode: 'backwards'
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="h-10 flex items-center justify-center w-full px-0 group/item cursor-pointer text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] transition-all duration-300 ease-out"
                  style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
                >
                  <Icon
                    size={18}
                    weight="regular"
                    className="text-[var(--sidebar-icon-default)] group-hover/item:text-[var(--sidebar-icon-hover)] transition-all duration-300"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-[180px]">
                {item.subItems?.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = location.pathname === subItem.path;
                  return (
                    <DropdownMenuItem
                      key={subItem.path}
                      onClick={() => handleNavigate(subItem.path, subItem.title)}
                      className={`cursor-pointer ${isSubActive ? 'bg-gray-100 hover:bg-gray-100' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {SubIcon && <SubIcon size={16} weight={isSubActive ? 'fill' : 'regular'} />}
                        <span className={isSubActive ? 'font-medium' : ''}>{subItem.title}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        );
      }

      // Expanded view - toggleable accordion
      return (
        <div key={item.title}>
          <SidebarMenuItem
            className="animate-in fade-in slide-in-from-left-3 duration-300"
            style={{
              animationDelay: `${index * 40}ms`,
              animationFillMode: 'backwards'
            }}
          >
            {/* Clickable row - toggles expand, never shows active state */}
            <button
              className="h-10 w-full flex items-center relative group/item overflow-hidden cursor-pointer ml-[-2px] mr-[-10px] pl-[8px] pr-[2px] text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] transition-all duration-300 ease-out"
              style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
              onClick={() => toggleExpanded(item.title)}
            >
              {/* Icon */}
              <div className="flex items-center gap-3 flex-1">
                <Icon
                  size={18}
                  weight="regular"
                  className="text-[var(--sidebar-icon-default)] group-hover/item:text-[var(--sidebar-icon-hover)] transition-all duration-300"
                />
                <span className="font-inter font-normal tracking-tight transition-all duration-300 whitespace-nowrap">
                  {item.title}
                </span>
              </div>

              {/* Caret indicator */}
              <div className="px-2.5 flex items-center justify-center">
                <CaretDown
                  size={14}
                  weight="bold"
                  className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
          </SidebarMenuItem>

          {/* Expandable sub-items */}
          {isExpanded && (
            <div className="ml-6 mt-1 space-y-0.5 animate-in slide-in-from-top-2 fade-in duration-200">
              {item.subItems?.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = location.pathname === subItem.path;
                return (
                  <SidebarMenuItem key={subItem.path}>
                    <SidebarMenuButton
                      className={`h-9 flex items-center pl-2 pr-3 group/subitem ${
                        isSubActive
                          ? 'text-[var(--sidebar-nav-text-active)] bg-[var(--sidebar-nav-bg-active)] hover:bg-[var(--sidebar-nav-bg-active)] hover:text-[var(--sidebar-nav-text-active)]'
                          : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)]'
                      } transition-all duration-200`}
                      style={{ borderRadius: 'var(--sidebar-nav-border-radius)' }}
                      onClick={(e) => handleNavigate(subItem.path, subItem.title, e)}
                    >
                      <div className="flex items-center gap-2.5">
                        {SubIcon && (
                          <SubIcon
                            size={16}
                            weight={isSubActive ? 'fill' : 'regular'}
                            className={`transition-all duration-200 ${
                              isSubActive
                                ? 'text-[var(--sidebar-icon-active)]'
                                : 'text-[var(--sidebar-icon-default)] group-hover/subitem:text-[var(--sidebar-icon-hover)]'
                            }`}
                          />
                        )}
                        <span className={`text-sm ${isSubActive ? 'font-medium' : ''}`}>
                          {subItem.title}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular menu item (no subItems)
    return (
      <SidebarMenuItem
        key={item.title}
        className={`${
          isCollapsed
            ? 'animate-in fade-in zoom-in-95 duration-200'
            : 'animate-in fade-in slide-in-from-left-3 duration-300'
        }`}
        style={{
          animationDelay: `${index * 40}ms`,
          animationFillMode: 'backwards'
        }}
      >
        <SidebarMenuButton
          className={`h-10 flex items-center relative group/item overflow-hidden ${
            isCollapsed ? 'justify-center w-full px-0' : 'ml-[-2px] mr-[-10px] pl-[8px] pr-[13px]'
          } ${
            isDisabled
              ? 'text-[var(--sidebar-nav-text)] opacity-50 cursor-not-allowed'
              : isActive
              ? 'text-[var(--sidebar-nav-text-active)] shadow-sm [&:hover]:text-[var(--sidebar-nav-text-active)] scale-[1.01]'
              : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] hover:translate-x-0.5 hover:scale-[1.02] active:scale-[0.98]'
          } transition-all duration-300 ease-out`}
          style={{
            borderRadius: isCollapsed ? '10px' : 'var(--sidebar-nav-border-radius)',
            ...(isActive && !isDisabled
              ? {
                  backgroundColor: 'var(--sidebar-nav-bg-active)',
                  color: 'var(--sidebar-nav-text-active)',
                }
              : {})
          }}
          onClick={(e) => {
            if (!isDisabled) {
              handleNavigate(item.path, item.title, e);
            } else {
              e.preventDefault();
            }
          }}
        >
          {/* Ripple effect on click */}
          {isClicked && (
            <div
              className="absolute inset-0 rounded-[var(--sidebar-nav-border-radius)] bg-[var(--sidebar-icon-active)] opacity-20 animate-ping"
              style={{ animationDuration: '600ms', animationIterationCount: '1' }}
            />
          )}

          <div className="relative flex items-center gap-3 z-10">
            <div className={`relative transition-all duration-300 ${
              isActive && !isDisabled ? 'scale-110' : isClicked ? 'scale-95' : 'scale-100'
            }`}>
              <Icon
                size={18}
                weight={isActive && !isDisabled ? 'fill' : 'regular'}
                className={`transition-all duration-300 ${
                  isDisabled
                    ? 'opacity-50 group-hover/item:opacity-0'
                    : isActive
                    ? 'text-[var(--sidebar-icon-active)] [&:hover]:text-[var(--sidebar-icon-active)]'
                    : 'text-[var(--sidebar-icon-default)] group-hover/item:text-[var(--sidebar-icon-hover)] group-hover/item:scale-125'
                }`}
                style={isActive && !isDisabled ? { color: 'var(--sidebar-icon-active)' } : {}}
              />
            </div>
            {isDisabled && (
              <Lock
                size={18}
                weight="regular"
                className="absolute left-0 opacity-0 group-hover/item:opacity-100 transition-all duration-200 text-[var(--sidebar-icon-default)]"
              />
            )}
            {!isCollapsed && (
              <span className={`font-inter font-normal tracking-tight transition-all duration-300 whitespace-nowrap group-hover/item:scale-105 origin-left ${
                isActive ? 'font-medium' : ''
              }`}>
                {item.title}
              </span>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      className="bg-sidebar-bg transition-all duration-200 ease-in-out"
      collapsible="icon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Logo and mode toggle */}
      <SidebarHeader className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'px-0 pt-5 pb-0' : 'pl-5 pr-3 pt-6 pb-1'}`}>
        <div className="flex items-center justify-between">
          {/* Logo (swaps to the mode toggle on hover while collapsed) */}
          <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            {isCollapsed ? (
              <div className="relative">
                <div className={`transition-all duration-300 ease-in-out ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                  <QwohterLogo size="sm" />
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                  <SidebarModeToggle />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <QwohterLogo size="sm" />
              </div>
            )}
          </div>
          {/* Mode toggle */}
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <SidebarModeToggle />
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 pt-3 pb-6 flex-1 transition-all duration-300">
        {visibleSections.map((section, sectionIndex) => (
          <SidebarGroup key={section.label ?? `section-${sectionIndex}`} className="py-0">
            {section.label && (
              !isCollapsed ? (
                <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-section-label)] animate-in fade-in duration-300">
                  {section.label}
                </div>
              ) : (
                <div className="flex justify-center py-2">
                  <div className="w-6 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
              )
            )}
            <SidebarGroupContent>
              <SidebarMenu className={isCollapsed ? 'space-y-1' : 'space-y-0'}>
                {section.items.map((item, index) => renderMenuItem(item, index))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

    </Sidebar>
  );
}
