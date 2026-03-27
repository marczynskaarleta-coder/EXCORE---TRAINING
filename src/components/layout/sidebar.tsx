'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, BookOpen, Calendar,
  FolderOpen, MessageCircle, CreditCard, Settings,
  Bell
} from 'lucide-react'

interface SidebarProps {
  workspaceSlug: string
  workspaceName: string
  enabledModules: string[]
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'community', label: 'Spolecznosc', icon: Users, path: '/community' },
  { key: 'learning', label: 'Nauka', icon: BookOpen, path: '/learning' },
  { key: 'events', label: 'Wydarzenia', icon: Calendar, path: '/events' },
  { key: 'resources', label: 'Zasoby', icon: FolderOpen, path: '/resources' },
  { key: 'messaging', label: 'Wiadomosci', icon: MessageCircle, path: '/messaging' },
  { key: 'billing', label: 'Platnosci', icon: CreditCard, path: '/billing' },
]

export function Sidebar({ workspaceSlug, workspaceName, enabledModules }: SidebarProps) {
  const pathname = usePathname()
  const base = `/app/${workspaceSlug}`

  const visibleItems = NAV_ITEMS.filter(
    item => item.key === 'dashboard' || enabledModules.includes(item.key)
  )

  return (
    <aside className="w-64 h-screen bg-card border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg truncate">{workspaceName}</h2>
        <p className="text-xs text-muted-foreground">EXCORE Training</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {visibleItems.map(item => {
          const href = `${base}${item.path}`
          const active = pathname.startsWith(href)
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t space-y-1">
        <Link
          href={`${base}/notifications`}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          Powiadomienia
        </Link>
        <Link
          href={`${base}/settings/general`}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Ustawienia
        </Link>
      </div>
    </aside>
  )
}
