<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

# EXCORE Training

Platforma edukacyjna dla firm szkoleniowych.

## Stack
- Next.js 16 + App Router + TypeScript
- Supabase (Auth, DB, RLS, Storage)
- Tailwind CSS 4 + shadcn/ui (Radix)
- Tiptap (rich text editor)
- Resend (email)
- Lucide (icons)

## Architecture
- 5-layer: Tenant > Identity > Products > Experience > Billing
- Multi-tenant via workspaces with RLS
- Products engine (8 types: course, membership, cohort, event_series, resource_hub, mentoring, community_access, bundle)
- Community module with spaces, posts, reactions, DMs
- RBAC + business roles per product

## Conventions
- Server Actions in /src/lib/actions/
- Supabase clients in /src/lib/supabase/
- Feature-based component folders
- Polish UI labels
- All dates in Europe/Warsaw timezone
