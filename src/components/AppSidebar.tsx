import { useState } from "react";
import { 
  BarChart3, 
  Calendar, 
  Home, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Users, 
  FileText,
  Building2
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  user: string;
  onLogout: () => void;
}

const menuItems = [
  { title: "Dashboard", icon: Home, isActive: true },
  { title: "Tasks", icon: FileText, badge: "12+" },
  { title: "Calendar", icon: Calendar },
  { title: "Analytics", icon: BarChart3 },
  { title: "Team", icon: Users },
];

const generalItems = [
  { title: "Settings", icon: Settings },
  { title: "Help", icon: HelpCircle },
];

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg text-foreground">WallQu</span>
          )}
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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={`w-full justify-start ${
                      item.isActive 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
              {generalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full justify-start hover:bg-muted">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className="w-full justify-start hover:bg-muted text-destructive hover:text-destructive"
                  onClick={onLogout}
                >
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

      {/* Mobile App Download Card */}
      {!isCollapsed && (
        <SidebarFooter className="p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Download our Mobile App</h4>
                <p className="text-xs text-white/70">Get easy in another way</p>
              </div>
            </div>
            <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Download
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}