# Public Chat Feature - Anonymous Assistant Links

This feature allows admins to create shareable links for assistants, enabling anonymous users to chat without requiring signup or login.

## Features

### 1. Shareable Links
- **Location**: Admin Panel → Assistants → "Get Link" button
- Generates unique, token-based URLs for each assistant
- Each link creates a new anonymous session
- Links can be shared via email, social media, etc.

### 2. Anonymous Chat Sessions
- No login/signup required for users
- Each click creates a new independent session
- Sessions track:
  - Duration (created → ended)
  - Message count
  - Last activity time
- Sessions auto-end when user closes browser/tab

### 3. Admin Monitoring
- **Location**: Admin Panel → Public Sessions
- View all anonymous sessions
- Filter by:
  - Status (Active/Ended/All)
  - Assistant type
- Session details:
  - Assistant used
  - Number of messages
  - Session duration
  - Activity timestamps
- View full conversation history for each session

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

\`\`\`bash
# File: public-chat-migration.sql
\`\`\`

This migration will:
- Create `public_sessions` table
- Update `messages` table to support public sessions
- Add necessary indexes and triggers
- Configure Row Level Security (RLS) policies

### 2. Verify Database Changes

After running the migration, verify:

\`\`\`sql
-- Check public_sessions table exists
SELECT * FROM public_sessions LIMIT 1;

-- Check messages table has new columns
SELECT session_id, is_public FROM messages LIMIT 1;

-- Verify triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'messages'
AND trigger_name = 'on_public_message_created';
\`\`\`

### 3. Environment Variables

Ensure you have the base URL configured (optional):

\`\`\`env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
\`\`\`

If not set, the system will auto-detect from request headers.

## How It Works

### For Admins

1. **Generate Link**:
   - Go to Admin Panel → Assistants
   - Click "Get Link" next to any assistant
   - Copy the generated link
   - Share it anywhere (email, website, social media)

2. **Monitor Sessions**:
   - Go to Admin Panel → Public Sessions
   - View all anonymous conversations
   - Filter by status or assistant
   - Click "View Messages" to see conversation details

3. **Export Data**:
   - Public session messages are included in the Messages export
   - Can be filtered and downloaded for analysis

### For Anonymous Users

1. **Access**:
   - Click the shared link
   - No signup or login required

2. **Chat**:
   - Start chatting immediately
   - Full-featured chat interface
   - Streaming responses
   - JSON response formatting (same as authenticated chat)

3. **Session End**:
   - Session ends automatically when browser/tab closes
   - Data is saved and accessible to admins

## Technical Details

### Database Schema

**public_sessions table**:
\`\`\`sql
- id: UUID (primary key)
- assistant_id: UUID (references assistants)
- session_token: TEXT (unique token for URL)
- openai_thread_id: TEXT (OpenAI conversation thread)
- created_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ (nullable)
- last_activity_at: TIMESTAMPTZ
- message_count: INTEGER (auto-updated by trigger)
\`\`\`

**messages table updates**:
\`\`\`sql
- user_id: UUID (now nullable for public messages)
- session_id: UUID (references public_sessions)
- is_public: BOOLEAN (flags public vs authenticated messages)
\`\`\`

### API Endpoints

**Admin**:
- `POST /api/admin/assistants/generate-link` - Generate shareable link
- `GET /api/admin/public-sessions/[sessionId]/messages` - Get session messages

**Public** (No Auth Required):
- `GET /public/chat/[token]` - Public chat page
- `POST /api/public/chat` - Send message (streaming response)
- `POST /api/public/chat/end-session` - Mark session as ended

### Security

- Public sessions use unique, randomly-generated UUID tokens
- No user data is exposed in public sessions
- RLS policies ensure public messages are only readable via session token
- Admin-only access to view all sessions
- Sessions are isolated (one session can't access another's messages)

## Data Privacy

- **Anonymous**: No user identification or tracking
- **Isolated**: Each session is completely separate
- **Admin Access**: Only admins can view all sessions
- **Data Retention**: Messages persist for research/analysis
- **Export Ready**: All data can be exported via admin panel

## Use Cases

1. **Customer Support**: Share link for instant help
2. **Product Demos**: Let prospects try the assistant
3. **Research**: Collect anonymous conversation data
4. **A/B Testing**: Compare different assistant personalities
5. **Public Access**: Embed on website for visitor engagement
6. **Marketing**: Share on social media for engagement

## Limitations

- Sessions don't persist across devices (token-based)
- No conversation history for users (single session only)
- Session ends when browser closes (by design)
- No user authentication or account features

## Future Enhancements

Possible improvements:
- Session persistence via cookies
- Optional user identification (name/email)
- Session sharing/resumption
- Rate limiting per session
- Auto-expire old sessions
- Public session analytics dashboard
