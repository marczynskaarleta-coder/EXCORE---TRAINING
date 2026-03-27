'use server'

import { createClient } from '@/lib/supabase/server'

export async function getProducts(workspaceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_tags (tag_id, tags (name, color)),
      enrollments (count)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return data || []
}

export async function getProduct(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      product_tags (tag_id, tags (name, color)),
      learning_modules (
        *,
        lessons (*)
      ),
      enrollments (count)
    `)
    .eq('id', productId)
    .single()

  return data
}

export async function createProduct(workspaceId: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')

  const { data, error } = await supabase
    .from('products')
    .insert({
      workspace_id: workspaceId,
      title,
      slug,
      type,
      description,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateProduct(productId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', productId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function publishProduct(productId: string) {
  return updateProduct(productId, {
    status: 'published',
    published_at: new Date().toISOString(),
  })
}

// Learning structure
export async function createModule(productId: string, title: string, position: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_modules')
    .insert({ product_id: productId, title, position })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function createLesson(
  moduleId: string,
  productId: string,
  data: { title: string; type: string; position: number }
) {
  const supabase = await createClient()

  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      product_id: productId,
      ...data,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: lesson }
}

export async function updateLesson(lessonId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lessons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', lessonId)

  if (error) return { error: error.message }
  return { success: true }
}

// Enrollments
export async function enrollMember(
  productId: string,
  workspaceId: string,
  memberId: string,
  role: string = 'participant'
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      product_id: productId,
      workspace_id: workspaceId,
      member_id: memberId,
      business_role: role,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function getMyEnrollments(workspaceId: string, memberId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select(`
      *,
      products (*)
    `)
    .eq('workspace_id', workspaceId)
    .eq('member_id', memberId)
    .order('enrolled_at', { ascending: false })

  return data || []
}

// Progress
export async function markLessonComplete(
  enrollmentId: string,
  lessonId: string,
  memberId: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert({
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      member_id: memberId,
      completed: true,
      completed_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }

  // Recalculate enrollment progress
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed')
    .eq('enrollment_id', enrollmentId)

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('product_id')
    .eq('id', enrollmentId)
    .single()

  if (enrollment) {
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', enrollment.product_id)
      .eq('is_published', true)

    const completedCount = progress?.filter(p => p.completed).length || 0
    const percent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0

    await supabase
      .from('enrollments')
      .update({
        progress_percent: percent,
        last_accessed_at: new Date().toISOString(),
        ...(percent === 100 ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', enrollmentId)
  }

  return { success: true }
}
