'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from './auth'
import { DEFAULT_MODULES } from '@/lib/modules'
import { ROLE_TEMPLATES } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { error: 'Nie zalogowano' }

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name, slug, created_by: user.id })
    .select()
    .single()

  if (wsError) return { error: wsError.message }

  // Add creator as admin
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    system_role: 'workspace_admin',
    display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
  })

  // Create workspace settings
  await supabase.from('workspace_settings').insert({
    workspace_id: workspace.id,
  })

  // Create workspace branding
  await supabase.from('workspace_branding').insert({
    workspace_id: workspace.id,
  })

  // Enable default modules
  const moduleInserts = DEFAULT_MODULES.map(module => ({
    workspace_id: workspace.id,
    module,
    enabled: true,
  }))
  await supabase.from('workspace_modules').insert(moduleInserts)

  // Create default roles
  const roleInserts = Object.values(ROLE_TEMPLATES).map(template => ({
    workspace_id: workspace.id,
    ...template,
  }))
  await supabase.from('roles').insert(roleInserts)

  redirect(`/app/${workspace.slug}/dashboard`)
}

export async function getMyWorkspaces() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      system_role,
      display_name,
      workspaces (
        id, name, slug, logo_url, brand_color, industry
      )
    `)

  if (error) return []
  return data || []
}

export async function getWorkspaceBySlug(slug: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_settings (*),
      workspace_branding (*),
      workspace_modules (*)
    `)
    .eq('slug', slug)
    .single()

  return data
}

export async function getWorkspaceMember(workspaceId: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabase
    .from('workspace_members')
    .select(`
      *,
      member_roles (
        role_id,
        roles (*)
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  return data
}

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('workspace_members')
    .select(`
      *,
      member_roles (
        role_id,
        roles (name, slug, color)
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true })

  return data || []
}
