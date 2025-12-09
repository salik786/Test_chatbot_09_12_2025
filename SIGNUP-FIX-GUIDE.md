# Signup Issue Fix Guide

This guide will help you fix the "Database error saving new user" issue step by step.

## Step 1: Run Diagnostic Queries

Open your Supabase SQL Editor and run the diagnostic queries from `diagnostic-queries.sql`.

### Critical checks:

1. **Verify triggers exist:**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
  AND trigger_name IN ('on_auth_user_created', 'on_profile_created');
```

**Expected output:** You should see 2 triggers:
- `on_auth_user_created` on `auth.users`
- `on_profile_created` on `profiles`

**If triggers are missing:** Run the FIX SCRIPT section in `diagnostic-queries.sql` (uncomment and execute)

2. **Verify assistants exist:**
```sql
SELECT name, openai_assistant_id, active, available_for_random_assignment
FROM assistants
WHERE active = TRUE;
```

**Expected output:** 3 assistants (nav_edu, core_edu, base_edu) with `available_for_random_assignment = TRUE`

**If no assistants or wrong config:** Run the assistant insert from `supabase-setup.sql` lines 171-192

---

## Step 2: Check Email Confirmation Setting

1. Go to your Supabase Dashboard
2. Navigate to: **Authentication** → **Providers** → **Email**
3. Look for **"Confirm email"** setting
4. **DISABLE** it if enabled (this is critical!)

When email confirmation is enabled, triggers don't execute until the user confirms their email, which breaks the signup flow.

---

## Step 3: Clean Up Failed Signups

If you have users in `auth.users` without corresponding profiles, clean them up:

```sql
-- View orphaned users
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Delete orphaned users (only recent failed signups)
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE p.id IS NULL
  AND u.created_at > NOW() - INTERVAL '1 day'
);
```

---

## Step 4: Test the Triggers Manually

Run this test to ensure triggers work correctly:

```sql
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'trigger-test@example.com';
  test_profile_count INT;
  test_assignment_count INT;
BEGIN
  -- Create a test profile (simulating what the trigger does)
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (test_user_id, test_email, FALSE);

  -- Check if profile was created
  SELECT COUNT(*) INTO test_profile_count
  FROM profiles WHERE id = test_user_id;

  -- Wait for assistant assignment trigger
  PERFORM pg_sleep(0.5);

  -- Check if assignment was created
  SELECT COUNT(*) INTO test_assignment_count
  FROM user_assistant WHERE user_id = test_user_id;

  RAISE NOTICE '✓ Profile created: %', (test_profile_count = 1);
  RAISE NOTICE '✓ Assignment created: %', (test_assignment_count = 1);

  -- Clean up
  DELETE FROM user_assistant WHERE user_id = test_user_id;
  DELETE FROM profiles WHERE id = test_user_id;

  IF test_profile_count = 1 AND test_assignment_count = 1 THEN
    RAISE NOTICE '✓✓✓ SUCCESS: Triggers working correctly!';
  ELSE
    RAISE EXCEPTION 'FAILED: Triggers not working. Profile: %, Assignment: %',
      test_profile_count, test_assignment_count;
  END IF;
