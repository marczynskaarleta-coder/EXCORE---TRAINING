import { NextResponse } from 'next/server'
import { getStripe } from '@/modules/training/billing/stripe'
import {
  isWebhookProcessed,
  recordWebhookEvent,
  markWebhookProcessed,
} from '@/modules/training/billing/repository'
import { fulfillCheckout, fulfillRenewal, handleSubscriptionCancelled, handlePaymentFailed } from '@/modules/training/billing/fulfillment'
import type Stripe from 'stripe'

/**
 * Stripe Webhook Handler
 *
 * Events handled:
 * - checkout.session.completed -> fulfillCheckout (enrollment + entitlement)
 * - invoice.payment_succeeded -> fulfillRenewal (extend subscription)
 * - customer.subscription.deleted -> handleSubscriptionCancelled
 * - invoice.payment_failed -> handlePaymentFailed (pause enrollment)
 *
 * Idempotency:
 * - Every event ID is logged to stripe_webhook_events
 * - Duplicate events are skipped
 * - Failed events are retried by Stripe (up to 3 days)
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Verify signature
  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Idempotency check
  const alreadyProcessed = await isWebhookProcessed(event.id)
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // Record event
  await recordWebhookEvent(event.id, event.type, event.data.object)

  // Process event
  let error: string | undefined
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata as Record<string, string>

        if (!metadata?.workspace_id || !metadata?.user_id || !metadata?.product_id) {
          error = 'Missing metadata on checkout session'
          break
        }

        await fulfillCheckout(
          session.id,
          {
            workspace_id: metadata.workspace_id,
            user_id: metadata.user_id,
            product_id: metadata.product_id,
            plan_id: metadata.plan_id,
            transaction_id: metadata.transaction_id,
          },
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.toString() || null
        )
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as Record<string, unknown>
        const subId = invoice.subscription as string | undefined
        const billingReason = invoice.billing_reason as string | undefined

        if (subId && billingReason === 'subscription_cycle') {
          const lines = invoice.lines as { data: Array<{ period?: { end: number } }> } | undefined
          await fulfillRenewal(subId, lines?.data?.[0]?.period?.end || 0)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { id: string }
        await handleSubscriptionCancelled(subscription.id)
        break
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as unknown as Record<string, unknown>
        const failedSubId = failedInvoice.subscription as string | undefined

        if (failedSubId) {
          await handlePaymentFailed(failedSubId)
        }
        break
      }

      default:
        // Unhandled event type - log but don't error
        break
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Processing error'
  }

  // Mark as processed
  await markWebhookProcessed(event.id, error)

  if (error) {
    // Return 200 to prevent Stripe from retrying handled-but-failed events
    // The error is logged in stripe_webhook_events for debugging
    return NextResponse.json({ received: true, error })
  }

  return NextResponse.json({ received: true })
}
