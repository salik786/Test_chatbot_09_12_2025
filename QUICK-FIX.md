# Quick Fix for "Database error saving new user"

## What I've Done

I've updated the codebase to help diagnose and fix the signup issue:

### 1. **Enhanced Signup Logging** (`app/api/auth/signup/route.ts`)
- Added detailed console logging for each step
- Added verification checks for profile and assignment creation
- Better error messages with stack traces
- Now returns debug info about what was created

### 2. **Diagnostic Queries** (`diagnostic-queries.sql`)
- Comprehensive SQL queries to check database state
- Trigger verification
- Assistant verification
- Orphaned user detection
- Manual trigger testing
- RLS policy checks

### 3. **Complete Fix Script** (`fix-signup-complete.sql`)
- One-command fix for all common issues
- Recreates triggers with error handling
- Fixes orphaned users
- Ensures all assistants are configured
- Assigns missing assistants
- Tests triggers automatically
- Shows final health check

### 4. **Step-by-Step Guide** (`SIGNUP-FIX-GUIDE.md`)
- Detailed troubleshooting steps
- Common error explanations
- Manual fix procedures
- Verification queries

---

## Quick Fix (3 Steps)

### Step 1: Run the Fix Script

1. Open your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire contents of **`fix-signup-complete.sql`**
3. Click **Run**
4. Check the output - look for ✓ checkmarks indicating success

**Expected output:**
```
✓ Profile creation trigger installed
✓ Assistant assignment trigger installed
✓ Found 3 assistants with OpenAI IDs
✓ Assistants configured
✓ No orphaned users found
✓ All users have assistant assignments
✓ Trigger test PASSED
```

### Step 2: Disable Email Confirmation

1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Find **"Confirm email"** setting
3. **Turn it OFF** (uncheck/disable)
4. Save changes

> **Why?** Email confirmation prevents triggers from running until email is verified, breaking the automatic signup flow.

### Step 3: Test Signup

1. **Clear browser cookies** for localhost:3000
2. **Restart your dev server:**
   ```bash
   npm run dev
   ```
3. **Watch the server console** - you'll see detailed logs now
4. **Open** http://localhost:3000/signup
5. **Sign up** with a new email

**What to expect in server logs:**
```
Starting signup for: test@example.com
User created in auth.users: <uuid>
Verifying profile creation...
Profile verified: { id: '...', email: 'test@example.com', is_admin: false }
Verifying assistant assignment...
Assistant assignment verified: { id: '...', assistant_id: '...' }
```

If you see all these messages, signup is working! You should be redirected to `/chat` and be able to send messages.

---

## If It Still Fails

### Check Server Logs

Look for error messages in your terminal. The enhanced signup route now logs:
- Exactly where the failure occurs
- Profile creation status
- Assignment creation status
- Full error details with stack trace

### Check Supabase Logs

1. Go to **Supabase Dashboard** → **Logs** → **Postgres Logs**
2. Look for errors around the time you attempted signup
3. Search for: `trigger`, `profile`, `user_assistant`, `error`

### Common Issues

| Issue | Fix |
|-------|-----|
| "No assistant assigned to user" | Run `fix-signup-complete.sql` - ensures assistants exist |
| Profile not created | Check email confirmation is DISABLED |
| Triggers not working | `fix-signup-complete.sql` recreates them |
| "Function does not exist" | Run `fix-signup-complete.sql` |

---

## Verify Everything Works

After signup succeeds, run this query in Supabase SQL Editor:

```sql
SELECT
  p.id,
  p.email,
  p.is_admin,
  a.name as assistant_name,
  a.openai_assistant_id,
  ua.openai_thread_id
FROM profiles p
LEFT JOIN user_assistant ua ON ua.user_id = p.id
LEFT JOIN assistants a ON a.id = ua.assistant_id
ORDER BY p.created_at DESC
LIMIT 5;
```

**Expected:** You should see your new user with:
- ✓ Profile (email, is_admin)
- ✓ Assigned assistant (one of: nav_edu, core_edu, base_edu)
- ✓ OpenAI assistant ID (asst_xxx)
- ✓ Thread ID (NULL until first chat message)

---

## Files Reference

- **`fix-signup-complete.sql`** - Run this first to fix everything
- **`SIGNUP-FIX-GUIDE.md`** - Detailed step-by-step troubleshooting
- **`diagnostic-queries.sql`** - Individual diagnostic queries
- **`TROUBLESHOOTING.md`** - General troubleshooting for all issues
- **`app/api/auth/signup/route.ts`** - Enhanced with detailed logging

---

## Success Checklist

- [ ] Ran `fix-signup-complete.sql` - saw ✓ checkmarks
- [ ] Email confirmation is DISABLED in Supabase
- [ ] 3 assistants visible in database with OpenAI IDs
- [ ] Triggers exist (verified by fix script)
- [ ] Cleared browser cookies
- [ ] Restarted dev server
- [ ] Signup succeeds and redirects to /chat
- [ ] Can send messages and get responses
- [ ] Server logs show profile and assignment verified

---

## Next Steps After Fix

Once signup is working:

1. **Test with multiple users** - verify random assignment distributes across all 3 assistants
2. **Test chat functionality** - ensure OpenAI streaming works
3. **Monitor logs** - watch for any warnings in Supabase
4. **Continue to Phase 3** - Build admin panel for managing users and assistants

---

## Need Help?

If the fix script doesn't resolve the issue, check:

1. **Server console output** - what error appears during signup?
2. **Supabase Postgres logs** - any trigger errors?
3. **Fix script output** - any ✗ or ⚠ warnings?
4. **Health check results** - which check failed?

Share the output from these sources for further diagnosis.
