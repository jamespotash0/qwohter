/**
 * Test Supabase Client
 *
 * Creates a Supabase client configured for testing.
 * Uses test environment variables when available.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTestEnvConfig } from './testEnv';

let testClient: SupabaseClient | null = null;

/**
 * Get or create a Supabase client for testing
 */
export function getTestSupabaseClient(): SupabaseClient {
  if (testClient) {
    return testClient;
  }

  const config = getTestEnvConfig();

  testClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return testClient;
}

/**
 * Sign in as the test user
 */
export async function signInTestUser(): Promise<{ userId: string; email: string }> {
  const config = getTestEnvConfig();
  const client = getTestSupabaseClient();

  const { data, error } = await client.auth.signInWithPassword({
    email: config.testUserEmail,
    password: config.testUserPassword,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned after sign in');
  }

  return {
    userId: data.user.id,
    email: data.user.email!,
  };
}

/**
 * Sign out the current test user
 */
export async function signOutTestUser(): Promise<void> {
  const client = getTestSupabaseClient();
  await client.auth.signOut();
}

/**
 * Get the current test session
 */
export async function getTestSession() {
  const client = getTestSupabaseClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return data.session;
}

/**
 * Reset the test client (useful between test suites)
 */
export function resetTestClient(): void {
  testClient = null;
}
