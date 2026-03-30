import { createClient } from '@/lib/shared/supabase/server'
import type { EnrollmentWithProduct } from './types'

export async function findEnrollmentsByUser(
  workspaceId: string,
  userId: string
): Promise<EnrollmentWithProduct[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select(`
      *,
      products (id, name, slug, type, cover_image_url)
    `)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  return (data as EnrollmentWithProduct[]) || []
}

export async function findEnrollmentsByProduct(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select('*')
    .eq('product_id', productId)
    .order('started_at', { ascending: false })

  return data || []
}

export async function findEnrollment(productId: string, userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .single()

  return data
}

export async function insertEnrollment(input: {
  product_id: string
  workspace_id: string
  user_id: string
  source?: string
  plan_id?: string
}) {
  const supabase = await createClient()

  return supabase
    .from('enrollments')
    .insert({
      source: 'manual',
      ...input,
    })
    .select()
    .single()
}

export async function updateEnrollmentById(enrollmentId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()

  return supabase
    .from('enrollments')
    .update(updates)
    .eq('id', enrollmentId)
}
