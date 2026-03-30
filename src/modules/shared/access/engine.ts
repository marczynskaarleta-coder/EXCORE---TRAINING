import type {
  PlatformRole,
  Permission,
  ResourceType,
  AccessDecision,
  UserAccessContext,
  CachedEntitlement,
} from './types'
import { roleHasPermission, resolvePlatformRole, getPermissionsForRole } from './roles'
import {
  getUserMembership,
  getUserEntitlements,
  findEntitlement,
  resolveLessonProduct,
  getProductVisibility,
} from './repository'

// =============================================
// ACCESS ENGINE - Jeden punkt prawdy
// Kazdy check przechodzi: rola -> entitlement -> resource rules
// =============================================

/**
 * Build full access context for a user in a workspace.
 * Call once per request (e.g. in layout), pass down to components.
 */
export async function buildAccessContext(
  workspaceId: string,
  userId: string
): Promise<UserAccessContext | null> {
  const membership = await getUserMembership(workspaceId, userId)
  if (!membership) return null

  const role = resolvePlatformRole(membership.system_role, membership.custom_role_slug)
  const permissions = Array.from(getPermissionsForRole(role))
  const entitlements = await getUserEntitlements(workspaceId, userId)

  return {
    user_id: userId,
    workspace_id: workspaceId,
    role,
    permissions,
    entitlements,
  }
}

/**
 * Check if user has a specific permission (role-based).
 * Use for UI elements: buttons, nav items, form visibility.
 */
export function hasPermission(ctx: UserAccessContext, permission: Permission): boolean {
  return ctx.permissions.includes(permission)
}

/**
 * Check if user can access a specific resource (role + entitlement).
 * Use for content access: lessons, products, events.
 *
 * Decision order:
 * 1. Role check (admin/trainer always have access)
 * 2. Entitlement check (enrollment, manual grant, bundle)
 * 3. Resource-specific rules (free preview, public visibility)
 */
export async function canAccessResource(
  userId: string,
  workspaceId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<AccessDecision> {
  const checks: string[] = []

  // 1. Get membership + role
  const membership = await getUserMembership(workspaceId, userId)
  if (!membership) {
    return denied('Nie jestes czlonkiem tego workspace', checks)
  }

  const role = resolvePlatformRole(membership.system_role, membership.custom_role_slug)
  checks.push(`role=${role}`)

  // 2. Role-based bypass (admin+ sees everything)
  const viewPermission = `${resourceType}.view` as Permission
  if (roleHasPermission(role, viewPermission) && isManagementRole(role)) {
    checks.push('role_bypass: management role has view access')
    return granted('role', `Rola ${role} daje pelny dostep`, role, checks)
  }

  // 3. Lesson special case: resolve to product + check free preview
  if (resourceType === 'lesson') {
    return checkLessonAccess(userId, resourceId, role, checks)
  }

  // 4. Product visibility check
  if (resourceType === 'product') {
    const vis = await getProductVisibility(resourceId)
    checks.push(`product_visibility=${vis?.visibility}`)

    if (!vis || vis.status !== 'published') {
      // Only management roles can see unpublished
      if (isManagementRole(role)) {
        return granted('role', 'Rola zarzadzajaca widzi nieopublikowane', role, checks)
      }
      return denied('Produkt nie jest opublikowany', checks)
    }

    if (vis.visibility === 'public') {
      checks.push('public_access: product is public')
      return granted('public', 'Produkt jest publiczny', role, checks)
    }
  }

  // 5. Entitlement check
  const entitlement = await findEntitlement(userId, resourceType, resourceId)
  checks.push(`entitlement=${entitlement ? 'found' : 'none'}`)

  if (entitlement) {
    // Check expiry
    if (entitlement.active_until && new Date(entitlement.active_until) < new Date()) {
      checks.push('entitlement_expired')
      return denied('Dostep wygasl', checks, entitlement.id, entitlement.active_until)
    }

    return granted('entitlement', `Dostep z: ${entitlement.source_type}`, role, checks, entitlement.id, entitlement.active_until)
  }

  // 6. For products with 'members' visibility, all workspace members can browse catalog
  if (resourceType === 'product') {
    const vis = await getProductVisibility(resourceId)
    if (vis?.visibility === 'members') {
      checks.push('catalog_browse: members can see product listing')
      return granted('role', 'Czlonek workspace widzi katalog', role, checks)
    }
  }

  return denied('Brak dostepu - zapisz sie lub skontaktuj z adminem', checks)
}

/**
 * Special handler for lesson access.
 * Chain: lesson -> module -> program -> product -> entitlement
 */
async function checkLessonAccess(
  userId: string,
  lessonId: string,
  role: PlatformRole,
  checks: string[]
): Promise<AccessDecision> {
  const resolved = await resolveLessonProduct(lessonId)

  if (!resolved) {
    checks.push('lesson_not_found')
    return denied('Lekcja nie istnieje', checks)
  }

  if (!resolved.is_published && !isManagementRole(role)) {
    checks.push('lesson_not_published')
    return denied('Lekcja nie jest opublikowana', checks)
  }

  if (resolved.is_free_preview) {
    checks.push('free_preview')
    return granted('free_preview', 'Lekcja jest darmowym podgladem', role, checks)
  }

  if (!resolved.product_id) {
    checks.push('no_product_id')
    return denied('Nie mozna ustalic produktu', checks)
  }

  // Check entitlement for the parent product
  checks.push(`resolving_product=${resolved.product_id}`)
  const entitlement = await findEntitlement(userId, 'product', resolved.product_id)

  if (entitlement) {
    if (entitlement.active_until && new Date(entitlement.active_until) < new Date()) {
      checks.push('product_entitlement_expired')
      return denied('Dostep do kursu wygasl', checks, entitlement.id, entitlement.active_until)
    }

    checks.push('product_entitlement_valid')
    return granted('entitlement', `Dostep przez enrollment`, role, checks, entitlement.id, entitlement.active_until)
  }

  checks.push('no_product_entitlement')
  return denied('Zapisz sie na kurs aby uzyskac dostep', checks)
}

/**
 * Full explanation of access decision (for admin panel / debugging).
 */
export async function explainAccessDecision(
  userId: string,
  workspaceId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<{
  decision: AccessDecision
  context: {
    role: PlatformRole | null
    permissions: Permission[]
    entitlements: CachedEntitlement[]
  }
}> {
  const decision = await canAccessResource(userId, workspaceId, resourceType, resourceId)
  const ctx = await buildAccessContext(workspaceId, userId)

  return {
    decision,
    context: {
      role: ctx?.role ?? null,
      permissions: ctx?.permissions ?? [],
      entitlements: ctx?.entitlements ?? [],
    },
  }
}

// --- HELPERS ---

function isManagementRole(role: PlatformRole): boolean {
  return ['owner', 'admin', 'manager', 'trainer'].includes(role)
}

function granted(
  source: AccessDecision['source'],
  reason: string,
  role: PlatformRole | null,
  checks: string[],
  entitlementId?: string | null,
  expiresAt?: string | null
): AccessDecision {
  return {
    granted: true,
    source,
    reason,
    entitlement_id: entitlementId ?? null,
    expires_at: expiresAt ?? null,
    role,
    checks_performed: checks,
  }
}

function denied(
  reason: string,
  checks: string[],
  entitlementId?: string | null,
  expiresAt?: string | null
): AccessDecision {
  return {
    granted: false,
    source: 'denied',
    reason,
    entitlement_id: entitlementId ?? null,
    expires_at: expiresAt ?? null,
    role: null,
    checks_performed: checks,
  }
}
