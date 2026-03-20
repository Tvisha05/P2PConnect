# Peer Connect - Project Guide

## Project Overview

Peer-to-peer academic doubt resolution platform. Students post doubts, helpers claim and resolve them through real-time chat. College project.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: MongoDB via Prisma ORM
- **Auth**: NextAuth (JWT strategy, Credentials provider)
- **Real-time**: Firebase Realtime Database (chat, typing indicators, presence)
- **Storage**: Cloudinary (file uploads)
- **Email**: Nodemailer + Gmail SMTP
- **Styling**: Tailwind CSS, next-themes (light/dark)
- **State**: React useState/useContext only (no external state library)
- **Validation**: Zod
- **Deployment**: Vercel

## Project Structure

```
src/
  app/
    (auth)/        # Login, register, verify, reset password
    (public)/      # Feed, doubt detail, profiles, tags, leaderboard
    (user)/        # Post doubt, bookmarks, activity, settings
    (admin)/admin/ # Dashboard, users, reports, tags, config
    api/           # All API route handlers
  components/
    ui/            # Reusable primitives (Badge, Pagination, etc.)
    layout/        # Navbar, Footer, MobileNav
    auth/          # Auth form components
    doubts/        # Doubt-specific components
    chat/          # Chat components
    profile/       # Profile components
    activity/      # Dashboard components
    leaderboard/   # Leaderboard components
    admin/         # Admin panel components
  hooks/           # Custom React hooks
  lib/             # Utility functions, clients, helpers
    prisma.ts      # Singleton PrismaClient
    firebase.ts    # Firebase app, Realtime DB client
    cloudinary.ts  # Cloudinary upload client
    auth.ts        # NextAuth config
    email.ts       # Nodemailer transporter
    notifications.ts
    karma.ts
    config.ts      # SystemConfig cache
    validators.ts  # Zod schemas
    utils.ts       # cn(), formatDate, etc.
  providers/       # React context providers
  types/           # TypeScript definitions
  middleware.ts    # Route protection (public/auth/user/admin)
prisma/
  schema.prisma    # 26 tables, 9 enums
  seed.ts          # Default config, categories, admin user
docs/              # SRS, ER diagram, architecture, use cases, DFD, API reference
```

## Key Architecture Decisions

- **Doubt lifecycle**: Open -> Claimed -> In Progress (on first message) -> Resolved
- **Chat**: Firebase Realtime Database path per doubt (`chats/{doubtId}/messages`). Listeners for messages, typing indicators at `chats/{doubtId}/typing`, presence via Firebase Realtime Database `connectedRef`.
- **File uploads**: Client uploads to Cloudinary via server-side SDK, gets secure URL back.
- **Karma**: All changes logged in KarmaEvent table. User.karma is denormalized running total. Weights are admin-configurable via SystemConfig.
- **RBAC**: 2-tier — Admin (full) + Moderator (content/reports only). Enforced at middleware + API route level.
- **Notifications**: In-app (fetched on page load + 60s polling) + email (Nodemailer, user-configurable preferences).
- **Rate limiting**: Database-level sliding window via RateLimit table.

## Database

- 26 collections in MongoDB
- Prisma ORM with `@auth/prisma-adapter` for NextAuth
- Text search via Prisma case-insensitive `contains` queries
- `DATABASE_URL` = MongoDB connection string

## Commands

```bash
npm run dev          # Start dev server
npx prisma studio    # Open Prisma Studio (DB browser)
npx prisma db push              # Push schema to MongoDB
npx prisma generate  # Regenerate Prisma client
npx prisma db seed   # Run seed script
```

## Frontend Design

- **Always use the `/frontend-design` skill** when creating or modifying any frontend pages or components. This ensures high design quality and avoids generic AI aesthetics.
- `/frontend-design` handles visual design only. Architecture, state, hooks, and logic follow the code style rules below.

## Code Style & Architecture

### Separation of Concerns — Every File Has One Job

- **Pages (`app/**/page.tsx`)**: Composition roots only. Fetch data on the server, handle params, render components. No business logic, no complex UI. A page should read like a table of contents — under 30 lines.
- **Components (`components/**/*.tsx`)**: Rendering and user interaction. Receive data via props, delegate logic to hooks. A component answers: "What does this look like?"
- **Hooks (`hooks/*.ts`)**: Business logic and state management. Bridge between components and services. A hook answers: "What does this feature do?" Only create hooks when business logic is tangled with rendering, the same logic appears in multiple components, or state + effects form a cohesive unit. Do NOT create hooks just to move a single useState out of a component.
- **Services / Lib (`lib/*.ts`)**: Pure functions and data access. No React, no hooks, no state. Database queries, external APIs, validation, transformations.
- **API Routes (`app/api/**/route.ts`)**: HTTP boundary only. Pattern: authenticate → parse → validate (Zod) → call service → respond. Export separate `GET`, `POST`, `PUT`, `DELETE` — don't branch on method.
- **Server Actions (`app/actions/*.ts`)**: Preferred for mutations from client components (form submissions). Use over client-side fetch to API routes when possible. Use API routes for public REST endpoints, webhooks, or third-party integrations.

