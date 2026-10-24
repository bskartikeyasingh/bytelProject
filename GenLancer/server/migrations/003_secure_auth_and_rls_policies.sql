-- ============================================================================
-- GenLancer: Secure Supabase Auth, Profiles & Row Level Security (RLS)
-- Migration: 003_secure_auth_and_rls_policies.sql (Phase 1B Hardened)
-- Description:
--   1. Creates public.profiles linked to auth.users(id) with role enforcement.
--   2. Fail-closed service role check: Handles NULL and unset role settings explicitly.
--   3. Enforces least-privileged role ('freelancer') on public signup; client metadata cannot select 'admin' or 'company'.
--   4. RLS and Database Triggers block role escalation and ID spoofing on BOTH INSERT and UPDATE.
--   5. Prevents creators from self-verifying portfolio items without authorized review on INSERT and UPDATE.
--   6. Collaboration requests:
--      - Request ID, company_id, and freelancer_id are strictly immutable.
--      - Direct row updates to status, confirmation timestamps, and audit logs are blocked.
--      - Material brief revisions automatically invalidate stale confirmations.
--   7. Message insertion strictly validates authenticated sender and collaboration membership.
--   8. Uses SECURITY DEFINER with explicit search_path = public, pg_temp.
--   9. Safely preserves all existing user records, columns, and profile data without data loss.
-- ============================================================================

-- 1. Create or Update public.profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'freelancer' CHECK (role IN ('company', 'freelancer', 'admin', 'reviewer')),
    company_id VARCHAR(255),
    freelancer_id VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add missing columns to public.profiles if already exists
DO $$
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'freelancer';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS freelancer_id VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
END $$;

-- 2. Link public.freelancers to auth.users and ensure message columns
DO $$
BEGIN
    ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS text_content TEXT;
END $$;

-- ============================================================================
-- 3. TRUSTED SERVER CONTEXT CHECK (FAIL-CLOSED)
-- ============================================================================
-- Explicitly handles NULL values and unset GUCs. Never treats missing setting as permission.
CREATE OR REPLACE FUNCTION public.is_trusted_service_role()
RETURNS BOOLEAN AS $$
DECLARE
    v_db_role TEXT;
    v_jwt_role TEXT;
BEGIN
    BEGIN
        v_db_role := current_setting('role', true);
    EXCEPTION WHEN OTHERS THEN
        v_db_role := NULL;
    END;

    BEGIN
        v_jwt_role := auth.jwt()->>'role';
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    -- FAIL CLOSED: Only return TRUE if explicitly service_role
    IF COALESCE(v_db_role, '') = 'service_role' OR COALESCE(v_jwt_role, '') = 'service_role' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 4. AUTOMATIC PROFILE CREATION TRIGGER ON SUPABASE AUTH SIGNUP
-- ============================================================================
-- Public signups unconditionally receive the least-privileged role ('freelancer').
-- Clients cannot choose 'admin' or 'company' via raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, company_id, freelancer_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New Member'),
        'freelancer',
        NULL,
        NULL
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        -- Preserve existing server-managed role on conflict; NEVER overwrite with client metadata
        role = public.profiles.role,
        company_id = public.profiles.company_id,
        freelancer_id = public.profiles.freelancer_id,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. ANTI-SELF-PROMOTION & PRIVILEGE ESCALATION GUARDS (FAIL-CLOSED)
-- ============================================================================

-- Guard for public.profiles: blocks privileged role and account ID injection on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
DECLARE
    v_trusted BOOLEAN;
BEGIN
    v_trusted := public.is_trusted_service_role();

    IF TG_OP = 'INSERT' THEN
        IF NOT v_trusted THEN
            -- Public profile inserts must be least privileged ('freelancer') and cannot specify company/freelancer IDs
            IF (NEW.role IS NOT NULL AND NEW.role != 'freelancer') OR
               (NEW.company_id IS NOT NULL) OR
               (NEW.freelancer_id IS NOT NULL) THEN
                RAISE EXCEPTION 'Forbidden: Direct profile creation cannot assign privileged role (%), company_id, or freelancer_id. Public profiles default to freelancer and are managed server-side.', NEW.role;
            END IF;
            NEW.role := 'freelancer';
            NEW.company_id := NULL;
            NEW.freelancer_id := NULL;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) OR
           (NEW.company_id IS DISTINCT FROM OLD.company_id) OR
           (NEW.freelancer_id IS DISTINCT FROM OLD.freelancer_id) THEN
            IF NOT v_trusted THEN
                RAISE EXCEPTION 'Forbidden: Users cannot modify their own role, company_id, or freelancer_id. These fields are server-managed.';
            END IF;
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- Guard for public.freelancers: prevents creators from self-verifying on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.prevent_creator_self_verification()
RETURNS TRIGGER AS $$
DECLARE
    v_trusted BOOLEAN;
