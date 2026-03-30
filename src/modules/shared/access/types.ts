// =============================================
// Access Engine - Centralny model dostepu
// Jeden punkt prawdy: rola + entitlement = decyzja
// =============================================

// --- ROLE HIERARCHY ---

export type PlatformRole =
  | 'owner'                   // wlasciciel workspace (1 per workspace)
  | 'admin'                   // pelne zarzadzanie
  | 'manager'                 // zarzadzanie trescia i czlonkami
  | 'trainer'                 // tworzenie i prowadzenie kursow
  | 'moderator'               // moderacja community
  | 'member'                  // zwykly uzytkownik (participant)
  | 'corporate_client_admin'  // zarzadza swoimi ludzmi w B2B

// Hierarchia: owner > admin > manager > trainer > moderator > member
export const ROLE_HIERARCHY: Record<PlatformRole, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  trainer: 60,
  moderator: 50,
  corporate_client_admin: 40,
  member: 10,
}

// --- PERMISSIONS ---

export type Permission =
  // Products
  | 'product.view'
  | 'product.create'
  | 'product.edit'
  | 'product.delete'
  | 'product.publish'
  // Programs / Learning
  | 'program.view'
  | 'program.create'
  | 'program.edit'
  | 'lesson.view'
  | 'lesson.create'
  | 'lesson.edit'
  | 'lesson.grade'
  // Enrollments
  | 'enrollment.view_own'
  | 'enrollment.view_all'
  | 'enrollment.create'
  | 'enrollment.cancel'
  // Events
  | 'event.view'
  | 'event.create'
  | 'event.edit'
  | 'event.register'
  // Community
  | 'community.view'
  | 'community.post'
  | 'community.moderate'
  | 'community.manage_spaces'
  // Resources
  | 'resource.view'
  | 'resource.create'
  | 'resource.edit'
  // Certificates
  | 'certificate.view_own'
  | 'certificate.issue'
  | 'certificate.manage_templates'
  // Analytics
  | 'analytics.view'
  | 'analytics.export'
  // Workspace management
  | 'members.view'
  | 'members.invite'
  | 'members.manage'
  | 'roles.manage'
  | 'settings.manage'
  | 'billing.manage'

// --- RESOURCE TYPES ---

export type ResourceType =
  | 'product'
  | 'program'
  | 'lesson'
  | 'event'
  | 'community_space'
  | 'resource'

// --- ACCESS DECISION ---

export type AccessSource =
  | 'role'           // rola daje dostep (admin, trainer)
  | 'entitlement'    // entitlement z DB (enrollment, manual grant)
  | 'free_preview'   // lekcja oznaczona jako darmowy preview
  | 'public'         // zasob publiczny (visibility: public)
  | 'denied'         // brak dostepu

export interface AccessDecision {
  granted: boolean
  source: AccessSource
  reason: string
  entitlement_id: string | null
  expires_at: string | null
  // Debug info
  role: PlatformRole | null
  checks_performed: string[]
}

// --- USER CONTEXT ---

export interface UserAccessContext {
  user_id: string
  workspace_id: string
  role: PlatformRole
  permissions: Permission[]
  entitlements: CachedEntitlement[]
}

export interface CachedEntitlement {
  id: string
  resource_type: string
  resource_id: string
  source_type: string
  active_until: string | null
}
