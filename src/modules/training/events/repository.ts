import { createClient } from '@/lib/shared/supabase/server'
import type { EventWithHost, EventRegistration } from './types'

// =============================================
// Events
// =============================================

export async function findEvents(workspaceId: string): Promise<EventWithHost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('events')
    .select(`*, host:workspace_members!host_id (id, display_name, avatar_url), event_registrations (count)`)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('starts_at', { ascending: true })
  return (data as EventWithHost[]) || []
}

export async function findUpcomingEvents(workspaceId: string, limit: number): Promise<EventWithHost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('events')
    .select(`*, host:workspace_members!host_id (id, display_name, avatar_url), event_registrations (count)`)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .gte('starts_at', new Date().toISOString())
    .in('status', ['scheduled', 'live'])
    .order('starts_at', { ascending: true })
    .limit(limit)
  return (data as EventWithHost[]) || []
}

export async function findEventById(eventId: string): Promise<EventWithHost | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('events')
    .select(`*, host:workspace_members!host_id (id, display_name, avatar_url), event_registrations (count)`)
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()
  return data as EventWithHost | null
}

export async function insertEvent(workspaceId: string, createdBy: string, input: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('events').insert({ workspace_id: workspaceId, created_by: createdBy, status: 'scheduled', ...input }).select().single()
}

export async function updateEventById(eventId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('events').update(updates).eq('id', eventId)
}

export async function softDeleteEvent(eventId: string) {
  const supabase = await createClient()
  return supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', eventId)
}

// =============================================
// Registrations
// =============================================

export async function findRegistrationsByEvent(eventId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_registrations')
    .select(`*, user:workspace_members!inner(id, display_name, avatar_url)`)
    .eq('event_id', eventId)
    .order('registered_at', { ascending: true })
  return data || []
}

export async function findUserRegistration(eventId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()
  return data as EventRegistration | null
}

export async function upsertRegistration(input: {
  event_id: string
  user_id: string
  workspace_id: string
  status: string
}) {
  const supabase = await createClient()
  return supabase.from('event_registrations').upsert(input, { onConflict: 'event_id,user_id' })
}

export async function markAttendance(eventId: string, userId: string) {
  const supabase = await createClient()
  return supabase
    .from('event_registrations')
    .update({ status: 'attended', attended_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', userId)
}
