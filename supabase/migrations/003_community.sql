-- =============================================
-- EXCORE TRAINING - Migration 003: Community
-- Warstwa 4: Experience Layer - Community
-- =============================================

-- =============================================
-- COMMUNITY SPACES
-- =============================================

CREATE TYPE space_type AS ENUM (
  'general', 'product', 'cohort', 'topic', 'announcements', 'qa'
);

CREATE TYPE space_visibility AS ENUM (
  'public', 'members_only', 'product_access', 'invite_only'
);

CREATE TABLE community_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL, -- linked to product
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#6366f1',
  type space_type DEFAULT 'general',
  visibility space_visibility DEFAULT 'members_only',
  position integer DEFAULT 0,
  is_archived boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- =============================================
-- POSTS
-- =============================================

CREATE TYPE post_type AS ENUM (
  'discussion', 'question', 'announcement', 'poll', 'resource'
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  type post_type DEFAULT 'discussion',
  title text,
  content text NOT NULL, -- rich text
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  -- Poll data
  poll_data jsonb, -- {options: [{text, votes}], multiple: bool, expires_at}
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

-- =============================================
-- COMMENTS
-- =============================================

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE, -- nested replies
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  mentions jsonb DEFAULT '[]', -- [{user_id, display_name}]
  -- Polymorphic: comments can be on posts, lessons, events
  commentable_type text, -- 'post', 'lesson', 'event'
  commentable_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz
);

-- =============================================
-- REACTIONS
-- =============================================

CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT 'heart', -- heart, thumbsup, fire, clap, thinking, rocket
  -- Polymorphic
  reactable_type text NOT NULL, -- 'post', 'comment'
  reactable_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, reactable_type, reactable_id, emoji)
);

-- =============================================
-- DIRECT MESSAGES (light)
-- =============================================

CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- MEMBER DIRECTORY
-- =============================================

CREATE TABLE member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE UNIQUE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  headline text,
  about text,
  website_url text,
  linkedin_url text,
  expertise jsonb DEFAULT '[]', -- ["coaching", "leadership"]
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE community_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

-- Spaces
CREATE POLICY "Members can view spaces" ON community_spaces
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage spaces" ON community_spaces
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Posts
CREATE POLICY "Members can view posts" ON posts
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can create posts" ON posts
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Authors can update own posts" ON posts
  FOR UPDATE USING (
    author_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
    OR is_workspace_admin(workspace_id)
  );

CREATE POLICY "Authors or admins can delete posts" ON posts
  FOR DELETE USING (
    author_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
    OR is_workspace_admin(workspace_id)
  );

-- Comments
CREATE POLICY "Members can view comments" ON comments
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can create comments" ON comments
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Authors can update own comments" ON comments
  FOR UPDATE USING (
    author_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authors or admins can delete comments" ON comments
  FOR DELETE USING (
    author_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
    OR is_workspace_admin(workspace_id)
  );

-- Reactions
CREATE POLICY "Members can view reactions" ON reactions
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can manage own reactions" ON reactions
  FOR ALL USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

-- DMs
CREATE POLICY "Users can view own DMs" ON direct_messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can send DMs" ON direct_messages
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Profiles
CREATE POLICY "Members can view profiles" ON member_profiles
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can manage own profile" ON member_profiles
  FOR ALL USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_spaces_workspace ON community_spaces(workspace_id);
CREATE INDEX idx_spaces_product ON community_spaces(product_id);
CREATE INDEX idx_posts_space ON posts(space_id);
CREATE INDEX idx_posts_workspace ON posts(workspace_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_commentable ON comments(commentable_type, commentable_id);
CREATE INDEX idx_reactions_target ON reactions(reactable_type, reactable_id);
CREATE INDEX idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX idx_dm_recipient ON direct_messages(recipient_id);
CREATE INDEX idx_dm_created ON direct_messages(created_at DESC);
