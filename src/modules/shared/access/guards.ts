import { getCurrentUser } from '@/modules/shared/auth/actions'
import { buildAccessContext, hasPermission, canAccessResource } from './engine'
import type { Permission, ResourceType, UserAccessContext, AccessDecision } from './types'

// =============================================
// Server-side guards for actions / route handlers
// Pattern: call at top of server action, bail if denied
// =============================================

/**
 * Get authenticated user or throw.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Nie zalogowano' } as const
  }
  return { user } as const
}

/**
 * Get access context or return error.
 * Use at top of server actions that need role/permission checks.
 *
 * Example:
 *   const auth = await requireContext(workspaceId)
 *   if ('error' in auth) return auth
 *   if (!hasPermission(auth.ctx, 'product.create')) return { error: 'Brak uprawnien' }
 */
export async function requireContext(workspaceId: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Nie zalogowano' } as const
  }

  const ctx = await buildAccessContext(workspaceId, user.id)
  if (!ctx) {
    return { error: 'Nie jestes czlonkiem tego workspace' } as const
  }

  return { user, ctx } as const
}

/**
 * Require a specific permission. Returns error or context.
 *
 * Example:
 *   const auth = await requirePermission(workspaceId, 'product.create')
 *   if ('error' in auth) return auth
 */
export async function requirePermission(workspaceId: string, permission: Permission) {
  const result = await requireContext(workspaceId)
  if ('error' in result) return result

  if (!hasPermission(result.ctx, permission)) {
    return { error: `Brak uprawnienia: ${permission}` } as const
  }

  return result
}

/**
 * Require access to a specific resource (role + entitlement check).
 *
 * Example:
 *   const auth = await requireResourceAccess(workspaceId, 'lesson', lessonId)
 *   if ('error' in auth) return auth
 */
export async function requireResourceAccess(
  workspaceId: string,
  resourceType: ResourceType,
  resourceId: string
) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: 'Nie zalogowano' } as const
  }

  const decision = await canAccessResource(user.id, workspaceId, resourceType, resourceId)
  if (!decision.granted) {
    return { error: decision.reason } as const
  }

  const ctx = await buildAccessContext(workspaceId, user.id)

  return { user, ctx: ctx!, decision } as const
}

// =============================================
// Type guard helper
// =============================================

export function isError(result: { error: string } | Record<string, unknown>): result is { error: string } {
  return 'error' in result && typeof (result as { error: unknown }).error === 'string'
}
