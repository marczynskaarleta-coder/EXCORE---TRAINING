-- =============================================
-- EXCORE TRAINING - Migration 005: Training Domain v2
-- Pelny model danych domeny edukacyjnej
-- Zastepuje: 002_products, 003_community, 004_events_resources_notifications
-- =============================================

-- =============================================
-- CLEANUP: Drop old domain tables (no production data yet)
-- Order matters: drop dependents first
-- =============================================

-- 004
DROP TABLE IF EXISTS activity_feed CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS resource_tags CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS event_category_links CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- 003
DROP TABLE IF EXISTS member_profiles CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS community_spaces CASCADE;

-- 002
DROP TABLE IF EXISTS bundle_items CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lesson_attachments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS learning_modules CASCADE;
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop old enums (safe - nothing references them after drops)
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS rsvp_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS post_type CASCADE;
DROP TYPE IF EXISTS space_visibility CASCADE;
DROP TYPE IF EXISTS space_type CASCADE;
DROP TYPE IF EXISTS enrollment_status CASCADE;
DROP TYPE IF EXISTS lesson_type CASCADE;
DROP TYPE IF EXISTS billing_interval CASCADE;
DROP TYPE IF EXISTS pricing_type CASCADE;
DROP TYPE IF EXISTS product_status CASCADE;
DROP TYPE IF EXISTS product_type CASCADE;

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE product_type AS ENUM (
  'course',
  'membership',
  'cohort_program',
  'mentoring_program',
  'resource_hub',
  'bundle',
  'community_access'
);

CREATE TYPE product_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE product_visibility AS ENUM (
  'public',       -- widoczny dla wszystkich (landing)
  'members',      -- widoczny tylko dla czlonkow workspace
  'private'       -- widoczny tylko dla enrolled
);

CREATE TYPE billing_type AS ENUM (
  'free',
  'one_time',
  'subscription',
  'custom'        -- niestandardowe warunki (corporate deals)
);

CREATE TYPE billing_interval AS ENUM (
  'monthly',
  'quarterly',
  'yearly'
);

CREATE TYPE enrollment_source AS ENUM (
  'purchase',
  'manual',
  'invite',
  'corporate_assignment',
  'automation'
);

CREATE TYPE enrollment_status AS ENUM (
  'active',
  'completed',
  'paused',
  'cancelled',
  'expired'
);

CREATE TYPE entitlement_status AS ENUM (
  'active',
  'expired',
  'revoked'
);

CREATE TYPE program_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE lesson_type AS ENUM (
  'video',
  'text',
  'audio',
  'quiz',
  'assignment',
  'live_session',
  'download',
  'embed'
);

CREATE TYPE lesson_progress_status AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

CREATE TYPE event_type AS ENUM (
  'live',
  'webinar',
  'office_hours',
  'workshop',
  'onsite'
);

CREATE TYPE event_status AS ENUM (
  'draft',
  'scheduled',
  'live',
  'completed',
  'cancelled'
);

CREATE TYPE registration_status AS ENUM (
  'registered',
  'waitlisted',
  'cancelled',
  'attended',
  'no_show'
);

-- =============================================
-- 1. PRODUCTS
-- Produkt = oferta w katalogu (kurs, membership, mentoring...)
-- Jeden produkt moze miec wiele planow cenowych i programow
-- =============================================

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  type product_type NOT NULL,
  status product_status NOT NULL DEFAULT 'draft',
  visibility product_visibility NOT NULL DEFAULT 'members',

  name text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image_url text,

  -- Konfiguracja per type
  metadata jsonb NOT NULL DEFAULT '{}',
  -- Przykladowe metadata:
  -- course:   { certificate_enabled: true, drip_enabled: false }
  -- cohort:   { starts_at, ends_at, max_participants, application_required }
  -- membership: { renewal_reminder_days: 7 }
  -- bundle:   { product_ids: ["uuid1", "uuid2"] }

  -- Soft delete
  deleted_at timestamptz,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, slug)
);

-- Tags M2M
CREATE TABLE product_tags (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- =============================================
-- 2. PRODUCT PLANS
-- Plan cenowy = wariant zakupu produktu
-- Jeden produkt moze miec plan free + plan premium itp.
-- =============================================

CREATE TABLE product_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name text NOT NULL DEFAULT 'Domyslny',
  billing_type billing_type NOT NULL DEFAULT 'free',
  price_amount integer NOT NULL DEFAULT 0, -- grosze/centy
  currency text NOT NULL DEFAULT 'PLN',
  interval billing_interval, -- NULL jesli one_time lub free
  trial_days integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,

  metadata jsonb NOT NULL DEFAULT '{}',
  -- Przykladowe: { stripe_price_id, features: ["access_community", "certificate"] }

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 3. ENROLLMENTS
-- Enrollment = "user X jest zapisany na product Y"
-- Zrodlo zapisu (purchase, invite, corporate) wazne dla raportow
-- =============================================

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES product_plans(id) ON DELETE SET NULL,

  source enrollment_source NOT NULL DEFAULT 'manual',
  status enrollment_status NOT NULL DEFAULT 'active',

  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  expires_at timestamptz, -- dla membership/trial

  progress_percent integer NOT NULL DEFAULT 0,

  metadata jsonb NOT NULL DEFAULT '{}',
  -- Przykladowe: { corporate_client_id, coupon_code, business_role }

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(product_id, user_id)
);

