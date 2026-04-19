import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      (email) => email.toLowerCase().endsWith("@srmap.edu.in"),
      "Only @srmap.edu.in email addresses are allowed"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

// ─── Doubts ─────────────────────────────────────────────

export const createDoubtSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(255),
  subject: z.string().min(1, "Subject is required").max(100, "Subject is too long"),
  description: z.string().min(30, "Description must be at least 30 characters").max(10000).optional(),
  categoryId: z.string().min(1, "Category is required"),
  tagIds: z.array(z.string()).max(5, "Maximum 5 tags").optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  attachmentUrls: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string().url(),
    fileType: z.string(),
    fileSizeKb: z.number(),
    storagePath: z.string(),
  })).max(5).optional(),
});

export const updateDoubtSchema = z.object({
  title: z.string().min(10).max(255).optional(),
  description: z.string().min(30).max(10000).optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).max(5).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

// ─── Messages ───────────────────────────────────────────

export const createMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000),
  contentType: z.enum(["TEXT", "IMAGE", "FILE", "CODE"]).optional(),
  replyToId: z.string().optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ─── Profile ────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  image: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

// ─── Academic Profile ───────────────────────────────────

const DEPARTMENTS = [
  "CSE", "ECE", "EEE", "ME", "CE", "IT", "AI_ML", "DS", "CIVIL", "OTHER",
] as const;

export const academicProfileSchema = z.object({
  rollNumber: z
    .string()
    .min(3, "Roll number is required")
    .max(20, "Roll number is too long")
    .regex(/^[A-Za-z0-9]+$/, "Roll number must be alphanumeric"),
  department: z.enum(DEPARTMENTS, {
    error: "Please select a department",
  }),
  year: z.number().int().min(1, "Year must be 1-4").max(4, "Year must be 1-4"),
  semester: z.number().int().min(1, "Semester must be 1-8").max(8, "Semester must be 1-8"),
  strongSubjects: z
    .array(z.string().min(1).max(100))
    .min(1, "Add at least one strong subject")
    .max(10, "Maximum 10 strong subjects"),
});

export type AcademicProfileInput = z.infer<typeof academicProfileSchema>;

// ─── Email Preferences ──────────────────────────────────

export const emailPreferencesSchema = z.object({
  doubtClaimed: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  doubtResolved: z.boolean().optional(),
  tagNewDoubt: z.boolean().optional(),
  announcements: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
});

// ─── Reports ────────────────────────────────────────────

export const createReportSchema = z.object({
  targetType: z.enum(["DOUBT", "MESSAGE", "USER"]),
  doubtId: z.string().optional(),
  messageId: z.string().optional(),
  targetUserId: z.string().optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

// ─── Admin ──────────────────────────────────────────────

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "MODERATOR", "ADMIN"]),
});

export const banUserSchema = z.object({
  reason: z.string().min(5, "Ban reason is required").max(500),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(5000),
  sendEmail: z.boolean().optional(),
});

export const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

// ─── Tags ───────────────────────────────────────────────

export const suggestTagSchema = z.object({
  name: z.string().min(2, "Tag name must be at least 2 characters").max(50),
});

// ─── Helpers ────────────────────────────────────────────

export const abandonSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});

export const dismissSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});
