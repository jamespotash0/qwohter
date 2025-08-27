/**
 * Team Display Helper Utilities
 * 
 * Extracted from Team.tsx to provide reusable UI helper functions
 * for displaying team member information, roles, and status indicators
 */

import { Crown, Shield, User } from "lucide-react";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export interface TeamStats {
  activeMembersCount: number;
  pendingMembersCount: number;
  totalMembersCount: number;
  roleDistribution: Record<string, number>;
}

/**
 * Team display helper functions
 */
export const teamDisplayHelpers = {
  /**
   * Get the appropriate icon for a user role
   */
  getRoleIcon: (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-slate-500" />;
    }
  },

  /**
   * Get the appropriate badge variant for a user role
   */
  getRoleBadgeVariant: (role: string): BadgeVariant => {
    switch (role) {
      case 'owner':
        return "default";
      case 'admin':
        return "secondary";
      default:
        return "outline";
    }
  },

  /**
   * Get the appropriate badge variant for a user status
   */
  getStatusBadgeVariant: (status: string): BadgeVariant => {
    switch (status) {
      case 'active':
        return "default";
      case 'pending':
        return "secondary";
      case 'inactive':
        return "outline";
      case 'rejected':
        return "destructive";
      default:
        return "outline";
    }
  },

  /**
   * Format user display name (prioritize full name over email)
   */
  formatUserDisplayName: (member: { full_name?: string | null; email: string }): string => {
    return member.full_name || member.email;
  },

  /**
   * Get user initials for avatar display
   */
  getUserInitials: (member: { full_name?: string | null; email: string }): string => {
    const name = member.full_name || member.email;
    
    if (member.full_name) {
      // Get initials from full name
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    } else {
      // Get initials from email
      return name.charAt(0).toUpperCase();
    }
  },

  /**
   * Format role display text
   */
  formatRoleDisplay: (role: string): string => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  },

  /**
   * Format status display text
   */
  formatStatusDisplay: (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  },

  /**
   * Get role hierarchy level (for permission checking)
   */
  getRoleLevel: (role: string): number => {
    const roleLevels: Record<string, number> = {
      'owner': 3,
      'admin': 2,
      'member': 1
    };
    
    return roleLevels[role] || 0;
  },

  /**
   * Check if user can manage another user based on role hierarchy
   */
  canManageUser: (managerRole: string, targetRole: string): boolean => {
    const managerLevel = teamDisplayHelpers.getRoleLevel(managerRole);
    const targetLevel = teamDisplayHelpers.getRoleLevel(targetRole);
    
    // Can manage users with lower role level
    return managerLevel > targetLevel;
  },

  /**
   * Get available role options for a user based on their current role
   */
  getAvailableRoleOptions: (currentUserRole: string, targetMemberRole: string): string[] => {
    const allRoles = ['member', 'admin'];
    
    // Owners can assign any role except owner
    if (currentUserRole === 'owner') {
      return targetMemberRole === 'owner' ? [] : allRoles;
    }
    
    // Admins can only manage members
    if (currentUserRole === 'admin') {
      return targetMemberRole === 'member' ? allRoles : [];
    }
    
    // Members can't assign roles
    return [];
  },

  /**
   * Get appropriate CSS classes for role-based styling
   */
  getRoleStyles: (role: string) => {
    switch (role) {
      case 'owner':
        return {
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          iconClass: 'text-yellow-500',
          bgClass: 'bg-gradient-to-br from-yellow-50 to-yellow-100'
        };
      case 'admin':
        return {
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          iconClass: 'text-blue-500',
          bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100'
        };
      default:
        return {
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          iconClass: 'text-slate-500',
          bgClass: 'bg-gradient-to-br from-slate-50 to-slate-100'
        };
    }
  },

  /**
   * Get status indicator styles
   */
  getStatusStyles: (status: string) => {
    switch (status) {
      case 'active':
        return {
          dotClass: 'bg-green-500',
          textClass: 'text-green-700',
          bgClass: 'bg-green-50'
        };
      case 'pending':
        return {
          dotClass: 'bg-yellow-500',
          textClass: 'text-yellow-700',
          bgClass: 'bg-yellow-50'
        };
      case 'inactive':
        return {
          dotClass: 'bg-slate-400',
          textClass: 'text-slate-600',
          bgClass: 'bg-slate-50'
        };
      default:
        return {
          dotClass: 'bg-slate-400',
          textClass: 'text-slate-600',
          bgClass: 'bg-slate-50'
        };
    }
  }
};