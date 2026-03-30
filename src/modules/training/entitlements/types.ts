// =============================================
// Entitlements - Warstwa dostepu
// Tabela: entitlements
// Wzorzec: enrollment -> generates entitlement(s)
// Bundle enrollment -> wiele entitlements (per sub-product)
// =============================================

export type EntitlementStatus = 'active' | 'expired' | 'revoked'

export interface Entitlement {
  id: string
  workspace_id: string
  user_id: string
  resource_type: string // 'product', 'program', 'event', 'community_space'
  resource_id: string
  source_type: string // 'enrollment', 'manual_grant', 'bundle', 'coupon'
  source_id: string | null
  status: EntitlementStatus
  active_from: string
  active_until: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AccessCheck {
  granted: boolean
  entitlement_id: string | null
  source: string | null
  expires_at: string | null
  reason: string | null
}
