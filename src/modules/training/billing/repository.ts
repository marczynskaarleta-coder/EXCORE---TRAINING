import { createClient } from '@/lib/shared/supabase/server'
import type { Transaction, TransactionWithProduct } from './types'

// =============================================
// Transactions
// =============================================

export async function insertTransaction(input: {
  workspace_id: string
  user_id: string
  product_id: string
  plan_id: string
  amount: number
  currency: string
  type: string
  stripe_checkout_session_id?: string
  stripe_payment_intent_id?: string
  stripe_subscription_id?: string
  stripe_invoice_id?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  return supabase.from('transactions').insert({ status: 'pending', ...input }).select().single()
}

export async function findTransactionByStripeSession(sessionId: string): Promise<Transaction | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_checkout_session_id', sessionId)
    .single()
  return data as Transaction | null
}

export async function findTransactionByStripeSubscription(subId: string): Promise<Transaction | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_subscription_id', subId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data as Transaction | null
}

export async function updateTransaction(txId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('transactions').update(updates).eq('id', txId)
}

export async function findTransactionsByUser(
  workspaceId: string,
  userId: string
): Promise<TransactionWithProduct[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select(`*, products (name, type), product_plans (name, billing_type)`)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as TransactionWithProduct[]) || []
}

export async function findTransactionsByWorkspace(workspaceId: string): Promise<TransactionWithProduct[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select(`*, products (name, type), product_plans (name, billing_type)`)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data as TransactionWithProduct[]) || []
}

// =============================================
// Webhook idempotency
// =============================================

export async function isWebhookProcessed(stripeEventId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stripe_webhook_events')
    .select('id, processed')
    .eq('stripe_event_id', stripeEventId)
    .single()
  return data?.processed === true
}

export async function recordWebhookEvent(stripeEventId: string, type: string, data: unknown) {
  const supabase = await createClient()
  return supabase.from('stripe_webhook_events').insert({
    stripe_event_id: stripeEventId,
    type,
    data: data as Record<string, unknown>,
    processed: false,
  })
}

export async function markWebhookProcessed(stripeEventId: string, error?: string) {
  const supabase = await createClient()
  return supabase.from('stripe_webhook_events').update({
    processed: true,
    error: error || null,
  }).eq('stripe_event_id', stripeEventId)
}

// =============================================
// Stripe IDs on plans
// =============================================

export async function findPlanById(planId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('product_plans').select('*').eq('id', planId).single()
  return data
}

export async function updatePlanStripeIds(planId: string, stripeProductId: string, stripePriceId: string) {
  const supabase = await createClient()
  return supabase.from('product_plans').update({ stripe_product_id: stripeProductId, stripe_price_id: stripePriceId }).eq('id', planId)
}

export async function findPlanByStripePrice(stripePriceId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('product_plans').select('*, products (id, name, workspace_id)').eq('stripe_price_id', stripePriceId).single()
  return data
}

// =============================================
// Workspace Stripe customer
// =============================================

export async function getWorkspaceStripeCustomer(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('workspaces').select('stripe_customer_id').eq('id', workspaceId).single()
  return data?.stripe_customer_id
}

export async function setWorkspaceStripeCustomer(workspaceId: string, customerId: string) {
  const supabase = await createClient()
  return supabase.from('workspaces').update({ stripe_customer_id: customerId }).eq('id', workspaceId)
}
