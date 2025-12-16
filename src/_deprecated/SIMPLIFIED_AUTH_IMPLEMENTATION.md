# Simplified Auth Flow Implementation

## Overview

This document describes the simplified authentication and organization management flow implemented in the `feature/simplified-auth-flow` branch.

## What Changed

### **Previous Flow:**
```
Sign Up → OTP → Choice (Create/Join with code) → Pending Approval (if joining) → Dashboard
```

### **New Flow:**
```
Sign Up → OTP → Auto-Create Organization → Company Info → Dashboard
OR
Invite Link → Sign Up → OTP → Auto-Join (Pending Approval) → Dashboard
```

## Key Benefits

1. **Simpler Onboarding** - Users create organizations by default, no choice required
2. **Better Security** - Joining requires time-limited, single-use invite tokens instead of permanent org codes
3. **Professional UX** - Email invitations are the industry standard (Slack, Notion, etc.)
4. **Clear Payment Model** - Every org has 1 owner + invited members (perfect for seat-based billing)
5. **Better Analytics** - Know exactly where users came from (created vs invited)

## Files Modified

### 1. **Auth Components**

#### `src/components/auth/OrganizationSetupForm.tsx`
- **Before:** User chose between "Create" or "Join" with separate inputs
- **After:** Single form with organization name input only
- Removed `orgChoice` and `orgCode` props
- Added helpful text: "Need to join? Ask admin for invitation link"

#### `src/pages/Auth.tsx`
- Updated invite token handling to store token in sessionStorage
- Modified OTP verification to automatically process pending invites
- Simplified organization submit handler (removed orgChoice parameter)
- Updated component props to match new OrganizationSetupForm interface

### 2. **Auth Actions**

#### `src/pages/Auth/actions/handleOrganizationSubmit.ts`
- **Before:** Handled both creation and joining
- **After:** Only handles organization creation
- Removed `orgChoice`, `orgCode`, and `locationSearch` parameters
- Simplified logic - always creates organization

#### `src/pages/Auth/actions/handleInviteJoin.ts` (NEW)
- New dedicated handler for joining via invitation
- Accepts `userId`, `orgCode`, `inviteToken`
- Marks token as used after successful join
- Redirects to pending approval page

#### `src/pages/Auth/actions/index.ts`
- Added export for new `handleInviteJoin` function

### 3. **Team Invitation System**

#### `supabase/functions/send-invite/index.ts` (NEW)
- New Supabase Edge Function using Resend API
- Sends professional HTML invitation emails
- Includes:
  - Organization name and details
  - Inviter name
  - Role assignment
  - Secure invite link
  - 7-day expiration notice
- Validates user permissions (Admin/Owner only)
- Handles authentication via JWT

#### `src/services/teamInvitationService.ts` (NEW)
- Comprehensive invitation management service
- **Functions:**
  - `inviteMember()` - Create invite token and send email
  - `resendInvitation()` - Resend invitation email
  - `cancelInvitation()` - Revoke/delete invitation
- **Validation:**
  - Email format checking
  - Duplicate membership checking
  - Existing invitation checking
- **Error Handling:**
  - Clear error messages
  - Graceful failures

### 4. **React Query Hooks**

#### `src/hooks/queries/useOrganization.ts`
- Updated `useInviteMember` hook to use new `teamInvitationService`
- **Before:** Tried to find existing user and create pending membership
- **After:** Generates invite token and sends email invitation
- Invalidates invite tokens cache on success (not members cache)

### 5. **Team Management UI**

#### `src/components/features/settings/TeamTab.tsx`
- No changes required! Uses existing `useInviteMember` hook
- Hook now automatically sends email invitations
- Shows pending invitations in the UI

## How It Works

### **Normal Signup Flow:**

1. User visits `/create-account`
2. Enters email, password, name
3. Receives OTP code
4. Verifies OTP
5. Prompted to enter organization name
6. Organization is created automatically
7. User becomes Owner
8. Proceeds to company info setup

### **Invitation Flow:**

1. Admin sends invitation:
   - Opens Team settings
   - Enters email and role
   - System generates secure token
   - Resend sends professional email

2. Invited user receives email:
   - Email shows organization details
   - Click "Accept Invitation" button
   - Redirected to `/create-account?invite=TOKEN`

3. User signs up:
   - Sees "Invite link detected" toast
   - Creates account normally
   - After OTP verification, automatically joins org
   - Status: Pending (requires approval)
   - Redirected to pending approval page

