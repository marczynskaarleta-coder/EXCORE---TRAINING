'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/modules/shared/access'
import {
  findRulesByWorkspace,
  findRuleById,
  insertRule,
  updateRuleById,
  deleteRuleById,
  findExecutionsByRule,
  findExecutionsByWorkspace,
} from './repository'
import { WORKFLOW_TEMPLATES } from './templates'

// =============================================
// Rules management (admin)
// =============================================

export async function getRules(workspaceId: string) {
  const auth = await requirePermission(workspaceId, 'settings.manage')
  if ('error' in auth) return []
  return findRulesByWorkspace(workspaceId)
}

export async function getRule(ruleId: string) {
  return findRuleById(ruleId)
}

/**
 * Enable a predefined template for a workspace.
 * Creates a rule from template.
 */
export async function enableTemplate(workspaceId: string, templateId: string) {
  const auth = await requirePermission(workspaceId, 'settings.manage')
  if ('error' in auth) return { error: auth.error }

  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId)
  if (!template) return { error: 'Szablon nie istnieje' }

  const { data, error } = await insertRule({
    workspace_id: workspaceId,
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    action: template.action,
    trigger_config: template.trigger_config,
    action_config: template.action_config,
    delay_minutes: template.delay_minutes,
    is_enabled: true,
    is_template: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

/**
 * Toggle rule enabled/disabled.
 */
export async function toggleRule(workspaceId: string, ruleId: string, enabled: boolean) {
  const auth = await requirePermission(workspaceId, 'settings.manage')
  if ('error' in auth) return { error: auth.error }

  const { error } = await updateRuleById(ruleId, { is_enabled: enabled })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

/**
 * Delete a rule.
 */
export async function removeRule(workspaceId: string, ruleId: string) {
  const auth = await requirePermission(workspaceId, 'settings.manage')
  if ('error' in auth) return { error: auth.error }

  const { error } = await deleteRuleById(ruleId)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Executions (read-only for admin)
// =============================================

export async function getRuleExecutions(ruleId: string, limit = 20) {
  return findExecutionsByRule(ruleId, limit)
}

export async function getRecentExecutions(workspaceId: string) {
  const auth = await requirePermission(workspaceId, 'settings.manage')
  if ('error' in auth) return []
  return findExecutionsByWorkspace(workspaceId)
}

// =============================================
// Templates list (for admin UI)
// =============================================

export async function getAvailableTemplates(workspaceId: string) {
  const auth = await requirePermission(workspaceId, 'settings.manage')
  if ('error' in auth) return []

  const existingRules = await findRulesByWorkspace(workspaceId)
  const enabledTemplateNames = new Set(existingRules.filter(r => r.is_template).map(r => r.name))

  return WORKFLOW_TEMPLATES.map(t => ({
    ...t,
    is_enabled: enabledTemplateNames.has(t.name),
  }))
}
