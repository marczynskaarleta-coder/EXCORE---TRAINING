export type SystemRole = 'super_admin' | 'workspace_admin' | 'member'

export type BusinessRole =
  | 'participant'
  | 'mentor'
  | 'coach'
  | 'cohort_lead'
  | 'trainer'
  | 'moderator'
  | 'corporate_client_admin'

export interface PermissionMatrix {
  can_view_community: boolean
  can_manage_community: boolean
  can_view_learning: boolean
  can_manage_learning: boolean
  can_view_events: boolean
  can_manage_events: boolean
  can_view_resources: boolean
  can_manage_resources: boolean
  can_view_messaging: boolean
  can_manage_billing: boolean
  can_view_analytics: boolean
  can_manage_members: boolean
  can_manage_roles: boolean
  can_manage_settings: boolean
}

export function isAdmin(systemRole: SystemRole): boolean {
  return systemRole === 'super_admin' || systemRole === 'workspace_admin'
}

export function canManageModule(
  systemRole: SystemRole,
  permissions: Partial<PermissionMatrix>,
  module: string
): boolean {
  if (isAdmin(systemRole)) return true
  const key = `can_manage_${module}` as keyof PermissionMatrix
  return permissions[key] === true
}

export function canViewModule(
  systemRole: SystemRole,
  permissions: Partial<PermissionMatrix>,
  module: string
): boolean {
  if (isAdmin(systemRole)) return true
  const key = `can_view_${module}` as keyof PermissionMatrix
  return permissions[key] !== false // default true
}

// Default role templates
export const ROLE_TEMPLATES = {
  trainer: {
    name: 'Trener',
    slug: 'trainer',
    color: '#8b5cf6',
    can_view_community: true,
    can_manage_community: true,
    can_view_learning: true,
    can_manage_learning: true,
    can_view_events: true,
    can_manage_events: true,
    can_view_resources: true,
    can_manage_resources: true,
    can_view_messaging: true,
    can_manage_billing: false,
    can_view_analytics: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_manage_settings: false,
  },
  moderator: {
    name: 'Moderator',
    slug: 'moderator',
    color: '#f59e0b',
    can_view_community: true,
    can_manage_community: true,
    can_view_learning: true,
    can_manage_learning: false,
    can_view_events: true,
    can_manage_events: false,
    can_view_resources: true,
    can_manage_resources: false,
    can_view_messaging: true,
    can_manage_billing: false,
    can_view_analytics: false,
    can_manage_members: false,
    can_manage_roles: false,
    can_manage_settings: false,
  },
  participant: {
    name: 'Uczestnik',
    slug: 'participant',
    color: '#10b981',
    is_default: true,
    can_view_community: true,
    can_manage_community: false,
    can_view_learning: true,
    can_manage_learning: false,
    can_view_events: true,
    can_manage_events: false,
    can_view_resources: true,
    can_manage_resources: false,
    can_view_messaging: true,
    can_manage_billing: false,
    can_view_analytics: false,
    can_manage_members: false,
    can_manage_roles: false,
    can_manage_settings: false,
  },
} as const
