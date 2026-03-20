import type {
  Doubt,
  User,
  Category,
  Tag,
  Message,
  Notification,
  DoubtStatus,
  Urgency,
} from "@/generated/prisma";

// ─── Doubt with Relations ───────────────────────────────

export type DoubtWithRelations = Doubt & {
  seeker: Pick<User, "id" | "name" | "image">;
  helper?: Pick<User, "id" | "name" | "image"> | null;
  category: Pick<Category, "id" | "name" | "slug">;
  tags: { tag: Pick<Tag, "id" | "name" | "slug"> }[];
  _count?: { messages: number; bookmarks: number };
};

// ─── Message with Relations ─────────────────────────────

export type MessageWithRelations = Message & {
  sender: Pick<User, "id" | "name" | "image">;
  replyTo?: Pick<Message, "id" | "content" | "senderId"> | null;
  attachments: { id: string; fileName: string; fileUrl: string; fileType: string }[];
};

// ─── Paginated Doubts Response (matches API spec) ───────

export type PaginatedDoubtsResponse = {
  doubts: DoubtWithRelations[];
  total: number;
  page: number;
  totalPages: number;
};

// ─── Filter/Sort Types ──────────────────────────────────

export type DoubtSortBy = "newest" | "oldest" | "upvotes" | "urgency" | "unanswered";

export type DoubtFilters = {
  status?: DoubtStatus;
  categoryId?: string;
  tags?: string;
  urgency?: Urgency;
  search?: string;
  sort?: DoubtSortBy;
  page?: number;
  limit?: number;
};

// ─── Leaderboard ────────────────────────────────────────

export type LeaderboardEntry = {
  userId: string;
  name: string;
  image: string | null;
  karma: number;
  rank: number;
};

export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

// ─── Notification (client) ──────────────────────────────

export type NotificationItem = Pick<
  Notification,
  "id" | "type" | "title" | "body" | "linkUrl" | "isRead" | "createdAt"
> & {
  sender?: Pick<User, "id" | "name" | "image"> | null;
};
