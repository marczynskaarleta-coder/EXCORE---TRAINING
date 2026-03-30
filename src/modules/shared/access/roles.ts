import type { PlatformRole, Permission } from './types'
import { ROLE_HIERARCHY } from './types'

// =============================================
// Permission matrix: rola -> set of permissions
// Kazda rola dziedziczy permissions z nizszych rol
// =============================================

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  member: [
    'product.view',
    'program.view',
    'lesson.view',
    'enrollment.view_own',
    'event.view',
    'event.register',
    'community.view',
    'community.post',
    'resource.view',
    'certificate.view_own',
    'members.view',
  ],

  corporate_client_admin: [
    // member permissions + ...
    'enrollment.view_all',
    'enrollment.create',     // moze zapisywac swoich ludzi
    'enrollment.cancel',
    'analytics.view',        // widzi statystyki swojej grupy
  ],

  moderator: [
    // member permissions + ...
    'community.moderate',
    'community.manage_spaces',
  ],

  trainer: [
    // member permissions + ...
    'product.create',
    'product.edit',
    'product.publish',
    'program.create',
    'program.edit',
    'lesson.create',
    'lesson.edit',
    'lesson.grade',
    'event.create',
    'event.edit',
    'resource.create',
    'resource.edit',
    'certificate.issue',
    'enrollment.view_all',
    'analytics.view',
  ],

  manager: [
    // trainer permissions + ...
    'product.delete',
    'enrollment.create',
    'enrollment.cancel',
    'certificate.manage_templates',
    'members.invite',
    'members.manage',
    'analytics.export',
  ],

  admin: [
    // manager permissions + ...
    'roles.manage',
    'settings.manage',
    'billing.manage',
  ],

  owner: [
    // admin permissions (identical, but owner cannot be removed)
  ],
}

/**
 * Resolve effective permissions for a role (with inheritance).
 * Higher roles inherit all permissions from lower roles.
 */
export function getPermissionsForRole(role: PlatformRole): Set<Permission> {
  const permissions = new Set<Permission>()
  const roleLevel = ROLE_HIERARCHY[role]

  // Collect permissions from this role and all lower roles
  for (const [r, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const rLevel = ROLE_HIERARCHY[r as PlatformRole]
    if (rLevel <= roleLevel) {
      for (const p of perms) {
        permissions.add(p)
      }
    }
  }

  return permissions
}

/**
 * Check if role has a specific permission.
 */
export function roleHasPermission(role: PlatformRole, permission: Permission): boolean {
  return getPermissionsForRole(role).has(permission)
}

/**
 * Check if roleA >= roleB in hierarchy.
 */
export function isRoleAtLeast(role: PlatformRole, minimumRole: PlatformRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Map system_role (from DB) to PlatformRole.
 * system_role is simpler (super_admin, workspace_admin, member).
 * We enrich it with custom role slug if available.
 */
export function resolvePlatformRole(
  systemRole: string,
  customRoleSlug?: string | null
): PlatformRole {
  // System role overrides
  if (systemRole === 'super_admin') return 'owner'
  if (systemRole === 'workspace_admin') return 'admin'

  // Custom role mapping
  if (customRoleSlug) {
    const mapping: Record<string, PlatformRole> = {
      owner: 'owner',
      admin: 'admin',
      manager: 'manager',
      trainer: 'trainer',
      moderator: 'moderator',
      corporate_client_admin: 'corporate_client_admin',
      participant: 'member',
    }
    if (mapping[customRoleSlug]) return mapping[customRoleSlug]
  }

  return 'member'
}

// Default role templates for workspace creation
export const ROLE_TEMPLATES = {
  trainer: {
    name: 'Trener',
    slug: 'trainer',
    color: '#8b5cf6',
  },
  moderator: {
    name: 'Moderator',
    slug: 'moderator',
    color: '#f59e0b',
  },
  manager: {
    name: 'Manager',
    slug: 'manager',
    color: '#3b82f6',
  },
  corporate_client_admin: {
    name: 'Admin klienta B2B',
    slug: 'corporate_client_admin',
    color: '#ef4444',
  },
  participant: {
    name: 'Uczestnik',
    slug: 'participant',
    color: '#10b981',
    is_default: true,
  },
} as const
