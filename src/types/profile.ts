/**
 * User Profile Types
 * Matches the profiles table schema in the database
 *
 * NOTE: organization_id, role, and join_type are stored in the memberships table, not here
 */

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}
