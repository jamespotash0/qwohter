-- Make refresh_token nullable in google_oauth_tokens
-- Previously NOT NULL, which could cause insert failures when Google
-- doesn't return a refresh token (edge case with re-authorization).
ALTER TABLE "public"."google_oauth_tokens"
  ALTER COLUMN "refresh_token" DROP NOT NULL;
