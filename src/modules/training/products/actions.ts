'use server'

import { revalidatePath } from 'next/cache'
import { createProductSchema, updateProductSchema, createPlanSchema, updatePlanSchema } from './schemas'
import { generateSlug } from './types'
import {
  findProducts, findAllProducts, findProductById,
  insertProduct, updateProductById, softDeleteProduct,
  findPlansByProduct, insertPlan, updatePlanById, deletePlanById,
  countPlansByProduct,
} from './repository'
import { requirePermission } from '@/modules/shared/access'

// =============================================
// Product CRUD
// =============================================

export async function getProducts(workspaceId: string) {
  return findProducts(workspaceId)
}

export async function getAdminProducts(workspaceId: string) {
  const auth = await requirePermission(workspaceId, 'product.view')
  if ('error' in auth) return []
  return findAllProducts(workspaceId)
}

export async function getProduct(productId: string) {
  return findProductById(productId)
}

export async function createProduct(workspaceId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'product.create')
  if ('error' in auth) return { error: auth.error }

  const parsed = createProductSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    description: formData.get('description') || undefined,
    visibility: formData.get('visibility') || 'members',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data, error } = await insertProduct(workspaceId, auth.user.id, {
    ...parsed.data,
    slug: generateSlug(parsed.data.name),
  })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: 'Produkt o tej nazwie juz istnieje w tym workspace' }
    }
    return { error: error.message }
  }

  revalidatePath('/app')
  return { data }
}

export async function updateProduct(workspaceId: string, productId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const raw: Record<string, unknown> = {}
  for (const key of ['name', 'slug', 'description', 'visibility', 'cover_image_url']) {
    const value = formData.get(key)
    if (value !== null) {
      raw[key] = value === '' ? null : value
    }
  }

  // Auto-generate slug from name if name changed and slug not explicitly set
  if (raw.name && !raw.slug) {
    raw.slug = generateSlug(raw.name as string)
  }

  const parsed = updateProductSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await updateProductById(productId, parsed.data)
  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: 'Slug juz jest zajety. Zmien nazwe lub slug.' }
    }
    return { error: error.message }
  }

  revalidatePath('/app')
  return { success: true }
}

export async function publishProduct(workspaceId: string, productId: string) {
  const auth = await requirePermission(workspaceId, 'product.publish')
  if ('error' in auth) return { error: auth.error }

  const { error } = await updateProductById(productId, { status: 'published' })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function archiveProduct(workspaceId: string, productId: string) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const { error } = await updateProductById(productId, { status: 'archived' })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function unarchiveProduct(workspaceId: string, productId: string) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const { error } = await updateProductById(productId, { status: 'draft' })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function deleteProduct(workspaceId: string, productId: string) {
  const auth = await requirePermission(workspaceId, 'product.delete')
  if ('error' in auth) return { error: auth.error }

  const { error } = await softDeleteProduct(productId)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Plan CRUD
// =============================================

export async function getPlans(productId: string) {
  return findPlansByProduct(productId)
}

export async function createPlan(workspaceId: string, productId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const parsed = createPlanSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    billing_type: formData.get('billing_type'),
    price_amount: formData.get('price_amount') || 0,
    currency: formData.get('currency') || 'PLN',
    interval: formData.get('interval') || null,
    trial_days: formData.get('trial_days') || 0,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Get next position
  const count = await countPlansByProduct(productId)

  const { data, error } = await insertPlan(productId, workspaceId, {
    ...parsed.data,
    position: count,
  })
  if (error) return { error: error.message }

  revalidatePath('/app')
  return { data }
}

export async function updatePlan(workspaceId: string, planId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value
  }

  const parsed = updatePlanSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await updatePlanById(planId, parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/app')
  return { success: true }
}

export async function togglePlanActive(workspaceId: string, planId: string, isActive: boolean) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const { error } = await updatePlanById(planId, { is_active: isActive })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function deletePlan(workspaceId: string, planId: string) {
  const auth = await requirePermission(workspaceId, 'product.edit')
  if ('error' in auth) return { error: auth.error }

  const { error } = await deletePlanById(planId)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}
