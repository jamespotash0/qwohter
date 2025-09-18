import { BarChart3, Home, Users, FileText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { ThemeToggleSwitch } from "@/components/common/ThemeToggleSwitch";
import { QwohterLogo } from "@/components/common/QwohterLogo";
interface AppSidebarProps {
  user: string;
  onLogout: () => void;
}
const menuItems = [{
  title: "Dashboard",
  icon: Home,
  path: "/dashboard"
}, {
  title: "Quotes",
  icon: FileText,
  path: "/quotes"
}, {
  title: "Analytics", 
  icon: BarChart3, 
  path: "/analytics"
}, {
  title: "Team",
  icon: Users,
  path: "/team"
}
];
// Removed generalItems - Settings and Logout moved to header
export function AppSidebar({
  // user,
  onLogout
}: AppSidebarProps) {
  const {
    state,
    setOpen
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    // Force sidebar to stay collapsed if it was collapsed
    if (isCollapsed) {
      // Use setTimeout to ensure the sidebar state is forced after any potential expansion
      setTimeout(() => {
        setOpen(false);
      }, 0);
    }
  };

  const handleLogout = () => {
    onLogout();
    // Force sidebar to stay collapsed if it was collapsed
    if (isCollapsed) {
      setTimeout(() => {
        setOpen(false);
      }, 0);
    }
  };
  return (
    <Sidebar 
      className={`${isCollapsed ? "w-16" : "w-60"} shadow-xl sidebar-theme`} 
      collapsible="icon" 
      style = {{
        backgroundColor: "var(--sidebar-bg)",
        color: "var(--text-secondary)",
      } as any}
    >
      <SidebarHeader className="p-3 border-b" style={{borderColor: "var(--border-primary)"}}>
        {isCollapsed ? (
          <div className="flex justify-center">
            {/* Logo disappears when collapsed, only show toggle */}
            <SidebarTrigger 
              className="h-8 w-8 p-2 rounded-md transition-all duration-200" 
              style={{color: "var(--text-secondary)"}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {/* Logo takes up more room to the right when expanded */}
            <div className="flex-1 pr-4">
              <QwohterLogo size="md" />
            </div>
            <SidebarTrigger 
              className="h-8 w-8 p-2 rounded-md transition-all duration-200 flex-shrink-0" 
              style={{color: "var(--text-secondary)"}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium mb-2" style={{color: "#a3adc2"}}>
            {!isCollapsed ? "MENU" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      className={`w-full justify-start transition-all duration-200 ${isActive ? "font-medium shadow-md" : ""}`}
                      style={{
                        backgroundColor: isActive ? "var(--sidebar-active)" : "transparent",
                        color: "var(--text-secondary)"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "var(--sidebar-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigate(item.path);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span className="flex-1">{item.title}</span>}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>;
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings and Logout moved to header */}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t" style={{borderColor: "var(--border-primary)"}}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{color: "var(--text-secondary)"}}>
              Theme
            </span>
            <ThemeToggleSwitch />
          </div>
        ) : (
          <div className="flex justify-center">
            <ThemeToggleSwitch />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}