// =============================================
// Billing - Stripe payments, transactions
// Tabele: transactions, stripe_webhook_events
// =============================================

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed'
export type TransactionType = 'purchase' | 'renewal' | 'refund' | 'upgrade'

export interface Transaction {
  id: string
  workspace_id: string
  user_id: string
  product_id: string | null
  plan_id: string | null
  enrollment_id: string | null
  amount: number
  currency: string
  status: TransactionStatus
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  stripe_invoice_id: string | null
  stripe_subscription_id: string | null
  type: TransactionType
  metadata: Record<string, unknown>
  completed_at: string | null
  refunded_at: string | null
  created_at: string
  updated_at: string
}

export interface TransactionWithProduct extends Transaction {
  products?: { name: string; type: string } | null
  product_plans?: { name: string; billing_type: string } | null
}

export interface CheckoutParams {
  workspace_id: string
  user_id: string
  user_email: string
  product_id: string
  plan_id: string
  success_url: string
  cancel_url: string
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Oczekuje',
  completed: 'Zakonczona',
  failed: 'Nieudana',
  refunded: 'Zwrocona',
  disputed: 'Sporna',
}
