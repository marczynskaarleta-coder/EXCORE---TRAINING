import type { AutomationTrigger, AutomationAction } from './types'

// =============================================
// Predefined workflow templates
// Admin enables/disables, system handles the rest
// =============================================

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  trigger: AutomationTrigger
  action: AutomationAction
  trigger_config: Record<string, unknown>
  action_config: Record<string, unknown>
  delay_minutes: number
  category: 'onboarding' | 'engagement' | 'retention' | 'completion'
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // --- ONBOARDING ---
  {
    id: 'welcome_email',
    name: 'Email powitalny',
    description: 'Wyslij email powitalny po dolaczeniu do workspace',
    trigger: 'user_joined_workspace',
    action: 'send_email',
    trigger_config: {},
    action_config: {
      template: 'welcome',
      subject: 'Witaj w {{workspace_name}}!',
      body: 'Czesc {{user_name}}, witamy na platformie! Zacznij od przejrzenia dostepnych kursow.',
    },
    delay_minutes: 0,
    category: 'onboarding',
  },
  {
    id: 'welcome_notification',
    name: 'Powiadomienie powitalne',
    description: 'In-app powiadomienie po dolaczeniu',
    trigger: 'user_joined_workspace',
    action: 'create_notification',
    trigger_config: {},
    action_config: {
      title: 'Witaj na platformie!',
      body: 'Zacznij od przejrzenia dostepnych kursow w zakladce Nauka.',
      link: '/learning',
    },
    delay_minutes: 0,
    category: 'onboarding',
  },
  {
    id: 'new_member_lifecycle',
    name: 'Oznacz jako nowy czlonek',
    description: 'Ustaw lifecycle stage na new_member',
    trigger: 'user_joined_workspace',
    action: 'mark_lifecycle_stage',
    trigger_config: {},
    action_config: { stage: 'new_member' },
    delay_minutes: 0,
    category: 'onboarding',
  },

  // --- ENGAGEMENT ---
  {
    id: 'enrollment_confirmation',
    name: 'Potwierdzenie zapisu',
    description: 'Email z potwierdzeniem zapisu na kurs',
    trigger: 'enrollment_created',
    action: 'send_email',
    trigger_config: {},
    action_config: {
      template: 'enrollment_confirmation',
      subject: 'Zapisano na: {{product_name}}',
      body: 'Gratulacje! Zostales zapisany na {{product_name}}. Zacznij nauke juz teraz.',
    },
    delay_minutes: 0,
    category: 'engagement',
  },
  {
    id: 'enrollment_active_learner',
    name: 'Oznacz jako aktywny uczestnik',
    description: 'Zmien lifecycle po zapisie na kurs',
    trigger: 'enrollment_created',
    action: 'mark_lifecycle_stage',
    trigger_config: {},
    action_config: { stage: 'active_learner' },
    delay_minutes: 0,
    category: 'engagement',
  },
  {
    id: 'purchase_thank_you',
    name: 'Podziekowanie za zakup',
    description: 'Powiadomienie po zakupie produktu',
    trigger: 'product_purchased',
    action: 'create_notification',
    trigger_config: {},
    action_config: {
      title: 'Dziekujemy za zakup!',
      body: 'Twoj dostep do {{product_name}} jest juz aktywny.',
      link: '/learning/{{product_id}}',
    },
    delay_minutes: 0,
    category: 'engagement',
  },
  {
    id: 'event_reminder_24h',
    name: 'Przypomnienie 24h przed wydarzeniem',
    description: 'Email dzien przed wydarzeniem',
    trigger: 'event_starting_soon',
    action: 'send_email',
    trigger_config: { hours_before: 24 },
    action_config: {
      template: 'event_reminder',
      subject: 'Jutro: {{event_title}}',
      body: 'Przypominamy o jutrzejszym wydarzeniu: {{event_title}} o {{event_time}}.',
    },
    delay_minutes: 0,
    category: 'engagement',
  },
  {
    id: 'event_reminder_1h',
    name: 'Przypomnienie 1h przed wydarzeniem',
    description: 'Powiadomienie godzine przed wydarzeniem',
    trigger: 'event_starting_soon',
    action: 'create_notification',
    trigger_config: { hours_before: 1 },
    action_config: {
      title: 'Za godzine: {{event_title}}',
      body: 'Twoje wydarzenie {{event_title}} zaczyna sie o {{event_time}}.',
      link: '/events/{{event_id}}',
    },
    delay_minutes: 0,
    category: 'engagement',
  },

  // --- COMPLETION ---
  {
    id: 'lesson_streak',
    name: 'Powiadomienie o kontynuacji nauki',
    description: 'Zacheta po ukonczeniu lekcji',
    trigger: 'lesson_completed',
    action: 'create_notification',
    trigger_config: {},
    action_config: {
      title: 'Swietna robota!',
      body: 'Ukonczyles lekcje {{lesson_title}}. Kontynuuj nauke!',
      link: '/learning/{{product_id}}',
    },
    delay_minutes: 0,
    category: 'completion',
  },
  {
    id: 'certificate_email',
    name: 'Email z certyfikatem',
    description: 'Wyslij certyfikat po ukonczeniu kursu',
    trigger: 'certificate_issued',
    action: 'send_email',
    trigger_config: {},
    action_config: {
      template: 'certificate',
      subject: 'Twoj certyfikat: {{product_name}}',
      body: 'Gratulacje! Ukonczyles {{product_name}}. Twoj certyfikat nr {{certificate_number}} jest gotowy.',
    },
    delay_minutes: 0,
    category: 'completion',
  },
  {
    id: 'certificate_lifecycle',
    name: 'Oznacz jako ukonczony',
    description: 'Zmien lifecycle po wydaniu certyfikatu',
    trigger: 'certificate_issued',
    action: 'mark_lifecycle_stage',
    trigger_config: {},
    action_config: { stage: 'completed' },
    delay_minutes: 0,
    category: 'completion',
  },

  // --- RETENTION ---
  {
    id: 'inactive_nudge',
    name: 'Przypomnienie o nauce',
    description: 'Email po 7 dniach nieaktywnosci',
    trigger: 'user_inactive',
    action: 'send_email',
    trigger_config: { inactive_days: 7 },
    action_config: {
      template: 'inactive_nudge',
      subject: 'Tesknimy za Toba!',
      body: 'Czesc {{user_name}}, nie widzielismy Cie od {{inactive_days}} dni. Wroc do nauki!',
    },
    delay_minutes: 0,
    category: 'retention',
  },
  {
    id: 'inactive_lifecycle',
    name: 'Oznacz jako churning',
    description: 'Zmien lifecycle po 14 dniach nieaktywnosci',
    trigger: 'user_inactive',
    action: 'mark_lifecycle_stage',
    trigger_config: { inactive_days: 14 },
    action_config: { stage: 'churning' },
    delay_minutes: 0,
    category: 'retention',
  },
]

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category)
}
