# Bug Fixes: Assistant Assignment & Admin Panel

This document describes the fixes for two critical issues:
1. New users not being assigned assistants
2. Admin panel not showing users and messages

## Issues Fixed

### Issue 1: New Users Not Assigned Assistants

**Problem:** When new users sign up, they see "No Assistant Assigned" message instead of being automatically assigned an assistant.

**Root Causes:**
- Database triggers may not be created in Supabase
- No assistants with `available_for_random_assignment = TRUE`
- RLS policies potentially blocking auto-assignment

**Fix Applied:**
- Created diagnostic and fix scripts to identify and resolve issues
- Scripts can manually assign assistants to users without assignments

### Issue 2: Admin Panel Not Showing Users/Messages

**Problem:** Admin panel shows no users when clicking on the Users tab, and no messages in the Messages tab.

**Root Cause:**
The RLS (Row Level Security) policy on the `profiles` table only allowed users to view their own profile. The admin panel was using the regular Supabase client which respects RLS, preventing admins from seeing other users' data.

**Fix Applied:**
- Updated admin panel to use `createServiceClient()` which bypasses RLS
- Service role client has full database access and bypasses ALL RLS policies
- Updated both Users and Messages admin pages

**Important Note:** An earlier version attempted to add an RLS policy for admin access, but this caused infinite recursion. The current fix uses service role client exclusively, which doesn't need RLS policies.

## Files Modified

### Core Fixes
- `app/admin/users/page.tsx` - Now uses service role client
- `app/admin/messages/page.tsx` - Now uses service role client
- `supabase-setup.sql` - Removed problematic RLS policy

### New Tools
- `scripts/diagnose-assistant-assignment.ts` - Diagnostic tool
- `scripts/fix-assistant-assignment.ts` - Fix script for missing assignments
- `supabase-rls-fix.sql` - SQL to drop problematic RLS policy

## How to Apply Fixes

### 1. Apply Database Changes (IMPORTANT - If you already applied the previous version)

If you ran the old version and are getting "infinite recursion" errors, run this in Supabase SQL Editor:

```sql
-- This drops the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
```

Or simply copy and paste the contents of `supabase-rls-fix.sql` into Supabase SQL Editor.

**Note:** No RLS policy is needed for admin access because the admin panel uses service role client which bypasses ALL RLS policies.

### 2. Verify Environment Variables

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for admin operations
```

### 3. Run Diagnostic Script

Check the current state of your database:

```bash
npm install tsx dotenv  # Install dependencies if needed
npx tsx scripts/diagnose-assistant-assignment.ts
```

This will show:
- ✅ or ❌ for each check
- List of assistants and their availability
- Users with/without assignments
- Recommendations for fixes

### 4. Fix Existing Users Without Assignments

If users already exist without assignments, run the fix script:

```bash
npx tsx scripts/fix-assistant-assignment.ts
```

This will:
- Find all users without assistant assignments
- Randomly assign an available assistant to each
- Report success/failure for each assignment

### 5. Restart Your Application

```bash
npm run dev
```

## Verification Steps

### Test Admin Panel
1. Log in as an admin user
2. Navigate to `/admin/users`
3. You should now see all users listed
4. Navigate to `/admin/messages`
5. You should see messages from all users

### Test New User Signup
1. Sign up a new user
2. After signup, you should be redirected to `/chat`
3. You should see the chat interface (not "No Assistant Assigned")
4. Check the admin panel to verify the new user has an assignment

## Technical Details

### Service Role Client vs Regular Client

**Regular Client** (`createClient()`):
- Respects RLS policies
- Uses user's authentication token
- Suitable for user-facing features

**Service Role Client** (`createServiceClient()`):
- Bypasses RLS policies
- Uses service role key
- Should ONLY be used in admin-protected routes
- Never expose to client-side code

### RLS Policy Structure

**Important:** Initially, a policy was created to allow admins to view all profiles, but this caused infinite recursion errors. The problem was:

```sql
-- This causes infinite recursion - DO NOT USE
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p  -- This queries profiles while checking profiles policy!
      WHERE p.id = auth.uid()
      AND p.is_admin = TRUE
    )
  );
```

The issue: When you query `profiles` to check if someone is an admin, it triggers RLS policies on `profiles` again, creating infinite recursion.

**Solution:** Use service role client (`createServiceClient()`) which bypasses ALL RLS policies. This is the correct approach for admin operations.

### Assistant Assignment Flow

```
New User Signs Up
    ↓
Supabase Auth creates user in auth.users
    ↓
Trigger: on_auth_user_created
    ↓
Function: handle_new_user() creates profile
    ↓
Trigger: on_profile_created
    ↓
Function: auto_assign_assistant()
    ↓
Selects random assistant (active=TRUE, available_for_random_assignment=TRUE)
    ↓
Creates user_assistant record
    ↓
User can now access chat
```

## Troubleshooting

### Admin Panel Still Shows No Users

1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. Verify you're logged in as an admin user
3. Check browser console for errors
4. Check Supabase logs for query errors

### New Users Still Not Getting Assignments

1. Run the diagnostic script: `npx tsx scripts/diagnose-assistant-assignment.ts`
2. Verify assistants exist with `available_for_random_assignment = TRUE`
3. Check if triggers exist in Supabase (run the check from diagnostic output)
4. Check Supabase logs for trigger errors
5. Try manually running the fix script for existing users

### Email Confirmation Issues

If you have email confirmation enabled:
- Triggers will wait until email is confirmed
- Consider disabling email confirmation for testing
- Or manually confirm emails in Supabase Auth dashboard

## Security Considerations

- Service role key bypasses all RLS policies
- Only use in server-side code (API routes, server components)
- Never expose service role key to client-side code
- Admin panel layout already checks for admin status
- All admin API endpoints verify admin status before operations

## Additional Resources

- Supabase RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Triggers Documentation: https://supabase.com/docs/guides/database/postgres/triggers
- Next.js Server Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components
