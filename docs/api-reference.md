# API Reference

## Peer Connect - API Endpoint Documentation

**Base URL**: `/api`
**Auth**: JWT via NextAuth session cookie
**Content-Type**: `application/json` (unless file upload)

---

## Authentication

### POST `/api/register`
Register a new user account.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Body** | `{ name: string, email: string, password: string }` |
| **Validation** | Email: valid format, unique. Password: min 8 chars, 1 uppercase, 1 number. Name: 2-50 chars. |
| **Response 201** | `{ message: "Verification email sent" }` |
| **Response 400** | `{ error: "Email already exists" }` |
| **Side Effects** | Creates User (emailVerified: null), creates VerificationToken, sends verification email |

### GET `/api/verify-email?token=xxx`
Verify user email address.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Query** | `token: string` |
| **Response 200** | Redirect to `/login?verified=true` |
| **Response 400** | `{ error: "Invalid or expired token" }` |
| **Side Effects** | Sets emailVerified = now(), deletes token |

### POST `/api/forgot-password`
Send password reset email.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Body** | `{ email: string }` |
| **Response 200** | `{ message: "If account exists, reset email sent" }` (always 200 to prevent enumeration) |
| **Side Effects** | Creates reset token (1hr expiry), sends email |

### POST `/api/reset-password`
Reset password with token.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Body** | `{ token: string, password: string }` |
| **Response 200** | `{ message: "Password reset successful" }` |
| **Response 400** | `{ error: "Invalid or expired token" }` |
| **Side Effects** | Updates passwordHash, clears reset token |

### `*` `/api/auth/[...nextauth]`
NextAuth.js catch-all route. Handles login, logout, session, CSRF.

| Field | Details |
|-------|---------|
| **Key Endpoints** | `POST /api/auth/callback/credentials` (login), `POST /api/auth/signout` (logout), `GET /api/auth/session` (get session) |

---

## Doubts

### GET `/api/doubts`
List doubts with filters, sorting, pagination, and search.

| Field | Details |
|-------|---------|
| **Auth** | None (public) |
| **Query Params** | `status` (OPEN/CLAIMED/IN_PROGRESS/RESOLVED), `categoryId`, `tags` (comma-separated slugs), `urgency` (LOW/MEDIUM/HIGH), `sort` (newest/oldest/upvotes/urgency/unanswered), `search` (keyword), `page` (default 1), `limit` (default 20, max 50) |
| **Response 200** | `{ doubts: Doubt[], total: number, page: number, totalPages: number }` |
| **Notes** | Search uses case-insensitive text matching on title + description. Unauthenticated users see all public doubts. |

