import { BarChart3, Home, Settings, LogOut, Users, FileText, Building2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
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
const generalItems = [{
  title: "Settings",
  icon: Settings,
  path: "/settings"
}
];
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
      className={isCollapsed ? "w-16" : "w-60"} 
      collapsible="icon" 
      style = {{
        "--sidebar-bg": "#2a2d3a",
        "--sidebar-foreground": "#ffffff",
        "--sidebar-accent": "#4a3728",
        "--sidebar-border": "#404454",
      } as any}
    >
      <SidebarHeader className="p-4 border-b border-white/20">
        {isCollapsed ? (
          <div className="flex justify-center">
            <SidebarTrigger className="h-8 w-8 p-1 text-white hover:bg-orange-400/20 rounded-md transition-all duration-200 hover:text-white" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-white">Qwohter</span>
            </div>
            <SidebarTrigger className="h-8 w-8 p-1 text-white hover:bg-orange-400/20 rounded-md transition-all duration-200 hover:text-white" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-white/70 mb-2">
            {!isCollapsed ? "MENU" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      className={`w-full justify-start transition-all duration-200 ${isActive ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-md" : "text-white hover:bg-orange-400/20"}`}
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

        {/* General Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-white/70 mb-2">
            {!isCollapsed ? "GENERAL" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalItems.map(item => {
                const isActive = location.pathname === item.path;
                return <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    className={`w-full justify-start transition-all duration-200 ${isActive ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-md" : "text-white hover:bg-orange-400/20"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNavigate(item.path!);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              })}
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  className="w-full justify-start hover:bg-muted text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogout();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4 w-4" />
                    {!isCollapsed && <span>Logout</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}