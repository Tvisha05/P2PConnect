# Peer Connect - Implementation Tasks

## Status Legend

- [ ] Not started
- [x] Completed
- [ ] To be refactored

---

## Completed Foundation

### Documentation

- [x] Software Requirements Specification (`docs/srs.md`)
- [x] ER Diagram - 26 tables, Mermaid (`docs/er-diagram.md`)
- [x] Architecture Diagram - 12 Mermaid diagrams (`docs/architecture.md`)
- [x] Use Case Diagram - 33 use cases, 5 actors (`docs/use-case.md`)
- [x] Data Flow Diagrams - Level 0, 1, 2 (`docs/dfd.md`)
- [x] API Reference - 50+ endpoints (`docs/api-reference.md`)
- [x] Project Guide (`CLAUDE.md`)

### Project Setup

- [x] Initialize Next.js with TypeScript, Tailwind CSS, App Router
- [x] Install all dependencies (Prisma, NextAuth, Firebase, Cloudinary, Nodemailer, Zod, etc.)
- [x] Create Prisma schema — 26 tables, 9 enums, indexes, relations
- [x] Push Prisma schema to MongoDB (`prisma db push`)
- [x] Create seed script (default SystemConfig, categories, admin user)
- [x] Set up `.env.example` with all required env vars
- [x] Create `src/lib/prisma.ts` — singleton PrismaClient
- [x] Create `src/lib/firebase.ts` — Realtime DB + Storage clients
- [x] Create `src/lib/cloudinary.ts` — Cloudinary upload client
- [x] Create `src/lib/auth.ts` — NextAuth config (JWT, CredentialsProvider)
- [x] Create `src/lib/email.ts` — Nodemailer transporter
- [x] Create `src/lib/utils.ts` — cn(), formatDate, etc.
- [x] Create `src/lib/validators.ts` — Zod schemas
- [x] Create `src/proxy.ts` — route protection (public/auth/user/admin)
- [x] Create `src/providers/` — AuthProvider, ThemeProvider, NotificationProvider
- [x] Create `src/types/` — TypeScript types, next-auth.d.ts augmentation
- [x] Create root layout with providers (`src/app/layout.tsx`)
- [x] Create `src/app/globals.css` — Tailwind + CSS variables for theming
- [x] Create `.gitignore`

### Auth System

- [x] `POST /api/register` - registration with password hashing
- [x] `POST /api/verify-email` - email verification
- [x] `POST /api/forgot-password` - send reset email
- [x] `POST /api/reset-password` - reset password with token
- [x] `GET/POST /api/auth/[...nextauth]` - NextAuth route
- [x] Auth layout (`src/app/(auth)/layout.tsx`) - centered card, no navbar
- [x] Login page + LoginForm component
- [x] Register page + RegisterForm component
- [x] Forgot password page + form
- [x] Reset password page + form
- [x] Verify email page

### Existing Doubt Infrastructure

- [x] `GET /api/doubts` - list with filters, sorting, pagination, search
- [x] `POST /api/doubts` - create doubt with subject field + auto-add to waiting pool
- [x] `GET /api/doubts/similar` - full-text search suggestions
- [x] `GET /api/doubts/[doubtId]` - get doubt detail
- [x] `PATCH /api/doubts/[doubtId]` - edit doubt (before replies only)
- [x] `DELETE /api/doubts/[doubtId]` - delete doubt (before replies only)
- [x] `GET /api/tags` + `GET /api/tags/search` - tag listing and search
- [x] Public layout (`src/app/(public)/layout.tsx`) - Navbar + Footer
- [x] Navbar component (logo, search, nav links, auth state, theme toggle)
- [x] Footer component
- [x] Home feed page - doubt cards with filters/sorting/pagination
- [x] DoubtCard component
- [x] DoubtFilters component (status, category, tag, urgency, sort)
- [x] SearchInput component with debounce
- [x] Doubt detail page (`doubts/[doubtId]`)
- [x] DoubtDetail component
- [x] User layout (`src/app/(user)/layout.tsx`) - auth-gated
- [x] Post doubt page (`doubts/new`) - form with subject field + similar suggestions
- [x] Tags listing page + tag detail page
- [x] Pagination component

### Realtime Chat (to be migrated to Firebase)

- [ ] `GET /api/doubts/[doubtId]/messages` — paginated chat history
- [ ] `POST /api/doubts/[doubtId]/messages` — send message
- [ ] `PATCH /api/doubts/[doubtId]/messages/[messageId]` — edit message
- [ ] `DELETE /api/doubts/[doubtId]/messages/[messageId]` — soft delete
- [ ] Firebase Realtime Database subscription per doubt (`chats/{doubtId}`)
- [ ] ChatThread component — message list with auto-scroll
- [ ] ChatMessage component — markdown, code, LaTeX rendering
- [ ] ChatInput component — rich input with file upload
- [ ] ChatTypingIndicator component (Firebase Realtime DB)
- [ ] Online/offline presence (Firebase Realtime DB `connectedRef`)
- [ ] Read receipts (Firebase Realtime DB + MessageReadReceipt)
- [ ] Reply-to-message UI
- [ ] File upload in chat (Cloudinary)
- [ ] MessageAttachment display component

