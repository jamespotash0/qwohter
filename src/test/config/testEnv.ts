/**
 * Test Environment Configuration
 *
 * Loads environment variables for testing.
 * Uses TEST_* prefixed variables to avoid conflicts with production.
 */

export interface TestEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  testUserEmail: string;
  testUserPassword: string;
}

export function getTestEnvConfig(): TestEnvConfig {
  const supabaseUrl = import.meta.env.VITE_TEST_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_TEST_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  const testUserEmail = import.meta.env.VITE_TEST_USER_EMAIL || 'test@example.com';
  const testUserPassword = import.meta.env.VITE_TEST_USER_PASSWORD || 'testpassword123';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing test environment variables. Please set VITE_TEST_SUPABASE_URL and VITE_TEST_SUPABASE_ANON_KEY'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    testUserEmail,
    testUserPassword,
  };
}

/**
 * Generate unique test ID prefix for data isolation
 */
export function generateTestPrefix(): string {
  return `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
