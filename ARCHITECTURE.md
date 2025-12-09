# AI Chat Platform - System Architecture

## 1. File Structure

```
ai-chat-platform/
├── app/
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Landing/redirect page
│   ├── login/
│   │   └── page.tsx               # Login page
│   ├── signup/
│   │   └── page.tsx               # Signup page
│   ├── chat/
│   │   ├── page.tsx               # Main chat interface
│   │   └── components/
│   │       ├── ChatInterface.tsx  # Chat UI component
│   │       ├── MessageBubble.tsx  # Individual message component
│   │       └── ChatInput.tsx      # Input field component
│   ├── admin/
│   │   ├── layout.tsx             # Admin layout (checks admin role)
│   │   ├── page.tsx               # Admin dashboard home
│   │   ├── users/
│   │   │   └── page.tsx           # User management
│   │   ├── assistants/
│   │   │   ├── page.tsx           # Assistant CRUD
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Edit assistant
│   │   └── chats/
│   │       ├── page.tsx           # Chat history list
│   │       └── [userId]/
│   │           └── page.tsx       # User chat history detail
│   └── api/
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts       # POST /api/auth/login
│       │   ├── signup/
│       │   │   └── route.ts       # POST /api/auth/signup
│       │   └── logout/
│       │       └── route.ts       # POST /api/auth/logout
│       ├── chat/
│       │   └── route.ts           # POST /api/chat (streaming)
│       ├── admin/
│       │   ├── users/
│       │   │   ├── route.ts       # GET /api/admin/users
│       │   │   └── [id]/
│       │   │       └── route.ts   # PATCH /api/admin/users/:id
│       │   ├── assistants/
│       │   │   ├── route.ts       # GET, POST /api/admin/assistants
│       │   │   └── [id]/
│       │   │       └── route.ts   # GET, PATCH, DELETE /api/admin/assistants/:id
│       │   └── chats/
│       │       ├── route.ts       # GET /api/admin/chats
│       │       └── [userId]/
│       │           └── route.ts   # GET /api/admin/chats/:userId
├── components/
│   ├── providers/
│   │   └── AuthProvider.tsx       # Auth context provider
│   └── ui/
│       ├── Button.tsx             # Reusable UI components
│       ├── Input.tsx
│       ├── Table.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase browser client
│   │   ├── server.ts              # Supabase server client
│   │   └── middleware.ts          # Auth middleware
│   ├── openai/
│   │   └── client.ts              # OpenAI client setup
│   ├── db/
│   │   ├── users.ts               # User DB operations
│   │   ├── assistants.ts          # Assistant DB operations
│   │   ├── messages.ts            # Message DB operations
│   │   └── assignments.ts         # Assignment DB operations
│   └── utils/
│       ├── auth.ts                # Auth helper functions
│       └── validators.ts          # Input validation
├── types/
│   ├── database.ts                # Database types (from Supabase CLI)
│   ├── assistant.ts               # Assistant types
│   └── message.ts                 # Message types
├── middleware.ts                  # Next.js middleware for auth
├── .env.local                     # Environment variables
├── next.config.js
├── package.json
└── tsconfig.json
```

## 2. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com  # Used to identify admin user
```

## 3. Database Schema

### Tables

#### 3.1 `auth.users` (Supabase Auth - built-in)
```sql
-- Managed by Supabase Auth
-- Fields: id (uuid), email, encrypted_password, created_at, etc.
```

#### 3.2 `public.profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### 3.3 `public.assistants`
```sql
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  model_id TEXT NOT NULL,  -- OpenAI model ID (e.g., "ft:gpt-3.5-turbo:...")
  system_prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  available_for_random_assignment BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active assistants"
  ON assistants FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Admins can manage assistants"
  ON assistants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
```

#### 3.4 `public.user_assistant`
```sql
CREATE TABLE user_assistant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),  -- NULL if random, admin_id if manual
  UNIQUE(user_id)  -- Each user has only one active assistant
);

-- Enable RLS
ALTER TABLE user_assistant ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own assignment"
  ON user_assistant FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage assignments"
  ON user_assistant FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
```

#### 3.5 `public.messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
```

### Database Relationships

```
auth.users (1) <---> (1) profiles
auth.users (1) <---> (1) user_assistant
auth.users (1) <---> (*) messages
assistants (1) <---> (*) user_assistant
assistants (1) <---> (*) messages
```

### Sample Data

```sql
-- Insert sample assistants
INSERT INTO assistants (name, description, model_id, system_prompt, active, available_for_random_assignment) VALUES
('nav_edu', 'Navigation Education Assistant', 'gpt-3.5-turbo', 'You are a navigation education assistant helping students learn about navigation concepts.', TRUE, TRUE),
('core_edu', 'Core Education Assistant', 'gpt-3.5-turbo', 'You are a core education assistant providing fundamental educational support.', TRUE, TRUE),
('base_edu', 'Base Education Assistant', 'gpt-3.5-turbo', 'You are a base education assistant offering general learning assistance.', TRUE, TRUE);
```

## 4. Authentication Flow

### 4.1 Sign-Up Flow

```
User → /signup page
  ↓
