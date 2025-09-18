import { Bell, Settings, LogOut, User, ChevronDown, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderNavProps {
  user: string;
  userProfile?: {
    full_name?: string;
    role?: string;
  };
  organizationName?: string;
  onLogout: () => void;
}

export function HeaderNav({ user, userProfile, organizationName, onLogout }: HeaderNavProps) {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  const handleNotificationsClick = () => {
    // Future: Open notifications panel
    console.log("Notifications clicked");
  };

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 py-4 shadow-sm bg-theme-secondary border-theme-primary" style={{borderBottom: "1px solid var(--border-primary)"}}>
      {/* Left spacer */}
      <div className="flex-1" />
      
      {/* Center - Organization Name */}
      {organizationName && (
        <div className="flex items-center gap-3">
          {/* <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-4 h-4 text-white" />
          </div> */}
          <span className="font-bold text-xl text-theme-primary">
            {organizationName}
          </span>
        </div>
      )}
      
      {/* Right side - Theme, Notifications and Profile */}
      <div className="flex items-center gap-3 flex-1 justify-end pr-4">
      
      {/* Notifications Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 h-10 w-10 rounded-full transition-colors hover-theme-accent"
        style={{
          color: "var(--text-secondary)",
          backgroundColor: "transparent"
        }}
        onClick={handleNotificationsClick}
      >
        <Bell className="h-5 w-5" style={{color: "var(--text-secondary)"}} />
        {/* Notification badge - you can make this conditional based on actual notifications */}
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-white text-xs rounded-full" style={{backgroundColor: "#e98135"}}>
          3
        </Badge>
      </Button>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-2 h-10 rounded-full transition-colors"
            style={{
              backgroundColor: "transparent"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f7f2e9"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <div className="w-8 h-8 bg-gradient-to-br rounded-full flex items-center justify-center" style={{background: "linear-gradient(135deg, #4164df, #3565f7)"}}>
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium" style={{color: "#030410ff"}}>
                {userProfile?.full_name || user}
              </div>
              <div className="text-xs capitalize" style={{color: "#a4a5aeff"}}>
                {userProfile?.role || "Member"}
              </div>
            </div>
            <ChevronDown className="w-4 h-4" style={{color: "#a3adc2"}} />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg" style={{border: "1px solid rgba(163, 173, 194, 0.3)"}}>
          <div className="px-3 py-2">
            <div className="text-sm font-medium" style={{color: "#1b2169"}}>
              {userProfile?.full_name || user}
            </div>
            <div className="text-xs" style={{color: "#a3adc2"}}>
              {user}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleSettingsClick}
            className="cursor-pointer transition-colors"
            style={{
              color: "#1b2169"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f7f2e9"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <Settings className="w-4 h-4 mr-2" style={{color: "#1b2169"}} />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer transition-colors"
            style={{
              color: "#e98135"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f7f2e9";
              e.currentTarget.style.color = "#e98135";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#e98135";
            }}
          >
            <LogOut className="w-4 h-4 mr-2" style={{color: "#e98135"}} />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      </div> {/* End right side container */}
    </div>
  );
}