# Research Study Readiness Audit
## Platform Security, Scalability & Data Collection Review

**Target Scale**: 500-1000 students
**Purpose**: Research study data collection
**Date**: December 15, 2025

---

## 🚨 **CRITICAL ISSUES - MUST FIX BEFORE LAUNCH**

### **1. Missing Informed Consent System** ⚠️ **CRITICAL**

**Issue**: No consent tracking for research participants

**Required for IRB Approval**:
```sql
-- Add consent tracking table
CREATE TABLE IF NOT EXISTS research_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,  -- Track consent form version
  consented BOOLEAN NOT NULL,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,  -- For audit trail
  withdrawn_at TIMESTAMPTZ,  -- If participant withdraws
  UNIQUE(user_id, consent_version)
);

CREATE INDEX idx_research_consent_user_id ON research_consent(user_id);
```

**Implementation Needed**:
- [ ] Consent page before first chat
- [ ] Consent form with study details
- [ ] Checkbox: "I agree to participate"
- [ ] Store consent with version tracking
- [ ] Allow withdrawal at any time
- [ ] Export consent records for IRB

---

### **2. Missing Study Metadata** ⚠️ **CRITICAL**

**Issue**: No way to track study groups, conditions, or participant metadata

**Required Fields**:
```sql
-- Add study metadata to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS study_participant_id TEXT UNIQUE,  -- Anonymous ID
ADD COLUMN IF NOT EXISTS study_group TEXT,  -- e.g., 'control', 'treatment_a'
ADD COLUMN IF NOT EXISTS study_condition TEXT,  -- e.g., 'empathetic', 'neutral'
ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS withdrawn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS withdrawal_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demographics JSONB;  -- Store optional demographics

CREATE INDEX idx_profiles_study_group ON profiles(study_group);
CREATE INDEX idx_profiles_study_participant_id ON profiles(study_participant_id);
```

**Why This Matters**:
- Random assignment to conditions
- Track which assistant variant each participant gets
- Analyze results by study group
- Export anonymized data (use participant_id instead of email)

---

### **3. No Data Anonymization** ⚠️ **HIGH PRIORITY**

**Issue**: Email addresses and names stored in plaintext

**Privacy Requirements**:
- Student emails are personally identifiable information (PII)
- Research data should be de-identified for analysis
- Must separate PII from research data

**Solution**:
```sql
-- Function to export anonymized research data
CREATE OR REPLACE FUNCTION export_anonymized_research_data()
RETURNS TABLE (
  participant_id TEXT,
  study_group TEXT,
  study_condition TEXT,
  enrolled_date TIMESTAMPTZ,
  conversation_count BIGINT,
  message_count BIGINT,
  avg_message_length NUMERIC,
  total_conversation_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.study_participant_id,
    p.study_group,
    p.study_condition,
    p.enrolled_at,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(m.id) as message_count,
    AVG(LENGTH(m.content)) as avg_message_length,
    MAX(c.updated_at) - MIN(c.created_at) as total_conversation_time
  FROM profiles p
  LEFT JOIN conversations c ON c.user_id = p.id
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE p.study_participant_id IS NOT NULL
  GROUP BY p.study_participant_id, p.study_group, p.study_condition, p.enrolled_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **4. Missing Rate Limiting** ⚠️ **HIGH PRIORITY**

**Issue**: No protection against abuse or excessive API usage

**Risks**:
- Students could spam messages → high OpenAI costs
- No prevention of bot attacks
- Could exhaust OpenAI rate limits

**Solution Required**:
```typescript
// Add to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS rate_limit_bucket TEXT;  -- For rate limiting

// Implement rate limiting in API
// Option A: Database-based (simple)
const MAX_MESSAGES_PER_HOUR = 50;
const MAX_MESSAGES_PER_DAY = 200;

// Check before allowing message
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const { count } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('role', 'user')
  .gte('timestamp', oneHourAgo.toISOString());

if (count >= MAX_MESSAGES_PER_HOUR) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please try again later.' },
    { status: 429 }
  );
}