User submits email + password
  ↓
POST /api/auth/signup
  ↓
Supabase createUser()
  ↓
Create profile in profiles table
  ↓
Check if user has assistant assignment (NO on first signup)
  ↓
Randomly assign assistant from available_for_random_assignment=true
  ↓
Insert into user_assistant table (assigned_by = NULL)
  ↓
Create session cookie
  ↓
Redirect to /chat
```

**Implementation Details:**
- Use `supabase.auth.signUp()` in API route
- After successful signup, create profile entry
- Trigger assistant assignment function
- Set session cookie for authentication
- Return success response with redirect URL

### 4.2 Login Flow

```
User → /login page
  ↓
User submits email + password
  ↓
POST /api/auth/login
  ↓
Supabase signInWithPassword()
  ↓
Validate credentials
  ↓
Create session cookie
  ↓
Check if admin (profiles.is_admin)
  ↓
Redirect to /chat (or /admin if admin)
```

**Implementation Details:**
- Use `supabase.auth.signInWithPassword()`
- Set secure HTTP-only session cookie
- Fetch user profile to check admin status
- Return appropriate redirect URL

### 4.3 Session Management

**Middleware Protection (`middleware.ts`):**
```typescript
// Protected routes
const protectedRoutes = ['/chat', '/admin'];
const adminRoutes = ['/admin'];

// Check session on each request
// Redirect to /login if no session
// Check is_admin for /admin routes
```

**Session Refresh:**
- Use Supabase session refresh automatically
- Middleware checks session validity
- Refresh token stored in HTTP-only cookie

### 4.4 Logout Flow

```
User clicks logout
  ↓
POST /api/auth/logout
  ↓
Supabase signOut()
  ↓
Clear session cookie
  ↓
Redirect to /login
```

### 4.5 Role-Based Access Control

**User Roles:**
- **Regular User**: Access to /chat only
- **Admin**: Access to /chat and /admin/*

**Implementation:**
- Check `profiles.is_admin` boolean
- Protect admin routes in middleware
- API routes validate admin status before operations

## 5. Assistant Assignment Logic

### 5.1 Random Assignment on First Login

**Trigger:** After successful signup

**Algorithm:**
```sql
-- Get all assistants available for random assignment
SELECT id FROM assistants
WHERE active = TRUE
AND available_for_random_assignment = TRUE;

-- Pick random assistant
-- Use RANDOM() or application-level random selection

-- Insert assignment
INSERT INTO user_assistant (user_id, assistant_id, assigned_by)
VALUES (user_id, random_assistant_id, NULL);
```

**Implementation Flow:**
```
New user signs up
  ↓
Check if user has assignment
  ↓
  NO → Query available assistants
  ↓
  Filter: active=TRUE AND available_for_random_assignment=TRUE
  ↓
  Select random assistant from list
  ↓
  Insert into user_assistant table
  ↓
  assigned_by = NULL (indicates random assignment)
```

### 5.2 Manual Assignment by Admin

**Trigger:** Admin changes user's assistant in `/admin/users`

**Flow:**
```
Admin selects user
  ↓
Admin selects new assistant
  ↓
PATCH /api/admin/users/:id
  ↓
Delete existing user_assistant record
  ↓
Insert new user_assistant record
  ↓
assigned_by = admin_user_id
  ↓