-- =============================================
-- 4. ENTITLEMENTS
-- Entitlement = "user X ma dostep do resource Y w okresie Z"
-- Warstwa abstrakcji: enrollment generuje entitlement(y)
-- Umozliwia: bundle -> wiele entitlements, membership -> recurring
-- =============================================

CREATE TABLE entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Co jest odblokowane
  resource_type text NOT NULL, -- 'product', 'program', 'event', 'community_space'
  resource_id uuid NOT NULL,

  -- Skad pochodzi
  source_type text NOT NULL, -- 'enrollment', 'manual_grant', 'bundle', 'coupon'
  source_id uuid, -- enrollment_id, manual grant id, etc.

  status entitlement_status NOT NULL DEFAULT 'active',
  active_from timestamptz NOT NULL DEFAULT now(),
  active_until timestamptz, -- NULL = bezterminowo

  metadata jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 5. PROGRAMS
-- Program = kontener na moduly/lekcje wewnatrz produktu
-- Jeden produkt (type=course) ma zazwyczaj 1 program
-- Produkt (type=bundle) moze miec wiele (przez bundle_items)
-- =============================================

CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image_url text,

  status program_status NOT NULL DEFAULT 'draft',
  position integer NOT NULL DEFAULT 0,

  metadata jsonb NOT NULL DEFAULT '{}',
  -- Przykladowe: { estimated_hours, difficulty: 'beginner' }

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(product_id, slug)
);

-- =============================================
-- 6. PROGRAM MODULES
-- Modul = sekcja/rozdzial wewnatrz programu
-- =============================================

CREATE TABLE program_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,

  unlock_after_days integer, -- drip content: ile dni od enrollmentu
  is_published boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 7. LESSONS
-- Lekcja = jednostka tresci (video, tekst, quiz...)
-- =============================================

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES program_modules(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  title text NOT NULL,
  slug text NOT NULL,
  type lesson_type NOT NULL DEFAULT 'text',

  content text, -- rich text (Tiptap HTML)
  video_url text,
  audio_url text,
  attachment_url text,
  duration_minutes integer,

  is_published boolean NOT NULL DEFAULT true,
  is_free_preview boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,

  -- Quiz / assignment
  quiz_data jsonb, -- { questions: [...], passing_score: 70 }
  assignment_instructions text,

  metadata jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 8. LESSON PROGRESS
-- Sledzenie postepu per user per lesson
-- =============================================

CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  status lesson_progress_status NOT NULL DEFAULT 'not_started',
  progress_percent integer NOT NULL DEFAULT 0, -- 0-100 (np. ile % video obejrzane)

  completed_at timestamptz,
  last_seen_at timestamptz DEFAULT now(),

  -- Quiz/assignment results
  quiz_score integer,
  quiz_answers jsonb,
  assignment_url text,
  assignment_grade text,

  time_spent_seconds integer NOT NULL DEFAULT 0,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(lesson_id, user_id, enrollment_id)
);

-- =============================================
-- 9. EVENTS
-- Wydarzenie = webinar, warsztat, dyzur, spotkanie
-- Moze byc powiazane z produktem (event_series) lub samodzielne
-- =============================================

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  type event_type NOT NULL DEFAULT 'webinar',
  status event_status NOT NULL DEFAULT 'draft',

  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Warsaw',

  location text, -- adres fizyczny (onsite)
  meeting_url text, -- Zoom/Meet/Teams link
  replay_url text, -- nagranie po evencie

  capacity integer, -- NULL = bez limitu
  is_free boolean NOT NULL DEFAULT true,

  cover_image_url text,

  host_id uuid REFERENCES workspace_members(id) ON DELETE SET NULL,

  metadata jsonb NOT NULL DEFAULT '{}',
  -- Przykladowe: { recurring_rule, reminder_minutes: [1440, 60] }

  deleted_at timestamptz,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 10. EVENT REGISTRATIONS
-- Rejestracja = "user X zapisal sie na event Y"
-- =============================================

CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  status registration_status NOT NULL DEFAULT 'registered',

  registered_at timestamptz NOT NULL DEFAULT now(),
  attended_at timestamptz,
  cancelled_at timestamptz,

  metadata jsonb NOT NULL DEFAULT '{}',

  UNIQUE(event_id, user_id)
);