// Option B: Use Upstash Redis for better performance
```

**Recommended Limits**:
- 50 messages per hour per user
- 200 messages per day per user
- 5 new conversations per day
- Log rate limit violations for monitoring

---

### **5. No Backup Strategy** ⚠️ **HIGH PRIORITY**

**Issue**: No automated backups configured

**Risks**:
- Data loss if Supabase has issues
- No recovery if database corrupted
- Research data could be lost forever

**Required Actions**:
1. **Enable Supabase Point-in-Time Recovery**:
   - Go to Supabase Dashboard → Database → Backups
   - Enable daily backups (keep for 30 days minimum)

2. **Export Research Data Regularly**:
   ```bash
   # Daily backup script
   #!/bin/bash
   DATE=$(date +%Y-%m-%d)
   pg_dump -h db.supabase.co -U postgres -d postgres \
     -t profiles -t conversations -t messages -t research_consent \
     > backup_$DATE.sql

   # Upload to secure storage
   aws s3 cp backup_$DATE.sql s3://research-backups/
   ```

3. **Test Recovery Process**:
   - Restore from backup to test environment
   - Verify data integrity
   - Document recovery procedure

---

### **6. OpenAI API Key Security** ⚠️ **HIGH PRIORITY**

**Current Issue**: API key in .env.local

**Risks if Exposed**:
- Unlimited charges to your OpenAI account
- Attackers could drain your funds
- Study could be compromised

**Best Practices**:
1. **Never commit .env.local to git**
   ```bash
   # Verify it's in .gitignore
   echo ".env.local" >> .gitignore
   git rm --cached .env.local  # If accidentally committed
   ```

2. **Use Supabase Edge Functions for OpenAI calls** (More secure):
   - Move OpenAI API calls to Supabase Edge Functions
   - Store API key in Supabase secrets
   - Never expose key to client

3. **Set OpenAI Usage Limits**:
   - Go to OpenAI Dashboard → Usage limits
   - Set monthly budget cap (e.g., $500/month)
   - Set up billing alerts

4. **Monitor Usage Daily**:
   ```typescript
   // Track OpenAI costs per user
   ALTER TABLE messages
   ADD COLUMN IF NOT EXISTS openai_tokens_used INTEGER,
   ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 4);
   ```

---

## 🔒 **SECURITY VULNERABILITIES**

### **SQL Injection Protection** ✅ **SAFE**

**Status**: Protected by Supabase client (parameterized queries)

**Verification**:
```typescript
// All queries use Supabase client which auto-escapes
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId);  // ✅ Safe - parameterized
```

**No action needed** - Supabase handles this.

---

### **XSS (Cross-Site Scripting)** ⚠️ **NEEDS REVIEW**

**Potential Issue**: User messages displayed without sanitization

**Current Code**:
```typescript
// In MessageBubble.tsx
<div className="...">{message.content}</div>  // ⚠️ Could be unsafe
```

**Risk**: Malicious student could inject JavaScript

**Test**:
```javascript
// Try sending this message:
<img src=x onerror="alert('XSS')">
<script>alert('XSS')</script>
```

**Solution**:
```typescript
// Install sanitization library
npm install dompurify
npm install --save-dev @types/dompurify

// In MessageBubble.tsx
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(message.content, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],  // Allow basic formatting
  ALLOWED_ATTR: []  // No attributes allowed
});

<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

**Priority**: Implement before launch

---

### **CSRF Protection** ✅ **SAFE**

**Status**: Protected by Supabase Auth session cookies

**Verification**:
- All API routes use `requireAuth()` which validates session
- Supabase handles CSRF tokens automatically

**No action needed**.

---

### **Session Management** ⚠️ **NEEDS IMPROVEMENT**

**Current Issue**: Sessions don't expire

**Risks**:
- Student stays logged in forever on shared computer
- Security risk in computer labs

**Solution**:
```typescript
// In lib/supabase/server.ts
const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Add session timeout
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    cookies: {
      // ... existing cookie config
    }
  }
);

// Configure in Supabase Dashboard:
// Auth → Configuration → Session Management
// - Set JWT expiry to 1 hour
// - Set refresh token expiry to 7 days
```

**Recommended Settings**:
- JWT expiry: 1 hour (forces re-auth)
- Refresh token: 7 days
- Idle timeout: 30 minutes (implement with middleware)

---

## 📊 **DATABASE SCHEMA FOR RESEARCH**

### **Missing Research Tables**