### Existing Notification and Admin Base

- [x] `GET /api/notifications` - list notifications (paginated)
- [x] `PATCH /api/notifications` - mark as read
- [x] `GET/PATCH /api/notifications/preferences` - email preferences
- [x] `src/lib/notifications.ts` - createNotification() (in-app + email)
- [x] NotificationProvider - fetch on load + 60s polling
- [x] Notification bell in Navbar with unread count
- [x] Notifications dropdown/page
- [x] Notification preferences page (`settings/notifications`)
- [x] `GET /api/admin/analytics` - dashboard stats
- [x] `GET /api/admin/users` - paginated user list with search
- [x] `PATCH /api/admin/users/[userId]` - ban/unban, change role, adjust karma
- [x] `GET /api/admin/reports` + `PATCH /api/admin/reports/[reportId]` - reports queue
- [x] `PATCH /api/admin/tags/[tagId]` - approve/reject tags
- [x] `GET/POST /api/admin/announcements` + `PATCH/DELETE [id]`
- [x] `GET/PATCH /api/admin/config` - system configuration
- [x] `POST /api/doubts/[doubtId]/report` - report content/user
- [x] Admin layout (`src/app/(admin)/admin/layout.tsx`) - sidebar + topbar
- [x] Admin dashboard page - analytics cards
- [x] User management page - table with search, ban/unban, role change
- [x] Reports page - queue with actions (dismiss, warn, remove, ban)
- [x] Tag approval page - suggested tags with approve/reject
- [x] Announcements page - CRUD
- [x] System config page - edit configurable values
- [x] AnnouncementBanner component (shown to all users)

---

## Academic Profiling

- [x] Restrict registration to `@srmap.edu.in` email addresses only
- [x] Enforce email verification before account activation
- [x] Add academic profile fields: roll number, department, year, semester, strong subjects
- [x] Validate academic profile completeness before allowing doubt routing
- [x] Add profile setup and profile edit flows for academic details
- [x] Persist subject affinity data for matching engine use

---

## Matching Engine Integration

- [x] Implement backend mutual matching algorithm (`src/lib/matching/engine.ts`)
- [x] Support direct pair matching (`A ↔ B`)
- [x] Support circular group matching (`A → B → C → A`, sizes 2–5)
- [x] Build directed graph from strong subjects vs doubt subjects
- [x] Prefer larger groups over smaller ones
- [x] Cycle groups auto-accepted (everyone benefits mutually)
- [x] One-way helper groups require helper confirmation
- [x] Persist match decisions: `MatchProposal`, `MatchGroup`, `MatchGroupMember`
- [x] Add next-best-peer retry (re-runs matching on rejection)
- [x] Matching test script (`scripts/test-matching.ts`)
- [x] Test user seed script (`scripts/seed-test-users.ts`)
- [ ] Expose match logs for debugging and admin review

---

## Doubt Routing Flow

- [x] Add `subject` field to Doubt model (matching key)
- [x] Add subject input to doubt posting form
- [x] `WaitingPool` model — users with unmatched doubts
- [x] Auto-add doubt poster to waiting pool on creation
- [x] Trigger matching engine immediately after doubt posted
- [x] `POST /api/matching/proposals/[id]/accept` — helper accepts
- [x] `POST /api/matching/proposals/[id]/reject` — helper rejects
- [x] `GET /api/matching/proposals` — pending proposals for helper
- [x] `GET /api/matching/pool` — view current waiting pool
- [x] `GET /api/matching/groups` — user's formed groups
- [ ] Replace public doubt feed behavior with private doubt submission
- [ ] Track routed, waiting, matched, in-room, resolved, and expired states
- [ ] Ensure doubt details are only visible to the requester and matched helpers
- [ ] Add server-side guards so no public discovery flow remains

---

## Group Chat & UI

- [x] `GroupMessage` model for group chat messages
- [x] `GET /api/matching/groups/[groupId]/messages` — paginated group chat history
- [x] `POST /api/matching/groups/[groupId]/messages` — send message to group
- [x] Membership verification on all group endpoints
- [x] Groups list page (`/groups`) — shows matched groups + waiting status
- [x] `GroupList` component — group cards with type badge, subjects, members
- [x] Group chat page (`/groups/[groupId]`) — full chat room
- [x] `GroupChat` component — messages, input, member avatars, auto-scroll
- [x] Optimistic message sending
- [x] 3-second polling for new messages
- [x] "My Groups" link in navbar dropdown
- [ ] Firebase Realtime DB for instant message delivery (replace polling)
- [ ] Typing indicators in group chat
- [ ] File upload in group chat (Cloudinary)
- [ ] System messages (user joined, group formed, etc.)

