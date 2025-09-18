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
    <div className="sticky top-0 z-50 flex items-center gap-3 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Left spacer */}
      <div className="flex-1" />
      
      {/* Center - Organization Name */}
      {organizationName && (
        <div className="flex items-center gap-3">
          {/* <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-4 h-4 text-white" />
          </div> */}
          <span className="font-bold text-xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {organizationName}
          </span>
        </div>
      )}
      
      {/* Right side - Notifications and Profile */}
      <div className="flex items-center gap-3 flex-1 justify-end">
      
      {/* Notifications Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 h-10 w-10 hover:bg-gray-100 rounded-full"
        onClick={handleNotificationsClick}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {/* Notification badge - you can make this conditional based on actual notifications */}
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
          3
        </Badge>
      </Button>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-2 h-10 hover:bg-gray-100 rounded-full"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-900">
                {userProfile?.full_name || user}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {userProfile?.role || "Member"}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-gray-900">
              {userProfile?.full_name || user}
            </div>
            <div className="text-xs text-gray-500">
              {user}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleSettingsClick}
            className="cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      </div> {/* End right side container */}
    </div>
  );
}