assigned_at = NOW()
```

**Implementation Details:**
```typescript
// API Handler
async function updateUserAssistant(userId, newAssistantId, adminId) {
  // Delete old assignment
  await supabase
    .from('user_assistant')
    .delete()
    .eq('user_id', userId);

  // Create new assignment
  await supabase
    .from('user_assistant')
    .insert({
      user_id: userId,
      assistant_id: newAssistantId,
      assigned_by: adminId
    });
}
```

### 5.3 Assistant Availability Management

**Admin Controls:**
1. **Active Toggle**: `assistants.active`
   - When `false`, assistant is hidden from all users
   - Existing assignments remain but won't be used in chat

2. **Random Assignment Toggle**: `assistants.available_for_random_assignment`
   - When `false`, assistant won't be randomly assigned to new users
   - Can still be manually assigned by admin

**Example Scenarios:**

| Scenario | Active | Available for Random | Effect |
|----------|--------|---------------------|--------|
| New assistant in testing | TRUE | FALSE | Admin can manually assign for testing |
| Deprecated assistant | FALSE | FALSE | Hidden, not assigned to new users |
| Standard assistant | TRUE | TRUE | Available for everyone |
| Premium assistant | TRUE | FALSE | Admin-only assignment |

### 5.4 Retrieving User's Assistant

**When user loads chat:**
```sql
SELECT a.* FROM assistants a
JOIN user_assistant ua ON ua.assistant_id = a.id
WHERE ua.user_id = :user_id
AND a.active = TRUE;
```

**Fallback Strategy:**
- If no assignment exists: trigger random assignment
- If assigned assistant is inactive: notify admin, show error to user

## 6. Chat Component and API Flow

### 6.1 Chat Page Component Structure

```typescript
// app/chat/page.tsx
'use client';

export default function ChatPage() {
  // 1. Fetch chat history on mount
  // 2. Display messages in scrollable container
  // 3. Handle user input submission
  // 4. Stream assistant responses
  // 5. Auto-scroll to latest message
}

// Components:
// - ChatInterface.tsx (main container)
// - MessageBubble.tsx (individual message with role styling)
// - ChatInput.tsx (textarea + send button)
```

### 6.2 Chat API Flow (POST /api/chat)

**Request:**
```typescript
{
  "message": "User's message text"
}
```

**Response:**
- Streaming response using Server-Sent Events (SSE)
- Content-Type: `text/event-stream`

**Complete Flow:**
```
User types message → Click Send
  ↓
ChatInterface.tsx calls POST /api/chat
  ↓
API Route Handler:
  ↓
1. Authenticate user (check session)
  ↓
2. Get user_id from session
  ↓
3. Query user's assigned assistant:
   SELECT a.* FROM assistants a
   JOIN user_assistant ua ON ua.assistant_id = a.id
   WHERE ua.user_id = :user_id
  ↓
4. Load assistant's model_id and system_prompt
  ↓
5. Fetch recent chat history (last 20 messages):
   SELECT role, content FROM messages
   WHERE user_id = :user_id
   ORDER BY timestamp DESC
   LIMIT 20
  ↓
6. Build OpenAI messages array:
   [
     { role: 'system', content: assistant.system_prompt },
     ...history.reverse(),
     { role: 'user', content: new_message }
   ]
  ↓
7. Save user message to database:
   INSERT INTO messages (user_id, assistant_id, role, content)
   VALUES (:user_id, :assistant_id, 'user', :message)
  ↓
8. Call OpenAI API with streaming:
   openai.chat.completions.create({
     model: assistant.model_id,
     messages: messages,
     stream: true
   })
  ↓
9. Stream response chunks to client
  ↓
10. Accumulate full response
  ↓
11. Save assistant message to database:
    INSERT INTO messages (user_id, assistant_id, role, content)
    VALUES (:user_id, :assistant_id, 'assistant', :full_response)
  ↓
12. End stream
```

### 6.3 Frontend Implementation

**State Management:**
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [streamingMessage, setStreamingMessage] = useState('');

// On mount: fetch history
useEffect(() => {
  fetchChatHistory();
}, []);

// Send message
async function sendMessage(text: string) {
  // Add user message to UI immediately
  setMessages(prev => [...prev, { role: 'user', content: text }]);

  // Call API with streaming
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });

  // Handle stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullMessage = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    fullMessage += chunk;
    setStreamingMessage(fullMessage);
  }

  // Add complete assistant message
  setMessages(prev => [...prev, { role: 'assistant', content: fullMessage }]);
  setStreamingMessage('');
}
```

### 6.4 Loading Chat History

**API Endpoint:** `GET /api/chat/history`

