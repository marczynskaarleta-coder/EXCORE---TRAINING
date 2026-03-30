import { createClient } from '@/lib/shared/supabase/server'
import type { ProductWithRelations } from './types'

// --- Products ---

export async function findProducts(workspaceId: string): Promise<ProductWithRelations[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_tags (tag_id, tags (name, color)),
      product_plans (id, name, billing_type, price_amount, currency, is_active),
      enrollments (count)
    `)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (data as ProductWithRelations[]) || []
}

export async function findAllProducts(workspaceId: string): Promise<ProductWithRelations[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_tags (tag_id, tags (name, color)),
      product_plans (id, name, billing_type, price_amount, currency, is_active),
      enrollments (count)
    `)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  return (data as ProductWithRelations[]) || []
}

export async function findProductById(productId: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_tags (tag_id, tags (name, color)),
      product_plans (id, name, billing_type, price_amount, currency, interval, trial_days, is_active, position, metadata, created_at),
      programs (id, name, slug, status, position),
      enrollments (count)
    `)
    .eq('id', productId)
    .is('deleted_at', null)
    .single()

  return data as ProductWithRelations | null
}

export async function findProductBySlug(workspaceId: string, slug: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_tags (tag_id, tags (name, color)),
      product_plans (id, name, billing_type, price_amount, currency, is_active),
      enrollments (count)
    `)
    .eq('workspace_id', workspaceId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  return data as ProductWithRelations | null
}

export async function insertProduct(
  workspaceId: string,
  createdBy: string,
  input: {
    name: string
    slug: string
    type: string
    description?: string
    visibility?: string
  }
) {
  const supabase = await createClient()

  return supabase
    .from('products')
    .insert({
      workspace_id: workspaceId,
      created_by: createdBy,
      status: 'draft',
      ...input,
    })
    .select()
    .single()
}

export async function updateProductById(productId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('products').update(updates).eq('id', productId)
}

export async function softDeleteProduct(productId: string) {
  const supabase = await createClient()
  return supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', productId)
}

// --- Plans ---

export async function countPlansByProduct(productId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('product_plans')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
  return count || 0
}

export async function findPlansByProduct(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('product_plans')
    .select('*')
    .eq('product_id', productId)
    .order('position', { ascending: true })

  return data || []
}

export async function insertPlan(
  productId: string,
  workspaceId: string,
  input: {
    name: string
    description?: string
    billing_type: string
    price_amount: number
    currency: string
    interval?: string | null
    trial_days?: number
    position?: number
  }
) {
  const supabase = await createClient()

  return supabase
    .from('product_plans')
    .insert({
      product_id: productId,
      workspace_id: workspaceId,
      ...input,
    })
    .select()
    .single()
}

export async function updatePlanById(planId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('product_plans').update(updates).eq('id', planId)
}

export async function deletePlanById(planId: string) {
  const supabase = await createClient()
  return supabase.from('product_plans').delete().eq('id', planId)
}
