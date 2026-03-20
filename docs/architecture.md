# System Architecture

## Peer Connect - Architecture Document

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        NextFE["Next.js Frontend<br/>(React, Tailwind CSS)"]
        FirebaseClient["Firebase Client<br/>(Realtime DB)"]
    end

    subgraph Vercel["Vercel (Deployment)"]
        NextAPI["Next.js API Routes<br/>(Server-side)"]
        MW["Middleware<br/>(Auth + RBAC)"]
        SSR["Server Components<br/>(SSR/RSC)"]
    end

    subgraph Services["Cloud Services"]
        Mongo["MongoDB<br/>(Primary Database)"]
        Firebase["Firebase Realtime DB<br/>(WebSocket Server)"]
        Cloudinary["Cloudinary<br/>(Media Storage)"]
    end

    subgraph External["External Services"]
        Gmail["Gmail SMTP<br/>(Nodemailer)"]
        Cron["Vercel Cron<br/>(Auto-resolve)"]
    end

    NextFE -->|"HTTP Requests"| MW
    MW -->|"Route to"| NextAPI
    MW -->|"Route to"| SSR
    NextAPI -->|"Prisma ORM"| Mongo
    SSR -->|"Prisma ORM"| Mongo
    NextAPI -->|"Upload API"| Cloudinary
    FirebaseClient <-->|"WebSocket"| Firebase
    NextAPI -->|"Send Email"| Gmail
    Cron -->|"POST /api/cron"| NextAPI

    style Client fill:#e3f2fd,stroke:#1565c0
    style Vercel fill:#e8f5e9,stroke:#2e7d32
    style Services fill:#fff3e0,stroke:#e65100
    style External fill:#f3e5f5,stroke:#7b1fa2
```

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ (App Router) | UI rendering, routing, server components |
| **Language** | TypeScript | Type safety across frontend and backend |
| **Styling** | Tailwind CSS + next-themes | Utility-first CSS, light/dark theme |
| **Auth** | NextAuth.js (v4) | Session management, JWT, credentials provider |
| **ORM** | Prisma | Type-safe database access |
| **Database** | MongoDB (via Prisma) | Primary data store |
| **Real-time** | Firebase Realtime Database | Live chat, typing indicators, presence |
| **Storage** | Cloudinary | File/image uploads (doubt attachments, chat files, avatars) |
| **Email** | Nodemailer + Gmail SMTP | Verification, notifications, announcements |
| **State** | React useState/useContext | Client-side state (no external library) |
| **Validation** | Zod | Schema validation for API inputs |
| **Deployment** | Vercel | Hosting, serverless functions, cron jobs |

---

## 3. Application Layer Architecture

```mermaid
graph LR
    subgraph Presentation["Presentation Layer"]
        Pages["Pages<br/>(App Router)"]
        Layouts["Layouts<br/>(auth, public, user, admin)"]
        Components["React Components"]
    end

    subgraph Business["Business Logic Layer"]
        API["API Route Handlers"]
        Hooks["Custom Hooks"]
        Providers["Context Providers"]
        Lib["Lib Utilities<br/>(karma, notifications, config)"]
    end

    subgraph Data["Data Access Layer"]
        Prisma["Prisma Client"]
        FirebaseSDK["Firebase Client"]
        CloudinarySDK["Cloudinary SDK"]
        Mailer["Nodemailer"]
    end

    subgraph Storage["Storage Layer"]
        DB["MongoDB"]
        FirebaseRT["Firebase Realtime DB"]
        CloudinaryCDN["Cloudinary CDN"]
        SMTP["Gmail SMTP"]
    end

    Pages --> Components
    Pages --> Hooks
    Components --> Hooks
    Components --> Providers
    Hooks --> API
    API --> Lib
    API --> Prisma
    API --> CloudinarySDK
    Hooks --> FirebaseSDK
    Lib --> Prisma
    Lib --> Mailer
    Prisma --> DB
    FirebaseSDK --> FirebaseRT
    CloudinarySDK --> CloudinaryCDN
    Mailer --> SMTP
