-- ============================================================================
-- GenLancer: Supabase Schema Migration (Idempotent & Safe)
-- Migration: 001_create_or_update_freelancers_schema.sql
-- Description:
--   Creates or updates the authoritative 'freelancers' table along with
--   'collaboration_requests' and 'messages' tables without dropping or overwriting data.
-- ============================================================================

-- 1. Create or Update public.freelancers Table
CREATE TABLE IF NOT EXISTS public.freelancers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    avatar_url TEXT,
    location VARCHAR(255) DEFAULT 'Remote',
    hourly_rate_usd NUMERIC(10, 2) DEFAULT 100.00,
    rating NUMERIC(3, 2) DEFAULT 4.90,
    completed_gigs INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 95,
    specializations TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    ai_tools_models TEXT[] DEFAULT '{}',
    visual_styles TEXT[] DEFAULT '{}',
    content_types TEXT[] DEFAULT '{"Video"}',
    output_formats TEXT[] DEFAULT '{"16:9"}',
    availability VARCHAR(50) DEFAULT 'Full-time',
    commercial_use_licensing TEXT DEFAULT 'Full commercial rights included',
    portfolio_items JSONB DEFAULT '[]'::jsonb,
    verified BOOLEAN DEFAULT FALSE,
    is_demo BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'pending_audit',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add missing columns to existing freelancers table
DO $$ 
BEGIN
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Remote';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS hourly_rate_usd NUMERIC(10, 2) DEFAULT 100.00;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.90;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS completed_gigs INTEGER DEFAULT 0;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 95;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS ai_tools_models TEXT[] DEFAULT '{}';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS visual_styles TEXT[] DEFAULT '{}';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS content_types TEXT[] DEFAULT '{"Video"}';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS output_formats TEXT[] DEFAULT '{"16:9"}';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'Full-time';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS commercial_use_licensing TEXT DEFAULT 'Full commercial rights included';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending_audit';
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- 2. Create or Update public.collaboration_requests Table
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    request_id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    freelancer_id VARCHAR(255) NOT NULL,
    project_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
    brief_version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    company_confirmed_at TIMESTAMP WITH TIME ZONE,
    freelancer_confirmed_at TIMESTAMP WITH TIME ZONE,
    clarification_history JSONB DEFAULT '[]'::jsonb,
    revision_history JSONB DEFAULT '[]'::jsonb,
    audit_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add missing columns to collaboration_requests
DO $$
BEGIN
    ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS brief_version INTEGER DEFAULT 1;
    ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS clarification_history JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS audit_history JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS company_confirmed_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS freelancer_confirmed_at TIMESTAMP WITH TIME ZONE;
END $$;

-- 3. Create or Update public.messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    text_content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Helpful Performance Indexes
CREATE INDEX IF NOT EXISTS idx_freelancers_skills ON public.freelancers USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_freelancers_ai_tools ON public.freelancers USING GIN (ai_tools_models);
CREATE INDEX IF NOT EXISTS idx_freelancers_rating_score ON public.freelancers (rating DESC, reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_collab_company ON public.collaboration_requests (company_id);
CREATE INDEX IF NOT EXISTS idx_collab_freelancer ON public.collaboration_requests (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_req ON public.messages (request_id, created_at ASC);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to freelancers directory
DROP POLICY IF EXISTS "Public read access for freelancers" ON public.freelancers;
CREATE POLICY "Public read access for freelancers" 
    ON public.freelancers FOR SELECT 
    USING (true);

-- Allow public / anon read/write access for collaboration requests (managed via app session logic)
DROP POLICY IF EXISTS "Allow select collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Allow select collaboration requests" 
    ON public.collaboration_requests FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow insert collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Allow insert collaboration requests" 
    ON public.collaboration_requests FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Allow update collaboration requests" 
    ON public.collaboration_requests FOR UPDATE 
    USING (true);

-- Allow public select/insert messages
DROP POLICY IF EXISTS "Allow select messages" ON public.messages;
CREATE POLICY "Allow select messages" 
    ON public.messages FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;
CREATE POLICY "Allow insert messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (true);
