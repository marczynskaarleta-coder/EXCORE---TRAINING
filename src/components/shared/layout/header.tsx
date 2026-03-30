'use client'

import { signOut } from '@/modules/shared/auth/actions'
import { Button } from '@/components/shared/ui/button'
import { LogOut, Search } from 'lucide-react'

interface HeaderProps {
  displayName: string
  avatarUrl?: string | null
}

export function Header({ displayName }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Szukaj..."
            className="pl-9 pr-4 py-1.5 text-sm rounded-md border bg-background w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{displayName}</span>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  )
}
