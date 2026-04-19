# P2PConnect — Missing UI Pages: Feature Descriptions

---

## 1. Announcements Feed

### `/announcements` — Announcements List Page

**Purpose:** A public page where all users (logged in or not) can see platform-wide announcements posted by admins.

**Page Sections:**
- **Page Header** — Title "Announcements" with a subtitle like "Platform updates and important notices"
- **Announcement Cards** — A vertical list of cards, each showing:
  - Announcement title (clickable, links to detail page)
  - A short preview of the body text (first ~200 characters, cut off with "...")
  - Author avatar initial + author name
  - Relative time (e.g. "2 days ago")
  - Hover effect highlighting the card
- **Empty State** — A centered message if no announcements have been posted yet
- **Pagination** — Previous/Next page controls at the bottom if there are more than 10 announcements

---

### `/announcements/[id]` — Announcement Detail Page

**Purpose:** Shows the full content of a single announcement.

**Page Sections:**
- **Breadcrumb** — "Announcements → [Title]" navigation trail at the top
- **Announcement Card** — A single large card containing:
  - Full announcement title
  - Author info block — avatar initial, name, and date posted
  - A horizontal divider
  - Full body text rendered as-is (preserving line breaks)
- **Back navigation** — Breadcrumb links back to the list

---

## 2. Public User Profile

### `/users/[userId]` — User Profile Page

**Purpose:** A publicly viewable profile page for any user on the platform. Currently, doubt detail pages already link here — but this page doesn't exist yet, causing a 404.

**Page Sections:**

- **Profile Header Card** — The main identity block at the top:
  - Large avatar (initials-based circle if no image uploaded)
  - User's display name
  - Role badge if the user is MODERATOR or ADMIN
  - Department + Year (e.g. "CSE · Year 2")
  - Karma score (e.g. "240 karma")
  - Join date (e.g. "Joined Jan 2025")
  - Bio text if the user has written one

- **Stats Row** — Three numbers displayed side by side inside the header card:
  - Doubts Posted (total number of doubts this user has asked)
  - Peers Helped (number of doubts this user has helped resolve)
  - Karma (their current karma score)

- **Strong Subjects** — A section inside the header card showing all the subjects this user is good at, displayed as green pill badges (e.g. "Data Structures", "Thermodynamics")

- **Activity Tabs** — Two tabs below the header card:
  - **Doubts Posted** — A paginated list of all doubts this user has asked, shown as Doubt Cards (same cards as in the Feed)
  - **Doubts Helped** — A paginated list of all doubts this user was the helper on
  - Switching tabs loads the relevant list
  - Each tab shows a "Nothing here yet" empty state if applicable

---

## 3. Leaderboard

### `/leaderboard` — Leaderboard Page

**Purpose:** Ranks all users by karma so students can see who the top contributors are on the platform.

**Page Sections:**

- **Page Header** — Title "Leaderboard" with subtitle "Top contributors ranked by karma"

- **Period Filter Buttons** — Three toggle buttons to switch the time range:
  - **All Time** — Overall karma ranking since account creation
  - **This Month** — Karma earned only in the current calendar month
  - **This Week** — Karma earned in the last 7 days
  - Switching periods reloads the list and resets to page 1

- **Ranked List** — A card containing all ranked users, each row showing:
  - **Rank number** — #1, #2, #3... with gold/silver/bronze medal emojis for the top 3
  - **Avatar** — Initials-based circle
  - **Name** — Clickable link to their public profile (`/users/[id]`)
  - **Department** — Small label (e.g. "CSE", "ECE")
  - **Karma score** — Their karma total for the selected period

- **Pagination** — Controls to move between pages (20 users per page)

---

## 4. Settings Page (Expanded)

### `/settings` — Settings Page

**Purpose:** The settings page currently only has the Academic Profile form. It needs 3 more sections added.

**Current State:** Only has "Academic Profile" section.

**New Sections to Add:**

---

### Section 1 — Profile (NEW)
Appears at the very top, before Academic Profile.

- **Display Name** input — Edit the name shown across the platform
- **Bio** textarea — A short description about yourself (max 500 characters, with a live character counter)
- **Avatar URL** input — Paste a URL to set your profile picture
- **Save Profile** button — Saves changes via API

---

### Section 2 — Academic Profile (EXISTING, unchanged)
- Roll number, department, year, semester
- Strong subjects with add/remove tags
- Already built and working

---

### Section 3 — Change Password (NEW)

