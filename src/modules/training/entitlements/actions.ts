'use server'

import { createClient } from '@/lib/shared/supabase/server'
import type { AccessCheck } from './types'

/**
 * Check if user has access to a specific resource via entitlements table.
 * Central access point - enrollment creates entitlements, this checks them.
 */
export async function checkAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  workspaceId: string
): Promise<AccessCheck> {
  const supabase = await createClient()

  // Admin bypass
  const { data: member } = await supabase
    .from('workspace_members')
    .select('system_role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (member?.system_role === 'workspace_admin' || member?.system_role === 'super_admin') {
    return { granted: true, entitlement_id: null, source: 'admin', expires_at: null, reason: null }
  }

  // Check entitlements
  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('status', 'active')
    .single()

  if (!entitlement) {
    return { granted: false, entitlement_id: null, source: null, expires_at: null, reason: 'Brak dostepu' }
  }

  // Check expiry
  if (entitlement.active_until && new Date(entitlement.active_until) < new Date()) {
    return { granted: false, entitlement_id: entitlement.id, source: entitlement.source_type, expires_at: entitlement.active_until, reason: 'Dostep wygasl' }
  }

  return { granted: true, entitlement_id: entitlement.id, source: entitlement.source_type, expires_at: entitlement.active_until, reason: null }
}

/**
 * Check lesson access (includes free preview)
 */
export async function checkLessonAccess(
  lessonId: string,
  userId: string,
  workspaceId: string
): Promise<AccessCheck> {
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('module_id, is_free_preview, is_published')
    .eq('id', lessonId)
    .single()

  if (!lesson) {
    return { granted: false, entitlement_id: null, source: null, expires_at: null, reason: 'Lekcja nie istnieje' }
  }

  if (!lesson.is_published) {
    return { granted: false, entitlement_id: null, source: null, expires_at: null, reason: 'Lekcja nie jest opublikowana' }
  }

  if (lesson.is_free_preview) {
    return { granted: true, entitlement_id: null, source: 'free_preview', expires_at: null, reason: null }
  }

  // Get program -> product chain
  const { data: mod } = await supabase
    .from('program_modules')
    .select('program_id, programs (product_id)')
    .eq('id', lesson.module_id)
    .single()

  const programs = mod?.programs as unknown as { product_id: string } | null
  const productId = programs?.product_id
  if (!productId) {
    return { granted: false, entitlement_id: null, source: null, expires_at: null, reason: 'Produkt nie znaleziony' }
  }

  return checkAccess(userId, 'product', productId, workspaceId)
}

/**
 * Grant entitlement (used by enrollment process)
 */
export async function grantEntitlement(input: {
  workspace_id: string
  user_id: string
  resource_type: string
  resource_id: string
  source_type: string
  source_id: string
  active_until?: string | null
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entitlements')
    .insert({
      status: 'active',
      ...input,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

/**
 * Revoke entitlement
 */
export async function revokeEntitlement(entitlementId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('entitlements')
    .update({ status: 'revoked' })
    .eq('id', entitlementId)

  if (error) return { error: error.message }
  return { success: true }
}
