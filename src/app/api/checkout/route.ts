import { NextResponse } from 'next/server'
import { startCheckout, enrollFree } from '@/modules/training/billing/actions'
import { redirect } from 'next/navigation'

/**
 * POST /api/checkout
 * Initiates checkout or free enrollment.
 * Body: { workspace_id, product_id, plan_id, billing_type }
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { workspace_id, product_id, plan_id, billing_type } = body

  if (!workspace_id || !product_id || !plan_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Free plan - direct enrollment
  if (billing_type === 'free') {
    const result = await enrollFree(workspace_id, product_id, plan_id)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ enrolled: true, enrollment_id: result.enrollment_id })
  }

  // Paid plan - Stripe checkout
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const result = await startCheckout(
    workspace_id,
    product_id,
    plan_id,
    `${origin}/app/checkout/success`,
    `${origin}/app/checkout/cancel`
  )

  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  if ('url' in result) {
    return NextResponse.json({ url: result.url })
  }

  return NextResponse.json({ error: 'Nieoczekiwany wynik' }, { status: 500 })
}
