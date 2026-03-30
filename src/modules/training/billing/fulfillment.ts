import { createClient } from '@/lib/shared/supabase/server'
import {
  findTransactionByStripeSession,
  findTransactionByStripeSubscription,
  updateTransaction,
} from './repository'
import { insertEnrollment, findEnrollment, updateEnrollmentById } from '@/modules/training/enrollments/repository'
import { insertEntitlement } from '@/modules/shared/access/repository'

/**
 * Fulfill a completed checkout session.
 * Called from webhook: checkout.session.completed
 *
 * Creates:
 * 1. Transaction -> status: completed
 * 2. Enrollment (source: purchase)
 * 3. Entitlement (resource_type: product)
 */
export async function fulfillCheckout(
  sessionId: string,
  metadata: {
    workspace_id: string
    user_id: string
    product_id: string
    plan_id: string
    transaction_id: string
  },
  stripeSubscriptionId?: string | null
) {
  // 1. Find and update transaction
  const tx = await findTransactionByStripeSession(sessionId)
  if (!tx) {
    // Transaction not found - might have been created with different session
    // This is OK for idempotency
    return { error: 'Transaction not found for session' }
  }

  if (tx.status === 'completed') {
    // Already fulfilled - idempotent
    return { already_fulfilled: true }
  }

  await updateTransaction(tx.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    stripe_subscription_id: stripeSubscriptionId || null,
  })

  // 2. Create or reactivate enrollment
  const existing = await findEnrollment(metadata.product_id, metadata.user_id)

  let enrollmentId: string

  if (existing) {
    // Reactivate if cancelled/expired
    await updateEnrollmentById(existing.id, {
      status: 'active',
      plan_id: metadata.plan_id,
      source: 'purchase',
      started_at: new Date().toISOString(),
      ended_at: null,
      stripe_subscription_id: stripeSubscriptionId || null,
    })
    enrollmentId = existing.id
  } else {
    const { data: enrollment, error } = await insertEnrollment({
      product_id: metadata.product_id,
      workspace_id: metadata.workspace_id,
      user_id: metadata.user_id,
      source: 'purchase',
      plan_id: metadata.plan_id,
    })
    if (error || !enrollment) {
      return { error: `Failed to create enrollment: ${error?.message}` }
    }
    enrollmentId = enrollment.id

    // Update enrollment with Stripe IDs
    if (stripeSubscriptionId) {
      await updateEnrollmentById(enrollmentId, { stripe_subscription_id: stripeSubscriptionId })
    }
  }

  // Update transaction with enrollment
  await updateTransaction(tx.id, { enrollment_id: enrollmentId })

  // 3. Create entitlement
  await insertEntitlement({
    workspace_id: metadata.workspace_id,
    user_id: metadata.user_id,
    resource_type: 'product',
    resource_id: metadata.product_id,
    source_type: 'enrollment',
    source_id: enrollmentId,
    // Subscriptions: active_until managed by renewal webhook
    // One-time: no expiry
  })

  // 4. Fire automation triggers
  const { fireTrigger } = await import('@/modules/training/automations/engine')
  await fireTrigger({
    trigger: 'product_purchased',
    workspace_id: metadata.workspace_id,
    user_id: metadata.user_id,
    data: { product_id: metadata.product_id, plan_id: metadata.plan_id, enrollment_id: enrollmentId },
  })
  await fireTrigger({
    trigger: 'enrollment_created',
    workspace_id: metadata.workspace_id,
    user_id: metadata.user_id,
    data: { product_id: metadata.product_id, enrollment_id: enrollmentId, source: 'purchase' },
  })

  return { enrollment_id: enrollmentId, transaction_id: tx.id }
}

/**
 * Handle subscription renewal (invoice.payment_succeeded).
 * Extends entitlement active_until.
 */
export async function fulfillRenewal(
  stripeSubscriptionId: string,
  periodEnd: number // unix timestamp
) {
  const supabase = await createClient()

  // Find enrollment by stripe subscription
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, user_id, product_id, workspace_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (!enrollment) return { error: 'Enrollment not found for subscription' }

  // Ensure enrollment is active
  await updateEnrollmentById(enrollment.id, {
    status: 'active',
    expires_at: new Date(periodEnd * 1000).toISOString(),
  })

  // Update entitlement expiry
  const { data: entitlements } = await supabase
    .from('entitlements')
    .select('id')
    .eq('user_id', enrollment.user_id)
    .eq('resource_type', 'product')
    .eq('resource_id', enrollment.product_id)
    .eq('source_id', enrollment.id)

  if (entitlements && entitlements.length > 0) {
    for (const ent of entitlements) {
      await supabase
        .from('entitlements')
        .update({
          status: 'active',
          active_until: new Date(periodEnd * 1000).toISOString(),
        })
        .eq('id', ent.id)
    }
  }

  return { renewed: true }
}

/**
 * Handle subscription cancellation.
 * Enrollment -> cancelled, entitlement -> expired.
 */
export async function handleSubscriptionCancelled(stripeSubscriptionId: string) {
  const supabase = await createClient()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, user_id, product_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (!enrollment) return { error: 'Enrollment not found' }

  await updateEnrollmentById(enrollment.id, {
    status: 'cancelled',
    ended_at: new Date().toISOString(),
  })

  // Expire entitlements
  await supabase
    .from('entitlements')
    .update({ status: 'expired' })
    .eq('source_id', enrollment.id)
    .eq('resource_type', 'product')

  return { cancelled: true }
}

/**
 * Handle failed payment on subscription.
 * Enrollment -> paused.
 */
export async function handlePaymentFailed(stripeSubscriptionId: string) {
  const supabase = await createClient()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (!enrollment) return

  await updateEnrollmentById(enrollment.id, { status: 'paused' })
}
