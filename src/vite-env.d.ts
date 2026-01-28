/// <reference types="vite/client" />

// Build-time environment constants
declare const __DEV__: boolean;
declare const __STAGING__: boolean;
declare const __PROD__: boolean;

interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  readonly VITE_APP_URL_DEVELOPMENT: string;
  readonly VITE_APP_URL_STAGING: string;
  readonly VITE_APP_URL_PRODUCTION: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // DEV ONLY - secret for impersonation (not the service role key!)
  readonly VITE_DEV_IMPERSONATE_SECRET?: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_TEST_REDIRECT_URI: string;
  readonly VITE_GOOGLE_PROD_REDIRECT_URI: string;
  readonly VITE_MICROSOFT_CLIENT_ID: string;
  readonly VITE_MICROSOFT_TENANT_ID: string;
  readonly VITE_MICROSOFT_TEST_REDIRECT_URI: string;
  readonly VITE_MICROSOFT_PROD_REDIRECT_URI: string;
  // Note: OpenAI API key should be in edge functions only, not client-side
  readonly TEST_USER_EMAIL: string;
  readonly TEST_USER_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
