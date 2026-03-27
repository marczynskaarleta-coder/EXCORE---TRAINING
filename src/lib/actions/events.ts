'use server'

import { createClient } from '@/lib/supabase/server'

export async function getEvents(workspaceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('events')
    .select(`
      *,
      host:workspace_members!host_id (id, display_name, avatar_url),
      event_rsvps (count)
    `)
    .eq('workspace_id', workspaceId)
    .order('starts_at', { ascending: true })

  return data || []
}

export async function getUpcomingEvents(workspaceId: string, limit: number = 5) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('events')
    .select(`
      *,
      host:workspace_members!host_id (id, display_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .gte('starts_at', new Date().toISOString())
    .in('status', ['scheduled', 'live'])
    .order('starts_at', { ascending: true })
    .limit(limit)

  return data || []
}

export async function createEvent(workspaceId: string, formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .insert({
      workspace_id: workspaceId,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as string || 'webinar',
      starts_at: formData.get('starts_at') as string,
      ends_at: formData.get('ends_at') as string,
      location_url: formData.get('location_url') as string,
      host_id: formData.get('host_id') as string,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function rsvpEvent(eventId: string, memberId: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('event_rsvps')
    .upsert({
      event_id: eventId,
      member_id: memberId,
      status,
    })

  if (error) return { error: error.message }
  return { success: true }
}