```

---

## 4. Authentication Architecture

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as Middleware
    participant API as API Routes
    participant NA as NextAuth
    participant DB as MongoDB
    participant Email as Gmail SMTP

    Note over B,Email: Registration Flow
    B->>API: POST /api/register (name, email, password)
    API->>API: Validate with Zod
    API->>API: Hash password (bcrypt)
    API->>DB: Create User (emailVerified: null)
    API->>DB: Create VerificationToken
    API->>Email: Send verification email
    API->>B: 200 OK (check your email)

    Note over B,Email: Email Verification
    B->>API: GET /api/verify-email?token=xxx
    API->>DB: Find & validate token
    API->>DB: Set emailVerified = now()
    API->>B: Redirect to /login?verified=true

    Note over B,Email: Login Flow
    B->>NA: POST /api/auth/callback/credentials
    NA->>DB: Find user by email
    NA->>NA: Verify password (bcrypt)
    NA->>NA: Check emailVerified & isBanned
    NA->>NA: Generate JWT (id, role, karma)
    NA->>B: Set session cookie

    Note over B,Email: Protected Route Access
    B->>MW: Request to /doubts/new
    MW->>MW: Read JWT from cookie
    MW->>MW: Check auth + role
    MW->>API: Forward request (authorized)
```

### Auth Configuration

- **Strategy**: JWT (stateless, Vercel edge-compatible)
- **Session duration**: 30 days
- **JWT payload**: `{ id, email, name, role, karma, image }`
- **Provider**: CredentialsProvider (email + password)
- **Password hashing**: bcrypt (12 rounds)
- **Token generation**: `crypto.randomUUID()`

### Middleware Route Protection

| Route Group | Access Rule |
|-------------|------------|
| `(auth)/*` (login, register, etc.) | If already authenticated → redirect to `/` |
| `(public)/*` (feed, doubt detail, etc.) | Open to all |
| `(user)/*` (post doubt, bookmarks, etc.) | Must be authenticated → else redirect to `/login` |
| `(admin)/*` (dashboard, config, etc.) | Must be ADMIN or MODERATOR → else redirect to `/` |

---

## 5. Real-time Chat Architecture

```mermaid
sequenceDiagram
    participant Seeker as Seeker Browser
    participant API as API Route
    participant DB as MongoDB
    participant Firebase as Firebase Realtime DB
    participant Helper as Helper Browser

    Note over Seeker,Helper: Listener Setup
    Seeker->>Firebase: Listen to "doubts/{doubtId}/messages"
    Helper->>Firebase: Listen to "doubts/{doubtId}/messages"
    Seeker->>Firebase: Set presence (online)
    Helper->>Firebase: Set presence (online)

    Note over Seeker,Helper: Sending a Message
    Seeker->>API: POST /api/doubts/{id}/messages
    API->>DB: INSERT into Message collection
    API->>Firebase: Write message to "doubts/{doubtId}/messages"
    Firebase->>Seeker: onValue/onChildAdded event
    Firebase->>Helper: onValue/onChildAdded event

    Note over Seeker,Helper: Typing Indicator
    Seeker->>Firebase: Write to "doubts/{doubtId}/typing/{userId}"
    Firebase->>Helper: onValue event (typing status)

    Note over Seeker,Helper: Read Receipt
    Helper->>Firebase: Write to "doubts/{doubtId}/readReceipts/{userId}"
    Helper->>API: PATCH /api/.../messages (persist readAt)
    Firebase->>Seeker: onValue event (read receipt)

    Note over Seeker,Helper: Presence
    Firebase->>Seeker: onValue (Helper online)
    Firebase->>Helper: onValue (Seeker online)
```

### Firebase Realtime DB Structure

Each active doubt chat uses a path: `doubts/{doubtId}/`

| Feature | Mechanism | Persisted? |
|---------|-----------|-----------|
| New messages | Firebase listener on `doubts/{doubtId}/messages` (onChildAdded) | Yes (MongoDB + Firebase) |
| Edited messages | Firebase listener on `doubts/{doubtId}/messages` (onChildChanged) | Yes (MongoDB + Firebase) |
| Typing indicators | Firebase write to `doubts/{doubtId}/typing/{userId}` | No (ephemeral, auto-cleared) |
| Read receipts | Firebase write to `doubts/{doubtId}/readReceipts/{userId}` + API call | Partially |
| Online/offline status | Firebase Presence (`onDisconnect` + connection listener) | No (ephemeral) |

---

## 6. File Upload Architecture

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as API Route
    participant CLD as Cloudinary

    B->>B: User selects file
    B->>B: Client-side validation (type, size)
    B->>API: POST /api/upload (file as FormData)
    API->>API: Validate session + file type
    API->>CLD: Upload file via Cloudinary SDK
    CLD->>API: Return {secure_url, public_id}
    API->>B: Return {url, publicId}
    B->>B: Add url to form state
    B->>API: Submit form with attachment URLs