-- =============================================
-- 11. CERTIFICATES
-- Certyfikat = potwierdzenie ukonczenia programu/produktu
-- =============================================

CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,

  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  file_url text, -- wygenerowany PDF

  template_data jsonb NOT NULL DEFAULT '{}',
  -- Przykladowe: { member_name, product_title, completion_date, custom_fields }

  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- COMMUNITY (zachowujemy, bo nie ma w nowym modelu - osobna migracja)
-- Tworzymy minimalne tabele ponownie
-- =============================================

CREATE TABLE community_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,

  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#6366f1',

  type text NOT NULL DEFAULT 'general', -- general, product, cohort, topic, announcements, qa
  visibility text NOT NULL DEFAULT 'members_only', -- public, members_only, product_access, invite_only

  position integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(workspace_id, slug)
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,

  type text NOT NULL DEFAULT 'discussion', -- discussion, question, announcement, poll, resource
  title text,
  content text NOT NULL,

  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,

  poll_data jsonb,
  deleted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,

  -- Polymorphic: komentarz moze byc pod postem, lekcja, eventem
  commentable_type text NOT NULL, -- 'post', 'lesson', 'event'
  commentable_id uuid NOT NULL,

  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE, -- nested replies
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  mentions jsonb DEFAULT '[]',

  deleted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,

  reactable_type text NOT NULL, -- 'post', 'comment'
  reactable_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT 'heart',

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(member_id, reactable_type, reactable_id, emoji)
);

CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,

  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- RESOURCES (biblioteka materialow)
CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'other', -- pdf, template, workbook, checklist, sop, recording, video, audio, link, other
  file_url text,
  file_name text,
  file_size integer,
  external_url text,
  is_premium boolean NOT NULL DEFAULT false,
  download_count integer NOT NULL DEFAULT 0,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resource_tags (
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,

  type text NOT NULL, -- new_post, mention, enrollment, event_reminder, certificate, system
  title text NOT NULL,
  body text,
  link text,

  actor_id uuid REFERENCES workspace_members(id),
  reference_type text,
  reference_id uuid,

  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ACTIVITY FEED
CREATE TABLE activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES workspace_members(id),

  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_title text,

  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- Strategia: RLS jako siatka bezpieczenstwa, NIE jedyna warstwa
-- Logika biznesowa w server actions + entitlements
-- RLS gwarantuje: user widzi tylko dane swojego workspace
-- =============================================

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view non-deleted products" ON products
  FOR SELECT USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_workspace_admin(workspace_id));

-- PRODUCT PLANS
ALTER TABLE product_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view active plans" ON product_plans
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Admins can manage plans" ON product_plans
  FOR ALL USING (is_workspace_admin(workspace_id));

-- ENROLLMENTS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage enrollments" ON enrollments
  FOR ALL USING (is_workspace_admin(workspace_id));

-- ENTITLEMENTS
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlements" ON entitlements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage entitlements" ON entitlements
  FOR ALL USING (is_workspace_admin(workspace_id));

-- PROGRAMS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view published programs" ON programs
  FOR SELECT USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    AND (status = 'published' OR is_workspace_admin(workspace_id))
  );

CREATE POLICY "Admins can manage programs" ON programs
  FOR ALL USING (is_workspace_admin(workspace_id));

-- PROGRAM MODULES
ALTER TABLE program_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view published modules" ON program_modules
  FOR SELECT USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    AND is_published = true
  );

CREATE POLICY "Admins can manage modules" ON program_modules
  FOR ALL USING (is_workspace_admin(workspace_id));

-- LESSONS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view published lessons" ON lessons
  FOR SELECT USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    AND (is_published = true OR is_free_preview = true)
  );

CREATE POLICY "Admins can manage lessons" ON lessons
  FOR ALL USING (is_workspace_admin(workspace_id));

-- LESSON PROGRESS
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress" ON lesson_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress" ON lesson_progress
  FOR SELECT USING (is_workspace_admin(workspace_id));

-- EVENTS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view non-deleted events" ON events
  FOR SELECT USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can manage events" ON events
  FOR ALL USING (is_workspace_admin(workspace_id));

-- EVENT REGISTRATIONS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations" ON event_registrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can register themselves" ON event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own registration" ON event_registrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage registrations" ON event_registrations
  FOR ALL USING (is_workspace_admin(workspace_id));

-- CERTIFICATES
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates" ON certificates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage certificates" ON certificates
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Public verification (anyone can verify by certificate_number)
CREATE POLICY "Anyone can verify certificate" ON certificates
  FOR SELECT USING (true);

-- COMMUNITY
ALTER TABLE community_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view spaces" ON community_spaces
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "Admins can manage spaces" ON community_spaces
  FOR ALL USING (is_workspace_admin(workspace_id));

