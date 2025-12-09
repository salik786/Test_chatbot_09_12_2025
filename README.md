# AI Chat Platform

A simple AI chat platform built with Next.js, Supabase, and OpenAI with assistant management and admin panel.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system architecture documentation.

## Current Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)

The following has been implemented:

1. **Project Setup**
   - Next.js 14 with App Router and TypeScript
   - Tailwind CSS for styling
   - Package configuration with all necessary dependencies

2. **Database Types**
   - Complete TypeScript types for all tables
   - Type-safe database operations
   - Assistant, Message, and User types

3. **Supabase Integration**
   - Client-side Supabase client
   - Server-side Supabase client
   - Service role client for admin operations
   - Middleware for session management

4. **OpenAI Integration**
   - OpenAI client setup
   - Ready for chat and streaming responses

5. **Database Operations**
   - Assistants CRUD operations
   - User assignment management
   - Message operations
   - User profile operations

6. **Authentication**
   - Sign up API route with automatic assistant assignment
   - Login API route with admin detection
   - Logout API route
   - Auth utility functions

7. **Pages**
   - Login page with form validation
   - Signup page with password confirmation
   - Home page with auto-redirect

8. **Middleware**
   - Route protection
   - Session management

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `ARCHITECTURE.md` section 3 to create all tables
3. Copy your project URL and anon key

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

### 4. Seed Initial Assistants

Run this SQL in your Supabase SQL editor:

```sql
INSERT INTO assistants (name, description, model_id, system_prompt, active, available_for_random_assignment) VALUES
('nav_edu', 'Navigation Education Assistant', 'gpt-3.5-turbo', 'You are a friendly and patient navigation education assistant designed to help students learn about navigation concepts, map reading, and wayfinding skills.', TRUE, TRUE),
('core_edu', 'Core Education Assistant', 'gpt-3.5-turbo', 'You are a comprehensive core education assistant focused on fundamental academic subjects including mathematics, science, language arts, and social studies.', TRUE, TRUE),
('base_edu', 'Base Education Assistant', 'gpt-3.5-turbo', 'You are a general-purpose educational assistant helping students with a wide range of learning needs and questions.', TRUE, TRUE);
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## What's Next

### Phase 2: Core Chat (Next Steps)

1. Build chat UI components
2. Implement POST /api/chat with streaming
3. Add message persistence
4. Implement chat history loading
5. Test with base OpenAI models

### Phase 3: Assistant System

1. Test random assignment
2. Verify assistant management
3. Test with multiple assistants

### Phase 4: Admin Panel

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
│   │   └── auth/          # Authentication endpoints
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Utility libraries
│   ├── db/               # Database operations
│   ├── openai/           # OpenAI client
│   ├── supabase/         # Supabase clients
│   └── utils/            # Helper functions
├── types/                 # TypeScript types
│   ├── database.ts       # Database types
│   ├── assistant.ts      # Assistant types
│   └── message.ts        # Message types
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
- ✅ Session management
- ⏳ Chat interface (coming next)
- ⏳ OpenAI streaming responses (coming next)
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
