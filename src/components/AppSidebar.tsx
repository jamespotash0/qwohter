import { useState } from "react";
import { BarChart3, Calendar, Home, Settings, HelpCircle, LogOut, Users, FileText, Building2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
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
}, 
// {
//   title: "Calendar",
//   icon: Calendar,
//   path: "/calendar"
// }
// { title: "Analytics", icon: BarChart3, path: "/analytics" },
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
  return <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          
          {!isCollapsed && <span className="font-bold text-lg text-foreground">WallQu</span>}
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
                    <SidebarMenuButton asChild className={`w-full justify-start ${isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
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