### POST `/api/doubts`
Create a new doubt.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ title: string, description: string, categoryId: string, tagIds: string[], urgency: "LOW"/"MEDIUM"/"HIGH", attachmentUrls?: { fileName, fileUrl, fileType, fileSizeKb, storagePath }[] }` |
| **Validation** | Title: 10-255 chars. Description: min 30 chars. Category: must exist. Tags: must be APPROVED. Urgency: valid enum. Rate limit check. |
| **Response 201** | `{ doubt: Doubt }` |
| **Response 429** | `{ error: "Rate limit exceeded. Max X doubts per hour." }` |
| **Side Effects** | Creates Doubt (status: OPEN), creates DoubtTag entries, creates DoubtAttachment entries, notifies tag followers |

### GET `/api/doubts/similar?title=xxx&description=yyy`
Get similar doubt suggestions while typing.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Query** | `title: string` (required), `description?: string` |
| **Response 200** | `{ doubts: { id, title, status, createdAt }[] }` (max 5 results) |
| **Notes** | Uses case-insensitive text matching on title and description fields |

### GET `/api/doubts/[doubtId]`
Get doubt detail.

| Field | Details |
|-------|---------|
| **Auth** | None (public) |
| **Response 200** | `{ doubt: Doubt }` (includes category, tags, seeker, helper, attachments, vote counts) |
| **Response 404** | `{ error: "Doubt not found" }` |
| **Side Effects** | Increments viewCount |

### PATCH `/api/doubts/[doubtId]`
Update doubt (title, description, tags, urgency).

| Field | Details |
|-------|---------|
| **Auth** | User (must be seeker/owner) |
| **Preconditions** | Doubt status is OPEN, no messages exist |
| **Body** | `{ title?, description?, tagIds?, urgency? }` |
| **Response 200** | `{ doubt: Doubt }` |
| **Response 403** | `{ error: "Cannot edit after replies" }` |

### DELETE `/api/doubts/[doubtId]`
Delete doubt.

| Field | Details |
|-------|---------|
| **Auth** | User (must be seeker/owner) |
| **Preconditions** | Doubt status is OPEN, no messages exist |
| **Response 200** | `{ message: "Doubt deleted" }` |
| **Response 403** | `{ error: "Cannot delete after replies" }` |
| **Side Effects** | Deletes doubt, attachments (DB + Storage) |

### POST `/api/doubts/[doubtId]/claim`
Claim a doubt as helper.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Preconditions** | Doubt is OPEN, user is not the seeker, user has < max_simultaneous_claims active claims |
| **Response 200** | `{ doubt: Doubt }` |
| **Response 409** | `{ error: "Doubt already claimed" }` |
| **Response 400** | `{ error: "Maximum active claims reached" }` |
| **Side Effects** | Sets status=CLAIMED, assigns helperId, sets claimedAt, notifies seeker |

### POST `/api/doubts/[doubtId]/abandon`
Helper abandons a claimed doubt.

| Field | Details |
|-------|---------|
| **Auth** | User (must be current helper) |
| **Preconditions** | Doubt is CLAIMED or IN_PROGRESS |
| **Body** | `{ reason: string }` (min 20 chars) |
| **Response 200** | `{ abandonRequest: AbandonRequest }` |
| **Side Effects** | Creates AbandonRequest (PENDING), notifies seeker. If doubt is CLAIMED (no messages), doubt goes directly to OPEN with no penalty. |

### POST `/api/doubts/[doubtId]/abandon/approve`
Seeker approves abandon reason.

| Field | Details |
|-------|---------|
| **Auth** | User (must be seeker) |
| **Response 200** | `{ message: "Abandon approved" }` |
| **Side Effects** | AbandonRequest → APPROVED, doubt → OPEN, helper cleared, no karma penalty, notifies helper |

### POST `/api/doubts/[doubtId]/abandon/disapprove`
Seeker disapproves abandon reason.

| Field | Details |
|-------|---------|
| **Auth** | User (must be seeker) |
| **Body** | `{ reason?: string }` |
| **Response 200** | `{ message: "Abandon disapproved" }` |
| **Side Effects** | AbandonRequest → DISAPPROVED, doubt → OPEN, helper cleared, karma -10 to helper, creates report for admin review, notifies helper |

### POST `/api/doubts/[doubtId]/dismiss`
Seeker dismisses current helper.

| Field | Details |
|-------|---------|
| **Auth** | User (must be seeker) |
| **Body** | `{ reason: string }` |
| **Response 200** | `{ message: "Helper dismissed" }` |
| **Side Effects** | Creates HelperDismissal, doubt → OPEN, helper cleared, karma -5 to seeker, notifies helper |

### POST `/api/doubts/[doubtId]/resolve`
Seeker marks doubt as resolved.

| Field | Details |
|-------|---------|
| **Auth** | User (must be seeker) |
| **Preconditions** | Doubt is IN_PROGRESS |
| **Response 200** | `{ doubt: Doubt }` |
| **Side Effects** | Status → RESOLVED, sets resolvedAt, karma +15 to helper, karma +5 to seeker, notifies helper |

### POST `/api/doubts/[doubtId]/vote`
Upvote or downvote a doubt.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ value: 1 or -1 }` |
| **Response 200** | `{ upvoteCount, downvoteCount }` |
| **Notes** | If user already voted same direction → remove vote. If opposite direction → switch vote. |
| **Side Effects** | Upsert/delete Vote, update denormalized counts, karma to doubt author |