END $$;
```

**Expected output:** `SUCCESS: Triggers working correctly!`

**If it fails:** The error message will show what went wrong. Check:
- Do assistants exist with `available_for_random_assignment = TRUE`?
- Are RLS policies blocking the inserts?
- Is there a permission issue with SECURITY DEFINER?

---

## Step 5: Check RLS Policies

Verify that RLS policies allow trigger execution:

```sql
-- Check profiles policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Check user_assistant policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_assistant';
```

The triggers run with `SECURITY DEFINER`, so they should bypass RLS, but verify the policies are correct.

---

## Step 6: Test Signup with Improved Logging

I've updated the signup route to provide detailed logging. Now test the signup:

1. Clear your browser cookies for localhost:3000
2. Stop your dev server and restart:
```bash
npm run dev
```
3. Open browser console and Network tab
4. Try to sign up with a new email
5. Watch the server terminal for detailed logs

**What to look for in server logs:**
```
Starting signup for: test@example.com
User created in auth.users: <uuid>
Verifying profile creation...
Profile verified: { id: ..., email: ..., is_admin: false }
Verifying assistant assignment...
Assistant assignment verified: { id: ..., assistant_id: ... }
```

**If you see errors:**
- Note the exact error message
- Check which step failed (auth.users creation, profile verification, assignment verification)
- Look for trigger errors in Supabase logs

---

## Step 7: Check Supabase Logs

If signup still fails, check Supabase logs for the actual database error:

1. Go to Supabase Dashboard
2. Navigate to: **Logs** → **Postgres Logs**
3. Look for errors around the time you attempted signup
4. Search for keywords: `trigger`, `profile`, `user_assistant`, `error`

Common errors and fixes:

### Error: "function handle_new_user() does not exist"
**Fix:** Run the trigger creation SQL from `diagnostic-queries.sql` (FIX SCRIPT section)

### Error: "permission denied for table profiles"
**Fix:** Ensure trigger is created with `SECURITY DEFINER`:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Error: "no rows returned by query that requires one or more rows"
**Fix:** This might mean assistants table is empty. Run the INSERT from `supabase-setup.sql`

---

## Step 8: Recreate Triggers with Error Handling

If triggers are failing silently, recreate them with error handling:

```sql
-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Recreate with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  is_admin_user BOOLEAN;
BEGIN
  BEGIN
    admin_email := NEW.raw_user_meta_data->>'admin_email';
    is_admin_user := (admin_email IS NOT NULL AND NEW.email = admin_email);

    INSERT INTO public.profiles (id, email, is_admin)
    VALUES (NEW.id, NEW.email, COALESCE(is_admin_user, FALSE));

    RAISE NOTICE 'Profile created for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for %: % %', NEW.email, SQLERRM, SQLSTATE;
      -- Don't fail the auth.users insert
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate assistant assignment with error handling
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  random_assistant_id UUID;
BEGIN
  BEGIN
    SELECT id INTO random_assistant_id
    FROM assistants
    WHERE active = TRUE AND available_for_random_assignment = TRUE
    ORDER BY RANDOM() LIMIT 1;

    IF random_assistant_id IS NOT NULL THEN
      INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
      VALUES (NEW.id, random_assistant_id, NULL);

      RAISE NOTICE 'Assistant assigned to user %: %', NEW.id, random_assistant_id;
    ELSE
      RAISE WARNING 'No available assistants for random assignment';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error assigning assistant to %: % %', NEW.id, SQLERRM, SQLSTATE;
      -- Don't fail the profile insert
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_assistant();
```

---

## Step 9: Verify Complete Signup Flow

After applying fixes, test the complete flow:

1. Clear browser cookies
2. Restart dev server
3. Navigate to `/signup`
4. Sign up with a new email
5. Check server logs for the verification steps
6. Should redirect to `/chat`
7. Verify you can send messages

### Verification queries:
```sql
-- Check the newly created user
SELECT
  p.id,
  p.email,
  p.is_admin,
  a.name as assigned_assistant,
  ua.openai_thread_id
FROM profiles p
LEFT JOIN user_assistant ua ON ua.user_id = p.id
LEFT JOIN assistants a ON a.id = ua.assistant_id
WHERE p.email = 'your-test-email@example.com';
```

**Expected output:** One row with profile, assistant name, and thread_id (NULL until first message)

---

## Step 10: Monitor for Success

Once signup works:

1. Test with multiple new users to ensure consistency
2. Verify random assignment distributes across all 3 assistants
3. Test chat functionality for each new user
4. Monitor Supabase logs for any warnings

---

## Common Issues Summary

| Error | Cause | Fix |
|-------|-------|-----|
| "Database error saving new user" | Trigger missing or failing | Run diagnostic queries, recreate triggers |
| "No Assistant Assigned" | Email confirmation enabled OR no assistants | Disable email confirmation, verify assistants exist |
| Profile not created | Trigger not executing | Check email confirmation, verify trigger exists |
| Foreign key constraint | Race condition (old issue) | Using triggers eliminates this |
| No assistants available | Assistants not inserted OR all inactive | Run INSERT from supabase-setup.sql |

---

## Still Having Issues?

If you've gone through all steps and still have problems:

1. Share the exact error from:
   - Server console logs (from the improved signup route)
   - Supabase Postgres logs
   - Browser console
2. Share output of diagnostic queries (especially trigger check)
3. Confirm email confirmation is DISABLED
4. Confirm trigger test (Step 4) result

---

## Success Checklist

Before considering this fixed, verify:

- [ ] Triggers exist in database
- [ ] 3 assistants exist with correct OpenAI IDs
- [ ] Email confirmation is DISABLED
- [ ] Manual trigger test passes
- [ ] New signup creates profile immediately
- [ ] New signup assigns assistant automatically
- [ ] Chat page works without "No Assistant Assigned" error
- [ ] Can send and receive messages
- [ ] Server logs show verification success
