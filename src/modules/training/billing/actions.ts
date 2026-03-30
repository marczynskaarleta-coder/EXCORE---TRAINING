'use server'

import { requirePermission, requireContext } from '@/modules/shared/access'
import { createCheckoutSession } from './checkout'
import { findTransactionsByUser, findTransactionsByWorkspace } from './repository'
import { insertEnrollment } from '@/modules/training/enrollments/repository'
import { insertEntitlement } from '@/modules/shared/access/repository'
import { getCurrentUser } from '@/modules/shared/auth/actions'
import type { CheckoutParams } from './types'

// =============================================
// Checkout
// =============================================

/**
 * Initiate checkout for a paid plan.
 * Returns Stripe Checkout URL or error.
 */
export async function startCheckout(
  workspaceId: string,
  productId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Nie zalogowano' }

  const params: CheckoutParams = {
    workspace_id: workspaceId,
    user_id: user.id,
    user_email: user.email || '',
    product_id: productId,
    plan_id: planId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  }

  return createCheckoutSession(params)
}

/**
 * Enroll user for free plan (no Stripe needed).
 */
export async function enrollFree(workspaceId: string, productId: string, planId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Nie zalogowano' }

  // Create enrollment
  const { data: enrollment, error } = await insertEnrollment({
    product_id: productId,
    workspace_id: workspaceId,
    user_id: user.id,
    source: 'purchase',
    plan_id: planId,
  })

  if (error) return { error: error.message }
  if (!enrollment) return { error: 'Nie udalo sie zapisac' }

  // Create entitlement
  await insertEntitlement({
    workspace_id: workspaceId,
    user_id: user.id,
    resource_type: 'product',
    resource_id: productId,
    source_type: 'enrollment',
    source_id: enrollment.id,
  })

  return { enrollment_id: enrollment.id }
}

// =============================================
// Transactions queries
// =============================================

export async function getMyTransactions(workspaceId: string) {
  const user = await getCurrentUser()
  if (!user) return []
  return findTransactionsByUser(workspaceId, user.id)
}

export async function getWorkspaceTransactions(workspaceId: string) {
  const auth = await requirePermission(workspaceId, 'billing.manage')
  if ('error' in auth) return []
  return findTransactionsByWorkspace(workspaceId)
}