### POST `/api/doubts/[doubtId]/bookmark`
Toggle bookmark on a doubt.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Response 200** | `{ bookmarked: boolean }` |

### POST `/api/doubts/[doubtId]/report`
Report a doubt.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ reason: string, details?: string }` |
| **Response 201** | `{ message: "Report submitted" }` |

---

## Messages (Chat)

### GET `/api/doubts/[doubtId]/messages`
Get paginated chat messages for a doubt.

| Field | Details |
|-------|---------|
| **Auth** | User (seeker or helper of the doubt) |
| **Query** | `cursor?: string` (messageId for cursor pagination), `limit?: number` (default 30) |
| **Response 200** | `{ messages: Message[], nextCursor?: string, hasMore: boolean }` |
| **Notes** | Cursor-based pagination (oldest first). Each message includes sender info, attachments, replyTo, vote counts. |

### POST `/api/doubts/[doubtId]/messages`
Send a message in the doubt chat.

| Field | Details |
|-------|---------|
| **Auth** | User (seeker or helper) |
| **Preconditions** | Doubt is CLAIMED or IN_PROGRESS |
| **Body** | `{ content: string, contentType?: "TEXT"/"IMAGE"/"FILE"/"CODE", replyToId?: string, attachments?: { fileName, fileUrl, fileType, fileSizeKb, storagePath }[] }` |
| **Response 201** | `{ message: Message }` |
| **Side Effects** | Creates Message, creates MessageAttachments, if first message → doubt status CLAIMED→IN_PROGRESS, updates lastActivityAt, Firebase Realtime Database syncs to channel, notifies other party |

### PATCH `/api/doubts/[doubtId]/messages/[messageId]`
Edit a message.

| Field | Details |
|-------|---------|
| **Auth** | User (must be message sender) |
| **Body** | `{ content: string }` |
| **Response 200** | `{ message: Message }` |
| **Side Effects** | Sets isEdited=true, Firebase Realtime Database syncs update |

### DELETE `/api/doubts/[doubtId]/messages/[messageId]`
Soft-delete a message.

| Field | Details |
|-------|---------|
| **Auth** | User (must be message sender) |
| **Response 200** | `{ message: "Message deleted" }` |
| **Side Effects** | Sets isDeleted=true (soft delete), Firebase Realtime Database syncs update. Content replaced with "[deleted]" in API response. |

### POST `/api/doubts/[doubtId]/messages/[messageId]/vote`
Vote on a message.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ value: 1 or -1 }` |
| **Response 200** | `{ upvoteCount, downvoteCount }` |
| **Side Effects** | Same vote toggling logic as doubt votes. Karma to message author. |

### POST `/api/doubts/[doubtId]/messages/[messageId]/report`
Report a message.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ reason: string, details?: string }` |
| **Response 201** | `{ message: "Report submitted" }` |

---

## Tags

### GET `/api/tags`
List tags.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Query** | `status?: string` (APPROVED/SUGGESTED), `search?: string` |
| **Response 200** | `{ tags: Tag[] }` |

### GET `/api/tags/search?q=xxx`
Autocomplete tag search (for doubt creation form).

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Query** | `q: string` |
| **Response 200** | `{ tags: { id, name, slug }[] }` (max 10, APPROVED only) |

### POST `/api/tags`
Suggest a new tag.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ name: string }` |
| **Response 201** | `{ tag: Tag }` (status: SUGGESTED, voteCount: 1) |
| **Response 409** | `{ error: "Tag already exists" }` |
| **Side Effects** | Creates Tag with SUGGESTED status, auto-votes for creator |

### POST `/api/tags/[tagId]/vote`
Vote for a suggested tag.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Response 200** | `{ voteCount: number }` |
| **Notes** | One vote per user per tag. If voteCount reaches threshold, tag enters admin review queue. |

### POST `/api/tags/[tagId]/follow`
Toggle follow/unfollow a tag.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Response 200** | `{ following: boolean }` |

