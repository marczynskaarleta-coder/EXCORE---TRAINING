# eXcore Training - Architektura i Ustalenia

## Spis tresci
1. [Stack technologiczny](#stack)
2. [Struktura katalogow](#struktura)
3. [Model danych (SQL)](#model-danych)
4. [System dostepu](#system-dostepu)
5. [Permission matrix](#permission-matrix)
6. [Entitlement engine](#entitlement-engine)
7. [Routing](#routing)
8. [Import rules](#import-rules)
9. [Konwencje plikow](#konwencje)
10. [Edge cases](#edge-cases)
11. [Plan rozwoju](#plan-rozwoju)

---

## 1. Stack technologiczny <a name="stack"></a>

| Warstwa | Technologia |
|---------|-------------|
| Framework | Next.js 16 + App Router + Server Actions |
| Jezyk | TypeScript (strict) |
| Baza danych | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Walidacja | Zod v4 |
| UI | Tailwind CSS 4 + shadcn/ui (Base UI) |
| Rich text | Tiptap (zainstalowany, nie podpiety) |
| Email | Resend (skonfigurowany, nie podlaczony) |
| Ikony | Lucide React |

---

## 2. Struktura katalogow <a name="struktura"></a>

```
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Login, register
│   ├── (app)/app/
│   │   ├── select/                   # Workspace selector
│   │   └── [workspaceSlug]/          # Workspace-scoped routes
│   │       ├── dashboard/
│   │       ├── learning/
│   │       ├── community/
│   │       ├── events/
│   │       ├── resources/
│   │       └── settings/             # (placeholder)
│   ├── auth/callback/                # OAuth callback
│   └── admin/                        # (placeholder)
│
├── modules/
│   ├── shared/                       # Platform core
│   │   ├── access/                   # CENTRALNY SYSTEM DOSTEPU
│   │   │   ├── types.ts              # PlatformRole, Permission, AccessDecision
│   │   │   ├── roles.ts              # Permission matrix, role hierarchy
│   │   │   ├── repository.ts         # DB queries: membership, entitlements
│   │   │   ├── engine.ts             # buildAccessContext, canAccessResource, explain
│   │   │   ├── guards.ts             # requireAuth, requirePermission, requireResourceAccess
│   │   │   └── index.ts              # Public API
│   │   ├── auth/actions.ts           # signIn, signUp, signOut, getCurrentUser
│   │   ├── workspace/actions.ts      # CRUD workspace, members
│   │   ├── notifications/actions.ts  # In-app notifications
│   │   └── rbac/permissions.ts       # Backward compat re-exports
│   │
│   ├── training/                     # Domena edukacyjna (10 modulow)
│   │   ├── products/                 # Katalog produktow
│   │   ├── plans/                    # Plany cenowe
│   │   ├── enrollments/              # Zapisy
│   │   ├── entitlements/             # Warstwa dostepu (operacje CRUD)
│   │   ├── learning/                 # Programy, moduly, lekcje, progress
│   │   ├── community/               # Spaces, posty, komentarze, reakcje
│   │   ├── events/                   # Wydarzenia, rejestracje
│   │   ├── certificates/             # Certyfikaty
│   │   ├── resources/                # Biblioteka materialow
│   │   └── analytics/                # Statystyki
│   │
│   └── operations/                   # Placeholder: przyszla domena TSL/Finance
│
├── components/
│   ├── shared/
│   │   ├── ui/                       # shadcn/ui (badge, button, input, label)
│   │   └── layout/                   # header, sidebar
│   └── training/                     # (placeholder)
│
└── lib/
    └── shared/
        ├── supabase/                 # client.ts, server.ts
        ├── utils.ts                  # cn() helper
        └── modules.ts               # Module registry
```

---

## 3. Model danych (SQL) <a name="model-danych"></a>

### Migracje
- `001_foundation.sql` - workspaces, members, roles, tags, RLS helpers
- `005_training_domain_v2.sql` - pelny model domeny Training (zastepuje 002-004)

### Diagram relacji

```
workspaces
  │
  ├── products (type, status, visibility, metadata)
  │     ├── product_plans (billing_type, price, interval)
  │     ├── product_tags -> tags
  │     ├── programs (name, status)
  │     │     └── program_modules (title, sort_order, drip)
  │     │           └── lessons (type, content, video, quiz)
  │     │                 └── lesson_progress (status, %, quiz_score)
  │     └── enrollments (source, status, progress_percent)
  │           └── entitlements (resource_type, resource_id, active_until)
  │
  ├── events (type, status, starts_at, capacity)
  │     └── event_registrations (status, attended_at)
  │
  ├── certificates (product_id?, program_id?, certificate_number)
  │
  ├── community_spaces -> posts -> comments, reactions
  ├── resources + resource_tags
  ├── notifications
  └── activity_feed
```

### Kluczowe tabele

| Tabela | Klucze | Cel |
|--------|--------|-----|
| `products` | workspace_id, type, status, visibility | Katalog: kurs, membership, cohort, bundle... |
| `product_plans` | product_id, billing_type, price_amount | Warianty cenowe per produkt |
| `enrollments` | product_id, user_id (UNIQUE), source, status | Zapis usera na produkt |
| `entitlements` | user_id, resource_type, resource_id, status | "User X ma dostep do Y do daty Z" |
| `programs` | product_id, status | Kontener na moduly/lekcje w produkcie |
| `program_modules` | program_id, sort_order | Rozdzial/sekcja programu |
| `lessons` | module_id, type, is_free_preview | Jednostka tresci |
| `lesson_progress` | lesson_id, user_id, enrollment_id, status | Sledzenie postepu |
| `events` | workspace_id, product_id?, type, status | Webinar, warsztat, dyzur |
| `event_registrations` | event_id, user_id (UNIQUE) | RSVP na wydarzenie |
| `certificates` | user_id, product_id?, program_id? | Certyfikat ukonczenia |

### Enumy SQL

```sql
product_type:       course, membership, cohort_program, mentoring_program, resource_hub, bundle, community_access
product_status:     draft, published, archived
product_visibility: public, members, private
billing_type:       free, one_time, subscription, custom
enrollment_source:  purchase, manual, invite, corporate_assignment, automation
enrollment_status:  active, completed, paused, cancelled, expired
entitlement_status: active, expired, revoked
program_status:     draft, published, archived
lesson_type:        video, text, audio, quiz, assignment, live_session, download, embed
lesson_progress_status: not_started, in_progress, completed
event_type:         live, webinar, office_hours, workshop, onsite
event_status:       draft, scheduled, live, completed, cancelled
registration_status: registered, waitlisted, cancelled, attended, no_show
```

### RLS Strategy

RLS = siatka bezpieczenstwa, NIE jedyna warstwa logiki.

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|---------------------|
| products | workspace members, deleted_at IS NULL | admins only |
| enrollments | own user_id only | admins only |
| entitlements | own user_id only | admins only |
| lessons | published OR free_preview | admins only |
| lesson_progress | own user_id | own user_id |
| events | workspace members, deleted_at IS NULL | admins only |
| event_registrations | own user_id | own user_id (register), admins (manage) |
| certificates | own user_id + public verify | admins only |

Logika biznesowa (kto moze co robic) zyje w `access/engine.ts`, NIE w RLS.

---

## 4. System dostepu <a name="system-dostepu"></a>

### Architektura

```
                    ┌─────────────────────────┐
                    │     Server Action /      │
                    │     Route Handler /      │
                    │     Server Component     │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   guards.ts              │
                    │   requirePermission()    │
                    │   requireResourceAccess()│
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   engine.ts              │
                    │   buildAccessContext()   │
                    │   canAccessResource()    │
                    │   hasPermission()        │
                    └──────┬──────────┬───────┘
                           │          │
              ┌────────────▼──┐ ┌─────▼──────────┐
              │   roles.ts    │ │  repository.ts  │
              │   permission  │ │  DB queries:    │
              │   matrix      │ │  membership,    │
              │   hierarchy   │ │  entitlements   │
              └───────────────┘ └────────────────┘
```

### Decision flow (canAccessResource)

```
1. Pobierz membership (system_role + custom role slug)
2. Resolve PlatformRole (owner > admin > manager > trainer > moderator > member)
3. Role bypass: management roles (owner/admin/manager/trainer) maja pelny dostep
4. Lesson? -> resolve chain: lesson -> module -> program -> product
5. Free preview? -> granted
6. Product visibility = public? -> granted
7. Entitlement check (tabela entitlements: user + resource_type + resource_id + status=active)
8. Entitlement expired? -> denied
9. Product visibility = members? -> catalog browse allowed
10. Default: denied
```

### Gdzie wywoływac

| Kontekst | Metoda | Przyklad |
|----------|--------|---------|
| Server Action (CRUD) | `requirePermission()` | `const auth = await requirePermission(wsId, 'product.create')` |
| Server Action (content) | `requireResourceAccess()` | `const auth = await requireResourceAccess(wsId, 'lesson', lessonId)` |
| Server Component (page) | `buildAccessContext()` | `const ctx = await buildAccessContext(wsId, userId)` |
| Server Component (UI) | `hasPermission(ctx, ...)` | `{hasPermission(ctx, 'product.create') && <CreateButton />}` |
| Admin debug | `explainAccessDecision()` | Pelny breakdown: rola, permissions, entitlements, checks |

---

## 5. Permission matrix <a name="permission-matrix"></a>

Role z dziedziczeniem (kazda rola ma swoje + wszystkie nizsze):

| Permission | member | corporate | moderator | trainer | manager | admin | owner |
|------------|--------|-----------|-----------|---------|---------|-------|-------|
| product.view | x | x | x | x | x | x | x |
| product.create | | | | x | x | x | x |
| product.edit | | | | x | x | x | x |
| product.delete | | | | | x | x | x |
| product.publish | | | | x | x | x | x |
| program.view | x | x | x | x | x | x | x |
| program.create | | | | x | x | x | x |
| program.edit | | | | x | x | x | x |
| lesson.view | x | x | x | x | x | x | x |
| lesson.create | | | | x | x | x | x |
| lesson.edit | | | | x | x | x | x |
| lesson.grade | | | | x | x | x | x |
| enrollment.view_own | x | x | x | x | x | x | x |
| enrollment.view_all | | x | | x | x | x | x |
| enrollment.create | | x | | | x | x | x |
| enrollment.cancel | | x | | | x | x | x |
| event.view | x | x | x | x | x | x | x |
| event.create | | | | x | x | x | x |
| event.edit | | | | x | x | x | x |
| event.register | x | x | x | x | x | x | x |
| community.view | x | x | x | x | x | x | x |
| community.post | x | x | x | x | x | x | x |
| community.moderate | | | x | | x | x | x |
| community.manage_spaces | | | x | | x | x | x |
| resource.view | x | x | x | x | x | x | x |
| resource.create | | | | x | x | x | x |
| resource.edit | | | | x | x | x | x |
| certificate.view_own | x | x | x | x | x | x | x |
| certificate.issue | | | | x | x | x | x |
| certificate.manage_templates | | | | | x | x | x |
| analytics.view | | x | | x | x | x | x |
| analytics.export | | | | | x | x | x |
| members.view | x | x | x | x | x | x | x |
| members.invite | | | | | x | x | x |
| members.manage | | | | | x | x | x |
| roles.manage | | | | | | x | x |
| settings.manage | | | | | | x | x |
| billing.manage | | | | | | x | x |

---

## 6. Entitlement engine <a name="entitlement-engine"></a>

### Jak powstaja entitlements

```
Enrollment created (source: purchase/manual/invite/...)
  └── grantEntitlement({
        resource_type: 'product',
        resource_id: product_id,
        source_type: 'enrollment',
        source_id: enrollment_id,
        active_until: expires_at  // z planu lub null (bezterminowo)
      })

Bundle enrollment
  └── for each sub-product:
        grantEntitlement({ resource_type: 'product', resource_id: sub_product_id, ... })

Manual grant (admin)
  └── grantEntitlement({ source_type: 'manual_grant', ... })

Subscription renewal
  └── update entitlement.active_until
```

### Jak sprawdzac dostep

```typescript
// Server action - wymaga permission do operacji
const auth = await requirePermission(workspaceId, 'product.create')
if ('error' in auth) return auth

// Server action - wymaga dostepu do zasobu
const auth = await requireResourceAccess(workspaceId, 'lesson', lessonId)
if ('error' in auth) return auth

// Server component - buduj kontekst raz
const ctx = await buildAccessContext(workspaceId, userId)
// Potem w renderze:
if (hasPermission(ctx, 'event.create')) { ... }

// Admin debug
const explanation = await explainAccessDecision(userId, workspaceId, 'product', productId)
// Returns: { decision, context: { role, permissions, entitlements } }
```

---

## 7. Routing <a name="routing"></a>

```
Publiczne (bez auth):
  /                              Landing page
  /login                         Logowanie
  /register                      Rejestracja

Auth (zalogowany, bez workspace):
  /app/select                    Wybor workspace

Workspace (auth + member):
  /app/[workspaceSlug]/
    dashboard/                   Dashboard z KPI
    learning/                    Katalog produktow
    learning/[productId]/        Detail produktu (TODO)
    learning/[productId]/[lessonId]/  Widok lekcji (TODO)
    community/                   Feed spolecznosci
    community/[spaceId]/         Widok space (TODO)
    events/                      Lista wydarzen
    events/[eventId]/            Detail eventu (TODO)
    resources/                   Biblioteka zasobow
    messaging/                   DM (TODO)
    billing/                     Subskrypcje (TODO)
    settings/                    Ustawienia (TODO)

Admin (super_admin):
  /admin/workspaces/             (TODO)
  /admin/users/                  (TODO)
```

---

## 8. Import rules <a name="import-rules"></a>

```
modules/shared/access/  ->  lib/shared/ only
modules/shared/*/       ->  lib/shared/ + shared/access/
modules/training/*/     ->  lib/shared/ + modules/shared/
components/shared/      ->  lib/shared/ + modules/shared/
app/ (pages)            ->  all layers

NIGDY:
  shared/ -> training/ (dependency inversion)
  training/X/ -> training/Y/ (lateral coupling) - WYJATKI: enrollments/repository w learning/actions
```

---

## 9. Konwencje plikow <a name="konwencje"></a>

Kazdy modul training/ ma:
- `types.ts` - interfejsy, enumy, labels
- `schemas.ts` - Zod v4 validation
- `repository.ts` - czyste DB queries (NIE 'use server')
- `actions.ts` - server actions ('use server'), business logic
- (usuniety) ~~permissions.ts~~ - zastapiony przez shared/access/

Zod v4 uwagi:
- `error.issues[0].message` (nie `errors`)
- `z.record(z.string(), z.unknown())` (wymaga 2 args)

---

## 10. Edge cases <a name="edge-cases"></a>

| Case | Rozwiazanie |
|------|-------------|
| User w 2 workspace'ach | Enrollment per user_id + product_id (nie per workspace member) |
| Bundle enrollment | Jeden enrollment na bundle, wiele entitlements na sub-products |
| Expired subscription | Entitlement.active_until < now() -> denied |
| Free preview lesson | Sprawdzane PRZED entitlement check - zawsze granted |
| Product visibility: public | Widoczny bez enrollment (katalog), content wymaga enrollment |
| Product visibility: members | Listing widoczny dla workspace members, content wymaga enrollment |
| Product visibility: private | Widoczny TYLKO dla enrolled |
| Admin edytuje draft | Management roles bypass entitlement check |
| Corporate B2B | corporate_client_admin moze enrollment.create dla swoich ludzi |
| Soft-deleted product | RLS filtruje deleted_at IS NULL, admins widza wszystko |
| Lesson w nieopublikowanym module | Tylko management roles widza |

---

## 11. Plan rozwoju <a name="plan-rozwoju"></a>

### Sprint 1 - Core views
- Product detail page
- Lesson viewer z access check
- Community space page
- Event detail + registration

### Sprint 2 - Admin
- Product creation/edit form
- Settings pages
- Member management
- Enrollment management

### Sprint 3 - Rich features
- TipTap editor (lesson content, posts)
- File upload (Supabase Storage)
- Email (Resend): zaproszenia, powiadomienia
- Search

### Sprint 4 - Billing
- Plans SQL migration (juz jest tabela)
- Stripe integration
- Enrollment on purchase flow
- Auto-entitlement on payment

### Sprint 5 - Analytics & polish
- Analytics dashboard
- Certificate PDF generation
- Activity feed
- Seed data
- Vercel deploy