**Query:**
```sql
SELECT id, role, content, timestamp
FROM messages
WHERE user_id = :user_id
ORDER BY timestamp ASC
LIMIT 100;
```

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Hello",
      "timestamp": "2025-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Hi! How can I help?",
      "timestamp": "2025-01-15T10:00:05Z"
    }
  ]
}
```

### 6.5 Error Handling

**Common Errors:**
1. **No assistant assigned**
   - Response: 400 "No assistant assigned to user"
   - Trigger random assignment

2. **Assistant inactive**
   - Response: 400 "Your assigned assistant is currently inactive"
   - Admin notification

3. **OpenAI API error**
   - Response: 500 "Failed to get response from AI"
   - Log error, show user-friendly message

4. **Rate limiting**
   - Implement simple rate limit (e.g., 20 messages/minute)
   - Response: 429 "Too many requests"

## 7. Admin Panel Structure and APIs

### 7.1 Admin Routes Overview

```
/admin                    → Dashboard home (stats overview)
/admin/users              → User management
/admin/assistants         → Assistant CRUD
/admin/assistants/:id     → Edit specific assistant
/admin/chats              → Chat history list
/admin/chats/:userId      → User's chat history detail
```

### 7.2 Admin Authentication

**Middleware Check:**
```typescript
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const user = await getUser();
  const profile = await getProfile(user.id);

  if (!profile.is_admin) {
    redirect('/chat');
  }

  return <AdminLayoutUI>{children}</AdminLayoutUI>;
}
```

### 7.3 User Management (GET /api/admin/users)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2025-01-15T10:00:00Z",
      "assistant": {
        "id": "uuid",
        "name": "nav_edu",
        "assigned_at": "2025-01-15T10:00:00Z",
        "assigned_by": null
      },
      "message_count": 45
    }
  ]
}
```

**SQL Query:**
```sql
SELECT
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  a.id as assistant_id,
  a.name as assistant_name,
  ua.assigned_at,
  ua.assigned_by,
  COUNT(m.id) as message_count
FROM profiles p
LEFT JOIN user_assistant ua ON ua.user_id = p.id
LEFT JOIN assistants a ON a.id = ua.assistant_id
LEFT JOIN messages m ON m.user_id = p.id
WHERE p.is_admin = FALSE
GROUP BY p.id, a.id, ua.assigned_at, ua.assigned_by
ORDER BY p.created_at DESC;
```

### 7.4 Change User's Assistant (PATCH /api/admin/users/:id)

**Request:**
```json
{
  "assistant_id": "new-assistant-uuid"
}
```

**Flow:**
```typescript
1. Verify admin authentication
2. Validate assistant_id exists and is active
3. Delete current assignment
4. Insert new assignment with assigned_by = admin_id
5. Return success
```

**Response:**
```json
{
  "success": true,
  "message": "Assistant updated successfully"
}
```

### 7.5 Assistant Management

#### 7.5.1 List Assistants (GET /api/admin/assistants)

**Response:**
```json
{
  "assistants": [
    {
      "id": "uuid",
      "name": "nav_edu",
      "description": "Navigation Education Assistant",
      "model_id": "gpt-3.5-turbo",
      "active": true,
      "available_for_random_assignment": true,
      "user_count": 12,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### 7.5.2 Create Assistant (POST /api/admin/assistants)

**Request:**
```json
{
  "name": "nav_sci",
  "description": "Navigation Science Assistant",
  "model_id": "ft:gpt-3.5-turbo-1234:org:model:xyz",
  "system_prompt": "You are a navigation science assistant...",
  "active": true,
  "available_for_random_assignment": false
}
```

**Validation:**
- `name`: required, unique, alphanumeric + underscore
- `model_id`: required, valid OpenAI model
- `system_prompt`: required, 10-2000 characters
- `active`: boolean, default true
- `available_for_random_assignment`: boolean, default true

#### 7.5.3 Update Assistant (PATCH /api/admin/assistants/:id)

**Request:** (any subset of fields)
```json
{
  "description": "Updated description",
  "active": false
}
```

#### 7.5.4 Delete Assistant (DELETE /api/admin/assistants/:id)

**Safety Check:**
```typescript
// Check if any users are assigned
const usersCount = await supabase
  .from('user_assistant')
  .select('id', { count: 'exact' })
  .eq('assistant_id', assistantId);

if (usersCount > 0) {
  return error(400, 'Cannot delete assistant with active users');
}

// Safe to delete
await supabase
  .from('assistants')
  .delete()
  .eq('id', assistantId);
```

### 7.6 Chat History Management

#### 7.6.1 List All Chats (GET /api/admin/chats)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "assistant_name": "nav_edu",
      "message_count": 45,
      "last_message_at": "2025-01-15T14:30:00Z"
    }
  ]
}
```

**Query:**
```sql
SELECT
  p.id,
  p.email,
  a.name as assistant_name,
  COUNT(m.id) as message_count,
  MAX(m.timestamp) as last_message_at
FROM profiles p
LEFT JOIN user_assistant ua ON ua.user_id = p.id
LEFT JOIN assistants a ON a.id = ua.assistant_id
LEFT JOIN messages m ON m.user_id = p.id
WHERE p.is_admin = FALSE
GROUP BY p.id, a.name
ORDER BY last_message_at DESC;
```

