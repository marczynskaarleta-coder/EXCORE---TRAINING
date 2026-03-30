<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

# EXCORE Training

Platforma edukacyjna dla firm szkoleniowych.

## Stack
- Next.js 16 + App Router + TypeScript
- Supabase (Auth, DB, RLS, Storage)
- Tailwind CSS 4 + shadcn/ui (Base UI)
- Stripe (payments, subscriptions)
- Tiptap (rich text - zainstalowany)
- Resend (email)
- Zod v4 (validation)
- Lucide (icons)

## Architecture
- Multi-tenant via workspaces with RLS
- Central access engine (roles + entitlements)
- Products engine (7 types) with plans, enrollments, entitlements
- Learning engine (programs > modules > lessons > progress)
- Community (spaces, posts, comments, reactions)
- Events (5 types, registration, replay)
- Billing (Stripe checkout, webhooks, fulfillment)
- Automations (13 predefined workflows, execution engine)

## Module Structure
- `src/modules/shared/` - Platform core:
  - access/ - Central access engine (roles, permissions, entitlements, guards)
  - auth/ - Login, register, session
  - workspace/ - Workspace CRUD, members
  - notifications/ - In-app notifications
- `src/modules/training/` - Training domain (11 modules):
  - products/ - Product catalog, CRUD, plans CRUD
  - plans/ - Types and labels only (plan CRUD in products/)
  - enrollments/ - Enrollment lifecycle
  - entitlements/ - Entitlement CRUD operations
  - learning/ - Programs, modules, lessons, progress
  - community/ - Spaces, posts, comments, reactions
  - events/ - Events, registrations, attendance
  - certificates/ - Issue, verify
  - resources/ - File library, downloads
  - analytics/ - Workspace and product stats
  - billing/ - Stripe integration, checkout, fulfillment, transactions
  - automations/ - Workflow templates, execution engine, cron
- `src/modules/operations/` - Placeholder for future domain
- `src/components/shared/` - shadcn/ui (14 components), layout
- `src/components/training/` - Domain UI (products, learning, community, billing, automations)
- `src/lib/shared/` - Supabase clients, utils, module registry

## Module File Convention
- `types.ts` - TypeScript interfaces, enums, labels
- `schemas.ts` - Zod v4 validation (issues not errors, record needs 2 args)
- `repository.ts` - Data access (Supabase queries, NO 'use server')
- `actions.ts` - Server actions ('use server', business logic, permission checks)
- NO individual permissions.ts - all access via shared/access/

## Import Rules
- Pages -> modules/ + components/
- training/ -> shared/ (allowed)
- training/ -> training/ sibling (minimized, documented exceptions only):
  - learning/ -> enrollments/repository (progress recalc)
  - billing/ -> enrollments/repository (fulfillment)
  - learning,billing -> automations/engine (dynamic import, fire triggers)
- shared/ NEVER imports from training/
- All DB via @/lib/shared/supabase/server or /client
- All access via @/modules/shared/access
- All utils via @/lib/shared/utils

## Conventions
- Polish UI labels
- Europe/Warsaw timezone
- Soft delete (deleted_at) on products, events, posts, comments
- Stripe webhook idempotency via stripe_webhook_events table