---

## Users & Profile

### GET `/api/users/me`
Get authenticated user's profile.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Response 200** | `{ user: User }` (full profile with email, preferences) |

### PATCH `/api/users/me`
Update own profile.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ name?, bio?, image? }` |
| **Response 200** | `{ user: User }` |

### GET `/api/users/me/doubts`
List doubts posted by authenticated user.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Query** | `status?: string`, `page?: number` |
| **Response 200** | `{ doubts: Doubt[], total, page, totalPages }` |

### GET `/api/users/me/helping`
List doubts the user is currently helping with.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Query** | `status?: string`, `page?: number` |
| **Response 200** | `{ doubts: Doubt[], total, page, totalPages }` |

### GET `/api/users/me/bookmarks`
List user's bookmarked doubts.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Query** | `page?: number` |
| **Response 200** | `{ doubts: Doubt[], total, page, totalPages }` |

### GET `/api/users/[userId]`
Get public user profile.

| Field | Details |
|-------|---------|
| **Auth** | None (public) |
| **Response 200** | `{ user: { id, name, image, karma, bio, createdAt, doubtsPostedCount, doubtsHelpedCount, followedTags } }` |

### POST `/api/users/[userId]/report`
Report a user.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ reason: string, details?: string }` |
| **Response 201** | `{ message: "Report submitted" }` |

---

## Notifications

### GET `/api/notifications`
Get user's notifications.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Query** | `page?: number`, `unreadOnly?: boolean` |
| **Response 200** | `{ notifications: Notification[], totalUnread: number, total, page, totalPages }` |

