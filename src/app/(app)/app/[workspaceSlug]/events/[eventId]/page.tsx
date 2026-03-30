import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getEvent, getMyRegistration, registerForEvent, cancelRegistration } from '@/modules/training/events/actions'
import { buildAccessContext, hasPermission, canAccessResource } from '@/modules/shared/access'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { Separator } from '@/components/shared/ui/separator'
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, REGISTRATION_STATUS_LABELS } from '@/modules/training/events/types'
import type { EventStatus, EventType, RegistrationStatus } from '@/modules/training/events/types'
import { ArrowLeft, Calendar, Clock, MapPin, Video, Users, Play, ExternalLink, Lock } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700 animate-pulse', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500 line-through',
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; eventId: string }>
}) {
  const { workspaceSlug, eventId } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')
  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const event = await getEvent(eventId)
  if (!event) notFound()

  // Access check for product-linked events
  if (event.product_id) {
    const access = await canAccessResource(member.user_id, workspace.id, 'product', event.product_id)
    if (!access.granted) {
      return (
        <div className="max-w-lg mx-auto text-center py-16">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Wydarzenie premium</h1>
          <p className="text-muted-foreground mb-4">{access.reason}</p>
          <Link href={`/app/${workspaceSlug}/events`} className="text-sm text-primary hover:underline">Powrot do wydarzen</Link>
        </div>
      )
    }
  }

  const registration = await getMyRegistration(eventId, member.user_id)
  const regCount = event.event_registrations?.[0]?.count || 0
  const ctx = await buildAccessContext(workspace.id, member.user_id)
  const canEdit = ctx && hasPermission(ctx, 'event.edit')

  const isPast = new Date(event.starts_at) < new Date()
  const isRegistered = registration?.status === 'registered' || registration?.status === 'attended'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={`/app/${workspaceSlug}/events`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Wydarzenia
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className={STATUS_COLORS[event.status] || ''}>{EVENT_STATUS_LABELS[event.status as EventStatus]}</Badge>
          <Badge variant="outline">{EVENT_TYPE_LABELS[event.type as EventType]}</Badge>
          {event.is_free && <Badge className="bg-green-100 text-green-700 text-xs">Darmowe</Badge>}
        </div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        {event.description && <p className="text-muted-foreground mt-2">{event.description}</p>}
      </div>

      {/* Meta */}
      <div className="bg-card border rounded-lg p-4 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{new Date(event.starts_at).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(event.starts_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
              {event.ends_at && ` - ${new Date(event.ends_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {event.meeting_url ? (
            <>
              <Video className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Online</p>
                {isRegistered && (
                  <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    Dolacz do spotkania <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </>
          ) : (
            <>
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{event.location || 'Stacjonarnie'}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{regCount} zarejestrowanych</p>
            {event.capacity && <p className="text-sm text-muted-foreground">Limit: {event.capacity} miejsc</p>}
          </div>
        </div>

        {event.host?.display_name && (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {event.host.display_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Host</p>
              <p className="font-medium">{event.host.display_name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Registration action */}
      {!isPast && event.status !== 'cancelled' && (
        <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
          {isRegistered ? (
            <>
              <div>
                <p className="font-medium text-green-600">Jestes zarejestrowany</p>
                {registration && <p className="text-xs text-muted-foreground">Status: {REGISTRATION_STATUS_LABELS[registration.status as RegistrationStatus]}</p>}
              </div>
              <form action={async () => { 'use server'; await cancelRegistration(workspace.id, eventId, member.user_id) }}>
                <Button variant="outline" size="sm" type="submit">Wypisz sie</Button>
              </form>
            </>
          ) : registration?.status === 'waitlisted' ? (
            <div>
              <p className="font-medium text-amber-600">Na liscie rezerwowej</p>
              <p className="text-xs text-muted-foreground">Otrzymasz powiadomienie gdy zwolni sie miejsce</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">
                {event.capacity ? `${event.capacity - regCount} wolnych miejsc` : 'Otwarta rejestracja'}
              </p>
              <form action={async () => { 'use server'; await registerForEvent(workspace.id, eventId, member.user_id) }}>
                <Button type="submit">Zarejestruj sie</Button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Replay */}
      {event.replay_url && (
        <>
          <Separator />
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Play className="h-4 w-4" /> Nagranie
            </h3>
            {event.replay_url.includes('youtube.com') || event.replay_url.includes('youtu.be') ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe src={event.replay_url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen />
              </div>
            ) : (
              <a href={event.replay_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                Otworz nagranie <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}
