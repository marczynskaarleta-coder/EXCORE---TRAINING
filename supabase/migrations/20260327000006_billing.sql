-- =============================================
-- EXCORE TRAINING - Migration 006: Billing
-- Stripe integration, transactions, workspace billing config
-- =============================================

-- =============================================
-- Stripe IDs on existing tables
-- =============================================

-- Workspace-level Stripe customer (B2B or individual)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_id text; -- for connected accounts (future)

-- Plans link to Stripe prices
ALTER TABLE product_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text;

-- Enrollments link to Stripe subscriptions
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- =============================================
-- Transactions - record of every payment
-- =============================================

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded',
  'disputed'
);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What was purchased
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES product_plans(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,

  -- Payment details
  amount integer NOT NULL, -- grosze/centy
  currency text NOT NULL DEFAULT 'PLN',
  status transaction_status NOT NULL DEFAULT 'pending',

  -- Stripe references
  stripe_payment_intent_id text,
  stripe_checkout_session_id text UNIQUE,
  stripe_invoice_id text,
  stripe_subscription_id text,

  -- Type
  type text NOT NULL DEFAULT 'purchase', -- purchase, renewal, refund, upgrade

  -- Metadata
  metadata jsonb NOT NULL DEFAULT '{}',

  completed_at timestamptz,
  refunded_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- Webhook events log (idempotency)
-- =============================================

CREATE TABLE stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE, -- idempotency key
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage transactions" ON transactions
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Webhook events: only service role (no user access)
CREATE POLICY "No user access to webhook events" ON stripe_webhook_events
  FOR ALL USING (false);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_workspace ON transactions(workspace_id);
CREATE INDEX idx_transactions_product ON transactions(product_id);
CREATE INDEX idx_transactions_stripe_session ON transactions(stripe_checkout_session_id);
CREATE INDEX idx_transactions_stripe_sub ON transactions(stripe_subscription_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_plans_stripe_price ON product_plans(stripe_price_id);
CREATE INDEX idx_enrollments_stripe_sub ON enrollments(stripe_subscription_id);

-- Apply updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
