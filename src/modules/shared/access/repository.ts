import { createClient } from '@/lib/shared/supabase/server'
import type { CachedEntitlement } from './types'

/**
 * Get user's workspace membership with role info.
 * Single query - cached by Next.js request dedup.
 */
export async function getUserMembership(workspaceId: string, userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('workspace_members')
    .select(`
      id,
      system_role,
      member_roles (
        roles (slug)
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!data) return null

  // Extract custom role slug (first assigned role)
  const memberRoles = data.member_roles as unknown as Array<{ roles: { slug: string } | { slug: string }[] | null }> | null
  const firstRole = memberRoles?.[0]?.roles
  const customRoleSlug = firstRole
    ? (Array.isArray(firstRole) ? firstRole[0]?.slug : firstRole.slug) ?? null
    : null

  return {
    member_id: data.id,
    system_role: data.system_role as string,
    custom_role_slug: customRoleSlug,
  }
}

/**
 * Get all active entitlements for a user in a workspace.
 * Single query - use for batch access checks.
 */
export async function getUserEntitlements(
  workspaceId: string,
  userId: string
): Promise<CachedEntitlement[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('entitlements')
    .select('id, resource_type, resource_id, source_type, active_until')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')

  return (data as CachedEntitlement[]) || []
}

/**
 * Check if a specific entitlement exists (single resource check).
 */
export async function findEntitlement(
  userId: string,
  resourceType: string,
  resourceId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('entitlements')
    .select('id, source_type, active_until, status')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('status', 'active')
    .single()

  return data
}

/**
 * Resolve lesson -> module -> program -> product chain.
 * Returns product_id for entitlement check.
 */
export async function resolveLessonProduct(lessonId: string) {
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('module_id, is_free_preview, is_published')
    .eq('id', lessonId)
    .single()

  if (!lesson) return null

  if (lesson.is_free_preview) {
    return { product_id: null, is_free_preview: true, is_published: lesson.is_published }
  }

  const { data: mod } = await supabase
    .from('program_modules')
    .select('program_id')
    .eq('id', lesson.module_id)
    .single()

  if (!mod) return null

  const { data: program } = await supabase
    .from('programs')
    .select('product_id')
    .eq('id', mod.program_id)
    .single()

  return {
    product_id: program?.product_id ?? null,
    is_free_preview: false,
    is_published: lesson.is_published,
  }
}

/**
 * Get product visibility.
 */
export async function getProductVisibility(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('visibility, status')
    .eq('id', productId)
    .is('deleted_at', null)
    .single()

  return data
}

/**
 * Insert entitlement row.
 */
export async function insertEntitlement(input: {
  workspace_id: string
  user_id: string
  resource_type: string
  resource_id: string
  source_type: string
  source_id: string
  active_until?: string | null
}) {
  const supabase = await createClient()

  return supabase
    .from('entitlements')
    .insert({ status: 'active', ...input })
    .select()
    .single()
}

/**
 * Revoke entitlement.
 */
export async function updateEntitlementStatus(entitlementId: string, status: string) {
  const supabase = await createClient()

  return supabase
    .from('entitlements')
    .update({ status })
    .eq('id', entitlementId)
}
