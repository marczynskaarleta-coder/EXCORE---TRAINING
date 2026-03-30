'use server'

import type { ProductAnalytics, WorkspaceAnalytics } from './types'
import {
  countWorkspaceMembers,
  countPublishedProducts,
  findEnrollmentStats,
  findProductEnrollmentStats,
} from './repository'

export async function getWorkspaceAnalytics(workspaceId: string): Promise<WorkspaceAnalytics> {
  const [members, products, enrollmentData] = await Promise.all([
    countWorkspaceMembers(workspaceId),
    countPublishedProducts(workspaceId),
    findEnrollmentStats(workspaceId),
  ])

  const completed = enrollmentData.filter(e => e.status === 'completed').length
  const total = enrollmentData.length

  return {
    workspace_id: workspaceId,
    total_members: members.count || 0,
    total_products: products.count || 0,
    total_enrollments: total,
    active_learners_30d: 0,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    total_revenue: 0,
    top_products: [],
  }
}

export async function getProductAnalytics(productId: string): Promise<ProductAnalytics> {
  const data = await findProductEnrollmentStats(productId)

  const active = data.filter(e => e.status === 'active').length
  const completed = data.filter(e => e.status === 'completed').length
  const total = data.length
  const avgProgress = total > 0
    ? Math.round(data.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / total)
    : 0

  return {
    product_id: productId,
    total_enrollments: total,
    active_enrollments: active,
    completed_enrollments: completed,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    average_progress: avgProgress,
    total_revenue: 0,
  }
}
