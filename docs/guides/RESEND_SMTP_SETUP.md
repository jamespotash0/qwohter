# Resend SMTP Setup for Supabase Auth Emails

This guide covers switching Supabase authentication emails from the default email service to Resend.com via SMTP.

## Why Use Resend?

- **Better deliverability** - Resend has better email reputation than Supabase's shared service
- **Custom domain** - Emails come from `@qwohter.com` instead of Supabase's domain
- **Consistent branding** - All emails (auth + transactional) come from the same service
- **Analytics** - Track email opens, clicks, and bounces in Resend dashboard

---

## Prerequisites

- Resend account with API key
- Domain `qwohter.com` verified in Resend
- Access to Supabase project dashboard

---

## Step 1: Get Resend SMTP Credentials

1. Log into [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key (or use existing one)
3. Note these SMTP credentials:

| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Username | `resend` |
| Password | Your Resend API key |

---

## Step 2: Verify Domain in Resend

If `qwohter.com` is not already verified:

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain" and enter `qwohter.com`
3. Add the DNS records Resend provides:
   - **SPF record** - Authorizes Resend to send on your behalf
   - **DKIM records** - Cryptographic signature for emails
   - **DMARC record** (optional but recommended)
4. Wait for verification (usually 5-15 minutes)

---

## Step 3: Configure Supabase SMTP

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Email Templates** → **SMTP Settings**
   (Or: **Project Settings** → **Auth** → **SMTP**)
4. Enable **Custom SMTP**
5. Enter these settings:

| Field | Value |
|-------|-------|
| Sender email | `noreply@qwohter.com` |
| Sender name | `Qwohter` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Minimum interval | `60` (seconds between emails) |
| Username | `resend` |
| Password | `re_xxxxxxxxxxxx` (your API key) |

6. Click **Save**
7. Click **Send test email** to verify configuration

---

## Step 4: Customize Email Templates

In Supabase Dashboard → Authentication → Email Templates:

### Confirm Signup

**Subject:** `Verify your Qwohter account`

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Qwohter</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Thanks for signing up! Your verification code is:
    </p>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #EE6C4D;">{{ .Token }}</span>
    </div>
    <p style="color: #666; font-size: 14px;">
      This code expires in 1 hour. If you didn't create an account, please ignore this email.
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © 2024 Qwohter. All rights reserved.
  </div>
</div>
```

### Reset Password

**Subject:** `Reset your Qwohter password`

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      We received a request to reset your password. Click the button below to choose a new password:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">
      This link expires in 1 hour. If you didn't request a password reset, please ignore this email.
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #EE6C4D; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © 2024 Qwohter. All rights reserved.
  </div>
</div>
```

### Magic Link

**Subject:** `Your Qwohter login link`

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Sign In to Qwohter</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Click the button below to sign in to your account:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Sign In
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">
      This link expires in 1 hour and can only be used once.
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #EE6C4D; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © 2024 Qwohter. All rights reserved.
  </div>
</div>
```

### Change Email Address

**Subject:** `Confirm your new email address`

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Confirm Email Change</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Click the button below to confirm your new email address:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #EE6C4D 0%, #F38D68 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Confirm Email
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">
      If you didn't request this change, please contact support immediately.
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #EE6C4D; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © 2024 Qwohter. All rights reserved.
  </div>
</div>
```

---

## Step 5: Test Email Flows

After configuration, test each email type:

| Flow | How to Test |
|------|-------------|
| Signup confirmation | Create a new test account |
| Password reset | Click "Forgot password" on login page |
| Magic link | Enable magic links and request one |
| Email change | Update email in account settings |

**Verify:**
- Emails arrive in inbox (not spam)
- Sender shows as `Qwohter <noreply@qwohter.com>`
- Links work correctly
- Styling renders properly

---

## Troubleshooting

### Emails going to spam
- Ensure domain is fully verified in Resend
- Add DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@qwohter.com`
- Wait 24-48 hours for DNS propagation

### Test email fails in Supabase
- Verify API key is correct
- Check port (try 587 if 465 doesn't work)
- Ensure sender email domain is verified in Resend

### Emails not sending
- Check Resend dashboard for errors
- Verify SMTP settings are saved in Supabase
- Check Supabase logs for SMTP errors

---

## Rollback

If issues occur:
1. Go to Supabase Dashboard → Authentication → SMTP Settings
2. Disable "Custom SMTP"
3. Supabase will revert to its default email service immediately

---

## Related Files

No code changes required. Existing auth code remains unchanged:
- `src/auth/services/authService.ts` - Auth operations
- `src/auth/hooks/useAuth.ts` - Auth hooks
- `src/pages/Auth.tsx` - Auth UI
- `src/pages/ForgotPassword.tsx` - Password reset UI

---

## Checklist

- [ ] Resend API key obtained
- [ ] Domain `qwohter.com` verified in Resend
- [ ] SMTP configured in Supabase dashboard
- [ ] Test email sent successfully
- [ ] Signup confirmation email works
- [ ] Password reset email works
- [ ] Magic link email works (if enabled)
- [ ] Email change confirmation works
- [ ] Emails arrive in inbox (not spam)
- [ ] Templates customized with Qwohter branding
