'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/shared/ui/select'
import { PRODUCT_TYPE_LABELS, generateSlug } from '@/modules/training/products/types'
import type { Product, ProductType } from '@/modules/training/products/types'
import { Image, Link2 } from 'lucide-react'

interface ProductFormProps {
  workspaceSlug: string
  workspaceId: string
  product?: Product | null
  action: (workspaceId: string, formData: FormData) => Promise<{ data?: unknown; error?: string; success?: boolean }>
  actionWithProduct?: (workspaceId: string, productId: string, formData: FormData) => Promise<{ error?: string; success?: boolean }>
}

export function ProductForm({ workspaceSlug, workspaceId, product, action, actionWithProduct }: ProductFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(product?.name || '')
  const [slug, setSlug] = useState(product?.slug || '')
  const [slugManual, setSlugManual] = useState(false)

  const isEdit = !!product

  // Auto-generate slug from name (unless manually edited)
  useEffect(() => {
    if (!slugManual && !isEdit) {
      setSlug(generateSlug(name))
    }
  }, [name, slugManual, isEdit])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Inject slug if editing
    if (isEdit && slug !== product?.slug) {
      formData.set('slug', slug)
    }

    let result
    if (isEdit && actionWithProduct && product) {
      result = await actionWithProduct(workspaceId, product.id, formData)
    } else {
      result = await action(workspaceId, formData)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (!isEdit && result && 'data' in result && result.data) {
      const created = result.data as { id: string }
      router.push(`/app/${workspaceSlug}/admin/products/${created.id}`)
    } else {
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    }

    setLoading(false)
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">
          Zapisano pomyslnie
        </div>
      )}

      {/* Name + auto-slug */}
      <div className="space-y-2">
        <Label htmlFor="name">Nazwa produktu</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="np. Kurs podstaw zarzadzania"
          required
          maxLength={200}
        />
      </div>

      {/* Slug (editable in edit mode) */}
      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="slug">
            <span className="flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" />
              Slug (URL)
            </span>
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
            placeholder="kurs-podstaw-zarzadzania"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            URL: /learning/{slug || '...'}
          </p>
        </div>
      )}

      {/* Type (only on create) */}
      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="type">Typ produktu</Label>
          <Select name="type" defaultValue="course">
            <SelectTrigger>
              <SelectValue placeholder="Wybierz typ" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PRODUCT_TYPE_LABELS) as [ProductType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Typ nie moze byc zmieniony po utworzeniu</p>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product?.description || ''}
          placeholder="Opisz czego nauczy sie uczestnik, jakie umiejetnosci zdobedzie..."
          rows={5}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground">Max 5000 znakow. Widoczny na stronie produktu.</p>
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label htmlFor="visibility">Widocznosc</Label>
        <Select name="visibility" defaultValue={product?.visibility || 'members'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Publiczny - widoczny na landing page</SelectItem>
            <SelectItem value="members">Czlonkowie - widoczny po zalogowaniu</SelectItem>
            <SelectItem value="private">Prywatny - widoczny tylko po zapisie</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cover image URL */}
      <div className="space-y-2">
        <Label htmlFor="cover_image_url">
          <span className="flex items-center gap-1">
            <Image className="h-3.5 w-3.5" />
            Obrazek okladki (URL)
          </span>
        </Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          defaultValue={product?.cover_image_url || ''}
          placeholder="https://..."
          type="url"
        />
        {product?.cover_image_url && (
          <div
            className="w-full h-32 rounded-lg bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${product.cover_image_url})` }}
          />
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utworz produkt'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}
