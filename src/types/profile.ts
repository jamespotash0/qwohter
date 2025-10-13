/**
 * User Profile Types
 * Matches the profiles table schema in the database
 *
 * NOTE: organization_id and role are stored in the memberships table, not here
 */

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  join_type: string | null; // Direct, Invited
  created_at: string;
  updated_at: string;
}