---

## Conditional Notification Logic

- [ ] Notify a matched user only when they are the sole helper available
- [ ] Present sole-helper notifications with Accept / Ignore actions
- [ ] Auto-join newly matched users directly when at least one helper already exists in the group
- [ ] Retry matching with the next-best peer if the sole helper ignores the request
- [ ] Record notification decisions and retry outcomes for each doubt
- [ ] Add timeout handling for unhandled sole-helper requests

---

## Help Room Lifecycle

- [ ] Create temporary Help Room records after acceptance or direct join
- [ ] Implement lifecycle states: `pending_acceptance`, `active`, `resolved`, `expired`
- [ ] Transition rooms from `pending_acceptance` to `active` after acceptance or direct join
- [ ] Move rooms to `resolved` when the doubt is solved
- [ ] Expire inactive rooms automatically after the configured timeout
- [ ] Preserve room metadata for audit, moderation, and analytics

---

## Reputation & Expertise System

- [ ] Award subject-wise karma or expertise score after a doubt is resolved
- [ ] Track reputation changes per subject, department, and overall contribution
- [ ] Log reputation events for every matched help interaction
- [ ] Surface expertise scores to improve future matching decisions
- [ ] Prevent reputation farming with duplicate or low-quality contributions
- [ ] Add admin controls for reputation adjustments when moderation is required

---

## Notification Enhancements

- [ ] Implement in-app notifications for match requests, accepts, ignores, joins, and room updates
- [ ] Add notification delivery for Help Room lifecycle changes
- [ ] Mark notifications read/unread and maintain delivery history
- [ ] Support retries and fallback handling for failed notifications
- [ ] Provide notification preferences for academic help routing events
- [ ] Keep notifications private and scoped to involved participants

---

## Admin Matching Controls

- [ ] Build admin views for match logs and routing outcomes
- [ ] Add subject management tools for departments, subjects, and mapping rules
- [ ] Provide moderation access to private Help Room records and lifecycle events
- [ ] Add reporting and diagnostics for failed matches, ignored requests, and expired rooms
- [ ] Expose analytics for matching efficiency, resolution rates, and expert activity
- [ ] Restrict admin actions with role-based access control

---

## Forum Features To Be Refactored or De-Prioritized

- [ ] Refactor `GET /api/doubts` - no public feed, only private routing-aware access
- [ ] Refactor `POST /api/doubts` - create private routing request instead of public post
- [ ] Refactor `GET /api/doubts/similar` - use for subject routing hints only
- [ ] Refactor `GET /api/doubts/[doubtId]` - private request detail access only
- [ ] Refactor `PATCH /api/doubts/[doubtId]` - edit only while routing is pending
- [ ] Refactor `DELETE /api/doubts/[doubtId]` - delete private request only
- [ ] Refactor `GET /api/tags` and `GET /api/tags/search` for subject metadata only
- [ ] Refactor `Home feed page` into a private help request dashboard
- [ ] Refactor `DoubtCard` component for routing request cards
- [ ] Refactor `DoubtFilters` component for subject and route-state filters
- [ ] Refactor `SearchInput` component for academic subject lookup
- [ ] Refactor `Doubt detail page` (`doubts/[doubtId]`) into private request detail view
- [ ] Refactor `DoubtDetail` component for route state and room links
- [ ] Refactor `Post doubt page` (`doubts/new`) into private help request form
- [ ] Refactor `Tags listing page` and tag detail page into subject management views
- [ ] De-prioritize voting, bookmarking, public leaderboard, and tag social features
- [ ] De-prioritize `POST /api/doubts/[doubtId]/vote`
- [ ] De-prioritize `POST /api/doubts/[doubtId]/messages/[messageId]/vote`
- [ ] De-prioritize `POST /api/doubts/[doubtId]/bookmark`
- [ ] De-prioritize `POST /api/tags/[tagId]/vote`
- [ ] De-prioritize `POST /api/tags/[tagId]/follow`
- [ ] De-prioritize `GET /api/leaderboard`
- [ ] De-prioritize Vote buttons, Bookmark button, Bookmarks page, and Leaderboard page

---

## Final Polish

- [ ] Light/dark theme toggle (next-themes)
- [ ] Responsive design pass - mobile (375px), tablet (768px), desktop (1280px)
- [ ] MobileNav component (hamburger menu)
- [ ] Loading states (skeletons/spinners) for all pages
- [ ] Empty states for lists and room views
- [ ] Error pages (`not-found.tsx`, `error.tsx`)
- [ ] Toast/alert system for user feedback
- [ ] SEO meta tags
- [ ] Security review for private routing, room access, and notifications
- [ ] Vercel deployment configuration
- [ ] Final testing pass
