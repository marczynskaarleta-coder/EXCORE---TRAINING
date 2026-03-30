'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Switch } from '@/components/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs'
import { Separator } from '@/components/shared/ui/separator'
import { enableTemplate, toggleRule, removeRule } from '@/modules/training/automations/actions'
import { TRIGGER_LABELS, ACTION_LABELS } from '@/modules/training/automations/types'
import type { AutomationTrigger, AutomationAction, AutomationRule, AutomationExecution } from '@/modules/training/automations/types'
import { Zap, Mail, Bell, Key, Tag, UserCheck, Trash2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'

const ACTION_ICONS: Record<string, typeof Mail> = {
  send_email: Mail,
  create_notification: Bell,
  grant_entitlement: Key,
  add_tag: Tag,
  mark_lifecycle_stage: UserCheck,
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
  pending: { icon: Clock, color: 'text-amber-500' },
  running: { icon: RefreshCw, color: 'text-blue-500' },
  skipped: { icon: XCircle, color: 'text-gray-400' },
}

interface Props {
  workspaceId: string
  rules: AutomationRule[]
  templates: Array<{
    id: string; name: string; description: string; trigger: string; action: string;
    category: string; is_enabled: boolean; delay_minutes: number;
  }>
  recentExecutions: AutomationExecution[]
}

export function AutomationsManager({ workspaceId, rules, templates, recentExecutions }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const categories = ['onboarding', 'engagement', 'completion', 'retention']
  const categoryLabels: Record<string, string> = {
    onboarding: 'Onboarding', engagement: 'Zaangazowanie',
    completion: 'Ukonczenie', retention: 'Retencja',
  }

  async function handleEnableTemplate(templateId: string) {
    setLoading(templateId)
    await enableTemplate(workspaceId, templateId)
    router.refresh()
    setLoading(null)
  }

  async function handleToggle(ruleId: string, enabled: boolean) {
    setLoading(ruleId)
    await toggleRule(workspaceId, ruleId, enabled)
    router.refresh()
    setLoading(null)
  }

  async function handleDelete(ruleId: string) {
    if (!confirm('Usunac ta regule?')) return
    await removeRule(workspaceId, ruleId)
    router.refresh()
  }

  return (
    <Tabs defaultValue="templates">
      <TabsList>
        <TabsTrigger value="templates">Szablony ({templates.length})</TabsTrigger>
        <TabsTrigger value="active">Aktywne reguly ({rules.filter(r => r.is_enabled).length})</TabsTrigger>
        <TabsTrigger value="logs">Ostatnie wykonania ({recentExecutions.length})</TabsTrigger>
      </TabsList>

      {/* Templates */}
      <TabsContent value="templates" className="mt-6 space-y-6">
        {categories.map(cat => {
          const catTemplates = templates.filter(t => t.category === cat)
          if (catTemplates.length === 0) return null
          return (
            <div key={cat}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">{categoryLabels[cat]}</h3>
              <div className="space-y-2">
                {catTemplates.map(t => {
                  const ActionIcon = ACTION_ICONS[t.action] || Zap
                  return (
                    <div key={t.id} className="bg-card border rounded-lg p-4 flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ActionIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{TRIGGER_LABELS[t.trigger as AutomationTrigger] || t.trigger}</Badge>
                          <span className="text-xs text-muted-foreground">{'-->'}</span>
                          <Badge variant="outline" className="text-xs">{ACTION_LABELS[t.action as AutomationAction]}</Badge>
                          {t.delay_minutes > 0 && (
                            <span className="text-xs text-muted-foreground">+{t.delay_minutes}min</span>
                          )}
                        </div>
                      </div>
                      {t.is_enabled ? (
                        <Badge className="bg-green-100 text-green-700">Wlaczony</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEnableTemplate(t.id)} disabled={loading === t.id}>
                          {loading === t.id ? 'Wlaczanie...' : 'Wlacz'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </TabsContent>

      {/* Active rules */}
      <TabsContent value="active" className="mt-6">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-2" />
            <p>Brak aktywnych regul. Wlacz szablony w zakladce Szablony.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => {
              const ActionIcon = ACTION_ICONS[rule.action] || Zap
              return (
                <div key={rule.id} className="bg-card border rounded-lg p-4 flex items-center gap-4">
                  <ActionIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rule.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{TRIGGER_LABELS[rule.trigger]}{' -> '}{ACTION_LABELS[rule.action]}</span>
                      <span>Wykonan: {rule.run_count}x</span>
                      {rule.last_run_at && (
                        <span>Ostatnio: {new Date(rule.last_run_at).toLocaleDateString('pl-PL')}</span>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={rule.is_enabled}
                    onCheckedChange={(v) => handleToggle(rule.id, !!v)}
                  />
                  <Button size="icon-xs" variant="ghost" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </TabsContent>

      {/* Execution logs */}
      <TabsContent value="logs" className="mt-6">
        {recentExecutions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Brak wykonan</p>
        ) : (
          <div className="bg-card border rounded-lg divide-y">
            {recentExecutions.map(exec => {
              const statusCfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending
              const StatusIcon = statusCfg.icon
              return (
                <div key={exec.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <StatusIcon className={`h-4 w-4 ${statusCfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{ACTION_LABELS[exec.action]}</span>
                    <span className="text-muted-foreground ml-2">{TRIGGER_LABELS[exec.trigger_event]}</span>
                  </div>
                  {exec.error && <span className="text-xs text-red-500 truncate max-w-40">{exec.error}</span>}
                  {exec.retry_count > 0 && <Badge variant="outline" className="text-xs">retry {exec.retry_count}</Badge>}
                  <time className="text-xs text-muted-foreground">
                    {new Date(exec.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              )
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