#### 7.6.2 View User Chat History (GET /api/admin/chats/:userId)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "assistant_name": "nav_edu"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Hello",
      "timestamp": "2025-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Hi! How can I help?",
      "timestamp": "2025-01-15T10:00:05Z"
    }
  ]
}
```

### 7.7 Admin Dashboard Stats (GET /api/admin/stats)

**Response:**
```json
{
  "total_users": 150,
  "total_messages": 3420,
  "active_assistants": 3,
  "messages_today": 89,
  "new_users_this_week": 12
}
```

## 8. Component Interactions and Data Flow

### 8.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │  Signup  │  │   Chat   │  │  Admin   │   │
│  │  Page    │  │  Page    │  │   Page   │  │  Panel   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘          │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐          │
│  │    Auth    │  │    Chat    │  │    Admin     │          │
│  │   Routes   │  │   Routes   │  │    Routes    │          │
│  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘          │
│        │                │                 │                  │
└────────┼────────────────┼─────────────────┼──────────────────┘
         │                │                 │
         ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Supabase │  │ Profiles │  │Assistant │  │ Messages │   │
│  │   Auth   │  │  Table   │  │  Tables  │  │  Table   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ (Chat API only)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    OPENAI API                                │
├─────────────────────────────────────────────────────────────┤
│  - GPT-3.5-turbo (base models)                              │
│  - Fine-tuned models (custom assistants)                    │
│  - Streaming responses                                      │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 User Journey: Complete Flow

#### 8.2.1 New User Journey

```
1. User visits /signup
   ↓
2. Enters email + password
   ↓
3. POST /api/auth/signup
   ├─ Creates auth.users entry (Supabase Auth)
   ├─ Creates profiles entry (is_admin=false)
   ├─ Queries available assistants (active=true, available_for_random=true)
   ├─ Randomly selects one assistant
   └─ Creates user_assistant entry (assigned_by=null)
   ↓
4. Redirects to /chat
   ↓
5. Chat page loads:
   ├─ Fetches user's assigned assistant
   ├─ Loads empty chat history (first time)
   └─ Shows chat interface
   ↓
6. User sends first message
   ↓
7. POST /api/chat
   ├─ Validates session
   ├─ Gets assigned assistant (nav_edu, core_edu, or base_edu)
   ├─ Loads assistant's model_id and system_prompt
   ├─ Calls OpenAI with system prompt + user message
   ├─ Streams response
   └─ Saves both messages to database
   ↓
8. User sees assistant response
```

#### 8.2.2 Returning User Journey

```
1. User visits /login
   ↓
2. Enters credentials
   ↓
3. POST /api/auth/login
   ├─ Validates with Supabase Auth
   └─ Creates session
   ↓
4. Redirects to /chat
   ↓
5. Chat page loads:
   ├─ Fetches chat history (GET /api/chat/history)
   ├─ Displays previous conversations
   └─ Shows assistant name
   ↓
6. User continues conversation
```

#### 8.2.3 Admin Journey

```
1. Admin logs in (same as regular user)
   ↓
2. System detects is_admin=true
   ↓
3. Can access both /chat and /admin
   ↓
4. On /admin/users:
   ├─ GET /api/admin/users
   ├─ Views all users and their assignments
   ├─ Can change user's assistant
   └─ PATCH /api/admin/users/:id { assistant_id }
   ↓
5. On /admin/assistants:
   ├─ GET /api/admin/assistants
   ├─ Views all assistants
   ├─ Can create new assistant (POST)
   ├─ Can toggle active/inactive
   └─ Can toggle random assignment availability
   ↓
6. On /admin/chats:
   ├─ GET /api/admin/chats
   ├─ Views all user conversations
   └─ GET /api/admin/chats/:userId for details
```

### 8.3 Data Flow Diagrams

#### 8.3.1 Chat Message Flow

```
User Input
    │
    ├─► Frontend validates (not empty, max length)
    │
    ├─► POST /api/chat { message: "..." }
    │
    ▼
API Route
    │
    ├─► Authenticate user (middleware)
    │
    ├─► Query user_assistant table
    │       └─► Get assistant_id
    │
    ├─► Query assistants table
    │       └─► Get model_id, system_prompt
    │
    ├─► Query messages table
    │       └─► Get last 20 messages for context
    │
    ├─► Build OpenAI messages array:
    │       [
    │         { role: 'system', content: system_prompt },
    │         ...history,
    │         { role: 'user', content: new_message }
    │       ]
    │
    ├─► INSERT user message to messages table
    │
    ├─► Call OpenAI API (streaming)
    │       └─► Stream chunks to client
    │
    ├─► Accumulate full response
    │
    ├─► INSERT assistant message to messages table
    │
    └─► Complete stream
         │
         ▼
Frontend
    │
    ├─► Displays streaming response in real-time
    │
    └─► Updates message history