#### **1. Session Tracking**
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  messages_sent INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_start ON user_sessions(session_start DESC);
```

**Purpose**: Track when students use the system for engagement analysis

---

#### **2. Conversation Analytics**
```sql
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Engagement metrics
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  assistant_messages INTEGER DEFAULT 0,

  -- Content metrics
  avg_user_message_length NUMERIC(10, 2),
  avg_assistant_message_length NUMERIC(10, 2),
  total_words INTEGER,

  -- Timing metrics
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  total_duration_seconds INTEGER,
  avg_response_time_seconds NUMERIC(10, 2),

  -- Sentiment/quality (for future ML analysis)
  sentiment_score NUMERIC(5, 2),  -- Can be populated later
  topic_tags TEXT[],

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX idx_conversation_analytics_user_id ON conversation_analytics(user_id);
```

---

#### **3. Study Events Log**
```sql
CREATE TABLE IF NOT EXISTS study_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'signup', 'consent', 'first_message', 'withdrew', etc.
  event_data JSONB,  -- Additional context
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_events_user_id ON study_events(user_id);
CREATE INDEX idx_study_events_type ON study_events(event_type);
CREATE INDEX idx_study_events_occurred_at ON study_events(occurred_at DESC);
```

**Usage**:
```typescript
// Log important events
await supabase.from('study_events').insert({
  user_id: userId,
  event_type: 'consent_given',
  event_data: { consent_version: '1.0', ip_address: request.ip }
});
```

---

### **Missing Indexes for Performance**

```sql
-- Add these for better query performance at scale
CREATE INDEX IF NOT EXISTS idx_messages_user_timestamp ON messages(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- For study group analysis
CREATE INDEX IF NOT EXISTS idx_profiles_study_group_enrolled ON profiles(study_group, enrolled_at);
```

---

## 🎯 **DATA COLLECTION FOR RESEARCH ANALYSIS**

### **What Data to Collect**

#### **Primary Research Data**:
1. **Message Content**:
   - All user messages (questions, concerns, topics)
   - All assistant responses
   - Timestamps for temporal analysis
   - Conversation context (which conversation thread)

2. **Engagement Metrics**:
   - Number of conversations per student
   - Number of messages per conversation
   - Session duration and frequency
   - Time between messages (response time)
   - Drop-off points (when students stop)

3. **Behavioral Patterns**:
   - Time of day usage
   - Day of week patterns
   - Message length distribution
   - Topic transitions
   - Re-engagement patterns

4. **Study Group Comparisons**:
   - Different assistant variants
   - Control vs treatment groups
   - Demographic group differences (if collected)

---

### **Export Queries for Analysis**

#### **1. Complete Dataset Export**
```sql
-- Export all data for statistical analysis (R, Python, SPSS)
COPY (
  SELECT
    p.study_participant_id,
    p.study_group,
    p.study_condition,
    p.enrolled_at,
    c.id as conversation_id,
    c.title as conversation_title,
    c.created_at as conversation_started,
    c.updated_at as conversation_last_activity,
    m.id as message_id,
    m.role as message_role,
    LENGTH(m.content) as message_length,
    m.content as message_content,
    m.timestamp as message_timestamp,
    EXTRACT(EPOCH FROM (m.timestamp - LAG(m.timestamp) OVER (PARTITION BY c.id ORDER BY m.timestamp))) as seconds_since_last_message
  FROM profiles p
  JOIN conversations c ON c.user_id = p.id
  JOIN messages m ON m.conversation_id = c.id
  WHERE p.study_participant_id IS NOT NULL
  ORDER BY p.study_participant_id, c.created_at, m.timestamp
) TO '/tmp/research_data.csv' WITH CSV HEADER;
```

#### **2. Engagement Summary**
```sql
-- Participant engagement summary
SELECT
  p.study_participant_id,
  p.study_group,
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages,
  AVG(CASE WHEN m.role = 'user' THEN LENGTH(m.content) END) as avg_user_message_length,
  MIN(m.timestamp) as first_interaction,
  MAX(m.timestamp) as last_interaction,
  EXTRACT(EPOCH FROM (MAX(m.timestamp) - MIN(m.timestamp)))/3600 as total_hours_engaged
FROM profiles p
LEFT JOIN conversations c ON c.user_id = p.id
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE p.study_participant_id IS NOT NULL
GROUP BY p.study_participant_id, p.study_group
ORDER BY p.study_participant_id;
```

#### **3. Temporal Patterns**
```sql
-- Usage by time of day and day of week
SELECT
  p.study_group,
  EXTRACT(HOUR FROM m.timestamp) as hour_of_day,
  EXTRACT(DOW FROM m.timestamp) as day_of_week,  -- 0=Sunday, 6=Saturday
  COUNT(*) as message_count,
  COUNT(DISTINCT p.id) as unique_users
FROM messages m
JOIN profiles p ON m.user_id = p.id
WHERE p.study_participant_id IS NOT NULL
GROUP BY p.study_group, hour_of_day, day_of_week
ORDER BY p.study_group, day_of_week, hour_of_day;
```

#### **4. Conversation Flow Analysis**
```sql
-- Analyze conversation patterns
SELECT
  p.study_group,
  c.id as conversation_id,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE m.role = 'user') as user_messages,
  STRING_AGG(
    CASE
      WHEN m.role = 'user' THEN 'U'
      ELSE 'A'
    END,
    '' ORDER BY m.timestamp
  ) as conversation_pattern,  -- e.g., "UAUAUAU" shows turn-taking
  EXTRACT(EPOCH FROM (MAX(m.timestamp) - MIN(m.timestamp)))/60 as duration_minutes
