'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission, requireContext } from '@/modules/shared/access'
import { canAccessResource } from '@/modules/shared/access'
import { createEventSchema } from './schemas'
import {
  findEvents, findUpcomingEvents, findEventById,
  insertEvent, updateEventById, softDeleteEvent,
  findRegistrationsByEvent, findUserRegistration,
  upsertRegistration, markAttendance,
} from './repository'
import type { EventWithHost } from './types'

// =============================================
// Events CRUD
// =============================================

export async function getEvents(workspaceId: string) {
  return findEvents(workspaceId)
}

export async function getUpcomingEvents(workspaceId: string, limit = 5) {
  return findUpcomingEvents(workspaceId, limit)
}

/**
 * Get events visible to user (respects product entitlements).
 * - Events without product_id: visible to all members
 * - Events with product_id: only if user has entitlement
 */
export async function getAccessibleEvents(workspaceId: string, userId: string) {
  const allEvents = await findEvents(workspaceId)
  const accessible: EventWithHost[] = []

  for (const event of allEvents) {
    if (!event.product_id) {
      accessible.push(event)
      continue
    }
    const access = await canAccessResource(userId, workspaceId, 'product', event.product_id)
    if (access.granted) accessible.push(event)
  }
  return accessible
}

export async function getEvent(eventId: string) {
  return findEventById(eventId)
}

export async function createEvent(workspaceId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'event.create')
  if ('error' in auth) return { error: auth.error }

  const parsed = createEventSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    type: formData.get('type') || 'webinar',
    starts_at: formData.get('starts_at'),
    ends_at: formData.get('ends_at') || undefined,
    is_online: formData.get('is_online') === 'true',
    location: formData.get('location') || undefined,
    meeting_url: formData.get('meeting_url') || undefined,
    capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : undefined,
    product_id: formData.get('product_id') || null,
    host_id: formData.get('host_id') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await insertEvent(workspaceId, auth.user.id, parsed.data)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

export async function updateEvent(workspaceId: string, eventId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'event.edit')
  if ('error' in auth) return { error: auth.error }

  const updates: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key === 'capacity') updates[key] = value ? parseInt(value as string) : null
    else if (key === 'is_free') updates[key] = value === 'true'
    else updates[key] = value || null
  }

  const { error } = await updateEventById(eventId, updates)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function cancelEvent(workspaceId: string, eventId: string) {
  const auth = await requirePermission(workspaceId, 'event.edit')
  if ('error' in auth) return { error: auth.error }
  await updateEventById(eventId, { status: 'cancelled' })
  revalidatePath('/app')
  return { success: true }
}

export async function completeEvent(workspaceId: string, eventId: string) {
  const auth = await requirePermission(workspaceId, 'event.edit')
  if ('error' in auth) return { error: auth.error }
  await updateEventById(eventId, { status: 'completed' })
  revalidatePath('/app')
  return { success: true }
}

export async function setReplayUrl(workspaceId: string, eventId: string, replayUrl: string) {
  const auth = await requirePermission(workspaceId, 'event.edit')
  if ('error' in auth) return { error: auth.error }
  await updateEventById(eventId, { replay_url: replayUrl })
  revalidatePath('/app')
  return { success: true }
}

export async function deleteEvent(workspaceId: string, eventId: string) {
  const auth = await requirePermission(workspaceId, 'event.edit')
  if ('error' in auth) return { error: auth.error }
  await softDeleteEvent(eventId)
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Registration
// =============================================

export async function getRegistrations(eventId: string) {
  return findRegistrationsByEvent(eventId)
}

export async function getMyRegistration(eventId: string, userId: string) {
  return findUserRegistration(eventId, userId)
}

export async function registerForEvent(workspaceId: string, eventId: string, userId: string) {
  const auth = await requirePermission(workspaceId, 'event.register')
  if ('error' in auth) return { error: auth.error }

  // Check capacity
  const event = await findEventById(eventId)
  if (!event) return { error: 'Wydarzenie nie istnieje' }
  if (event.status === 'cancelled') return { error: 'Wydarzenie zostalo odwolane' }
  if (event.status === 'completed') return { error: 'Wydarzenie juz sie odbylo' }

  if (event.capacity) {
    const registrations = await findRegistrationsByEvent(eventId)
    const activeCount = registrations.filter(r => r.status === 'registered' || r.status === 'attended').length
    if (activeCount >= event.capacity) {
      const { error } = await upsertRegistration({ event_id: eventId, user_id: userId, workspace_id: workspaceId, status: 'waitlisted' })
      if (error) return { error: error.message }
      revalidatePath('/app')
      return { status: 'waitlisted' }
    }
  }

  const { error } = await upsertRegistration({ event_id: eventId, user_id: userId, workspace_id: workspaceId, status: 'registered' })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { status: 'registered' }
}

export async function cancelRegistration(workspaceId: string, eventId: string, userId: string) {
  const { error } = await upsertRegistration({ event_id: eventId, user_id: userId, workspace_id: workspaceId, status: 'cancelled' })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function recordAttendance(workspaceId: string, eventId: string, userId: string) {
  const auth = await requirePermission(workspaceId, 'event.edit')
  if ('error' in auth) return { error: auth.error }
  await markAttendance(eventId, userId)
  revalidatePath('/app')
  return { success: true }
}
