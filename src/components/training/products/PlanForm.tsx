'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/shared/ui/select'
import { BILLING_TYPE_LABELS, BILLING_INTERVAL_LABELS } from '@/modules/training/plans/types'
import type { BillingType, BillingInterval } from '@/modules/training/plans/types'
import { AlertCircle } from 'lucide-react'

interface PlanFormProps {
  workspaceId: string
  productId: string
  onSubmit: (workspaceId: string, productId: string, formData: FormData) => Promise<{ error?: string; data?: unknown }>
  onClose: () => void
}

const BILLING_HINTS: Record<string, string> = {
  free: 'Bezplatny dostep. Uzytkownicy zapisuja sie bez platnosci.',
  one_time: 'Jednorazowa platnosc za pelny dostep.',
  subscription: 'Cykliczna platnosc. Dostep aktywny dopoki trwa subskrypcja.',
  custom: 'Niestandardowe warunki. Brak automatycznego checkout - kontakt z adminem.',
}

export function PlanForm({ workspaceId, productId, onSubmit, onClose }: PlanFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [billingType, setBillingType] = useState<string>('free')

  const showPrice = billingType === 'one_time' || billingType === 'subscription'
  const showInterval = billingType === 'subscription'
  const showTrial = billingType === 'subscription'

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    // Force price to 0 for free plans
    if (billingType === 'free') {
      formData.set('price_amount', '0')
    }

    const result = await onSubmit(workspaceId, productId, formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
    setLoading(false)
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plan_name">Nazwa planu</Label>
          <Input id="plan_name" name="name" placeholder="np. Podstawowy, Premium" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_type">Typ platnosci</Label>
          <Select name="billing_type" defaultValue="free" onValueChange={(v) => setBillingType(v || 'free')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(BILLING_TYPE_LABELS) as [BillingType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{BILLING_HINTS[billingType]}</p>

      <div className="space-y-2">
        <Label htmlFor="plan_description">Opis planu (opcjonalnie)</Label>
        <Textarea
          id="plan_description"
          name="description"
          placeholder="Co zawiera ten plan? Jakie korzysc i daje?"
          rows={2}
          maxLength={500}
        />
      </div>

      {showPrice && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price_amount">Cena (grosze/centy)</Label>
            <Input
              id="price_amount"
              name="price_amount"
              type="number"
              min={1}
              defaultValue={9900}
              placeholder="np. 9900 = 99 PLN"
              required
            />
            <p className="text-xs text-muted-foreground">
              {billingType === 'one_time' ? 'Jednorazowa platnosc' : 'Cena za okres'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Waluta</Label>
            <Select name="currency" defaultValue="PLN">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PLN">PLN</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showInterval && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interval">Okres rozliczeniowy</Label>
            <Select name="interval" defaultValue="monthly">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(BILLING_INTERVAL_LABELS) as [BillingInterval, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showTrial && (
            <div className="space-y-2">
              <Label htmlFor="trial_days">Dni trial (0 = brak)</Label>
              <Input
                id="trial_days"
                name="trial_days"
                type="number"
                min={0}
                max={365}
                defaultValue={0}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Dodawanie...' : 'Dodaj plan'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}
