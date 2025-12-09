# Database Migrations

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of the migration file
4. Click "Run" to execute

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## Migration Files

### 001_setup_rls_policies.sql
Sets up Row Level Security (RLS) policies for all tables:

- **Profiles**: Users can read/update their own profile, admins can read all
- **Assistants**: Authenticated users can read active assistants, admins can manage
- **User Assignments**: Users can read their own assignments, admins can manage all
- **Messages**: Users can read/write their own messages, admins can read all

**Important Notes:**
- Profile creation during signup is handled via the service role client in the API
- This bypasses RLS and ensures proper validation and assistant assignment
- Assistant message insertion is also handled via service role for proper authorization

## Environment Variables Required

Make sure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EMAIL=your_admin_email@example.com
```

## Troubleshooting

If you encounter RLS policy violations:
1. Verify the migration has been applied
2. Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Ensure the service role client is used for operations that need to bypass RLS
