// =============================================
// Analytics - Statystyki, raporty, metryki
// Odpowiedzialnosc: dashboardy, eksport, KPI
// Dane: agreguje z enrollments, learning, community, events
// =============================================

export interface ProductAnalytics {
  product_id: string
  total_enrollments: number
  active_enrollments: number
  completed_enrollments: number
  completion_rate: number // 0-100
  average_progress: number // 0-100
  total_revenue: number // in cents
}

export interface MemberAnalytics {
  member_id: string
  enrolled_products: number
  completed_products: number
  total_lessons_completed: number
  total_time_spent_seconds: number
  certificates_earned: number
  posts_created: number
  events_attended: number
}

export interface WorkspaceAnalytics {
  workspace_id: string
  total_members: number
  total_products: number
  total_enrollments: number
  active_learners_30d: number
  completion_rate: number
  total_revenue: number
  top_products: Array<{ product_id: string; title: string; enrollments: number }>
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '12m' | 'all'