BEGIN
    v_trusted := public.is_trusted_service_role();

    IF TG_OP = 'INSERT' THEN
        IF NEW.verified IS TRUE AND NOT v_trusted THEN
            RAISE EXCEPTION 'Forbidden: Creators cannot self-verify upon creation. Verification requires authorized review.';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.verified IS DISTINCT FROM OLD.verified AND NEW.verified IS TRUE THEN
            IF NOT v_trusted THEN
                RAISE EXCEPTION 'Forbidden: Creator verification must be approved by an authorized reviewer or administrator.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_creator_self_verification ON public.freelancers;
CREATE TRIGGER trg_prevent_creator_self_verification
    BEFORE INSERT OR UPDATE ON public.freelancers
    FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_self_verification();

-- ============================================================================
-- 6. COLLABORATION MUTATION & AUDIT GUARDS (STATE MACHINE ENFORCEMENT)
-- ============================================================================

-- Helper: Verify if current authenticated user is an authorized participant of a collaboration
CREATE OR REPLACE FUNCTION public.is_collaboration_participant(collab_req public.collaboration_requests)
RETURNS BOOLEAN AS $$
DECLARE
    uid_text TEXT := auth.uid()::text;
    uid_uuid UUID := auth.uid();
BEGIN
    IF uid_uuid IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Direct ID match
    IF collab_req.company_id = uid_text OR collab_req.freelancer_id = uid_text THEN
        RETURN TRUE;
    END IF;

    -- Linked profile company_id or freelancer_id
    IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = uid_uuid
        AND (p.company_id = collab_req.company_id OR p.freelancer_id = collab_req.freelancer_id)
    ) THEN
        RETURN TRUE;
    END IF;

    -- Linked creator record in public.freelancers
    IF EXISTS (
        SELECT 1 FROM public.freelancers f
        WHERE f.user_id = uid_uuid
        AND f.id = collab_req.freelancer_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Guard for public.collaboration_requests: protects immutable fields and state transitions
CREATE OR REPLACE FUNCTION public.protect_collaboration_request_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_trusted BOOLEAN;
    v_uid UUID := auth.uid();
    v_is_company BOOLEAN := FALSE;
    v_is_freelancer BOOLEAN := FALSE;
BEGIN
    v_trusted := public.is_trusted_service_role();

    -- Rule 1: Request ownership and participant identities are permanently immutable
    IF NEW.request_id IS DISTINCT FROM OLD.request_id THEN
        RAISE EXCEPTION 'Forbidden: Collaboration request_id is immutable.';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION 'Forbidden: Collaboration company_id is immutable. Cannot swap company participant.';
    END IF;
    IF NEW.freelancer_id IS DISTINCT FROM OLD.freelancer_id THEN
        RAISE EXCEPTION 'Forbidden: Collaboration freelancer_id is immutable. Cannot swap freelancer participant.';
    END IF;

    -- Rule 2: Material brief revisions strictly invalidate stale confirmations
    IF (NEW.project_brief IS DISTINCT FROM OLD.project_brief) OR
       (NEW.brief_version IS DISTINCT FROM OLD.brief_version AND NEW.brief_version > OLD.brief_version) THEN
        NEW.company_confirmed_at := NULL;
        NEW.freelancer_confirmed_at := NULL;
    END IF;

    -- Rule 3: Fail-closed checks for non-service-role callers
    IF NOT v_trusted THEN
        IF v_uid IS NULL THEN
            RAISE EXCEPTION 'Forbidden: Unauthenticated modifications to collaboration requests are blocked.';
        END IF;

        IF v_uid::text = OLD.company_id OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.company_id = OLD.company_id
        ) THEN
            v_is_company := TRUE;
        END IF;

        IF v_uid::text = OLD.freelancer_id OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.freelancer_id = OLD.freelancer_id
        ) OR EXISTS (
            SELECT 1 FROM public.freelancers f WHERE f.user_id = v_uid AND f.id = OLD.freelancer_id
        ) THEN
            v_is_freelancer := TRUE;
        END IF;

        IF NOT v_is_company AND NOT v_is_freelancer THEN
            RAISE EXCEPTION 'Forbidden: Caller is not an authorized participant in this collaboration.';
        END IF;

        -- Prevent arbitrary tampering with confirmation fields directly
        IF (NEW.company_confirmed_at IS DISTINCT FROM OLD.company_confirmed_at) OR
           (NEW.freelancer_confirmed_at IS DISTINCT FROM OLD.freelancer_confirmed_at) THEN
            RAISE EXCEPTION 'Forbidden: Direct updates to confirmation timestamps are forbidden. Confirmations must use the collaboration service.';
        END IF;

        -- Prevent arbitrary tampering with audit history directly
        IF (NEW.audit_history IS DISTINCT FROM OLD.audit_history) THEN
            RAISE EXCEPTION 'Forbidden: Audit history cannot be altered directly.';
        END IF;

        -- Prevent arbitrary status transitions directly
        IF (NEW.status IS DISTINCT FROM OLD.status) THEN
            RAISE EXCEPTION 'Forbidden: Direct status transitions are forbidden. All collaboration transitions must be performed through verified server endpoints.';
        END IF;

        -- Prevent non-company participant from modifying the brief
        IF (NEW.project_brief IS DISTINCT FROM OLD.project_brief) AND NOT v_is_company THEN
            RAISE EXCEPTION 'Forbidden: Only the company participant can revise the project brief.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_collaboration_request_mutation ON public.collaboration_requests;
