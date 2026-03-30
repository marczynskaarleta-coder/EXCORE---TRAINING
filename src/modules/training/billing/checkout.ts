import { getStripe, toStripeInterval, toStripeIntervalCount } from './stripe'
import {
  findPlanById,
  updatePlanStripeIds,
  getWorkspaceStripeCustomer,
  setWorkspaceStripeCustomer,
  insertTransaction,
  updateTransaction,
} from './repository'
import type { CheckoutParams } from './types'

/**
 * Create Stripe Checkout Session for a product plan.
 * Handles both one_time and subscription plans.
 *
 * Stripe objects created lazily:
 * - Customer (per workspace, reused)
 * - Product + Price (per plan, synced on first checkout)
 */
export async function createCheckoutSession(params: CheckoutParams) {
  const stripe = getStripe()

  // 1. Get plan
  const plan = await findPlanById(params.plan_id)
  if (!plan) return { error: 'Plan nie istnieje' }
  if (plan.billing_type === 'free') return { error: 'Darmowy plan nie wymaga platnosci' }

  // 2. Ensure Stripe Customer
  let customerId = await getWorkspaceStripeCustomer(params.workspace_id)
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: params.user_email,
      metadata: {
        workspace_id: params.workspace_id,
        user_id: params.user_id,
      },
    })
    customerId = customer.id
    await setWorkspaceStripeCustomer(params.workspace_id, customerId)
  }

  // 3. Ensure Stripe Price (lazy sync)
  let stripePriceId = plan.stripe_price_id
  if (!stripePriceId) {
    const syncResult = await syncPlanToStripe(plan)
    if ('error' in syncResult) return syncResult
    stripePriceId = syncResult.price_id
  }

  // 4. Determine mode
  const mode = plan.billing_type === 'subscription' ? 'subscription' : 'payment'

  // 5. Create transaction record (pending)
  const { data: tx, error: txError } = await insertTransaction({
    workspace_id: params.workspace_id,
    user_id: params.user_id,
    product_id: params.product_id,
    plan_id: params.plan_id,
    amount: plan.price_amount,
    currency: plan.currency,
    type: 'purchase',
    metadata: { plan_name: plan.name, billing_type: plan.billing_type },
  })

  if (txError) return { error: txError.message }

  // 6. Create Checkout Session
  try {
    const sessionParams: Record<string, unknown> = {
      customer: customerId,
      mode,
      line_items: [{
        price: stripePriceId,
        quantity: 1,
      }],
      success_url: `${params.success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancel_url,
      metadata: {
        workspace_id: params.workspace_id,
        user_id: params.user_id,
        product_id: params.product_id,
        plan_id: params.plan_id,
        transaction_id: tx.id,
      },
      client_reference_id: tx.id,
    }

    // Add trial for subscriptions
    if (mode === 'subscription' && plan.trial_days > 0) {
      (sessionParams as Record<string, unknown>).subscription_data = {
        trial_period_days: plan.trial_days,
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0])

    await updateTransaction(tx.id, { stripe_checkout_session_id: session.id })

    return { url: session.url, session_id: session.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    await updateTransaction(tx.id, { status: 'failed', metadata: { error: message } })
    return { error: `Blad Stripe: ${message}` }
  }
}

/**
 * Sync a plan to Stripe (create Product + Price).
 * Called lazily on first checkout for this plan.
 */
async function syncPlanToStripe(plan: Record<string, unknown>) {
  const stripe = getStripe()

  try {
    // Create Stripe Product
    const product = await stripe.products.create({
      name: plan.name as string,
      metadata: { plan_id: plan.id as string, product_id: plan.product_id as string },
    })

    // Create Stripe Price
    const priceParams: Record<string, unknown> = {
      product: product.id,
      unit_amount: plan.price_amount as number,
      currency: ((plan.currency as string) || 'PLN').toLowerCase(),
    }

    if (plan.billing_type === 'subscription' && plan.interval) {
      (priceParams as Record<string, unknown>).recurring = {
        interval: toStripeInterval(plan.interval as string),
        interval_count: toStripeIntervalCount(plan.interval as string),
      }
    }

    const price = await stripe.prices.create(priceParams as unknown as Parameters<typeof stripe.prices.create>[0])

    // Save back to DB
    await updatePlanStripeIds(plan.id as string, product.id, price.id)

    return { product_id: product.id, price_id: price.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe sync error'
    return { error: `Sync failed: ${message}` }
  }
}
