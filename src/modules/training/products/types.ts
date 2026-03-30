// =============================================
// Products - Katalog produktow edukacyjnych
// Tabele: products, product_tags, product_plans
// =============================================

export type ProductType =
  | 'course'
  | 'membership'
  | 'cohort_program'
  | 'mentoring_program'
  | 'resource_hub'
  | 'bundle'
  | 'community_access'

export type ProductStatus = 'draft' | 'published' | 'archived'

export type ProductVisibility = 'public' | 'members' | 'private'

export interface Product {
  id: string
  workspace_id: string
  type: ProductType
  status: ProductStatus
  visibility: ProductVisibility
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  metadata: Record<string, unknown>
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProductTag {
  product_id: string
  tag_id: string
  tags?: { name: string; color: string }
}

export interface ProductPlanSummary {
  id: string
  name: string
  billing_type: string
  price_amount: number
  currency: string
  interval?: string | null
  trial_days?: number
  is_active: boolean
  position?: number
  metadata?: Record<string, unknown>
  created_at?: string
}

export interface ProductWithRelations extends Product {
  product_tags?: ProductTag[]
  product_plans?: ProductPlanSummary[]
  enrollments?: { count: number }[]
  programs?: Array<{ id: string; name: string; status: string }>
}

// --- Labels ---

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  course: 'Kurs',
  membership: 'Membership',
  cohort_program: 'Program kohortowy',
  mentoring_program: 'Mentoring',
  resource_hub: 'Baza zasobow',
  bundle: 'Pakiet',
  community_access: 'Dostep do spolecznosci',
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Szkic',
  published: 'Opublikowany',
  archived: 'Zarchiwizowany',
}

export const PRODUCT_VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  public: 'Publiczny',
  members: 'Czlonkowie',
  private: 'Prywatny',
}

// --- Helpers ---

export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return 'Darmowy'
  return `${(amount / 100).toFixed(2)} ${currency}`
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
