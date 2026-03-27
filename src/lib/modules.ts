import {
  Users, BookOpen, Calendar, FolderOpen,
  MessageCircle, CreditCard, Zap, BarChart3,
  type LucideIcon
} from 'lucide-react'

export interface ModuleConfig {
  key: string
  label: string
  description: string
  icon: LucideIcon
  path: string
  defaultEnabled: boolean
}

export const MODULES: ModuleConfig[] = [
  {
    key: 'community',
    label: 'Spolecznosc',
    description: 'Feed, spaces, posty, dyskusje, katalog czlonkow',
    icon: Users,
    path: '/community',
    defaultEnabled: true,
  },
  {
    key: 'learning',
    label: 'Nauka',
    description: 'Kursy, programy, lekcje, progres, certyfikaty',
    icon: BookOpen,
    path: '/learning',
    defaultEnabled: true,
  },
  {
    key: 'events',
    label: 'Wydarzenia',
    description: 'Webinary, warsztaty, spotkania, kalendarz',
    icon: Calendar,
    path: '/events',
    defaultEnabled: true,
  },
  {
    key: 'resources',
    label: 'Zasoby',
    description: 'Biblioteka materialow, szablony, nagrania',
    icon: FolderOpen,
    path: '/resources',
    defaultEnabled: true,
  },
  {
    key: 'messaging',
    label: 'Wiadomosci',
    description: 'Powiadomienia, wiadomosci prywatne',
    icon: MessageCircle,
    path: '/messaging',
    defaultEnabled: true,
  },
  {
    key: 'billing',
    label: 'Platnosci',
    description: 'Subskrypcje, faktury, plany cenowe',
    icon: CreditCard,
    path: '/billing',
    defaultEnabled: false,
  },
  {
    key: 'automations',
    label: 'Automatyzacje',
    description: 'Workflow po zakupie, onboarding, przypomnienia',
    icon: Zap,
    path: '/automations',
    defaultEnabled: false,
  },
  {
    key: 'analytics',
    label: 'Analityka',
    description: 'Retencja, aktywnosc, ukonczenia, sprzedaz',
    icon: BarChart3,
    path: '/analytics',
    defaultEnabled: false,
  },
]

export const DEFAULT_MODULES = MODULES.filter(m => m.defaultEnabled).map(m => m.key)

export function getModuleByKey(key: string) {
  return MODULES.find(m => m.key === key)
}
