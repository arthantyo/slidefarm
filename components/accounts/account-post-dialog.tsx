"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SchedulePostForm } from "@/components/accounts/schedule-post-form";
import { AccountPostDetails } from "@/components/accounts/account-post-details";
import type { ScheduledPost } from "@/lib/server/tiktok-schedule";
import type { PostTimes } from "@/lib/server/tiktok-post-settings";
import type { ComponentProps } from "react";

type Account = ComponentProps<typeof SchedulePostForm>["account"];
type Props = {
  dialogOpen: boolean;
  dialogView: "list" | "form" | "preview";
  day: string;
  error: string;
  message: string;
  formPost: ScheduledPost | null;
  dayPosts: ScheduledPost[];
  previewPost?: ScheduledPost;
  busy: boolean;
  postTimesLoaded: boolean;
  canPublish: boolean;
  activeAccount?: Account;
  formKey: number;
  projects: ComponentProps<typeof SchedulePostForm>["projects"];
  folders: ComponentProps<typeof SchedulePostForm>["folders"];
  setPosted: ComponentProps<typeof SchedulePostForm>["onSetPosted"];
  posts: ScheduledPost[];
  formTime: string;
  formSlot: number;
  onOpenChange: (open: boolean) => void;
  onPreview: (id: string) => void;
  onBack: () => void;
  onEdit: (post: ScheduledPost) => void;
  onRetry: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onAdd: () => void;
  onSaved: ComponentProps<typeof SchedulePostForm>["onSaved"];
};

export function AccountPostDialog({ dialogOpen, dialogView, day, error, message, formPost, dayPosts, previewPost, busy, postTimesLoaded, canPublish, activeAccount, formKey, projects, folders, setPosted, posts, formTime, formSlot, onOpenChange, onPreview, onBack, onEdit, onRetry, onCancel, onAdd, onSaved }: Props) {
  return (
        <Dialog
          open={dialogOpen}
          onOpenChange={onOpenChange}
        >
          <DialogContent
            className={
              dialogView === "form"
                ? "max-h-[90vh] max-w-7xl overflow-hidden p-0"
                : "max-h-[90vh] max-w-3xl overflow-y-auto"
            }
          >
            {dialogView === "form" ? (
              <DialogHeader className="sr-only">
                <DialogTitle>
                  {formPost ? "Edit scheduled post" : "Schedule a post"}
                </DialogTitle>
                <DialogDescription>
                  Preview slides and enter TikTok post details.
                </DialogDescription>
              </DialogHeader>
            ) : (
              <DialogHeader>
                <DialogTitle>
                  {dialogView === "preview"
                    ? "Post preview"
                    : new Date(`${day}T12:00`).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                </DialogTitle>
                <DialogDescription>
                  {dialogView === "list"
                    ? "Scheduled content for this day"
                    : "Review the slides and post details."}
                </DialogDescription>
              </DialogHeader>
            )}
            {dialogView !== "form" && error && (
              <p
                role="alert"
                className="rounded-md border border-destructive p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {dialogView !== "form" && message && (
              <p role="status" className="rounded-md border p-3 text-sm">
                {message}
              </p>
            )}
            <AccountPostDetails
              dialogView={dialogView}
              dayPosts={dayPosts}
              previewPost={previewPost}
              busy={busy}
              postTimesLoaded={postTimesLoaded}
              canPublish={canPublish}
              onPreview={onPreview}
              onBack={onBack}
              onEdit={onEdit}
              onRetry={onRetry}
              onCancel={onCancel}
              onAdd={onAdd}
            />
            {dialogView === "form" && activeAccount && (
              <SchedulePostForm
                key={formKey}
                account={activeAccount}
                projects={projects}
                folders={folders}
                onSetPosted={setPosted}
                posts={posts}
                initialDay={day}
                slotTime={formTime}
                slot={formSlot}
                editingPost={formPost}
                onSaved={onSaved}
              />
            )}{" "}
          </DialogContent>
        </Dialog>
  );
}
