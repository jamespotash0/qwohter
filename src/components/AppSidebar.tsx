import { useState } from "react";
import { BarChart3, Calendar, Home, Settings, HelpCircle, LogOut, Users, FileText, Building2, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
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
},
// {
//   title: "Calendar",
//   icon: Calendar,
//   path: "/calendar"
// }
// { title: "Team", icon: Users, path: "/team" },
];
const generalItems = [{
  title: "Settings",
  icon: Settings
}
// { title: "Help", icon: HelpCircle },
];
export function AppSidebar({
  user,
  onLogout
}: AppSidebarProps) {
  const {
    state
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  return <Sidebar className={isCollapsed ? "w-16" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/80 bg-clip-text text-transparent">AiQu</span>
            </div>
          )}
          <SidebarTrigger className="h-6 w-6" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2">
            {!isCollapsed ? "MENU" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={`w-full justify-start transition-all duration-200 ${isActive ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium shadow-md" : "hover:bg-sidebar-accent/80"}`}>
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(item.path)}>
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
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2">
            {!isCollapsed ? "GENERAL" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full justify-start hover:bg-muted">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full justify-start hover:bg-muted text-destructive hover:text-destructive" onClick={onLogout}>
                  <div className="flex items-center gap-3 cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    {!isCollapsed && <span>Logout</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>;
}