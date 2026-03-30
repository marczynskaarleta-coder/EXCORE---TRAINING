import { createClient } from '@/lib/shared/supabase/server'
import type { AutomationRule, AutomationExecution, AutomationTrigger } from './types'

// =============================================
// Rules
// =============================================

export async function findRulesByWorkspace(workspaceId: string): Promise<AutomationRule[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  return (data as AutomationRule[]) || []
}

export async function findEnabledRulesForTrigger(
  workspaceId: string,
  trigger: AutomationTrigger
): Promise<AutomationRule[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('trigger', trigger)
    .eq('is_enabled', true)
  return (data as AutomationRule[]) || []
}

export async function findRuleById(ruleId: string): Promise<AutomationRule | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('id', ruleId)
    .single()
  return data as AutomationRule | null
}

export async function insertRule(input: {
  workspace_id: string
  name: string
  description?: string
  trigger: string
  action: string
  trigger_config?: Record<string, unknown>
  action_config?: Record<string, unknown>
  delay_minutes?: number
  is_enabled?: boolean
  is_template?: boolean
}) {
  const supabase = await createClient()
  return supabase.from('automation_rules').insert(input).select().single()
}

export async function updateRuleById(ruleId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('automation_rules').update(updates).eq('id', ruleId)
}

export async function deleteRuleById(ruleId: string) {
  const supabase = await createClient()
  return supabase.from('automation_rules').delete().eq('id', ruleId)
}

export async function incrementRunCount(ruleId: string) {
  const supabase = await createClient()
  const { data: rule } = await supabase.from('automation_rules').select('run_count').eq('id', ruleId).single()
  if (rule) {
    await supabase.from('automation_rules').update({
      run_count: (rule.run_count || 0) + 1,
      last_run_at: new Date().toISOString(),
    }).eq('id', ruleId)
  }
}

// =============================================
// Executions
// =============================================

export async function insertExecution(input: {
  rule_id: string
  workspace_id: string
  trigger_event: string
  trigger_user_id?: string
  trigger_data: Record<string, unknown>
  action: string
  action_data: Record<string, unknown>
  scheduled_at: string
}) {
  const supabase = await createClient()
  return supabase.from('automation_executions').insert({ status: 'pending', ...input }).select().single()
}

export async function updateExecution(executionId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('automation_executions').update(updates).eq('id', executionId)
}

export async function findPendingExecutions(workspaceId?: string): Promise<AutomationExecution[]> {
  const supabase = await createClient()
  let query = supabase
    .from('automation_executions')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(50)

  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  const { data } = await query
  return (data as AutomationExecution[]) || []
}

export async function findExecutionsByRule(ruleId: string, limit = 20): Promise<AutomationExecution[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('rule_id', ruleId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as AutomationExecution[]) || []
}

export async function findExecutionsByWorkspace(workspaceId: string, limit = 50): Promise<AutomationExecution[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as AutomationExecution[]) || []
}

// =============================================
// Lifecycle stages
// =============================================

export async function upsertLifecycleStage(input: {
  workspace_id: string
  user_id: string
  stage: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  return supabase.from('user_lifecycle_stages').upsert(input, { onConflict: 'workspace_id,user_id' })
}
