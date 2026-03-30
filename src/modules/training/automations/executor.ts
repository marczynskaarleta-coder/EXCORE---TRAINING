import { createClient } from '@/lib/shared/supabase/server'
import { insertEntitlement } from '@/modules/shared/access/repository'
import { upsertLifecycleStage, updateExecution, incrementRunCount } from './repository'
import type { AutomationAction, AutomationExecution } from './types'

// =============================================
// Action executors
// Each action type has its own executor function.
// Executors are pure: they receive config + context, return result.
// =============================================

type ActionExecutor = (
  execution: AutomationExecution,
  config: Record<string, unknown>
) => Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }>

const executors: Record<AutomationAction, ActionExecutor> = {
  send_email: executeSendEmail,
  create_notification: executeCreateNotification,
  grant_entitlement: executeGrantEntitlement,
  add_tag: executeAddTag,
  mark_lifecycle_stage: executeMarkLifecycleStage,
}

// =============================================
// Main execution function
// =============================================

/**
 * Execute a single pending automation execution.
 * Handles: status transitions, error capture, retry logic.
 */
export async function executeAutomation(execution: AutomationExecution): Promise<void> {
  const executor = executors[execution.action]
  if (!executor) {
    await updateExecution(execution.id, {
      status: 'failed',
      error: `Unknown action: ${execution.action}`,
      completed_at: new Date().toISOString(),
    })
    return
  }

  // Mark as running
  await updateExecution(execution.id, {
    status: 'running',
    started_at: new Date().toISOString(),
  })

  try {
    const result = await executor(execution, execution.action_data)

    if (result.success) {
      await updateExecution(execution.id, {
        status: 'completed',
        result: result.result || {},
        completed_at: new Date().toISOString(),
      })
      await incrementRunCount(execution.rule_id)
    } else {
      // Check retry
      if (execution.retry_count < execution.max_retries) {
        await updateExecution(execution.id, {
          status: 'pending',
          error: result.error,
          retry_count: execution.retry_count + 1,
          scheduled_at: new Date(Date.now() + retryDelay(execution.retry_count)).toISOString(),
        })
      } else {
        await updateExecution(execution.id, {
          status: 'failed',
          error: result.error,
          completed_at: new Date().toISOString(),
        })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (execution.retry_count < execution.max_retries) {
      await updateExecution(execution.id, {
        status: 'pending',
        error: message,
        retry_count: execution.retry_count + 1,
        scheduled_at: new Date(Date.now() + retryDelay(execution.retry_count)).toISOString(),
      })
    } else {
      await updateExecution(execution.id, {
        status: 'failed',
        error: message,
        completed_at: new Date().toISOString(),
      })
    }
  }
}

/** Exponential backoff: 1min, 5min, 15min */
function retryDelay(retryCount: number): number {
  const delays = [60_000, 300_000, 900_000]
  return delays[retryCount] || 900_000
}

// =============================================
// Individual action executors
// =============================================

async function executeSendEmail(
  execution: AutomationExecution,
  config: Record<string, unknown>
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const subject = interpolate(config.subject as string, execution.trigger_data)
  const body = interpolate(config.body as string, execution.trigger_data)

  // Get user email
  const supabase = await createClient()
  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', execution.workspace_id)
    .eq('user_id', execution.trigger_user_id)
    .single()

  if (!member) return { success: false, error: 'User not found in workspace' }

  // Use Resend if available
  try {
    const { Resend } = await import('resend')
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return { success: false, error: 'RESEND_API_KEY not set' }

    const resend = new Resend(apiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@excore.pl'

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(execution.trigger_user_id!)
    if (!user?.email) return { success: false, error: 'User email not found' }

    await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject,
      html: body,
    })

    return { success: true, result: { to: user.email, subject } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Email send failed' }
  }
}

async function executeCreateNotification(
  execution: AutomationExecution,
  config: Record<string, unknown>
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const title = interpolate(config.title as string, execution.trigger_data)
  const body = interpolate(config.body as string || '', execution.trigger_data)
  const link = interpolate(config.link as string || '', execution.trigger_data)

  const supabase = await createClient()

  // Get member ID
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', execution.workspace_id)
    .eq('user_id', execution.trigger_user_id)
    .single()

  if (!member) return { success: false, error: 'Member not found' }

  const { error } = await supabase.from('notifications').insert({
    workspace_id: execution.workspace_id,
    recipient_id: member.id,
    type: 'system',
    title,
    body,
    link: link || null,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, result: { title } }
}

async function executeGrantEntitlement(
  execution: AutomationExecution,
  config: Record<string, unknown>
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  if (!execution.trigger_user_id) return { success: false, error: 'No user_id' }

  const { data, error } = await insertEntitlement({
    workspace_id: execution.workspace_id,
    user_id: execution.trigger_user_id,
    resource_type: config.resource_type as string || 'product',
    resource_id: config.resource_id as string,
    source_type: 'automation',
    source_id: execution.rule_id,
    active_until: config.active_until as string || undefined,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, result: { entitlement_id: data?.id } }
}

async function executeAddTag(
  execution: AutomationExecution,
  config: Record<string, unknown>
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  // Tags are on workspace_members (via metadata or future member_tags table)
  // For now, log intent - actual tag system can be extended
  return {
    success: true,
    result: {
      tag: config.tag_name || config.tag_id,
      user_id: execution.trigger_user_id,
      note: 'Tag action recorded (tag system to be extended)',
    },
  }
}

async function executeMarkLifecycleStage(
  execution: AutomationExecution,
  config: Record<string, unknown>
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  if (!execution.trigger_user_id) return { success: false, error: 'No user_id' }

  const { error } = await upsertLifecycleStage({
    workspace_id: execution.workspace_id,
    user_id: execution.trigger_user_id,
    stage: config.stage as string,
    metadata: execution.trigger_data,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, result: { stage: config.stage } }
}

// =============================================
// Template interpolation
// =============================================

/** Replace {{key}} with values from context */
function interpolate(template: string, context: Record<string, unknown>): string {
  if (!template) return ''
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return String(context[key] || '')
  })
}
