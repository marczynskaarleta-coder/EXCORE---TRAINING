import {
  findEnabledRulesForTrigger,
  insertExecution,
  findPendingExecutions,
} from './repository'
import { executeAutomation } from './executor'
import type { TriggerEvent, AutomationRule } from './types'

// =============================================
// Automation Engine
// Entry point: fireTrigger() called from business logic
// Processor: processPendingExecutions() called from cron
// =============================================

/**
 * Fire a trigger event. Finds matching rules and schedules executions.
 * Called from business logic (enrollment created, lesson completed, etc.)
 *
 * This does NOT execute actions immediately (unless delay=0).
 * It creates execution records that are processed by the runner.
 */
export async function fireTrigger(event: TriggerEvent): Promise<{ scheduled: number }> {
  const rules = await findEnabledRulesForTrigger(event.workspace_id, event.trigger)

  let scheduled = 0

  for (const rule of rules) {
    // Check trigger conditions
    if (!matchesTriggerConfig(rule, event)) continue

    const scheduledAt = rule.delay_minutes > 0
      ? new Date(Date.now() + rule.delay_minutes * 60_000).toISOString()
      : new Date().toISOString()

    await insertExecution({
      rule_id: rule.id,
      workspace_id: event.workspace_id,
      trigger_event: event.trigger,
      trigger_user_id: event.user_id,
      trigger_data: event.data,
      action: rule.action,
      action_data: rule.action_config,
      scheduled_at: scheduledAt,
    })

    scheduled++
  }

  return { scheduled }
}

/**
 * Process pending executions. Called from cron job.
 * Picks up executions where scheduled_at <= now() and status = pending.
 */
export async function processPendingExecutions(): Promise<{ processed: number; failed: number }> {
  const executions = await findPendingExecutions()

  let processed = 0
  let failed = 0

  for (const execution of executions) {
    try {
      await executeAutomation(execution)
      processed++
    } catch {
      failed++
    }
  }

  return { processed, failed }
}

/**
 * Check if trigger event matches rule's trigger_config conditions.
 * Empty config = always match.
 */
function matchesTriggerConfig(rule: AutomationRule, event: TriggerEvent): boolean {
  const config = rule.trigger_config
  if (!config || Object.keys(config).length === 0) return true

  // product_id filter
  if (config.product_id && event.data.product_id !== config.product_id) return false

  // lesson_type filter
  if (config.lesson_type && event.data.lesson_type !== config.lesson_type) return false

  // inactive_days filter (checked by cron, not here)
  // hours_before filter (checked by cron, not here)

  return true
}
