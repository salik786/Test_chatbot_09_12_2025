# Troubleshooting Guide

## Common Issues and Solutions

### Error: "PGRST116: Cannot coerce the result to a single JSON object" / "The result contains 0 rows"

**Cause:** This error means the user doesn't have an assistant assigned, or the database schema hasn't been updated to use OpenAI Assistant IDs.

**Solutions:**

#### Option 1: Fresh Database Setup (Recommended if no important data)

1. Drop and recreate your database:
   ```sql
   -- In Supabase SQL Editor
   DROP TABLE IF EXISTS messages CASCADE;
   DROP TABLE IF EXISTS user_assistant CASCADE;
   DROP TABLE IF EXISTS assistants CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   ```

2. Run the complete setup:
   ```bash
   # Copy and run the entire supabase-setup.sql file in SQL Editor
   ```

#### Option 2: Migrate Existing Database (If you have users/data)

1. Run the migration script:
   ```bash
   # Copy and run supabase-migration.sql in SQL Editor
   ```

2. Verify the migration:
   ```sql
   -- Check that assistants have OpenAI IDs
   SELECT id, name, openai_assistant_id FROM assistants;

   -- Check that users are properly assigned
   SELECT ua.user_id, p.email, a.name
   FROM user_assistant ua
   JOIN profiles p ON p.id = ua.user_id
   JOIN assistants a ON a.id = ua.assistant_id;
   ```

#### Option 3: Manual Assignment Fix

If a specific user doesn't have an assignment:

```sql
-- Find the user
SELECT id, email FROM profiles WHERE email = 'user@example.com';

-- Find available assistants
SELECT id, name FROM assistants WHERE active = true;

-- Create assignment
INSERT INTO user_assistant (user_id, assistant_id)
VALUES ('user-uuid-here', 'assistant-uuid-here');
```

---

### Error: "No assistant assigned to user"

**Cause:** User signed up but random assignment failed.

**Solution:**

```sql
-- Get user ID
SELECT id FROM profiles WHERE email = 'user@example.com';

-- Assign random assistant
INSERT INTO user_assistant (user_id, assistant_id)
SELECT 'user-id-here', id FROM assistants
WHERE active = TRUE AND available_for_random_assignment = TRUE
ORDER BY RANDOM() LIMIT 1;
```

---

### Assistant Returns JSON But Frontend Shows Nothing

**Cause:** Your OpenAI Assistant is configured with JSON response format, but the streaming needs to handle this properly.

**Solution:** The latest code (after this update) now handles both text and JSON responses. Make sure you're running the latest version.

**Verify your assistant settings:**
1. Go to OpenAI Playground
2. Check your assistant's response format
3. If it's set to JSON, the system will now handle it correctly

---

### Thread Not Persisting / Context Lost

**Cause:** OpenAI thread ID not being saved properly.

**Solution:**

```sql
-- Check if thread IDs are being saved
SELECT user_id, assistant_id, openai_thread_id
FROM user_assistant;

-- If missing, they will be created on next chat message
```

---

### OpenAI API Errors

#### Error: "Invalid assistant_id"

**Cause:** Assistant ID in database doesn't match your OpenAI account.

**Solution:**
```sql
-- Update with correct assistant IDs from your OpenAI Playground
UPDATE assistants SET openai_assistant_id = 'asst_8U73byxV7wR65zuTiPUdDav7' WHERE name = 'nav_edu';
UPDATE assistants SET openai_assistant_id = 'asst_oxD6VwzWDq50mQMZPxtRs4MZ' WHERE name = 'core_edu';
UPDATE assistants SET openai_assistant_id = 'asst_dqm6xw0NYdiIqu65rIQ2iGOW' WHERE name = 'base_edu';
```

#### Error: "Rate limit exceeded"

**Cause:** Too many OpenAI API calls.

**Solution:**
- Check your OpenAI usage dashboard
- Upgrade your OpenAI plan if needed
- Implement rate limiting in the app (coming in admin panel)

---

### Database Connection Issues

#### RLS Policy Errors

**Cause:** Row Level Security policies blocking queries.

**Solution:**

```sql
-- Check which policies exist
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE tablename IN ('profiles', 'assistants', 'user_assistant', 'messages');

-- If needed, recreate policies (they're in supabase-setup.sql)
```

---

### Debugging Tips

1. **Check server logs:**
   ```bash
   # Run in development
   npm run dev

   # Watch for console.log output showing:
   # - User ID
   # - Assistant name and ID
   # - Thread ID creation/reuse
   # - Response streaming events
   ```

2. **Test API directly:**
   ```bash
   # Test chat endpoint
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}' \
     --cookie "your-session-cookie"
   ```

3. **Verify database state:**
   ```sql
   -- Count records
   SELECT 'profiles' as table_name, COUNT(*) FROM profiles
   UNION ALL
   SELECT 'assistants', COUNT(*) FROM assistants
   UNION ALL
   SELECT 'user_assistant', COUNT(*) FROM user_assistant
   UNION ALL
   SELECT 'messages', COUNT(*) FROM messages;
   ```

---

## Getting Help

If you're still stuck:

1. Check the console logs (both browser and server)
2. Run the verification queries above
3. Check your OpenAI account:
   - Valid API key
   - Assistants exist and are accessible
   - Account has credits
4. Check Supabase:
   - Database connection working
   - RLS policies correct
   - Tables exist with correct schema

---

## Quick Health Check

Run this query to verify everything is set up correctly:

```sql
-- Health check query
SELECT
  'Database Setup' as check_type,
  CASE
    WHEN (SELECT COUNT(*) FROM assistants WHERE openai_assistant_id IS NOT NULL) >= 3
    THEN 'OK: 3+ assistants configured'
    ELSE 'ERROR: Missing assistants or OpenAI IDs'
  END as status

UNION ALL

SELECT
  'User Assignments',
  CASE
    WHEN (SELECT COUNT(*) FROM user_assistant) > 0
    THEN 'OK: ' || (SELECT COUNT(*) FROM user_assistant)::text || ' users assigned'
    ELSE 'WARNING: No users assigned yet'
  END

UNION ALL

SELECT
  'Active Assistants',
  CASE
    WHEN (SELECT COUNT(*) FROM assistants WHERE active = TRUE) >= 1
    THEN 'OK: ' || (SELECT COUNT(*) FROM assistants WHERE active = TRUE)::text || ' active'
    ELSE 'ERROR: No active assistants'
  END;
```
