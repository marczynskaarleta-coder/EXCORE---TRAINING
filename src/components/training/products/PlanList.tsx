'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Switch } from '@/components/shared/ui/switch'
import { PlanForm } from './PlanForm'
import { createPlan, togglePlanActive, deletePlan } from '@/modules/training/products/actions'
import { BILLING_TYPE_LABELS, BILLING_INTERVAL_LABELS } from '@/modules/training/plans/types'
import { formatPrice } from '@/modules/training/products/types'
import type { BillingType, BillingInterval } from '@/modules/training/plans/types'
import { Plus, Trash2, CreditCard, Zap } from 'lucide-react'

interface Plan {
  id: string
  name: string
  billing_type: string
  price_amount: number
  currency: string
  interval: string | null
  trial_days: number
  is_active: boolean
  position: number
  metadata: Record<string, unknown>
  created_at: string
}

interface PlanListProps {
  workspaceId: string
  productId: string
  plans: Plan[]
  canEdit: boolean
}

export function PlanList({ workspaceId, productId, plans, canEdit }: PlanListProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  async function handleToggle(planId: string, current: boolean) {
    await togglePlanActive(workspaceId, planId, !current)
    router.refresh()
  }

  async function handleDelete(planId: string) {
    if (!confirm('Usunac ten plan cenowy?')) return
    await deletePlan(workspaceId, planId)
    router.refresh()
  }

  const activePlans = plans.filter(p => p.is_active)
  const hasStripeIds = plans.some(p => !!p.metadata?.stripe_price_id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Plany cenowe</h3>
          <p className="text-xs text-muted-foreground">
            {plans.length} planow ({activePlans.length} aktywnych)
            {hasStripeIds && (
              <span className="inline-flex items-center gap-1 ml-2 text-purple-600">
                <Zap className="h-3 w-3" /> Stripe
              </span>
            )}
          </p>
        </div>
        {canEdit && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj plan
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-muted/50 border rounded-lg p-4">
          <PlanForm
            workspaceId={workspaceId}
            productId={productId}
            onSubmit={createPlan}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {plans.length === 0 && !showForm ? (
        <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Brak planow cenowych</p>
          <p className="text-xs text-muted-foreground mt-1">Dodaj plan aby uzytkownicy mogli sie zapisac</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                plan.is_active ? 'bg-background' : 'bg-muted/30 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{plan.name}</p>
                    <Badge variant={plan.is_active ? 'default' : 'outline'} className="text-xs">
                      {plan.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {BILLING_TYPE_LABELS[plan.billing_type as BillingType]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    {plan.billing_type !== 'free' && (
                      <span className="font-medium text-foreground">
                        {formatPrice(plan.price_amount, plan.currency)}
                        {plan.interval && ` / ${BILLING_INTERVAL_LABELS[plan.interval as BillingInterval] || plan.interval}`}
                      </span>
                    )}
                    {plan.trial_days > 0 && <span>{plan.trial_days} dni trial</span>}
                    {!!plan.metadata?.stripe_price_id && (
                      <span className="text-purple-600 flex items-center gap-0.5">
                        <Zap className="h-3 w-3" /> Stripe
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-3 shrink-0">
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={() => handleToggle(plan.id, plan.is_active)}
                  />
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(plan.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
