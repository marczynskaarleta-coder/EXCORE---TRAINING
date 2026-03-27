'use server'

import { createClient } from '@/lib/supabase/server'

export async function getNotifications(memberId: string, limit: number = 50) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:workspace_members!actor_id (id, display_name, avatar_url)
    `)
    .eq('recipient_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

export async function getUnreadCount(memberId: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', memberId)
    .eq('is_read', false)

  return count || 0
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
}

export async function markAllAsRead(memberId: string) {
  const supabase = await createClient()

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', memberId)
    .eq('is_read', false)
}

export async function createNotification(params: {
  workspaceId: string
  recipientId: string
  type: string
  title: string
  body?: string
  link?: string
  actorId?: string
  referenceType?: string
  referenceId?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .insert({
      workspace_id: params.workspaceId,
      recipient_id: params.recipientId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      actor_id: params.actorId,
      reference_type: params.referenceType,
      reference_id: params.referenceId,
    })

  if (error) return { error: error.message }
  return { success: true }
}
