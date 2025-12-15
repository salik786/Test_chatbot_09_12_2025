# Round-Robin Assistant Assignment System

## Overview

The platform now uses **round-robin assignment** instead of random assignment. This ensures **equal distribution** of students across assistants - critical for research studies.

---

## How It Works

### **Assignment Logic**

When a new student signs up:

1. Count how many users are currently assigned to each active assistant
2. Assign the new student to the assistant with the **fewest users**
3. If there's a tie, use the assistant with the lowest ID (consistent ordering)

### **Example with 3 Assistants**

```
Initial State:
- Assistant 1: 0 users
- Assistant 2: 0 users
- Assistant 3: 0 users

Student 1 signs up → Assigned to Assistant 1
- Assistant 1: 1 user  ←
- Assistant 2: 0 users
- Assistant 3: 0 users

Student 2 signs up → Assigned to Assistant 2
- Assistant 1: 1 user
- Assistant 2: 1 user  ←
- Assistant 3: 0 users

Student 3 signs up → Assigned to Assistant 3
- Assistant 1: 1 user
- Assistant 2: 1 user
- Assistant 3: 1 user  ←

Student 4 signs up → Assigned to Assistant 1 (ties broken by ID)
- Assistant 1: 2 users ←
- Assistant 2: 1 user
- Assistant 3: 1 user

Student 5 signs up → Assigned to Assistant 2
- Assistant 1: 2 users
- Assistant 2: 2 users ←
- Assistant 3: 1 user

Student 6 signs up → Assigned to Assistant 3
- Assistant 1: 2 users
- Assistant 2: 2 users
- Assistant 3: 2 users ←

... and so on
```

### **Result with 120 Students and 3 Assistants**

Perfect distribution:
- Assistant 1: **40 students**
- Assistant 2: **40 students**
- Assistant 3: **40 students**

---

## Setup Instructions

### **1. Run the Migration**

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `migrations/round-robin-assignment.sql`
4. Click **Run**

**Or via Supabase CLI:**
```bash
supabase db push migrations/round-robin-assignment.sql
```

### **2. Verify It's Working**

Run the verification script:

```bash
npx tsx scripts/verify-assistant-distribution.ts
```

**Expected Output:**
```
📊 Assistant Distribution:

✅ Assistant 1
   ID: xxx
   📈 Users Assigned: 40

✅ Assistant 2
   ID: xxx
   📈 Users Assigned: 40

✅ Assistant 3
   ID: xxx
   📈 Users Assigned: 40

Summary:
Total Users: 120
Available Assistants: 3
Expected per Assistant: 40

✅ Distribution is BALANCED (difference ≤ 1)
```

---

## Configuration

### **Which Assistants Are Used?**

Only assistants with **BOTH** of these set to `TRUE`:
- `active = TRUE`
- `available_for_random_assignment = TRUE`

### **To Include an Assistant in Round-Robin:**

```sql
UPDATE assistants
SET
  active = TRUE,
  available_for_random_assignment = TRUE
WHERE name = 'Your Assistant Name';
```

### **To Exclude an Assistant:**

```sql
UPDATE assistants
SET available_for_random_assignment = FALSE
WHERE name = 'Assistant to Exclude';
```

---

## Research Study Configuration

### **For Control vs Treatment Groups**

If you have different assistant variants for research:

**Example: 2 Groups (Control vs Treatment)**

```sql
-- Control group assistant
UPDATE assistants
SET
  name = 'Control Assistant',
  active = TRUE,
  available_for_random_assignment = TRUE
WHERE openai_assistant_id = 'asst_control_xxx';

-- Treatment group assistant
UPDATE assistants
SET
  name = 'Treatment Assistant',
  active = TRUE,
  available_for_random_assignment = TRUE
WHERE openai_assistant_id = 'asst_treatment_xxx';
```

**Result with 120 students:**
- Control: 60 students
- Treatment: 60 students

**Example: 3 Groups (Control, Treatment A, Treatment B)**

```sql
-- Enable all three
UPDATE assistants
SET active = TRUE, available_for_random_assignment = TRUE
WHERE name IN ('Control', 'Treatment A', 'Treatment B');
```

**Result with 120 students:**
- Control: 40 students
- Treatment A: 40 students
- Treatment B: 40 students

---

## Monitoring & Verification

### **Check Current Distribution**

Run in Supabase SQL Editor or via the verification script:

```sql
SELECT
  a.name as assistant_name,
  a.openai_assistant_id,
  a.active,
  a.available_for_random_assignment,
  COUNT(ua.id) as user_count
FROM assistants a
LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
GROUP BY a.id, a.name, a.openai_assistant_id, a.active, a.available_for_random_assignment
ORDER BY a.id;
```

### **See Recent Assignments**

```sql
SELECT
  p.email as student_email,
  a.name as assistant_name,
  ua.assigned_at
FROM user_assistant ua
JOIN profiles p ON p.id = ua.user_id
JOIN assistants a ON a.id = ua.assistant_id
ORDER BY ua.assigned_at DESC
LIMIT 20;
```

### **Verify Balance**

```sql
WITH assistant_counts AS (
  SELECT
    a.id,
    a.name,
    COUNT(ua.id) as user_count
  FROM assistants a
  LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
  WHERE a.active = TRUE
    AND a.available_for_random_assignment = TRUE
  GROUP BY a.id, a.name
)
SELECT
  name,
  user_count,
  (SELECT MAX(user_count) - MIN(user_count) FROM assistant_counts) as max_difference
FROM assistant_counts
ORDER BY user_count DESC;
```

