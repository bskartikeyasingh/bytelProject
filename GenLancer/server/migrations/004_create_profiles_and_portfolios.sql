-- ============================================================================
-- GenLancer: Profiles & Portfolios Live Persistence Schema
-- Migration: 004_create_profiles_and_portfolios.sql
-- Description:
--   Creates authoritative public.profiles and public.portfolios tables 
--   with joined relationship and RLS policies for dynamic real-time creator persistence.
-- ============================================================================

-- 1. Create public.profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    bio TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'creator',
    skills TEXT[] DEFAULT '{}',
    specialization TEXT,
    tools TEXT[] DEFAULT '{}',
    hourly_rate NUMERIC(10, 2) DEFAULT 100.00,
    ai_score INTEGER DEFAULT 90,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was partially created
DO $$ 
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'creator';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 100.00;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 90;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- 2. Create public.portfolios Table
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    media_type VARCHAR(20) DEFAULT 'video', -- 'video' | 'image'
    model_used TEXT,
    prompt_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist
DO $$ 
BEGIN
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS creator_id TEXT;
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS media_url TEXT;
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'video';
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS model_used TEXT;
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS prompt_summary TEXT;
    ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Allow public read & upsert for profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public read profiles'
    ) THEN
        CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public write profiles'
    ) THEN
        CREATE POLICY "Public write profiles" ON public.profiles FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portfolios' AND policyname = 'Public read portfolios'
    ) THEN
        CREATE POLICY "Public read portfolios" ON public.portfolios FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'portfolios' AND policyname = 'Public write portfolios'
    ) THEN
        CREATE POLICY "Public write portfolios" ON public.portfolios FOR ALL USING (true);
    END IF;
END $$;