FROM conversations c
JOIN profiles p ON c.user_id = p.id
JOIN messages m ON m.conversation_id = c.id
WHERE p.study_participant_id IS NOT NULL
GROUP BY p.study_group, c.id
ORDER BY c.created_at;
```

---

## ⚡ **PERFORMANCE & SCALABILITY**

### **Current Capacity**

**Supabase Free Tier Limits**:
- 500 MB database storage
- 2 GB bandwidth/month
- 50,000 monthly active users

**With 500-1000 students**:
- ✅ User capacity: OK (well under 50K)
- ⚠️ Database storage: Monitor closely
- ⚠️ Bandwidth: May exceed if heavy usage

**Estimate**:
```
1000 students × 50 messages/student × 500 bytes/message = 25 MB messages
1000 students × 10 conversations × 200 bytes = 2 MB conversations
Total: ~30-50 MB (OK for free tier)

Bandwidth:
1000 students × 50 messages × 2KB (with overhead) = 100 MB read
Plus OpenAI streaming responses = 200-300 MB total/month
Risk: May exceed 2 GB if students very active
```

**Recommendation**: Upgrade to Supabase Pro ($25/month) for:
- 8 GB database (plenty of headroom)
- 50 GB bandwidth
- Daily backups
- Better support for research study

---

### **OpenAI Rate Limits** ⚠️

**Current Limits** (depends on your account tier):
- GPT-4: 10,000 tokens/minute (Tier 1)
- GPT-3.5: 60,000 tokens/minute (Tier 1)

**With 1000 students**:
- Peak usage: 50-100 concurrent users
- Each message: ~500 tokens (input + output)
- Peak load: 100 users × 500 tokens = 50,000 tokens/minute
- **Risk**: Could hit rate limits during peak hours

**Solutions**:
1. **Request Rate Limit Increase**:
   - Email OpenAI support
   - Explain research study use case
   - Request Tier 2+ limits

2. **Implement Queueing**:
   ```typescript
   // Add message queue for peak load
   import { Queue } from 'bull';

   const messageQueue = new Queue('messages', {
     redis: { host: 'localhost', port: 6379 }
   });

   // Instead of immediate processing:
   messageQueue.add({ userId, message, conversationId });
   ```

3. **Use GPT-3.5 Instead of GPT-4**:
   - 6x more tokens/minute
   - Much cheaper ($0.001 vs $0.03 per 1K tokens)
   - Still high quality for most conversations

---

### **Database Connection Pooling**

**Issue**: Each API request opens new database connection

**Supabase handles this**, but verify:
```typescript
// In lib/supabase/server.ts
// Connection pooling is automatic with Supabase
// Max 15 connections on free tier
// Max 60 connections on Pro tier
```

**Monitoring**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- If approaching limit, optimize:
-- 1. Close unused connections
-- 2. Upgrade to Pro tier
-- 3. Use connection pooler (PgBouncer)
```

---

## 🔐 **PRIVACY & COMPLIANCE**

### **GDPR Compliance** (if EU students)

