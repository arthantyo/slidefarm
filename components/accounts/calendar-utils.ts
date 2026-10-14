import type { ScheduledPost } from "@/lib/server/tiktok-schedule";

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const shiftDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const postDate = (post: ScheduledPost) =>
  post.calendarDate || dateKey(new Date(post.scheduledAt));

export const timeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const statusLabel: Record<ScheduledPost["status"], string> = {
  scheduled: "Scheduled",
  submitting: "Submitting",
  submitted: "Processing on TikTok",
  awaiting_creator: "Finish in TikTok inbox",
  published: "Published",
  failed: "Failed",
  canceled: "Canceled",
};
