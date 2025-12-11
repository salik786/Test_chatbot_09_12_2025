# Conversation History Feature - Setup Instructions

## Overview

This update adds **Conversation History & Organization** to your chatbot:
- ✅ Conversation sidebar with list of all past conversations
- ✅ New conversation button to start fresh chats
- ✅ Switch between different conversations
- ✅ Delete conversations
- ✅ Auto-generated conversation titles
- ✅ Fully responsive design (mobile & desktop)

## 🚀 Required Steps

### 1. Run Database Migration

You **MUST** run the SQL migration to add the conversations table and update the schema.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `migrations/add-conversations-table.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

**Option B: Using Supabase CLI**

```bash
# Make sure you're in the project directory
cd /home/user/Test_chatbot_09_12_2025

# Apply the migration
supabase db push migrations/add-conversations-table.sql
```

### 2. Verify Migration Success

After running the migration, verify in Supabase:

1. Go to **Table Editor**
2. You should see a new table: `conversations`
3. The `messages` table should have a new column: `conversation_id`
4. Check that existing messages were migrated to a default conversation

### 3. Test the Feature

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/chat`

3. You should see:
   - A sidebar on the left with conversations (on desktop, always visible)
   - A hamburger menu button (on mobile, to toggle sidebar)
   - A "New Conversation" button at the top of the sidebar
   - Your existing messages grouped into a "Previous Conversation"

4. Test the features:
   - ✅ Create a new conversation
   - ✅ Send messages in different conversations
   - ✅ Switch between conversations
   - ✅ Delete a conversation
   - ✅ Test on mobile (toggle sidebar with hamburger menu)

## 📋 What Changed

### Database Schema

**New Table: `conversations`**
- `id` (UUID) - Primary key
- `user_id` (UUID) - References profiles table
- `assistant_id` (UUID) - References assistants table
- `openai_thread_id` (TEXT) - OpenAI thread ID for this conversation
- `title` (TEXT) - Conversation title (auto-generated from first message)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ) - Updates when messages are added

**Updated Table: `messages`**
- Added column: `conversation_id` (UUID) - References conversations table

### New API Endpoints

- `GET /api/conversations` - List all user's conversations
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/[id]` - Get messages for a specific conversation
- `PATCH /api/conversations/[id]` - Update conversation (rename title)
- `DELETE /api/conversations/[id]` - Delete a conversation

### Updated API Endpoints

- `POST /api/chat` - Now accepts optional `conversationId` parameter

### New UI Components

- `app/chat/components/ConversationSidebar.tsx` - Sidebar with conversation list
- Updated `app/chat/components/ChatInterface.tsx` - Integrated sidebar and conversation management

### Updated TypeScript Types

- `types/database.ts` - Added conversations table, updated messages table
- `types/message.ts` - Added conversation_id field

## 🎨 UI Features

### Desktop View
- Sidebar always visible on the left (320px wide)
- Main chat area adjusts automatically
- Smooth transitions when switching conversations

### Mobile View
- Sidebar hidden by default
- Hamburger menu button in header to toggle sidebar
- Sidebar slides in from the left with backdrop overlay
- Auto-closes after selecting a conversation

### Conversation List
- Shows all conversations sorted by most recent activity
- Displays conversation title and last updated time
- Active conversation is highlighted
- Delete button appears on hover
- Empty state when no conversations exist

## 🔧 Troubleshooting

**Issue: Migration fails**
- Ensure you have admin access to your Supabase project
- Check that all previous migrations have been applied
- Look for error messages in the SQL Editor output

**Issue: Conversations not loading**
- Check browser console for errors
- Verify the migration ran successfully
- Ensure RLS policies are in place (migration adds them automatically)

**Issue: Cannot create new conversations**
- Verify you have an assigned assistant
- Check network tab for API errors
- Ensure you're logged in

**Issue: Messages not showing**
- Verify existing messages were migrated (check `conversation_id` is not null)
- Try refreshing the page
- Check browser console for errors

## 📝 Migration Details

The migration script automatically:
1. Creates the `conversations` table with RLS policies
2. Adds `conversation_id` column to messages table
3. **Migrates existing messages** to a default conversation titled "Previous Conversation"
4. Sets up triggers to auto-update conversation timestamps
5. Creates function to auto-generate conversation titles from first message

Your existing data is preserved and backward compatible.

## 🎯 Next Steps (Optional Enhancements)

Consider adding these features later:
- Rename conversation titles (API endpoint already exists)
- Search conversations
- Archive old conversations
- Export conversation to PDF/text
- Share conversation links
- Conversation folders/categories

---

**Need Help?** Check the Supabase dashboard logs or browser console for detailed error messages.