- **Current Password** input
- **New Password** input
- **Confirm New Password** input — Client-side check that new passwords match before submitting
- **Update Password** button
- Shows a success or error message after submission
- Only relevant for users who signed up with email/password (not OAuth)

---

### Section 4 — Email Notifications (NEW)
Appears at the bottom.

- A list of 6 toggle switches, one per notification type:

  | Toggle | What it controls |
  |--------|-----------------|
  | Doubt Claimed | Get an email when someone claims your doubt |
  | New Message | Get an email when you receive a chat message |
  | Doubt Resolved | Get an email when your doubt is marked resolved |
  | Tag Activity | Get an email when a new doubt is posted with your followed tags |
  | Announcements | Get an email when admins post a new announcement |
  | Weekly Digest | Receive a weekly summary of platform activity |

- Each toggle **auto-saves instantly** when flipped — no save button needed
- Shows a brief "saving" visual while the request is in flight

---

## 5. Admin Dashboard

**Who can access:** Only users with role `ADMIN` or `MODERATOR`. Anyone else is redirected to the homepage.

**Layout:** A persistent left sidebar with navigation links, and the main content area to the right.

**Sidebar links:** Overview · Reports · Users · Announcements

---

### `/admin` — Overview Page

**Purpose:** A quick health-check dashboard for the platform.

**Content:**
- **Page Header** — "Admin Overview" title
- **Stats Grid** — 6 stat cards arranged in a 2×3 grid (on desktop), each showing a number and label:
  - Total Users (with "+X this week" sub-label)
  - Banned Users (current active bans)
  - Total Doubts (with "X open" sub-label)
  - Resolved Doubts (with resolution rate %)
  - Pending Reports (reports waiting for review)
  - Total Announcements
- Stat cards that relate to a section are clickable and link to that section (e.g. "Pending Reports" links to `/admin/reports`)

---

### `/admin/reports` — Reports Management Page

**Purpose:** Review and act on user-submitted reports (reported doubts, messages, or users).

**Content:**

- **Status Filter Buttons** — Four filter tabs: PENDING · REVIEWED · RESOLVED · DISMISSED
  - Defaults to showing PENDING reports
  - Switching filters reloads the list

- **Reports List** — Each report shows:
  - Status badge (color-coded)
  - Target type badge (DOUBT / MESSAGE / USER)
  - Time posted
  - Reporter's name + what/who they reported
  - Truncated reason text
  - **"Review" button** — Expands the report in-place

- **Expanded Review Panel** (appears when you click Review):
  - Full reason text
  - **Admin Notes** textarea — Write internal notes about the decision
  - **Status dropdown** — Change to REVIEWED / RESOLVED / DISMISSED
  - **Save** button — Updates the report and collapses the panel
  - **Cancel** button — Collapses without saving

---

### `/admin/users` — User Management Page

**Purpose:** Search, filter, and manage all users — change their roles or ban/unban them.

**Content:**

- **Search Bar** — Live search by name or email address (debounced)
- **Role Filter** — Dropdown to filter by USER / MODERATOR / ADMIN
- **Status Filter** — Dropdown: All Users / Banned Only / Active Only

- **Users Table/List** — Each user row shows:
  - Avatar initial
  - Name + "Banned" badge if applicable
  - Email address
  - Join date
  - Karma score
  - Role badge (color-coded)
  - **Role Dropdown** — Inline dropdown to change the user's role (ADMIN only can use this)
  - **Ban / Unban Button** — Red "Ban" button for active users, green "Unban" for banned users

- **Ban Confirmation Modal** — Appears when clicking Ban:
  - Shows who you're banning
  - **Reason textarea** — Required, minimum 5 characters
  - **Confirm Ban** button — Submits the ban with the reason
  - **Cancel** button — Closes without banning

---

### `/admin/announcements` — Announcements Management Page

**Purpose:** Create, edit, and delete platform announcements (which appear on `/announcements`).

**Content:**

- **Create Announcement Form** — At the top of the page:
  - **Title** input (max 200 characters)
  - **Body** textarea (max 5000 characters)
  - **"Send email to subscribers" checkbox** — When checked, an email is sent to all users who have the Announcements email preference turned on
  - **Publish** button — Creates the announcement and adds it to the list immediately

- **Existing Announcements List** — Below the form, all published announcements:
  - Each item shows: title, body preview, author name, time posted
  - **Edit button** — Transforms the item into an inline edit form (title + body inputs) with Save / Cancel
  - **Delete button** — Opens a confirmation modal before deleting

- **Delete Confirmation Modal** — "Are you sure? This cannot be undone." with Delete / Cancel buttons
