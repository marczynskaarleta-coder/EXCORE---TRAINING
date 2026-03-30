'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/modules/shared/auth/actions'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">EXCORE Training</h1>
          <p className="text-muted-foreground">Stworz konto</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Imie i nazwisko</Label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="Jan Kowalski"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jan@firma.pl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Haslo</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Tworzenie konta...' : 'Zaloz konto'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Masz juz konto?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Zaloguj sie
          </Link>
        </p>
      </div>
    </div>
  )
}
