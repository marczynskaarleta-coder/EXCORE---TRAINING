-- =============================================
-- EXCORE TRAINING - Migration 002: Products
-- Warstwa 3: Produkty i ekosystemy
-- =============================================

-- Product types
CREATE TYPE product_type AS ENUM (
  'course',
  'membership',
  'cohort_program',
  'event_series',
  'resource_hub',
  'mentoring_program',
  'community_access',
  'bundle'
);

CREATE TYPE product_status AS ENUM (
  'draft', 'published', 'archived', 'coming_soon'
);

CREATE TYPE pricing_type AS ENUM (
  'free', 'one_time', 'subscription', 'payment_plan'
);

CREATE TYPE billing_interval AS ENUM (
  'monthly', 'quarterly', 'yearly'
);

-- =============================================
-- PRODUCTS
-- =============================================

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type product_type NOT NULL,
  status product_status DEFAULT 'draft',
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  short_description text,
  cover_image_url text,
  thumbnail_url text,
  -- Pricing
  pricing_type pricing_type DEFAULT 'free',
  price_amount integer DEFAULT 0, -- in cents
  currency text DEFAULT 'PLN',
  billing_interval billing_interval,
  trial_days integer DEFAULT 0,
  -- Access
  is_public boolean DEFAULT true,
  requires_approval boolean DEFAULT false,
  max_participants integer,
  -- Dates (for cohorts, events)
  starts_at timestamptz,
  ends_at timestamptz,
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  -- Settings
  settings jsonb DEFAULT '{}',
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  UNIQUE(workspace_id, slug)
);

-- Product tags
CREATE TABLE product_tags (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- =============================================
-- LEARNING STRUCTURE (within products)
-- =============================================

CREATE TABLE learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer DEFAULT 0,
  is_published boolean DEFAULT true,
  unlock_after_days integer, -- drip content
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TYPE lesson_type AS ENUM (
  'video', 'text', 'audio', 'quiz', 'assignment',
  'live_session', 'download', 'embed'
);

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type lesson_type DEFAULT 'text',
  title text NOT NULL,
  description text,
  content text, -- rich text (Tiptap)
  video_url text,
  video_type text, -- youtube, vimeo, upload
  audio_url text,
  duration_minutes integer,
  position integer DEFAULT 0,
  is_published boolean DEFAULT true,
  is_free_preview boolean DEFAULT false,
  -- Quiz/assignment settings
  quiz_data jsonb,
  assignment_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lesson attachments
CREATE TABLE lesson_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- ENROLLMENTS & PROGRESS
-- =============================================

CREATE TYPE enrollment_status AS ENUM (
  'active', 'completed', 'expired', 'cancelled', 'pending_approval'
);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  business_role business_role DEFAULT 'participant',
  status enrollment_status DEFAULT 'active',
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  progress_percent integer DEFAULT 0,
  last_accessed_at timestamptz,
  UNIQUE(product_id, member_id)
);

CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  time_spent_seconds integer DEFAULT 0,
  quiz_score integer,
  quiz_answers jsonb,
  assignment_url text,
  assignment_grade text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, lesson_id)
);

-- Certificates
CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz DEFAULT now(),
  template_data jsonb DEFAULT '{}'
);

-- =============================================
-- BUNDLES
-- =============================================

CREATE TABLE bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  UNIQUE(bundle_id, product_id)
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;

-- Products: public ones visible to all members, others to enrolled/admins
CREATE POLICY "Members can view published products" ON products
  FOR SELECT USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    AND (status = 'published' OR is_workspace_admin(workspace_id))
  );

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Learning modules & lessons: visible to enrolled members
CREATE POLICY "Enrolled can view modules" ON learning_modules
  FOR SELECT USING (
    product_id IN (
      SELECT product_id FROM enrollments WHERE member_id IN (
        SELECT id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
    OR product_id IN (
      SELECT id FROM products WHERE is_workspace_admin(workspace_id)
    )
  );

CREATE POLICY "Admins can manage modules" ON learning_modules
  FOR ALL USING (
    product_id IN (SELECT id FROM products WHERE is_workspace_admin(workspace_id))
  );

CREATE POLICY "Enrolled can view lessons" ON lessons
  FOR SELECT USING (
    product_id IN (
      SELECT product_id FROM enrollments WHERE member_id IN (
        SELECT id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
    OR is_free_preview = true
    OR product_id IN (
      SELECT id FROM products WHERE is_workspace_admin(workspace_id)
    )
  );

CREATE POLICY "Admins can manage lessons" ON lessons
  FOR ALL USING (
    product_id IN (SELECT id FROM products WHERE is_workspace_admin(workspace_id))
  );

-- Attachments
CREATE POLICY "Enrolled can view attachments" ON lesson_attachments
  FOR SELECT USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE product_id IN (
        SELECT product_id FROM enrollments WHERE member_id IN (
          SELECT id FROM workspace_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can manage attachments" ON lesson_attachments
  FOR ALL USING (
    lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN products p ON l.product_id = p.id
      WHERE is_workspace_admin(p.workspace_id)
    )
  );

-- Enrollments
CREATE POLICY "Members can view own enrollments" ON enrollments
  FOR SELECT USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage enrollments" ON enrollments
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Progress
CREATE POLICY "Members can manage own progress" ON lesson_progress
  FOR ALL USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all progress" ON lesson_progress
  FOR SELECT USING (
    enrollment_id IN (
      SELECT id FROM enrollments WHERE is_workspace_admin(workspace_id)
    )
  );

-- Certificates
CREATE POLICY "Members can view own certificates" ON certificates
  FOR SELECT USING (
    member_id IN (SELECT id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage certificates" ON certificates
  FOR ALL USING (is_workspace_admin(workspace_id));

-- Product tags
CREATE POLICY "Members can view product tags" ON product_tags
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "Admins can manage product tags" ON product_tags
  FOR ALL USING (
    product_id IN (SELECT id FROM products WHERE is_workspace_admin(workspace_id))
  );

-- Bundle items
CREATE POLICY "Members can view bundle items" ON bundle_items
  FOR SELECT USING (
    bundle_id IN (SELECT id FROM products WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "Admins can manage bundle items" ON bundle_items
  FOR ALL USING (
    bundle_id IN (SELECT id FROM products WHERE is_workspace_admin(workspace_id))
  );

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_products_workspace ON products(workspace_id);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_learning_modules_product ON learning_modules(product_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lessons_product ON lessons(product_id);
CREATE INDEX idx_enrollments_product ON enrollments(product_id);
CREATE INDEX idx_enrollments_member ON enrollments(member_id);
CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_certificates_member ON certificates(member_id);
