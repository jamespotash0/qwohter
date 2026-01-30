/// <reference types="vite/client" />

// Build-time environment constants
declare const __DEV__: boolean;
declare const __PROD__: boolean;

interface ImportMetaEnv {
  readonly VITE_APP_URL_PRODUCTION: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // DEV ONLY - secret for impersonation (not the service role key!)
  readonly VITE_DEV_IMPERSONATE_SECRET?: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENABLED?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
