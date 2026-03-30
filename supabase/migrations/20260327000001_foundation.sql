-- =============================================
-- EXCORE TRAINING - Migration 001: Foundation
-- Warstwa 1: Tenant / Workspace / Brand
-- Warstwa 2: Identity & Access
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- WARSTWA 1: TENANT / WORKSPACE / BRAND
-- =============================================

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  brand_color text DEFAULT '#6366f1',
  custom_domain text,
  industry text DEFAULT 'training',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  default_language text DEFAULT 'pl',
  timezone text DEFAULT 'Europe/Warsaw',
  currency text DEFAULT 'PLN',
  allow_public_registration boolean DEFAULT false,
  require_email_verification boolean DEFAULT true,
  max_members integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE workspace_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#6366f1',
  secondary_color text DEFAULT '#8b5cf6',
  accent_color text DEFAULT '#f59e0b',
  font_heading text DEFAULT 'Inter',
  font_body text DEFAULT 'Inter',
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Moduły włączane per workspace
CREATE TYPE module_key AS ENUM (
  'community', 'learning', 'events', 'resources',
  'messaging', 'billing', 'automations', 'analytics'
);

CREATE TABLE workspace_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  module module_key NOT NULL,
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, module)
);

-- =============================================
-- WARSTWA 2: IDENTITY & ACCESS
-- =============================================

-- System roles (per workspace)
CREATE TYPE system_role AS ENUM ('super_admin', 'workspace_admin', 'member');

CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_role system_role DEFAULT 'member',
  display_name text,
  avatar_url text,
  bio text,
  job_title text,
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz,
  UNIQUE(workspace_id, user_id)
);

-- Custom roles with granular permissions
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  is_default boolean DEFAULT false,
  -- Module permissions
  can_view_community boolean DEFAULT true,
  can_manage_community boolean DEFAULT false,
  can_view_learning boolean DEFAULT true,
  can_manage_learning boolean DEFAULT false,
  can_view_events boolean DEFAULT true,
  can_manage_events boolean DEFAULT false,
  can_view_resources boolean DEFAULT true,
  can_manage_resources boolean DEFAULT false,
  can_view_messaging boolean DEFAULT true,
  can_manage_billing boolean DEFAULT false,
  can_view_analytics boolean DEFAULT false,
  can_manage_members boolean DEFAULT false,
  can_manage_roles boolean DEFAULT false,
  can_manage_settings boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Member-role assignments (many-to-many)
CREATE TABLE member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(member_id, role_id)
);

-- Business roles (per product/program context)
CREATE TYPE business_role AS ENUM (
  'participant', 'mentor', 'coach', 'cohort_lead',
  'trainer', 'moderator', 'corporate_client_admin'
);

-- Invitations
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid REFERENCES roles(id),
  business_role business_role DEFAULT 'participant',
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tags (workspace-scoped, reusable across modules)
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  icon text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- =============================================
-- HELPER FUNCTIONS (after tables exist)
-- =============================================

CREATE OR REPLACE FUNCTION get_my_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND system_role IN ('super_admin', 'workspace_admin')
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Workspaces: members can view their workspaces
CREATE POLICY "Members can view workspace" ON workspaces
  FOR SELECT USING (id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can update workspace" ON workspaces
  FOR UPDATE USING (is_workspace_admin(id));

CREATE POLICY "Authenticated can create workspace" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace settings
CREATE POLICY "Members can view settings" ON workspace_settings
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage settings" ON workspace_settings
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Workspace branding
CREATE POLICY "Members can view branding" ON workspace_branding
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage branding" ON workspace_branding
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Workspace modules
CREATE POLICY "Members can view modules" ON workspace_modules
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage modules" ON workspace_modules
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Workspace members
CREATE POLICY "Members can view other members" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage members" ON workspace_members
  FOR ALL USING (is_workspace_admin(workspace_id));

CREATE POLICY "Users can update own profile" ON workspace_members
  FOR UPDATE USING (user_id = auth.uid());

-- Roles
CREATE POLICY "Members can view roles" ON roles
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Member roles
CREATE POLICY "Members can view assignments" ON member_roles
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage assignments" ON member_roles
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Invitations
CREATE POLICY "Admins can manage invitations" ON invitations
  FOR ALL USING (is_workspace_admin(workspace_id));

CREATE POLICY "Anyone can view by token" ON invitations
  FOR SELECT USING (true);

-- Tags
CREATE POLICY "Members can view tags" ON tags
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage tags" ON tags
  FOR ALL USING (is_workspace_admin(workspace_id));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_member_roles_member ON member_roles(member_id);
CREATE INDEX idx_roles_workspace ON roles(workspace_id);
CREATE INDEX idx_tags_workspace ON tags(workspace_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