```

#### 8.3.2 Assistant Assignment Flow

```
New User Signup
    │
    ├─► Create user in Supabase Auth
    │
    ├─► Create profile entry
    │
    ▼
Assignment Logic
    │
    ├─► SELECT * FROM assistants
    │   WHERE active = TRUE
    │   AND available_for_random_assignment = TRUE
    │
    ├─► Pick random from results
    │       └─► Use Math.random() or SQL ORDER BY RANDOM() LIMIT 1
    │
    ├─► INSERT INTO user_assistant
    │       (user_id, assistant_id, assigned_by)
    │       VALUES (new_user_id, random_assistant_id, NULL)
    │
    └─► User ready to chat

Admin Manual Assignment
    │
    ├─► Admin selects user and new assistant
    │
    ├─► DELETE FROM user_assistant
    │   WHERE user_id = :user_id
    │
    ├─► INSERT INTO user_assistant
    │       (user_id, assistant_id, assigned_by)
    │       VALUES (:user_id, :new_assistant_id, :admin_id)
    │
    └─► Assignment updated
```

### 8.4 Component Dependencies

```
Frontend Components:
  ChatPage
    ├── depends on: AuthProvider (session)
    ├── calls: GET /api/chat/history
    └── calls: POST /api/chat

  AdminUsersPage
    ├── depends on: AdminLayout (is_admin check)
    ├── calls: GET /api/admin/users
    └── calls: PATCH /api/admin/users/:id

  AdminAssistantsPage
    ├── depends on: AdminLayout (is_admin check)
    ├── calls: GET /api/admin/assistants
    ├── calls: POST /api/admin/assistants
    ├── calls: PATCH /api/admin/assistants/:id
    └── calls: DELETE /api/admin/assistants/:id