CREATE TRIGGER trg_protect_collaboration_request_mutation
    BEFORE UPDATE ON public.collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION public.protect_collaboration_request_mutation();

-- ============================================================================
-- 7. MESSAGING IDENTITY & SENDER VALIDATION
-- ============================================================================

-- Helper: Verify that message sender belongs to caller AND caller is a participant
CREATE OR REPLACE FUNCTION public.is_valid_message_sender(p_sender_id TEXT, p_request_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_uid_text TEXT := auth.uid()::text;
    v_cr public.collaboration_requests;
BEGIN
    IF v_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Fetch the collaboration request
    SELECT * INTO v_cr FROM public.collaboration_requests WHERE request_id = p_request_id;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Caller must be a verified participant of this request
    IF NOT public.is_collaboration_participant(v_cr) THEN
        RETURN FALSE;
    END IF;

    -- Sender ID must belong to the authenticated user
    IF p_sender_id = v_uid_text THEN
        RETURN TRUE;
    END IF;

    -- Or sender_id matches user's linked profile identifiers
    IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_uid
        AND (p.company_id = p_sender_id OR p.freelancer_id = p_sender_id)
    ) THEN
        RETURN TRUE;
    END IF;

    -- Or sender_id matches linked creator record
    IF EXISTS (
        SELECT 1 FROM public.freelancers f
        WHERE f.user_id = v_uid
        AND f.id = p_sender_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- A. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update own profile (legitimate fields like full_name, avatar_url are allowed;
-- trigger strictly blocks modifying role, company_id, or freelancer_id)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert own profile ONLY with least-privileged role 'freelancer' and null company/freelancer IDs
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        AND (role IS NULL OR role = 'freelancer')
        AND company_id IS NULL
        AND freelancer_id IS NULL
    );

-- B. Freelancers RLS (Directory is public; edits restricted to creator owner)
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "Public can view creator directory" ON public.freelancers;
CREATE POLICY "Public can view creator directory"
    ON public.freelancers FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Creators can update own profile" ON public.freelancers;
CREATE POLICY "Creators can update own profile"
    ON public.freelancers FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid()::text = id)
    WITH CHECK (auth.uid() = user_id OR auth.uid()::text = id);

DROP POLICY IF EXISTS "Creators can insert own profile" ON public.freelancers;
CREATE POLICY "Creators can insert own profile"
    ON public.freelancers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR auth.uid()::text = id);

-- C. Collaboration Requests RLS (Strict participant isolation)
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Participants can view collaboration requests"
    ON public.collaboration_requests FOR SELECT
    TO authenticated
    USING (public.is_collaboration_participant(collaboration_requests));

DROP POLICY IF EXISTS "Companies can create collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Companies can create collaboration requests"
    ON public.collaboration_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid()::text = company_id OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = collaboration_requests.company_id
        ))
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('company', 'admin')
        )
        AND status = 'pending'
        AND company_confirmed_at IS NULL
        AND freelancer_confirmed_at IS NULL
    );

DROP POLICY IF EXISTS "Participants can update collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Participants can update collaboration requests"
    ON public.collaboration_requests FOR UPDATE
    TO authenticated
    USING (public.is_collaboration_participant(collaboration_requests))
    WITH CHECK (public.is_collaboration_participant(collaboration_requests));

-- D. Messages RLS (Conversation participants and verified senders only)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.collaboration_requests cr
            WHERE cr.request_id = messages.request_id
            AND public.is_collaboration_participant(cr)
        )
    );

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_valid_message_sender(sender_id, request_id)
    );

-- ============================================================================
-- 9. LEAST-PRIVILEGE FUNCTION EXECUTION GRANTS
-- ============================================================================
-- Restrict direct execution of internal helper functions to trusted roles only
REVOKE ALL ON FUNCTION public.is_trusted_service_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_trusted_service_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_trusted_service_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_collaboration_participant(public.collaboration_requests) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_collaboration_participant(public.collaboration_requests) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_collaboration_participant(public.collaboration_requests) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_valid_message_sender(TEXT, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_valid_message_sender(TEXT, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_valid_message_sender(TEXT, VARCHAR) TO authenticated, service_role;

