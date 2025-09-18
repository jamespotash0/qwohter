import { BarChart3, Home, Users, FileText, Building2 } from "lucide-react";
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
      className={`${isCollapsed ? "w-16" : "w-60"} shadow-xl`} 
      collapsible="icon" 
      style = {{
        "--sidebar-bg": "#4761c2",
        "--sidebar-foreground": "#f7f2e9",
      } as any}
    >
      <SidebarHeader className="p-3 border-b" style={{borderColor: "rgba(108, 136, 211, 0.4)"}}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <SidebarTrigger 
              className="h-8 w-8 p-2 rounded-md transition-all duration-200" 
              style={{color: "#f7f2e9"}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(233, 129, 53, 0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4164df] to-[#3565f7] rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4" style={{color: "#f7f2e9"}} />
              </div>
              <span className="font-bold text-lg" style={{color: "#e8e8e8ff"}}>Qwohter</span>
            </div>
            <SidebarTrigger 
              className="h-10 w-10 p-2 rounded-md transition-all duration-200" 
              style={{color: "#f7f2e9"}}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(233, 129, 53, 0.3)"}
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
                        backgroundColor: isActive ? "#DE8964" : "transparent",
                        color: "#f7f2e9"
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "rgba(233, 129, 53, 0.3)";
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
    </Sidebar>
  );
}