**Required**:
1. ✅ Right to access data
2. ✅ Right to deletion (already have CASCADE DELETE)
3. ⚠️ Right to data portability (need export feature)
4. ⚠️ Consent management (need to implement)
5. ⚠️ Data minimization (don't collect unnecessary data)
6. ⚠️ Privacy policy (need to create)

**Implementation**:
```typescript
// Add data export endpoint
// GET /api/user/export-data
export async function GET() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Export all user data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, messages(*)')
    .eq('user_id', user.id);

  return NextResponse.json({
    profile,
    conversations,
    exported_at: new Date().toISOString()
  });
}
```

---

### **FERPA Compliance** (if US students)

**Family Educational Rights and Privacy Act**:
- Protects student education records
- Requires consent for sharing
- Requires secure storage

**Checklist**:
- [ ] Get student consent for research
- [ ] Store data securely (✅ Supabase encryption at rest)
- [ ] Limit access to authorized researchers only
- [ ] Don't share with third parties without consent
- [ ] Allow students to review their data
- [ ] Destroy data after study completion (or anonymize)

---

### **IRB Requirements** (Institutional Review Board)

**For Human Subjects Research**:

1. **Informed Consent Form** (Need to create):
   ```markdown
   # Research Study Consent Form

   ## Study Title: [Your Study Title]

   ## Purpose:
   This study investigates...

   ## Procedures:
   - You will interact with an AI chatbot
   - Your conversations will be recorded
   - Participation takes approximately X hours

   ## Risks:
   - Minimal risk
   - Possible discomfort discussing personal topics

   ## Benefits:
   - Access to mental health support chatbot
   - Contribution to research

   ## Confidentiality:
   - Your data will be anonymized
   - Only research team has access
   - Data stored securely on Supabase servers

   ## Voluntary Participation:
   - You can withdraw at any time
   - No penalty for withdrawal

   ## Contact:
   Principal Investigator: [Name]
   Email: [Email]
   IRB Contact: [IRB Email]

   □ I have read and understand the above
   □ I agree to participate in this research study

   Participant ID: [Auto-generated]
   Date: [Auto-filled]
   ```

2. **Data Security Plan**:
   - Where data is stored (Supabase, US-based servers)
   - Who has access (only research team)
   - How long retained (specify: 3 years? 5 years?)
   - How it will be destroyed (delete or anonymize)

3. **Risk Assessment**:
   - What if sensitive topics discussed?
   - Crisis intervention plan
   - Reporting requirements

---

## 📋 **PRE-LAUNCH CHECKLIST**

### **Security** (Before any student signs up)
- [ ] Implement rate limiting (50/hour, 200/day)
- [ ] Add XSS protection (sanitize message content)
- [ ] Set session timeout (1 hour JWT expiry)
- [ ] Configure OpenAI usage limits ($500/month cap)
- [ ] Set up billing alerts
- [ ] Review all API endpoints for auth checks
- [ ] Test logout flow (now fixed ✅)
- [ ] Enable HTTPS only (in production)
- [ ] Add security headers (CSP, HSTS, etc.)

### **Database** (Research-ready schema)
- [ ] Add research_consent table
- [ ] Add study metadata fields to profiles
- [ ] Add study_events logging
- [ ] Add conversation_analytics table
- [ ] Add all performance indexes
- [ ] Set up daily backups
- [ ] Test backup restoration
- [ ] Configure retention policies

### **Data Collection** (IRB compliance)
- [ ] Create consent form page
- [ ] Implement consent tracking
- [ ] Add study group assignment logic
- [ ] Generate anonymous participant IDs
- [ ] Create data export scripts
- [ ] Test anonymization process
- [ ] Document data collection procedures

### **Performance** (Handle 1000 users)
- [ ] Upgrade to Supabase Pro ($25/month)
- [ ] Request OpenAI rate limit increase
- [ ] Add database indexes (all listed above)
- [ ] Test with load testing tool (k6, Artillery)
- [ ] Monitor query performance
- [ ] Set up error tracking (Sentry)
- [ ] Create monitoring dashboard

### **Privacy** (Legal compliance)
- [ ] Draft privacy policy
- [ ] Draft terms of service
- [ ] Add cookie consent banner (if EU students)
- [ ] Implement data export feature
- [ ] Implement account deletion
- [ ] Review FERPA/GDPR requirements
- [ ] Get IRB approval
- [ ] Train research team on data handling

### **Testing** (Quality assurance)
- [ ] Test signup flow with consent
- [ ] Test message sending (rate limits)
- [ ] Test conversation creation/deletion
- [ ] Test admin panel access control
- [ ] Test logout (now works ✅)
- [ ] Test on mobile devices
- [ ] Test with 100 concurrent users
- [ ] Test data export queries
- [ ] Verify backup/restore works
- [ ] Cross-browser testing

### **Monitoring** (After launch)
- [ ] Daily backup verification
- [ ] Monitor OpenAI costs
- [ ] Monitor database usage
- [ ] Track consent completion rate
- [ ] Monitor error rates
- [ ] Check for rate limit violations
- [ ] Review logs for security issues
- [ ] Track participant enrollment

---

## 💰 **COST ESTIMATE**

### **For 1000 Students × 50 Messages Each**

**OpenAI Costs** (using GPT-3.5-turbo):
```
50,000 total messages
Avg 200 tokens input + 300 tokens output = 500 tokens/message
Total: 25 million tokens

Cost: 25M tokens ÷ 1000 × $0.0015 = $37.50
```

**OpenAI Costs** (using GPT-4):
```
Same volume
Cost: 25M tokens ÷ 1000 × $0.03 = $750
```

**Recommendation**: Use GPT-3.5 to keep costs low ($40 vs $750)

**Supabase**:
- Pro tier: $25/month
- Total for 3-month study: $75

**Total Estimated Cost**:
- GPT-3.5: ~$115 for 3-month study
- GPT-4: ~$825 for 3-month study

**Budget for**:
- 20% buffer for errors/retries: +$23 to $165
- Monitoring tools (optional): $0-50/month
- **Total Budget**: $150-1000 depending on model choice

---

## 🚀 **RECOMMENDED IMPLEMENTATION ORDER**

### **Week 1: Critical Security**
1. Fix logout (✅ Done)
2. Implement rate limiting
3. Add XSS protection
4. Set OpenAI usage limits
5. Upgrade to Supabase Pro
6. Enable backups

### **Week 2: Research Infrastructure**
1. Add consent table & page
2. Add study metadata fields
3. Implement participant ID generation
4. Add study event logging
5. Create data export queries
6. Test anonymization

### **Week 3: Testing & Optimization**
1. Add database indexes
2. Load testing (simulate 1000 users)
3. Optimize slow queries
4. Test data export
5. Test backup/restore
6. Security audit

### **Week 4: Compliance & Launch**
1. Draft consent form
2. Create privacy policy
3. Get IRB approval
4. Final testing
5. Train research team
6. Soft launch (10-50 users)
7. Monitor & adjust
8. Full launch

---

## 📊 **MONITORING DASHBOARD QUERIES**

Create these views for easy monitoring:

```sql
-- Daily enrollment
CREATE VIEW daily_enrollment AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_signups,
  COUNT(*) FILTER (WHERE is_admin = false) as students,
  COUNT(*) FILTER (WHERE study_group = 'control') as control_group,
  COUNT(*) FILTER (WHERE study_group = 'treatment') as treatment_group
FROM profiles
WHERE study_participant_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Daily activity
CREATE VIEW daily_activity AS
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE role = 'user') as user_messages,
  AVG(LENGTH(content)) as avg_message_length
FROM messages
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- System health
CREATE VIEW system_health AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE study_participant_id IS NOT NULL) as total_participants,
  (SELECT COUNT(*) FROM conversations) as total_conversations,
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(*) FROM messages WHERE timestamp > NOW() - INTERVAL '24 hours') as messages_24h,
  (SELECT COUNT(DISTINCT user_id) FROM messages WHERE timestamp > NOW() - INTERVAL '24 hours') as active_users_24h,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size;
```

---

## ✅ **CONCLUSION**

**Current Status**: 🟡 **NOT READY for research study**

**Must Complete Before Launch**:
1. Implement consent system
2. Add study metadata tracking
3. Set up rate limiting
4. Add XSS protection
5. Configure backups
6. Get IRB approval

**Estimated Time to Production-Ready**: 3-4 weeks

**Risk Level After Fixes**: 🟢 **LOW** - Suitable for 500-1000 student study

---

**Next Steps**: Would you like me to implement these critical fixes now? I can start with:
1. Consent system
2. Study metadata fields
3. Rate limiting
4. XSS protection

Let me know which priority you'd like to tackle first!
