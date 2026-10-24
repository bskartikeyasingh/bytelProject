-- GenLancer subscriptions and creator promotion add-ons. Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS public.genlancer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR(255) NOT NULL,
  owner_role VARCHAR(32) NOT NULL CHECK (owner_role IN ('freelancer','creator','company','agency')),
  subscription_type VARCHAR(32) NOT NULL CHECK (subscription_type IN ('creator_portfolio','agency_access','creator_promotion')),
  duration_months INTEGER NOT NULL CHECK (duration_months >= 0 AND duration_months <= 24),
  duration_days INTEGER NOT NULL DEFAULT 0 CHECK (duration_days >= 0 AND duration_days <= 7),
  status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled','failed')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  razorpay_order_id VARCHAR(128) UNIQUE,
  razorpay_payment_id VARCHAR(128) UNIQUE,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_genlancer_subscriptions_owner ON public.genlancer_subscriptions(owner_id, subscription_type, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_genlancer_subscriptions_expiry ON public.genlancer_subscriptions(expires_at) WHERE status = 'active';
ALTER TABLE public.genlancer_subscriptions ENABLE ROW LEVEL SECURITY;
-- Access is intentionally mediated by the trusted server using the service-role key.