4. Admin approves member:
   - Sees pending member in Team tab
   - Clicks "Approve"
   - Member gets Active status
   - Member gains full access

## Seat-Based Payment Integration

### How It Works with Stripe:

```typescript
// From stripeService.ts
export const calculateSubscriptionQuantity = async (organizationId: string) => {
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('status', 'Active');

  return Math.max(1, count || 1); // Minimum 1 seat
};
```

**Payment Flow:**
1. Organization created → 1 seat (Owner)
2. Member invited → Pending (no charge)
3. Member approved → Active (charge +1 seat)
4. Member removed → Inactive (refund 1 seat)

Stripe subscription quantity automatically updates via webhooks.

## Email Template

The Resend invitation email includes:

- **Header:** Qwohter branding
- **Invitation Details:**
  - Organization name
  - Role (Admin/Member)
  - Inviter name
- **Call-to-Action:** Big "Accept Invitation" button
- **Expiration Notice:** 7 days to accept
- **What is Qwohter:** Brief product description
- **Footer:** Support links and branding

## Environment Variables Required

For the send-invite edge function to work, ensure these are set in Supabase:

```env
RESEND_API_KEY=re_...
APP_URL=https://app.qwohter.com
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## Database Considerations

### Invite Tokens Table

The `invite_tokens` table already has all required fields:
- `id` (UUID)
- `token` (TEXT) - Secure random token
- `organization_id` (UUID)
- `organization_code` (TEXT)
- `email` (TEXT) - Recipient email
- `role` ('Admin' | 'Member')
- `created_by` (UUID)
- `expires_at` (TIMESTAMPTZ)
- `is_used` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

No schema changes required!

### Memberships Table

The `memberships` table tracks:
- `join_type`: 'Direct' (creator), 'Invited' (via email), 'Requested' (deprecated)
- `status`: 'Pending', 'Active', 'Suspended', 'Inactive'

**Important:** The old 'Requested' join_type is now deprecated but remains for backward compatibility.

## Testing Checklist

### Signup Flow
- [ ] New user can sign up and create organization
- [ ] Organization name is required
- [ ] User becomes Owner automatically
- [ ] User proceeds to company info step
- [ ] Trial subscription is created (if applicable)

### Invitation Flow
- [ ] Admin can send invitation to email
- [ ] Invitation email is sent via Resend
- [ ] Email contains correct organization details
- [ ] Invite link contains valid token
- [ ] Token expires after 7 days
- [ ] Token can only be used once
- [ ] User clicking invite link sees "Invite detected" message
- [ ] After signup, user automatically joins organization
- [ ] User has "Pending" status
- [ ] Admin can approve pending member
- [ ] Approved member gains access

### Error Cases
- [ ] Invalid email format rejected
- [ ] Duplicate invitation prevented
- [ ] Existing member cannot be re-invited
- [ ] Expired tokens show appropriate error
- [ ] Used tokens show appropriate error
- [ ] Non-admin cannot send invitations

### Stripe Integration
- [ ] New org starts with 1 seat
- [ ] Pending members don't affect seat count
- [ ] Approved members increment seat count
- [ ] Inactive members decrement seat count
- [ ] Stripe subscription quantity updates correctly

## Known Issues / Pre-existing Bugs

1. **Build Error:** There's a pre-existing error in `contactsService.ts` trying to import from `src/lib/supabase` (should be `@/integrations/supabase/client`)
2. **ESLint Config:** TypeScript-ESLint parser options not configured for API directory

These are unrelated to this implementation and should be fixed separately.

## Migration Notes

If you have existing users with pending "Requested" join types:

1. Those will continue to work (backward compatible)
2. New joins will all be "Invited" type
3. You can run a migration to clean up old request-based joins if desired

## Next Steps

### Before Merging:
1. Fix pre-existing build error in `contactsService.ts`
2. Test invitation email with actual Resend API key
3. Verify Supabase edge function deployment
4. Test complete signup → invite → join → approve flow
5. Verify Stripe seat counting works correctly

### After Merging:
1. Update documentation for admins
2. Consider adding "Resend Invitation" button in Team UI
3. Add invitation expiry notifications
4. Monitor Resend email delivery metrics
5. Consider removing deprecated "Requested" join type support

## Questions?

If you have questions about this implementation:
- Check the code comments in modified files
- Review the teamInvitationService.ts for invitation logic
- Check the send-invite edge function for email details
- Refer to Resend docs: https://resend.com/docs

---

**Author:** Claude
**Date:** 2025-11-21
**Branch:** feature/simplified-auth-flow
