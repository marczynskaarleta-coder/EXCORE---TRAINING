-- =============================================
-- EXCORE TRAINING - Migration 007: Automations
-- Predefined workflow templates, execution engine
-- =============================================

-- =============================================
-- Automation rules
-- =============================================

CREATE TYPE automation_trigger AS ENUM (
  'user_joined_workspace',
  'enrollment_created',
  'product_purchased',
  'lesson_completed',
  'event_starting_soon',
  'user_inactive',
  'certificate_issued'
);

CREATE TYPE automation_action AS ENUM (
  'send_email',
  'create_notification',
  'grant_entitlement',
  'add_tag',
  'mark_lifecycle_stage'
);

CREATE TABLE automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,
  trigger automation_trigger NOT NULL,
  action automation_action NOT NULL,

  -- Trigger conditions (optional filters)
  -- e.g. { product_id: "uuid", lesson_type: "video" }
  trigger_config jsonb NOT NULL DEFAULT '{}',

  -- Action parameters
  -- e.g. { template_id: "welcome", subject: "...", body: "..." }
  -- e.g. { resource_type: "product", resource_id: "uuid" }
  action_config jsonb NOT NULL DEFAULT '{}',

  -- Timing
  delay_minutes integer NOT NULL DEFAULT 0, -- 0 = immediate

  is_enabled boolean NOT NULL DEFAULT true,
  is_template boolean NOT NULL DEFAULT false, -- predefined vs custom

  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- Execution log
-- =============================================

CREATE TYPE execution_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'skipped'
);

CREATE TABLE automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Who/what triggered it
  trigger_event automation_trigger NOT NULL,
  trigger_user_id uuid REFERENCES auth.users(id),
  trigger_data jsonb NOT NULL DEFAULT '{}',

  -- Execution
  status execution_status NOT NULL DEFAULT 'pending',
  action automation_action NOT NULL,
  action_data jsonb NOT NULL DEFAULT '{}',

  -- Scheduling
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,

  -- Results
  result jsonb,
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- Lifecycle stages (for mark_lifecycle_stage action)
-- =============================================

CREATE TABLE user_lifecycle_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL, -- new_member, onboarding, active_learner, completed, churning, re_engaged
  entered_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(workspace_id, user_id)
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lifecycle_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rules" ON automation_rules
  FOR ALL USING (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can view executions" ON automation_executions
  FOR SELECT USING (is_workspace_admin(workspace_id));

CREATE POLICY "System can manage executions" ON automation_executions
  FOR ALL USING (true); -- service role only in practice (actions use admin client)

CREATE POLICY "Users can view own lifecycle" ON user_lifecycle_stages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage lifecycle" ON user_lifecycle_stages
  FOR ALL USING (true);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_rules_workspace ON automation_rules(workspace_id);
CREATE INDEX idx_rules_trigger ON automation_rules(trigger) WHERE is_enabled = true;
CREATE INDEX idx_rules_enabled ON automation_rules(workspace_id, is_enabled);
CREATE INDEX idx_executions_rule ON automation_executions(rule_id);
CREATE INDEX idx_executions_workspace ON automation_executions(workspace_id);
CREATE INDEX idx_executions_pending ON automation_executions(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_executions_status ON automation_executions(status);
CREATE INDEX idx_lifecycle_user ON user_lifecycle_stages(workspace_id, user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