```

### Cloudinary Folders

| Folder | Purpose | Max Size | Access |
|--------|---------|----------|--------|
| `p2p/doubt-attachments` | Files on doubt descriptions | 25 MB | Public read |
| `p2p/chat-attachments` | Files/images in chat | 25 MB | Public read (URL-based) |
| `p2p/avatars` | User profile pictures | 2 MB | Public read |

### Allowed File Types

- **Images**: jpeg, png, gif, webp
- **Documents**: pdf, txt
- **Archives**: zip (doubt-attachments only)

---

## 7. Notification System Architecture

```mermaid
graph TD
    Event["Trigger Event<br/>(doubt claimed, message sent, etc.)"]
    CreateNotif["createNotification()"]
    InApp["In-App Notification<br/>(stored in DB)"]
    CheckPref["Check EmailPreference"]
    SendEmail["Send Email<br/>(Nodemailer + Gmail)"]
    NoEmail["Skip Email"]

    Event --> CreateNotif
    CreateNotif --> InApp
    CreateNotif --> CheckPref
    CheckPref -->|"preference ON"| SendEmail
    CheckPref -->|"preference OFF"| NoEmail
```

### Notification Delivery

| Channel | Mechanism | Latency |
|---------|-----------|---------|
| In-app | Fetched on page load + 60s polling | Near real-time |
| Email | Nodemailer via Gmail SMTP | 1-5 seconds |

### Notification Triggers

| Event | Recipient | Type |
|-------|-----------|------|
| Doubt claimed | Seeker | DOUBT_CLAIMED |
| New message | Other party | NEW_MESSAGE |
| Doubt resolved | Helper | DOUBT_RESOLVED |
| New doubt in followed tag | Tag followers | TAG_NEW_DOUBT |
| Announcement created | All users | ANNOUNCEMENT |
| Report resolved | Reporter | REPORT_UPDATE |
| Karma change | User | KARMA_CHANGE |

---

## 8. Admin RBAC Architecture

```mermaid
graph TD
    Request["Incoming Request"]
    MW["Middleware"]
    CheckAuth["Check JWT Token"]
    CheckRole["Check User Role"]
    Deny403["403 Forbidden"]
    Route["API Route Handler"]
    RouteCheck["requireRole() Guard"]

    Request --> MW
    MW --> CheckAuth
    CheckAuth -->|"No token"| Deny403
    CheckAuth -->|"Valid token"| CheckRole
    CheckRole -->|"Not admin/mod"| Deny403
    CheckRole -->|"Admin or Mod"| Route
    Route --> RouteCheck
    RouteCheck -->|"Insufficient role"| Deny403
    RouteCheck -->|"Authorized"| Execute["Execute Action"]
```

### Permission Matrix

| Action | USER | MODERATOR | ADMIN |
|--------|:----:|:---------:|:-----:|
| View admin dashboard | - | Y | Y |
| View user list | - | Y | Y |
| Ban/unban users | - | - | Y |
| Change user roles | - | - | Y |
| Adjust karma manually | - | - | Y |
| View & resolve reports | - | Y | Y |
| Delete/moderate doubts | - | Y | Y |
| Approve/reject tags | - | Y | Y |
| Create announcements | - | - | Y |
| View analytics | - | Basic | Full |
| System configuration | - | - | Y |

---

## 9. Doubt Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: Seeker posts doubt

    OPEN --> CLAIMED: Helper claims (first-come-first-serve)

    CLAIMED --> IN_PROGRESS: First message sent in chat

    IN_PROGRESS --> RESOLVED: Seeker marks resolved<br/>OR auto-resolve after inactivity
    IN_PROGRESS --> OPEN: Seeker dismisses helper<br/>(karma -5 to seeker)
    IN_PROGRESS --> OPEN: Helper abandons<br/>(seeker approves/disapproves)

    CLAIMED --> OPEN: Helper abandons<br/>(no messages yet, no penalty)
    CLAIMED --> OPEN: Seeker dismisses helper

    RESOLVED --> [*]

    note right of OPEN
        Visible in public feed
        Any logged-in user can claim
        Max 3 simultaneous claims per helper
    end note

    note right of IN_PROGRESS
        Real-time chat active
        Only seeker + helper participate
        lastActivityAt updated on each message
    end note

    note right of RESOLVED
        Chat becomes read-only
        Remains visible forever (knowledge base)
        Cannot be reopened
    end note
```

