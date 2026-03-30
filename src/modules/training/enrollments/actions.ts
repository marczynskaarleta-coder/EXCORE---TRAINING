'use server'

import { enrollMemberSchema } from './schemas'
import {
  findEnrollmentsByUser,
  findEnrollmentsByProduct,
  findEnrollment,
  insertEnrollment,
  updateEnrollmentById,
} from './repository'

export async function getMyEnrollments(workspaceId: string, userId: string) {
  return findEnrollmentsByUser(workspaceId, userId)
}

export async function getProductEnrollments(productId: string) {
  return findEnrollmentsByProduct(productId)
}

export async function getEnrollment(productId: string, userId: string) {
  return findEnrollment(productId, userId)
}

export async function enrollUser(
  productId: string,
  workspaceId: string,
  userId: string,
  source: string = 'manual'
) {
  const { data, error } = await insertEnrollment({
    product_id: productId,
    workspace_id: workspaceId,
    user_id: userId,
    source,
  })

  if (error) return { error: error.message }
  return { data }
}

export async function cancelEnrollment(enrollmentId: string) {
  const { error } = await updateEnrollmentById(enrollmentId, {
    status: 'cancelled',
    ended_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return { success: true }
}
