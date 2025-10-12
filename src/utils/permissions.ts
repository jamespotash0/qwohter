/**
 * Utility functions for permission management across the application
 */

export type UserRole = 'Owner' | 'Admin' | 'Member';

/**
 * Check if user has admin-level permissions (Admin or Owner)
 */
export const hasAdminPermissions = (role: string): boolean => {
  return role === 'Admin' || role === 'Owner';
};

/**
 * Check if user has owner permissions
 */
export const hasOwnerPermissions = (role: string): boolean => {
  return role === 'Owner';
};

/**
 * Check if user can manage organization settings
 */
export const canManageOrganization = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Check if user can manage team members
 */
export const canManageTeam = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Check if user can manage permissions
 */
export const canManagePermissions = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Check if user can regenerate organization code
 */
export const canRegenerateOrgCode = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Check if user can invite new members
 */
export const canInviteMembers = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Check if user can remove members
 */
export const canRemoveMembers = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Check if user can change member roles
 */
export const canChangeMemberRoles = (role: string): boolean => {
  return hasAdminPermissions(role);
};

/**
 * Get user permission level for display
 */
export const getPermissionLevel = (role: string): string => {
  switch (role) {
    case 'Owner':
      return 'Full Access';
    case 'Admin':
      return 'Administrative Access';
    case 'Member':
      return 'Standard Access';
    default:
      return 'Limited Access';
  }
};

/**
 * Get available roles that a user can assign
 */
export const getAssignableRoles = (currentUserRole: string): UserRole[] => {
  if (currentUserRole === 'Owner') {
    return ['Admin', 'Member'];
  } else if (currentUserRole === 'Admin') {
    return ['Member'];
  }
  return [];
};

/**
 * Check if user can access settings tab
 */
export const canAccessSettingsTab = (tabName: string, userRole: string): boolean => {
  switch (tabName) {
    case 'profile':
      return true; // All users can access profile
    case 'organization':
      return canManageOrganization(userRole);
    case 'billing':
      return hasAdminPermissions(userRole); // Admin and Owner can access billing
    case 'team':
      return canManageTeam(userRole); // Admin and Owner can access team
    case 'security':
      return hasAdminPermissions(userRole); // Admin and Owner can access security
    case 'permissions':
      return canManagePermissions(userRole);
    default:
      return false;
  }
};