---

## 10. Karma System

### Karma Event Flow

```mermaid
graph LR
    Action["User Action"]
    CalcDelta["Calculate Delta<br/>(from SystemConfig)"]
    Transaction["Database Transaction"]
    LogEvent["INSERT KarmaEvent"]
    UpdateUser["UPDATE User.karma"]

    Action --> CalcDelta
    CalcDelta --> Transaction
    Transaction --> LogEvent
    Transaction --> UpdateUser
```

### Karma Weight Table

| Action | Delta | Notes |
|--------|------:|-------|
| Doubt resolved (helper) | +15 | Main incentive |
| Doubt resolved (seeker) | +5 | Encourages posting |
| Received upvote (doubt or message) | +2 | - |
| Received downvote (doubt or message) | -1 | - |
| Dismissed by seeker | -5 | Applied to seeker (anti-abuse) |
| Abandoned (disapproved by seeker) | -10 | Applied to helper |
| Tag approved (suggester) | +3 | - |
| First doubt posted | +1 | One-time bonus |

All values are admin-configurable via SystemConfig table.

---

## 11. Project Folder Structure

```
p2p/
├── prisma/
│   ├── schema.prisma              # 26 collections, 9 enums
│   └── seed.ts                    # Default config, categories, admin user
├── docs/
│   ├── srs.md                     # Software Requirements Specification
│   ├── er-diagram.md              # Entity-Relationship Diagram
│   ├── architecture.md            # This document
│   ├── use-case.md                # Use Case Diagrams
│   ├── dfd.md                     # Data Flow Diagrams
│   └── api-reference.md           # API Endpoint Reference
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (providers)
│   │   ├── globals.css            # Tailwind + CSS variables
│   │   ├── (auth)/                # Login, register, verify, reset
│   │   ├── (public)/              # Feed, doubt detail, profiles, tags, leaderboard
│   │   ├── (user)/                # Post doubt, bookmarks, activity, settings
│   │   ├── (admin)/admin/         # Dashboard, users, reports, tags, config
│   │   └── api/                   # All API route handlers
│   ├── components/
│   │   ├── ui/                    # Reusable UI primitives
│   │   ├── layout/                # Navbar, Footer, Sidebar
│   │   ├── auth/                  # Auth forms
│   │   ├── doubts/                # Doubt components
│   │   ├── chat/                  # Chat components
│   │   ├── profile/               # Profile components
│   │   ├── activity/              # Dashboard components
│   │   ├── leaderboard/           # Leaderboard components
│   │   └── admin/                 # Admin components
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Utility functions, clients, helpers
│   ├── providers/                 # React context providers
│   ├── types/                     # TypeScript definitions
│   └── middleware.ts              # Route protection
├── .env.local                     # Environment variables (MongoDB, Firebase, Cloudinary, etc.)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 12. Deployment Architecture

```mermaid
graph TB
    subgraph Dev["Development"]
        Local["localhost:3000"]
        PrismaStudio["Prisma Studio<br/>(localhost:5555)"]
    end

    subgraph Vercel["Vercel"]
        Edge["Edge Network<br/>(CDN + Middleware)"]
        Serverless["Serverless Functions<br/>(API Routes)"]
        Static["Static Assets<br/>(CSS, JS, Images)"]
        CronJob["Cron Job<br/>(Auto-resolve, every hour)"]
    end

    subgraph Cloud["Cloud Services"]
        MongoAtlas["MongoDB Atlas<br/>(Database)"]
        FirebaseRT["Firebase<br/>(Realtime Database)"]
        CloudinaryCDN["Cloudinary<br/>(Media Storage + CDN)"]
    end

    Local -->|"npx prisma studio"| PrismaStudio
    Edge --> Serverless
    Edge --> Static
    Serverless -->|"DATABASE_URL"| MongoAtlas
    Serverless -->|"Upload API"| CloudinaryCDN
    CronJob --> Serverless
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MongoDB connection string (MongoDB Atlas) |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret |
| `NEXTAUTH_URL` | Application base URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key (client-side) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (client-side) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID (client-side) |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL (client-side) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK service account JSON (server-side) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | Gmail app password |
| `CRON_SECRET` | Secret for authenticating cron job requests |
