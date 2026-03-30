'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'

interface CheckoutButtonProps {
  workspaceId: string
  productId: string
  planId: string
  billingType: string
  priceAmount: number
  currency: string
  label?: string
}

export function CheckoutButton({
  workspaceId,
  productId,
  planId,
  billingType,
  priceAmount,
  currency,
  label,
}: CheckoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFree = billingType === 'free' || priceAmount === 0

  const buttonLabel = label || (
    isFree
      ? 'Zapisz sie za darmo'
      : `Kup za ${(priceAmount / 100).toFixed(0)} ${currency}`
  )

  async function handleClick() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          product_id: productId,
          plan_id: planId,
          billing_type: billingType,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.enrolled) {
        // Free enrollment - refresh page
        router.refresh()
        return
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
        return
      }
    } catch (err) {
      setError('Wystapil blad. Sprobuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading} className="w-full">
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Przetwarzanie...</>
        ) : (
          <>{!isFree && <CreditCard className="h-4 w-4 mr-2" />}{buttonLabel}</>
        )}
      </Button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
