# AI Chat Platform

A simple AI chat platform built with Next.js, Supabase, and OpenAI with assistant management and admin panel.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system architecture documentation.

## Current Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)

1. **Project Setup** - Next.js 14, TypeScript, Tailwind CSS
2. **Database Types** - Complete type-safe operations
3. **Supabase Integration** - Client, server, and service role clients
4. **OpenAI Integration** - Client setup with streaming support
5. **Database Operations** - Assistants, assignments, messages, users
6. **Authentication** - Signup, login, logout with auto-assignment
7. **Pages** - Login, signup, home with redirects
8. **Middleware** - Route protection and session management

### ✅ Phase 2: Core Chat (COMPLETED)

The chat system is now fully functional!

1. **Chat UI Components**
   - `MessageBubble.tsx` - Individual message display with role-based styling
   - `ChatInput.tsx` - Message input with keyboard shortcuts
   - `ChatInterface.tsx` - Complete chat interface with streaming support
   - `LogoutButton.tsx` - User logout functionality

2. **Chat Page**
   - Protected chat route with authentication
   - Automatic assistant assignment check
   - Real-time chat interface
   - Header with assistant name and logout button

3. **Chat API Routes**
   - `GET /api/chat/history` - Loads past conversations
   - `POST /api/chat` - Sends messages with OpenAI streaming
   - Full conversation context (20 recent messages)
   - Automatic message persistence

4. **Features**
   - ✅ Real-time streaming responses from OpenAI
   - ✅ Chat history loading and persistence
   - ✅ System prompts based on assigned assistant
   - ✅ Auto-scroll to latest message
   - ✅ Loading indicators and typing animations
   - ✅ Error handling and validation
   - ✅ Keyboard shortcuts (Enter to send, Shift+Enter for new line)

5. **Database Setup**
   - `supabase-setup.sql` - Complete database setup script
   - Pre-configured with 3 sample assistants
   - All RLS policies and indexes

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and run the entire `supabase-setup.sql` file
   - This creates all tables with RLS policies
   - Seeds 3 sample assistants (nav_edu, core_edu, base_edu)
4. Copy your project URL and anon key from Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
```

**Important:** Replace all values with your actual credentials:
- Get Supabase credentials from your project's Settings > API
- Get OpenAI API key from [platform.openai.com](https://platform.openai.com)
- Set ADMIN_EMAIL to your email to become admin on first signup

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## What's Next

### Phase 3: Admin Panel (Next Steps)

The admin panel will allow administrators to:

1. Build admin layout
2. Implement user management
3. Create assistant CRUD interface
4. Add chat history viewer
5. Manual assignment feature

### Phase 5: Fine-Tuning

1. Collect training data
2. Create fine-tuning datasets
3. Train models
4. Deploy fine-tuned models

## Project Structure

```
ai-chat-platform/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── chat/          # Chat endpoints (chat, history)
│   ├── chat/              # Chat page
│   │   ├── components/    # Chat UI components
│   │   └── page.tsx       # Chat interface
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Shared components
│   └── ui/               # UI components
├── lib/                   # Utility libraries
│   ├── db/               # Database operations
│   ├── openai/           # OpenAI client
│   ├── supabase/         # Supabase clients
│   └── utils/            # Helper functions
├── types/                 # TypeScript types
│   ├── database.ts       # Database types
│   ├── assistant.ts      # Assistant types
│   └── message.ts        # Message types
├── supabase-setup.sql     # Database setup script
└── ARCHITECTURE.md        # Complete architecture docs
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Features

- ✅ Email/password authentication with Supabase
- ✅ Automatic assistant assignment on signup
- ✅ Admin user detection
- ✅ Type-safe database operations
- ✅ Session management with middleware
- ✅ **Real-time chat interface with message bubbles**
- ✅ **OpenAI streaming responses**
- ✅ **Chat history persistence and loading**
- ✅ **Multiple assistants with unique personalities**
- ✅ **Context-aware conversations (20 message history)**
- ⏳ Admin panel (coming next)

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-3.5/GPT-4
- **Deployment**: Vercel (recommended)

## License

MIT
