// =============================================
// Plans - Plany cenowe produktow
// Tabela: product_plans
// Relacja: product 1->N plans
// =============================================

export type BillingType = 'free' | 'one_time' | 'subscription' | 'custom'

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly'

export interface ProductPlan {
  id: string
  product_id: string
  workspace_id: string
  name: string
  billing_type: BillingType
  price_amount: number // grosze/centy
  currency: string
  interval: BillingInterval | null
  trial_days: number
  is_active: boolean
  position: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  free: 'Darmowy',
  one_time: 'Jednorazowa platnosc',
  subscription: 'Subskrypcja',
  custom: 'Niestandardowy',
}

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'Miesiecznie',
  quarterly: 'Kwartalnie',
  yearly: 'Rocznie',
}