API Routes:
  /api/chat
    ├── depends on: Supabase client
    ├── depends on: OpenAI client
    ├── queries: user_assistant, assistants, messages
    └── calls: OpenAI API

  /api/admin/*
    ├── depends on: Admin auth middleware
    ├── depends on: Supabase client
    └── queries: all tables
```

## 9. Example Assistant Prompts

### 9.1 Education Assistants

#### nav_edu (Navigation Education Assistant)
```
You are a friendly and patient navigation education assistant designed to help students learn about navigation concepts, map reading, and wayfinding skills.

Your role is to:
- Explain navigation concepts in simple, accessible language
- Use examples and analogies to make learning engaging
- Encourage students to think critically about spatial reasoning
- Provide step-by-step guidance when explaining complex topics
- Adapt your explanations based on the student's level of understanding

Keep responses concise (2-3 paragraphs) unless the student asks for more detail. Use a warm, encouraging tone and celebrate student progress.
```

#### core_edu (Core Education Assistant)
```
You are a comprehensive core education assistant focused on fundamental academic subjects including mathematics, science, language arts, and social studies.

Your responsibilities:
- Provide clear explanations of core academic concepts
- Help students with homework and assignment questions
- Break down complex problems into manageable steps
- Offer practice problems and learning exercises
- Connect concepts across different subject areas

Maintain an encouraging and supportive tone. Ask clarifying questions to understand the student's needs. Provide examples and real-world applications to reinforce learning.
```

#### base_edu (Base Education Assistant)
```
You are a general-purpose educational assistant helping students with a wide range of learning needs and questions.

Your approach:
- Listen carefully to understand what the student needs help with
- Provide accurate, age-appropriate information
- Use simple language and avoid jargon unless necessary
- Encourage curiosity and independent thinking
- Suggest additional resources when appropriate

Be patient, friendly, and non-judgmental. If you don't know something, admit it honestly and help the student find the right resources.
```

### 9.2 Science Assistants (Future Examples)

#### nav_sci (Navigation Science Assistant)
```
You are an advanced navigation science assistant specializing in geodesy, cartography, celestial navigation, and modern GPS technology.

Your expertise includes:
- Coordinate systems and map projections
- Satellite navigation systems (GPS, GLONASS, Galileo)
- Inertial navigation and dead reckoning
- Astronomical navigation techniques
- GIS and spatial analysis

Provide technically accurate information while remaining accessible. Use diagrams and examples when explaining complex concepts. Reference current research and standards in the field.
```

#### core_sci (Core Science Assistant)
```
You are a rigorous science assistant covering physics, chemistry, biology, and earth science at an advanced level.

Your capabilities:
- Explain scientific principles with mathematical precision
- Discuss current research and scientific developments
- Help with laboratory procedures and data analysis
- Connect scientific concepts across disciplines
- Evaluate scientific claims and methodology

Maintain scientific accuracy while adapting explanations to the user's level. Encourage the scientific method and critical thinking. Cite sources when discussing specific studies or data.
```

### 9.3 Customization Guidelines

**When creating new assistant prompts:**

1. **Clear Identity**: Define who the assistant is in the first sentence
2. **Scope**: Clearly state the assistant's domain and limitations
3. **Tone**: Specify the communication style (formal, friendly, professional)
4. **Response Format**: Guide response length and structure
5. **Key Behaviors**: List 3-5 key responsibilities or approaches
6. **Constraints**: Mention any specific things to avoid or emphasize

**Prompt Length**: 150-500 words for most assistants

**Testing**: After creating a prompt, test with 5-10 diverse queries to ensure:
- Consistent tone and personality
- Appropriate knowledge boundaries
- Helpful and accurate responses
- Engaging user experience

## 10. OpenAI Integration Guide

### 10.1 Setup

**Install OpenAI SDK:**
```bash
npm install openai
```

**Create OpenAI Client:**
```typescript
// lib/openai/client.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### 10.2 Using Base Models

**For initial development and testing:**

```typescript
// app/api/chat/route.ts
import { openai } from '@/lib/openai/client';

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',  // or 'gpt-4'
  messages: [
    {
      role: 'system',
      content: assistant.system_prompt
    },
    ...chatHistory,
    {
      role: 'user',
      content: userMessage
    }
  ],
  stream: true,
  temperature: 0.7,
  max_tokens: 1000,
});
```

### 10.3 Fine-Tuning Models

**Step 1: Prepare Training Data**

Create a JSONL file with training examples:

```jsonl
{"messages": [{"role": "system", "content": "You are a navigation education assistant..."}, {"role": "user", "content": "What is a compass?"}, {"role": "assistant", "content": "A compass is a navigation instrument that shows directions..."}]}
{"messages": [{"role": "system", "content": "You are a navigation education assistant..."}, {"role": "user", "content": "How do I read a map?"}, {"role": "assistant", "content": "Reading a map involves understanding several key elements..."}]}
```

**Minimum Requirements:**
- At least 10 examples (50-100 recommended for quality)
- Diverse conversation scenarios
- Consistent assistant behavior
- Representative of actual use cases

**Step 2: Upload Training File**

```bash
# Using OpenAI CLI
openai api files.create -f training_data.jsonl -p fine-tune
```

Or via API:

```typescript
const file = await openai.files.create({
  file: fs.createReadStream('training_data.jsonl'),
  purpose: 'fine-tune',
});
```

**Step 3: Create Fine-Tuning Job**

```bash
openai api fine_tunes.create \
  -t file-abc123 \
  -m gpt-3.5-turbo \
  --suffix "nav_edu"
```

Or via API:

```typescript
const fineTune = await openai.fineTuning.jobs.create({
  training_file: file.id,
  model: 'gpt-3.5-turbo',
  suffix: 'nav_edu',
});
```

**Step 4: Monitor Progress**

```typescript
const job = await openai.fineTuning.jobs.retrieve(fineTune.id);
console.log(job.status);  // 'validating_files', 'running', 'succeeded', 'failed'
```

**Step 5: Get Fine-Tuned Model ID**

Once complete:
```typescript
const job = await openai.fineTuning.jobs.retrieve(fineTune.id);
const modelId = job.fine_tuned_model;
// e.g., "ft:gpt-3.5-turbo-0613:your-org::abc123"
```

**Step 6: Add to Database**

```sql
INSERT INTO assistants (name, description, model_id, system_prompt, active)
VALUES (
  'nav_edu',
  'Navigation Education Assistant',
  'ft:gpt-3.5-turbo-0613:your-org::abc123',
  'You are a navigation education assistant...',
  TRUE
);
```

### 10.4 Streaming Implementation

**Backend (API Route):**

```typescript
import { OpenAIStream, StreamingTextResponse } from 'ai';

export async function POST(req: Request) {
  const { message } = await req.json();

  // ... auth and data loading ...

  const response = await openai.chat.completions.create({
    model: assistant.model_id,
    messages: messagesArray,
    stream: true,
  });

  // Use Vercel AI SDK for easy streaming
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

**Frontend:**

```typescript
import { useChat } from 'ai/react';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

### 10.5 Cost Optimization

**Strategies:**

1. **Limit Context Window**
   - Only include last 20 messages in history
   - Summarize older conversations if needed

2. **Use Appropriate Models**
   - gpt-3.5-turbo for most use cases ($0.50-$1.50 / 1M tokens)
   - gpt-4 only when advanced reasoning is needed ($30-$60 / 1M tokens)

3. **Set Token Limits**
   ```typescript
   max_tokens: 500,  // Prevent excessively long responses
   ```

4. **Cache System Prompts**
   - Store in database, not regenerated per request

5. **Rate Limiting**
   - Limit messages per user per minute
   - Prevents abuse and runaway costs

### 10.6 Model Comparison

| Model | Cost (Input/Output) | Best For | Speed |
|-------|-------------------|----------|-------|
| gpt-3.5-turbo | $0.50/$1.50 per 1M tokens | General chat, simple tasks | Fast |
| gpt-4 | $30/$60 per 1M tokens | Complex reasoning | Slower |
| gpt-4-turbo | $10/$30 per 1M tokens | Balance of quality/cost | Medium |
| Fine-tuned gpt-3.5 | $3/$6 per 1M tokens | Specialized behavior | Fast |

**Recommendation for this project:**
- Start with base gpt-3.5-turbo
- Fine-tune when you have 50+ quality training examples
- Use gpt-4 only for specialized assistants if needed

### 10.7 Testing Fine-Tuned Models

**Before deployment:**

```typescript
// Test script
const testMessages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: 'Test question 1' },
];

const response = await openai.chat.completions.create({
  model: 'ft:gpt-3.5-turbo:org:model:id',
  messages: testMessages,
});

console.log(response.choices[0].message.content);
```

**Quality Checklist:**
- [ ] Consistent tone across responses
- [ ] Stays within domain boundaries
- [ ] Provides helpful, accurate information
- [ ] Follows response format guidelines
- [ ] Doesn't hallucinate or make false claims
- [ ] Handles edge cases gracefully

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Set up Next.js project with TypeScript
2. Configure Supabase project
3. Create database schema and tables
4. Implement authentication (login/signup)
5. Set up basic routing

### Phase 2: Core Chat (Week 2)
1. Build chat UI components
2. Implement POST /api/chat with base model
3. Add message persistence to database
4. Implement chat history loading
5. Add streaming responses

### Phase 3: Assistant System (Week 3)
1. Implement random assignment on signup
2. Create assistant management in database
3. Test with multiple base model assistants
4. Validate assignment logic

### Phase 4: Admin Panel (Week 4)
1. Build admin layout and navigation
2. Implement user management page
3. Create assistant CRUD interface
4. Add chat history viewer
5. Implement manual assignment feature

### Phase 5: Fine-Tuning (Week 5+)
1. Collect training data from real usage
2. Create fine-tuning datasets
3. Train first fine-tuned models
4. Test and validate quality
5. Deploy fine-tuned models to production

### Phase 6: Polish (Ongoing)
1. Add error handling and validation
2. Implement rate limiting
3. Add loading states and UI polish
4. Performance optimization
5. Security hardening

## 12. Security Considerations

### 12.1 Authentication Security
- Use HTTP-only cookies for session tokens
- Implement CSRF protection
- Enforce strong password requirements
- Add session timeout (24 hours recommended)

### 12.2 API Security
- Validate all user inputs
- Sanitize database queries (Supabase handles this)
- Rate limit API endpoints
- Check authentication on every API route
- Verify admin status for admin routes

### 12.3 Data Privacy
- Don't log sensitive user messages
- Implement proper RLS policies in Supabase
- Consider GDPR requirements if applicable
- Allow users to delete their data

### 12.4 OpenAI API Security
- Never expose API key to frontend
- Store API key in environment variables
- Implement spending limits in OpenAI dashboard
- Monitor usage for anomalies

## 13. Monitoring and Maintenance

### 13.1 Key Metrics to Track
- Daily active users
- Messages per user
- API response times
- OpenAI API costs
- Error rates
- Assistant performance (user feedback)

### 13.2 Logging
- API errors and exceptions
- OpenAI API failures
- Authentication failures
- Admin actions (audit log)

### 13.3 Maintenance Tasks
- Weekly: Review error logs
- Monthly: Analyze costs and optimize
- Quarterly: Review assistant performance
- As needed: Update fine-tuned models with new data

---

## Quick Reference: API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Chat
- `POST /api/chat` - Send message (streaming)
- `GET /api/chat/history` - Get chat history

### Admin - Users
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id` - Update user's assistant

### Admin - Assistants
- `GET /api/admin/assistants` - List assistants
- `POST /api/admin/assistants` - Create assistant
- `GET /api/admin/assistants/:id` - Get assistant details
- `PATCH /api/admin/assistants/:id` - Update assistant
- `DELETE /api/admin/assistants/:id` - Delete assistant

### Admin - Chats
- `GET /api/admin/chats` - List all user chats
- `GET /api/admin/chats/:userId` - Get user chat history
- `GET /api/admin/stats` - Dashboard statistics

---

**End of Architecture Document**
