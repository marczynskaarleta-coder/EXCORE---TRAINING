import { createClient } from '@/lib/shared/supabase/server'

export async function countWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient()

  return supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
}

export async function countPublishedProducts(workspaceId: string) {
  const supabase = await createClient()

  return supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
}

export async function findEnrollmentStats(workspaceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select('status, progress_percent')
    .eq('workspace_id', workspaceId)

  return data || []
}

export async function findProductEnrollmentStats(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select('status, progress_percent')
    .eq('product_id', productId)

  return data || []
}
