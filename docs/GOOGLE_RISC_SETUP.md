# Google Cross-Account Protection (RISC) Setup Guide

This guide explains how to configure Google's Cross-Account Protection to automatically handle security events like token revocations.

## What is RISC?

RISC (Risk and Incident Sharing and Coordination) is Google's Cross-Account Protection system that notifies your application when:

- A user revokes your app's access from their Google Account settings
- Google disables or suspends a user's account
- All user sessions are terminated
- A user's account is re-enabled

## Prerequisites

1. Google Cloud Project with OAuth 2.0 configured
2. OAuth Consent Screen configured (preferably in Production mode)
3. Supabase Edge Functions deployed
4. Admin access to Google Cloud Console

## Step 1: Enable the RISC API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for "RISC Configuration API"
5. Click **Enable**

## Step 2: Create a Service Account

RISC registration requires a service account (not OAuth):

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `risc-configuration` (or similar)
4. Click **Create and Continue**
5. Grant role: **RISC Configuration Admin**
6. Click **Done**

### Generate Service Account Key

1. Click on the service account you created
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Download and secure the key file

## Step 3: Register Your RISC Receiver Endpoint

You need to register your endpoint with Google using the RISC Configuration API.

### Using curl

Replace the placeholders with your values:

```bash
# First, get an access token using your service account
# (You can use gcloud or a library for this)

# Register the RISC stream configuration
curl -X PATCH \
  'https://risc.googleapis.com/v1beta/stream:update' \
  -H 'Authorization: Bearer YOUR_SERVICE_ACCOUNT_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "delivery": {
      "delivery_method": "https://schemas.openid.net/secevent/risc/delivery-method/push",
      "url": "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/google-risc-receiver"
    },
    "events_requested": [
      "https://schemas.openid.net/secevent/risc/event-type/tokens-revoked",
      "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
      "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
      "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
      "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
      "https://schemas.openid.net/secevent/risc/event-type/account-purged"
    ]
  }'
```

### Using Google Cloud SDK

```bash
# Authenticate with the service account
gcloud auth activate-service-account --key-file=path/to/service-account-key.json

# Get an access token
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Register the RISC endpoint
curl -X PATCH \
  'https://risc.googleapis.com/v1beta/stream:update' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "delivery": {
      "delivery_method": "https://schemas.openid.net/secevent/risc/delivery-method/push",
      "url": "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/google-risc-receiver"
    },
    "events_requested": [
      "https://schemas.openid.net/secevent/risc/event-type/tokens-revoked",
      "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
      "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
      "https://schemas.openid.net/secevent/risc/event-type/account-enabled"
    ]
  }'
```

## Step 4: Verify Registration

Check that your endpoint is registered:

```bash
curl -X GET \
  'https://risc.googleapis.com/v1beta/stream' \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected response:

```json
{
  "delivery": {
    "delivery_method": "https://schemas.openid.net/secevent/risc/delivery-method/push",
    "url": "https://your-project.supabase.co/functions/v1/google-risc-receiver"
  },
  "events_requested": [
    "https://schemas.openid.net/secevent/risc/event-type/tokens-revoked",
    ...
  ],
  "status": {
    "state": "enabled"
  }
}
```

## Step 5: Deploy the Edge Function

Ensure the RISC receiver edge function is deployed:

```bash
# From your project root
supabase functions deploy google-risc-receiver
```

## Environment Variables

The RISC receiver uses these Supabase secrets (already configured for OAuth):

- `GOOGLE_CLIENT_ID` - Your OAuth Client ID (used as the audience for JWT verification)
- `SUPABASE_URL` - Auto-configured by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured by Supabase

## Testing

### Simulate a Token Revocation

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Navigate to **Third-party apps with account access**
3. Find your app and click **Remove Access**
4. Check your Supabase logs for the RISC event

### Verify Token Invalidation

After revoking access, check your database:

```sql
SELECT
  organization_id,
  is_valid,
  last_risc_event,
  updated_at
FROM google_oauth_tokens
WHERE google_email = 'user@example.com';
```

Expected result:
- `is_valid` = `false`
- `last_risc_event` contains the event details
- `access_token` = `'REVOKED_BY_RISC_EVENT'`

## Troubleshooting

### "JWT verification failed"

- Ensure `GOOGLE_CLIENT_ID` is set correctly in Supabase secrets
- The JWT audience must match your OAuth Client ID

### "No tokens found for email"

- The email from the RISC event must match `google_email` in your database
- Check that the user actually has a token stored

### Events Not Being Received

1. Check the RISC stream status:
   ```bash
   curl -X GET 'https://risc.googleapis.com/v1beta/stream' \
     -H "Authorization: Bearer $ACCESS_TOKEN"
   ```

2. Verify the endpoint URL is correct
3. Check Supabase Edge Function logs

### Google Retrying Events

Google retries failed events with exponential backoff. If your endpoint consistently fails, events may be dropped after several attempts.

The RISC receiver always returns HTTP 200 to acknowledge receipt, even if processing fails, to prevent unnecessary retries.

## Security Events Reference

| Event Type | Meaning | Action Taken |
|------------|---------|--------------|
| `tokens-revoked` | User revoked app access | Mark token invalid |
| `account-disabled` | Google disabled account | Mark token invalid |
| `sessions-revoked` | All sessions terminated | Mark token invalid |
| `account-enabled` | Account re-enabled | Log only (user should reconnect) |
| `account-credential-change-required` | Password change required | Mark token invalid |
| `account-purged` | Account deleted | Mark token invalid |

## Production Considerations

1. **OAuth Consent Screen**: Must be in "Production" mode for tokens to last indefinitely
2. **Testing Mode**: Tokens expire after 7 days in Testing mode
3. **Rate Limits**: RISC events are typically low-volume, but plan for bursts
4. **Monitoring**: Set up alerts for RISC events in your logging system

## Additional Resources

- [Google Cross-Account Protection Documentation](https://developers.google.com/identity/protocols/risc)
- [RISC Configuration API Reference](https://developers.google.com/identity/risc/reference/rest)
- [Security Event Token (SET) Specification](https://datatracker.ietf.org/doc/html/rfc8417)