CREATE POLICY "Members can view posts" ON posts
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()) AND deleted_at IS NULL);
CREATE POLICY "Members can create posts" ON posts
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "Authors can update posts" ON posts
  FOR UPDATE USING (author_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage posts" ON posts
  FOR ALL USING (is_workspace_admin(workspace_id));

CREATE POLICY "Members can view comments" ON comments
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()) AND deleted_at IS NULL);
CREATE POLICY "Members can create comments" ON comments
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "Authors can update comments" ON comments
  FOR UPDATE USING (author_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view reactions" ON reactions
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "Members can manage own reactions" ON reactions
  FOR ALL USING (member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own DMs" ON direct_messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can send DMs" ON direct_messages
  FOR INSERT WITH CHECK (sender_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view resources" ON resources
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "Admins can manage resources" ON resources
  FOR ALL USING (is_workspace_admin(workspace_id));

CREATE POLICY "Members can view resource tags" ON resource_tags
  FOR SELECT USING (resource_id IN (SELECT id FROM resources WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "Admins can manage resource tags" ON resource_tags
  FOR ALL USING (resource_id IN (SELECT id FROM resources WHERE is_workspace_admin(workspace_id)));

CREATE POLICY "Members can view product tags" ON product_tags
  FOR SELECT USING (product_id IN (SELECT id FROM products WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "Admins can manage product tags" ON product_tags
  FOR ALL USING (product_id IN (SELECT id FROM products WHERE is_workspace_admin(workspace_id)));

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (recipient_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (recipient_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can view activity" ON activity_feed
  FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "System can log activity" ON activity_feed
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));

-- =============================================
-- INDEXES
-- Strategia: workspace_id na wszystkim (tenant isolation),
-- status/type dla filtrow, FK dla joinow, created_at dla sortowania
-- =============================================

-- Products
CREATE INDEX idx_products_workspace ON products(workspace_id);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_slug ON products(workspace_id, slug);

-- Product plans
CREATE INDEX idx_plans_product ON product_plans(product_id);
CREATE INDEX idx_plans_workspace ON product_plans(workspace_id);
CREATE INDEX idx_plans_active ON product_plans(product_id) WHERE is_active = true;

-- Enrollments
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_product ON enrollments(product_id);
CREATE INDEX idx_enrollments_workspace ON enrollments(workspace_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_active ON enrollments(product_id, user_id) WHERE status = 'active';

-- Entitlements
CREATE INDEX idx_entitlements_user ON entitlements(user_id);
CREATE INDEX idx_entitlements_resource ON entitlements(resource_type, resource_id);
CREATE INDEX idx_entitlements_workspace ON entitlements(workspace_id);
CREATE INDEX idx_entitlements_active ON entitlements(user_id, resource_type, resource_id) WHERE status = 'active';

-- Programs
CREATE INDEX idx_programs_product ON programs(product_id);
CREATE INDEX idx_programs_workspace ON programs(workspace_id);

-- Program modules
CREATE INDEX idx_modules_program ON program_modules(program_id);
CREATE INDEX idx_modules_order ON program_modules(program_id, sort_order);

-- Lessons
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lessons_workspace ON lessons(workspace_id);
CREATE INDEX idx_lessons_order ON lessons(module_id, sort_order);

-- Lesson progress
CREATE INDEX idx_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_progress_status ON lesson_progress(status);

-- Events
CREATE INDEX idx_events_workspace ON events(workspace_id);
CREATE INDEX idx_events_starts ON events(starts_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_status ON events(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_product ON events(product_id);

-- Event registrations
CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_registrations_workspace ON event_registrations(workspace_id);

-- Certificates
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_product ON certificates(product_id);
CREATE INDEX idx_certificates_workspace ON certificates(workspace_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);

-- Community
CREATE INDEX idx_spaces_workspace ON community_spaces(workspace_id);
CREATE INDEX idx_posts_space ON posts(space_id);
CREATE INDEX idx_posts_workspace ON posts(workspace_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_target ON comments(commentable_type, commentable_id);
CREATE INDEX idx_reactions_target ON reactions(reactable_type, reactable_id);
CREATE INDEX idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX idx_dm_recipient ON direct_messages(recipient_id);
CREATE INDEX idx_resources_workspace ON resources(workspace_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;
CREATE INDEX idx_activity_workspace ON activity_feed(workspace_id, created_at DESC);

-- =============================================
-- HELPER: updated_at trigger
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'products', 'product_plans', 'enrollments', 'entitlements',
      'programs', 'program_modules', 'lessons', 'lesson_progress',
      'events', 'community_spaces', 'posts', 'comments', 'resources'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- =============================================
-- HELPER: increment_comments_count RPC
-- =============================================

CREATE OR REPLACE FUNCTION increment_comments_count(target_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = target_post_id;
END;
$$;