### PATCH `/api/notifications`
Mark notifications as read.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ ids: string[] }` or `{ all: true }` |
| **Response 200** | `{ message: "Notifications marked as read" }` |

### GET `/api/notifications/preferences`
Get notification email preferences.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Response 200** | `{ preferences: EmailPreference }` |

### PUT `/api/notifications/preferences`
Update notification email preferences.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `{ doubtClaimed?: boolean, newMessage?: boolean, doubtResolved?: boolean, tagNewDoubt?: boolean, announcements?: boolean, weeklyDigest?: boolean }` |
| **Response 200** | `{ preferences: EmailPreference }` |

---

## Leaderboard

### GET `/api/leaderboard`
Get leaderboard rankings.

| Field | Details |
|-------|---------|
| **Auth** | None (public) |
| **Query** | `scope?: "global"/"tag"`, `tagId?: string`, `period?: "weekly"/"monthly"/"all_time"` (default: all_time), `limit?: number` (default: 50) |
| **Response 200** | `{ entries: { rank, userId, name, image, karma, doubtsResolved }[] }` |
| **Notes** | Global: ordered by User.karma. Per-tag: computed from KarmaEvent joined with Doubts. Time-based: filtered by KarmaEvent.createdAt. |

---

## Upload

### POST `/api/upload`
Upload a file to Cloudinary.

| Field | Details |
|-------|---------|
| **Auth** | User |
| **Body** | `FormData` with `file: File` (the file to upload) |
| **Validation** | File type must be in allowed list (images, PDFs, common document types). Max file size enforced. |
| **Response 200** | `{ url: string, publicId: string }` |
| **Notes** | Client sends the file to this endpoint. Server uploads it to Cloudinary (folder: "p2p"). `url` is the Cloudinary delivery URL stored in the database. `publicId` is used for deletion. |

---

## Admin

### GET `/api/admin/users`
List all users (admin panel).

| Field | Details |
|-------|---------|
| **Auth** | Admin or Moderator |
| **Query** | `search?: string`, `role?: string`, `isBanned?: boolean`, `page?: number` |
| **Response 200** | `{ users: User[], total, page, totalPages }` |

### PATCH `/api/admin/users/[userId]`
Update user (role, ban/unban).

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Body** | `{ role?: "USER"/"MODERATOR"/"ADMIN", isBanned?: boolean, banReason?: string }` |
| **Response 200** | `{ user: User }` |
| **Side Effects** | If banned: invalidate sessions. Notifies user. |

### PATCH `/api/admin/users/[userId]/karma`
Manually adjust user karma.

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Body** | `{ delta: number, reason: string }` |
| **Response 200** | `{ user: { id, karma } }` |
| **Side Effects** | Creates KarmaEvent, updates User.karma |

### DELETE `/api/admin/doubts/[doubtId]`
Force-delete a doubt (moderation).

| Field | Details |
|-------|---------|
| **Auth** | Admin or Moderator |
| **Response 200** | `{ message: "Doubt deleted" }` |
| **Side Effects** | Deletes doubt, messages, attachments. Notifies seeker. |

### GET `/api/admin/reports`
Get reports queue.

| Field | Details |
|-------|---------|
| **Auth** | Admin or Moderator |
| **Query** | `status?: string`, `targetType?: string`, `page?: number` |
| **Response 200** | `{ reports: Report[], total, page, totalPages }` |

### PATCH `/api/admin/reports/[reportId]`
Resolve a report.

| Field | Details |
|-------|---------|
| **Auth** | Admin or Moderator |
| **Body** | `{ status: "RESOLVED"/"DISMISSED", adminNotes?: string, action?: "warn"/"remove_content"/"ban" }` |
| **Response 200** | `{ report: Report }` |
| **Side Effects** | Based on action: warn user (notification), remove content (delete doubt/message), ban user. Updates report status. |

### PATCH `/api/admin/tags/[tagId]`
Approve or reject a suggested tag.

| Field | Details |
|-------|---------|
| **Auth** | Admin or Moderator |
| **Body** | `{ status: "APPROVED"/"REJECTED", name?: string }` (name for edit-and-approve) |
| **Response 200** | `{ tag: Tag }` |
| **Side Effects** | If approved: karma +3 to suggester, notify suggester. If rejected: remove tag from pending doubts, optionally notify. |

### GET `/api/admin/announcements`
List all announcements.

| Field | Details |
|-------|---------|
| **Auth** | Admin or Moderator |
| **Response 200** | `{ announcements: Announcement[] }` |

### POST `/api/admin/announcements`
Create a new announcement.

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Body** | `{ title: string, body: string, sendEmail?: boolean }` |
| **Response 201** | `{ announcement: Announcement }` |
| **Side Effects** | Creates announcement. If sendEmail: sends to all users. Creates in-app notification for all users. |

### PATCH `/api/admin/announcements/[id]`
Update an announcement.

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Body** | `{ title?, body? }` |
| **Response 200** | `{ announcement: Announcement }` |

### DELETE `/api/admin/announcements/[id]`
Delete an announcement.

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Response 200** | `{ message: "Announcement deleted" }` |

### GET `/api/admin/analytics`
Get platform analytics.

| Field | Details |
|-------|---------|
| **Auth** | Admin (full) or Moderator (basic) |
| **Response 200** | `{ totalUsers, totalDoubts, activeDoubts, resolvedDoubts, newRegistrations7d, pendingReports, pendingTags }` |

### GET `/api/admin/config`
Get system configuration.

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Response 200** | `{ config: { key: value }[] }` |

### PUT `/api/admin/config`
Update system configuration.

| Field | Details |
|-------|---------|
| **Auth** | Admin only |
| **Body** | `{ key: string, value: string }[]` |
| **Response 200** | `{ config: { key: value }[] }` |

---

## Cron

### POST `/api/cron/auto-resolve`
Auto-resolve stale doubts. Called by Vercel Cron (hourly).

| Field | Details |
|-------|---------|
| **Auth** | Cron secret (via `Authorization: Bearer {CRON_SECRET}`) |
| **Response 200** | `{ resolved: number }` (count of doubts auto-resolved) |
| **Side Effects** | Finds doubts where status IN (CLAIMED, IN_PROGRESS) AND lastActivityAt < now - auto_resolve_hours. Sets status=RESOLVED. Awards karma. Notifies participants. |

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (duplicate, already claimed, etc.) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
