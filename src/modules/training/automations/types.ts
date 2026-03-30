// =============================================
// Automations - Predefined workflow templates
// Trigger -> (optional delay) -> Action
// =============================================

export type AutomationTrigger =
  | 'user_joined_workspace'
  | 'enrollment_created'
  | 'product_purchased'
  | 'lesson_completed'
  | 'event_starting_soon'
  | 'user_inactive'
  | 'certificate_issued'

export type AutomationAction =
  | 'send_email'
  | 'create_notification'
  | 'grant_entitlement'
  | 'add_tag'
  | 'mark_lifecycle_stage'

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface AutomationRule {
  id: string
  workspace_id: string
  name: string
  description: string | null
  trigger: AutomationTrigger
  action: AutomationAction
  trigger_config: Record<string, unknown>
  action_config: Record<string, unknown>
  delay_minutes: number
  is_enabled: boolean
  is_template: boolean
  run_count: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface AutomationExecution {
  id: string
  rule_id: string
  workspace_id: string
  trigger_event: AutomationTrigger
  trigger_user_id: string | null
  trigger_data: Record<string, unknown>
  status: ExecutionStatus
  action: AutomationAction
  action_data: Record<string, unknown>
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  result: Record<string, unknown> | null
  error: string | null
  retry_count: number
  max_retries: number
  created_at: string
}

// --- Trigger event payload (passed to engine) ---

export interface TriggerEvent {
  trigger: AutomationTrigger
  workspace_id: string
  user_id: string
  data: Record<string, unknown>
}

// --- Labels ---

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  user_joined_workspace: 'Nowy czlonek workspace',
  enrollment_created: 'Zapis na produkt',
  product_purchased: 'Zakup produktu',
  lesson_completed: 'Ukonczenie lekcji',
  event_starting_soon: 'Zbliajace sie wydarzenie',
  user_inactive: 'Uzytkownik nieaktywny',
  certificate_issued: 'Wydanie certyfikatu',
}

export const ACTION_LABELS: Record<AutomationAction, string> = {
  send_email: 'Wyslij email',
  create_notification: 'Stworz powiadomienie',
  grant_entitlement: 'Przyznaj dostep',
  add_tag: 'Dodaj tag',
  mark_lifecycle_stage: 'Oznacz etap lifecycle',
}