### Server vs Client Components

- **Default to Server Components.** Only add `'use client'` when the component needs event handlers, client hooks (useState, useEffect, etc.), or browser APIs.
- **Push `'use client'` as deep as possible.** If a component is mostly static but has one interactive part, extract the interactive piece into its own small client component.
- Use the `server-only` package to enforce boundaries at build time.

### React 19 Patterns

- **Forms**: `useActionState` + `useFormStatus` for every form mutation. No manual `useState + fetch + loading boolean` patterns.
- **Non-blocking updates**: `useTransition` for filtering, sorting, tab switching — anything that shouldn't freeze the UI.
- **Optimistic UI**: `useOptimistic` for predictable outcomes (voting, bookmarking, toggling). Show the result immediately, reconcile on server response.
- **Streaming data**: Pass promises from server components to client components, read with `use()` inside `<Suspense>` boundaries. Avoids waterfalls.

### State Handling — Every Action Has a Lifecycle

Every async operation follows: `idle → pending → success | error`. Map each to UI:

| State | UI |
|-------|---|
| idle | Interactive elements enabled, ready for input |
| pending | Disable trigger + related inputs, show contextual indicator (inline spinner, button text change, skeleton) |
| success | Update data, show confirmation (toast or inline), re-enable UI |
| error | Show error near trigger, re-enable UI for retry |
| blocking | During multi-step processes, disable navigation and conflicting actions |

**Loading states by context:**
- Initial page load → `loading.tsx` with skeleton components matching content layout
- Data refresh → inline spinner near affected data, keep stale content visible
- Form submission → disable all inputs, change submit button text ("Submitting...")
- Destructive actions → confirmation dialog first, then pending with description ("Deleting doubt...")

**Error handling by layer:**
- Field validation → inline errors below each field (Zod), shown on submit or blur (be consistent within a form)
- API errors → toast for transient, inline message for business logic errors
- Unexpected → `error.tsx` error boundary with retry button
- Not found → `not-found.tsx` triggered by `notFound()`

**No boolean soup.** Don't manage related states with independent booleans. Use discriminated unions or let `useActionState` handle it.

### SOLID Principles

- **Single Responsibility**: One component = one visual concern. One hook = one behavioral concern. One service = one data operation.
- **Open/Closed**: Extend via props and composition (`children`, render props, `className`), not modification.
- **Liskov Substitution**: Components sharing a prop interface must be interchangeable.
- **Interface Segregation**: Pass only the data a component needs. `<UserAvatar name={user.name} image={user.image} />` over `<UserAvatar user={user} />`. Exception: 4+ fields from same object → pass the object with a Pick type.
- **Dependency Inversion**: Components → hooks → services. Never call `fetch` or `localStorage` directly from a component.

### Code Readability

- **Naming**: Components `PascalCase` nouns, hooks `use` prefix verbs, server actions `Action` suffix, services `camelCase` verbs, types `PascalCase` nouns, constants `UPPER_SNAKE_CASE`
- **Structure**: One component per file, early returns for guard clauses, destructure props in signature, functions under 40 lines, no nested ternaries
- **Imports**: `@/` alias, grouped (React/Next → third-party → libs → components → types), no barrel files unless 5+ exports

### Anti-patterns to Avoid

- God components (>150 lines) — extract hooks + sub-components
- `useEffect` for data fetching — use server components or server actions
- Prop drilling past 2 levels — use context or component composition
- Client components for static content — if no interactivity, keep it a server component
- Premature abstraction — three similar components is fine, don't build a `GenericCard` with 15 config props

## Conventions

- All API routes use Zod validation on request body
- All admin routes check role via `requireRole()` helper
- Karma changes always go through `updateKarma()` in `lib/karma.ts` (creates KarmaEvent + updates User atomically)
- Notifications always go through `createNotification()` in `lib/notifications.ts` (handles in-app + email)
- File paths use `@/` alias for `src/`
- Components are organized by feature domain, not by type
- No external state management — use React context for auth, theme, notifications

## Documentation

All docs are in `docs/` with Mermaid diagrams:
- `srs.md` — Software Requirements Specification
- `er-diagram.md` — Entity-Relationship Diagram (26 tables)
- `architecture.md` — System architecture, auth flow, chat flow, deployment
- `use-case.md` — 33 use cases across 5 actor types
- `dfd.md` — Level 0, Level 1, Level 2 Data Flow Diagrams
- `api-reference.md` — 50+ API endpoints with full specs
