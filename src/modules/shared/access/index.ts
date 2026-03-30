// =============================================
// Public API access engine
// Import from '@/modules/shared/access'
// =============================================

// Types
export type {
  PlatformRole,
  Permission,
  ResourceType,
  AccessDecision,
  UserAccessContext,
  AccessSource,
  CachedEntitlement,
} from './types'

export { ROLE_HIERARCHY } from './types'

// Roles
export {
  getPermissionsForRole,
  roleHasPermission,
  isRoleAtLeast,
  resolvePlatformRole,
  ROLE_TEMPLATES,
} from './roles'

// Engine
export {
  buildAccessContext,
  hasPermission,
  canAccessResource,
  explainAccessDecision,
} from './engine'

// Guards (server actions)
export {
  requireAuth,
  requireContext,
  requirePermission,
  requireResourceAccess,
  isError,
} from './guards'

// Repository (for entitlement management)
export {
  insertEntitlement,
  updateEntitlementStatus,
  getUserEntitlements,
} from './repository'