**Interpretation:**
- `max_difference = 0`: Perfect balance
- `max_difference = 1`: Nearly perfect balance (expected with odd numbers)
- `max_difference > 1`: Unbalanced (investigate)

---

## Troubleshooting

### **Issue: Assignments Not Working**

**Check 1: Are assistants configured?**
```sql
SELECT name, active, available_for_random_assignment
FROM assistants;
```

**Fix:**
```sql
-- Enable at least one assistant
UPDATE assistants
SET active = TRUE, available_for_random_assignment = TRUE
WHERE id = 'your-assistant-id';
```

**Check 2: Is the trigger active?**
```sql
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'on_profile_created';
```

Should return:
- `tgname`: on_profile_created
- `tgrelid`: profiles
- `tgenabled`: O (enabled)

**Check 3: Test with new signup**
1. Create a test account
2. Check if assignment was created:
```sql
SELECT * FROM user_assistant
WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@example.com');
```

---

### **Issue: Unbalanced Distribution**

**Possible Causes:**
1. Assistants were added/removed during study
2. Manual reassignments by admin
3. Migration run after some signups occurred

**Solutions:**

**Option A: Keep Current Assignments**
- Don't change existing assignments (avoid disrupting student experience)
- Future signups will gradually balance out
- Works well if difference is small (≤ 5 users)

**Option B: Manually Rebalance**
- Use admin panel to reassign users
- Move users from over-assigned to under-assigned assistants
- Only do this if no conversations started yet

**Option C: Fresh Start (Only if Study Not Started)**
```sql
-- WARNING: This deletes all assignments and conversations!
-- Only use before study begins!
TRUNCATE user_assistant CASCADE;
TRUNCATE conversations CASCADE;
TRUNCATE messages CASCADE;

-- Users will be reassigned on next login
```

---

## Database Function

The actual implementation (in `migrations/round-robin-assignment.sql`):

```sql
CREATE OR REPLACE FUNCTION public.auto_assign_assistant()
RETURNS TRIGGER AS $$
DECLARE
  selected_assistant_id UUID;
BEGIN
  -- Get the assistant with the FEWEST assigned users
  SELECT a.id INTO selected_assistant_id
  FROM assistants a
  LEFT JOIN user_assistant ua ON ua.assistant_id = a.id
  WHERE a.active = TRUE
    AND a.available_for_random_assignment = TRUE
  GROUP BY a.id
  ORDER BY COUNT(ua.id) ASC, a.id ASC  -- Fewest first, tie-break by ID
  LIMIT 1;

  IF selected_assistant_id IS NOT NULL THEN
    INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
    VALUES (NEW.id, selected_assistant_id, NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**How it works:**
1. `LEFT JOIN user_assistant ua ON ua.assistant_id = a.id` - Join with assignments
2. `GROUP BY a.id` - Group by assistant
3. `COUNT(ua.id)` - Count how many users per assistant
4. `ORDER BY COUNT(ua.id) ASC` - Sort by count (fewest first)
5. `a.id ASC` - Tie-breaker for consistent ordering
6. `LIMIT 1` - Pick the one with fewest users

---

## Testing

### **Before Study Launch**

1. **Create 10 test accounts**
   ```bash
   # Sign up with:
   test1@example.com
   test2@example.com
   ...
   test10@example.com
   ```

2. **Verify distribution**
   ```bash
   npx tsx scripts/verify-assistant-distribution.ts
   ```

3. **Expected result with 3 assistants:**
   - Assistant 1: 3-4 users
   - Assistant 2: 3-4 users
   - Assistant 3: 3-4 users

4. **Check assignment order**
   - Should see pattern: 1, 2, 3, 1, 2, 3, 1, 2, 3, 1

5. **Delete test accounts**
   ```sql
   DELETE FROM profiles WHERE email LIKE 'test%@example.com';
   ```

---

## Benefits for Research

### **Statistical Power**
- Equal sample sizes per condition
- Maximum statistical power
- Easier analysis (no need for weighted statistics)

### **Fair Comparison**
- Each assistant tested with same number of students
- No bias from unequal groups
- Clear conclusions about differences

### **Predictable**
- Know exactly how many students per assistant
- Can calculate required sample size
- No "unlucky" random outcomes (e.g., 70/30 split instead of 60/60)

---

## Migration from Random to Round-Robin

If you already have users with random assignments:

### **Option 1: Keep Existing, Apply to New**
- Existing users keep their current assistant
- New signups use round-robin
- Will gradually balance over time
- **Recommended if study already started**

### **Option 2: Rebalance Everyone**
- Reassign users to achieve perfect balance
- Risk: Disrupts users who already started conversations
- **Only recommended if no conversations yet**

---

## Summary

✅ **Round-robin assignment ensures**:
- Equal distribution across assistants
- Predictable sample sizes per condition
- Maximum statistical power for research
- Fair comparison between groups

📊 **For 120 students with 3 assistants**:
- Each gets exactly 40 students
- Perfect balance guaranteed
- No statistical adjustments needed

🔍 **Monitor with**:
```bash
npx tsx scripts/verify-assistant-distribution.ts
```

---

**Last Updated**: December 15, 2025
**Status**: ✅ Ready for Production
