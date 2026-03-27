-- =============================================
-- EXCORE TRAINING - Migration 004: Events, Resources, Notifications
-- Warstwa 4: Experience Layer (continued)
-- =============================================

-- =============================================
-- EVENTS
-- =============================================

CREATE TYPE event_type AS ENUM (
  'webinar', 'workshop', 'live_session', 'meetup',
  'conference', 'ama', 'office_hours', 'custom'
);

CREATE TYPE event_status AS ENUM (
  'draft', 'scheduled', 'live', 'completed', 'cancelled'
);

CREATE TYPE rsvp_status AS ENUM (
  'going', 'maybe', 'not_going'
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL, -- linked to product
  title text NOT NULL,
  description text,
  type event_type DEFAULT 'webinar',
  status event_status DEFAULT 'draft',
  -- Schedule
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text DEFAULT 'Europe/Warsaw',
  is_recurring boolean DEFAULT false,
  recurrence_rule text, -- RRULE format
  -- Location
  is_online boolean DEFAULT true,
  location_url text, -- Zoom/Meet/Teams link
  location_address text, -- physical address
  -- Content
  cover_image_url text,
  replay_url text,
  notes text, -- post-event notes/summary
  -- Settings
  max_attendees integer,
  requires_rsvp boolean DEFAULT true,
  is_public boolean DEFAULT false,
  -- Host
  host_id uuid REFERENCES workspace_members(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  status rsvp_status DEFAULT 'going',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, member_id)
);

CREATE TABLE event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  icon text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE event_category_links (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, category_id)
);

-- =============================================
-- RESOURCES
-- =============================================

CREATE TYPE resource_type AS ENUM (
  'pdf', 'template', 'workbook', 'checklist', 'sop',
  'recording', 'video', 'audio', 'link', 'other'
);

CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  type resource_type DEFAULT 'other',
  file_url text,
  file_name text,
  file_size integer,
  external_url text,
  thumbnail_url text,
  is_premium boolean DEFAULT false,
  download_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE resource_tags (
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TYPE notification_type AS ENUM (
  'new_post', 'new_comment', 'mention', 'reaction',
  'new_lesson', 'course_completed', 'certificate_issued',
  'event_reminder', 'event_starting', 'new_resource',
  'enrollment', 'message', 'system', 'welcome',
  'assignment_graded', 'cohort_update'
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text, -- in-app link
  is_read boolean DEFAULT false,
  read_at timestamptz,
  -- Reference
  actor_id uuid REFERENCES workspace_members(id),
  reference_type text, -- 'post', 'comment', 'lesson', 'event', 'product'
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE UNIQUE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Per-type toggles (in-app / email)
  community_in_app boolean DEFAULT true,
  community_email boolean DEFAULT false,
  learning_in_app boolean DEFAULT true,
  learning_email boolean DEFAULT true,
  events_in_app boolean DEFAULT true,
  events_email boolean DEFAULT true,
  messages_in_app boolean DEFAULT true,
  messages_email boolean DEFAULT true,
  system_in_app boolean DEFAULT true,
  system_email boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- ACTIVITY FEED (audit log)
-- =============================================

CREATE TABLE activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES workspace_members(id),
  action text NOT NULL, -- 'created', 'updated', 'completed', 'enrolled', etc.
  target_type text NOT NULL, -- 'product', 'lesson', 'post', 'event', etc.
  target_id uuid,
  target_title text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Events
CREATE POLICY "Members can view events" ON events
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage events" ON events
  FOR ALL USING (is_workspace_admin(workspace_id));

-- RSVPs
CREATE POLICY "Members can view RSVPs" ON event_rsvps
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "Members can manage own RSVP" ON event_rsvps
  FOR ALL USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Event categories
CREATE POLICY "Members can view categories" ON event_categories
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage categories" ON event_categories
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Event category links
CREATE POLICY "Members can view category links" ON event_category_links
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "Admins can manage category links" ON event_category_links
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE is_workspace_admin(workspace_id))
  );

-- Resources
CREATE POLICY "Members can view resources" ON resources
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage resources" ON resources
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Resource tags
CREATE POLICY "Members can view resource tags" ON resource_tags
  FOR SELECT USING (
    resource_id IN (SELECT id FROM resources WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "Admins can manage resource tags" ON resource_tags
  FOR ALL USING (
    resource_id IN (SELECT id FROM resources WHERE is_workspace_admin(workspace_id))
  );

-- Notifications
CREATE POLICY "Members can view own notifications" ON notifications
  FOR SELECT USING (
    recipient_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can update own notifications" ON notifications
  FOR UPDATE USING (
    recipient_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Notification preferences
CREATE POLICY "Members can manage own prefs" ON notification_preferences
  FOR ALL USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Activity feed
CREATE POLICY "Members can view activity" ON activity_feed
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "System can log activity" ON activity_feed
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_events_workspace ON events(workspace_id);
CREATE INDEX idx_events_product ON events(product_id);
CREATE INDEX idx_events_starts ON events(starts_at);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_rsvps_member ON event_rsvps(member_id);
CREATE INDEX idx_resources_workspace ON resources(workspace_id);
CREATE INDEX idx_resources_product ON resources(product_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_activity_workspace ON activity_feed(workspace_id);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_target ON activity_feed(target_type, target_id);
