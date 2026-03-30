import { createClient } from '@/lib/shared/supabase/server'
import type { ResourceWithTags } from './types'

export async function findResources(workspaceId: string): Promise<ResourceWithTags[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('resources')
    .select(`
      *,
      resource_tags (tag_id, tags (name, color))
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (data as ResourceWithTags[]) || []
}

export async function findResourceById(resourceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('resources')
    .select(`
      *,
      resource_tags (tag_id, tags (name, color))
    `)
    .eq('id', resourceId)
    .single()

  return data
}

export async function insertResource(workspaceId: string, input: Record<string, unknown>) {
  const supabase = await createClient()

  return supabase
    .from('resources')
    .insert({ workspace_id: workspaceId, ...input })
    .select()
    .single()
}

export async function incrementDownloadCount(resourceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('resources')
    .select('download_count')
    .eq('id', resourceId)
    .single()

  if (data) {
    await supabase
      .from('resources')
      .update({ download_count: (data.download_count || 0) + 1 })
      .eq('id', resourceId)
  }
}
