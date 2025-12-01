# Family & Access Feature - Backend Fixes

You reported 3 issues with the invite flow. Here's how to fix them:

## Issues Reported

1. ✅ **No sign-in button** - FIXED in frontend (button was already there)
2. ❌ **`invite_email_sent` not updated** - Needs backend fix
3. ❌ **`status` stays 'pending'** - Needs backend fix

---

## Frontend Fixes (Already Applied)

### ✅ Better Sign-In Flow

Updated `/app/invite/accept.js` to pass the invite token when redirecting to login, so users can return after authentication.

---

## Backend Fixes (YOU NEED TO APPLY THESE)

### 1. Fix SQL RPCs in Supabase

Go to your **Supabase Dashboard → SQL Editor** and run the SQL from `BACKEND_FIXES.sql`

This will:

- ✅ Fix `create_baby_invite` RPC to properly return invite data
- ✅ Fix `accept_baby_invite` RPC to update status to 'accepted'
- ✅ Add missing columns if needed (accepted_at, accepted_by, updated_at)

### 2. Fix Edge Function

Go to your **Supabase Dashboard → Edge Functions → send-baby-invite-email**

Update the function with the code from `EDGE_FUNCTION_FIX.ts`

Key changes:

```typescript
// After sending the email successfully, ADD THIS:
const { error: updateError } = await supabase
  .from("baby_invites")
  .update({
    invite_email_sent: true,
    updated_at: new Date().toISOString(),
  })
  .eq("id", invite_id);
```

This ensures `invite_email_sent` is set to `true` after the email is sent.

---

## Testing the Complete Flow

After applying the backend fixes:

### Test 1: Send Invite (Logged In User)

1. Go to Baby Profile → Family & Access
2. Click "Invite Partner"
3. Enter email and select role
4. Click "Send Invite"
5. ✅ Check database: `invite_email_sent` should be `true`
6. ✅ Email should arrive at the invited email

### Test 2: Accept Invite (New User)

1. Click "Accept Invite" in email
2. ✅ Should see "Welcome! 💛" with "Go to sign in" button
3. Click "Go to sign in"
4. Sign up or sign in
5. ✅ Should automatically return to accept the invite
6. ✅ Should see success message
7. ✅ Check database: `status` should be 'accepted'
8. ✅ Should have record in `parent_baby` table

### Test 3: Accept Invite (Logged In User)

1. Be logged in to DearBaby
2. Click "Accept Invite" in email
3. ✅ Should immediately see success message
4. ✅ Check database: `status` should be 'accepted'
5. ✅ Should have record in `parent_baby` table

---

## Database Schema Requirements

Your `baby_invites` table should have these columns:

```sql
CREATE TABLE dearbaby.baby_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID REFERENCES dearbaby.babies(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invite_token TEXT UNIQUE NOT NULL,
  invite_email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Quick Checklist

- [ ] Run SQL from `BACKEND_FIXES.sql` in Supabase SQL Editor
- [ ] Update Edge Function `send-baby-invite-email` with code from `EDGE_FUNCTION_FIX.ts`
- [ ] Test sending an invite (check `invite_email_sent = true`)
- [ ] Test accepting invite as new user
- [ ] Test accepting invite as existing user
- [ ] Verify `status` changes to 'accepted' in database

---

## Files to Check

1. **BACKEND_FIXES.sql** - SQL to run in Supabase
2. **EDGE_FUNCTION_FIX.ts** - Edge Function code to update
3. **/app/invite/accept.js** - Already updated (frontend)
4. **/app/MainStack/BabyProfileScreen.js** - Already has debugging logs

---

## Console Logs for Debugging

The invite flow now has extensive logging. Check your browser console or Metro logs for:

```
[InvitePartner] Creating invite with params: {...}
[createBabyInviteRPC] Request details: {...}
[createBabyInviteRPC] Response status: 200
[InvitePartner] RPC result: {...}
[InvitePartner] Sending email for invite_id: ...
[InvitePartner] Email result: {...}
[InvitePartner] Success! Invite created and email sent.
```

If you see errors, they will show you exactly where the issue is.

---

## Support

If you encounter issues after applying these fixes:

1. Check Supabase logs for RPC errors
2. Check Edge Function logs for email errors
3. Share the console logs from the frontend
4. Verify the SQL functions were created successfully
