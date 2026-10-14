"use client";

import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScheduledPost } from "@/lib/server/tiktok-schedule";
import { statusLabel } from "./calendar-utils";

type Props = {
  dialogView: "list" | "form" | "preview";
  dayPosts: ScheduledPost[];
  previewPost?: ScheduledPost;
  busy: boolean;
  postTimesLoaded: boolean;
  canPublish: boolean;
  onPreview: (id: string) => void;
  onBack: () => void;
  onEdit: (post: ScheduledPost) => void;
  onRetry: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onAdd: () => void;
};

export function AccountPostDetails({ dialogView, dayPosts, previewPost, busy, postTimesLoaded, canPublish, onPreview, onBack, onEdit, onRetry, onCancel, onAdd }: Props) {
  return <>
            {dialogView === "list" && (
              <div className="space-y-4">
                {dayPosts.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No content planned for this day.
                  </p>
                )}
                {dayPosts.map((post) => (
                  <div key={post.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{post.projectName}</p>
                        <p className="text-sm">{post.title}</p>
                        <p className="text-xs text-muted-foreground">{post.postMode === "MEDIA_UPLOAD" ? "Send to TikTok inbox" : "Post automatically"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {statusLabel[post.status]} · {post.images.length}{" "}
                          slides
                        </p>
                        {post.error && (
                          <p className="mt-1 text-xs text-destructive">
                            {post.error}
                          </p>
                        )}
                        {post.status === "awaiting_creator" && <p className="mt-1 text-xs">Open the notification in your TikTok inbox to finish and publish.</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPreview(post.id)}
                        >
                          Preview
                        </Button>
                        {post.status === "failed" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void onRetry(post.id)}>Retry</Button>}
                        {post.status === "scheduled" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(post)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Cancel ${post.projectName}`}
                              disabled={busy}
                              onClick={() => void onCancel(post.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {post.images.slice(0, 5).map((src, index) => (
                        <Image
                          key={src}
                          src={src}
                          alt={`Slide ${index + 1} preview`}
                          width={90}
                          height={120}
                          unoptimized
                          className="h-28 w-20 shrink-0 rounded object-cover"
                        />
                      ))}
                      {post.images.length > 5 && (
                        <span className="self-center text-xs text-muted-foreground">
                          +{post.images.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  disabled={
                    !postTimesLoaded ||
                    dayPosts.length >= 2 ||
                    !canPublish
                  }
                  onClick={onAdd}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add post
                </Button>
                {dayPosts.length >= 2 && (
                  <p className="text-xs text-muted-foreground">
                    Two posts are already planned for this day.
                  </p>
                )}
              </div>
            )}
            {dialogView === "preview" && previewPost && (
              <div className="space-y-4">
                <Button variant="ghost" onClick={onBack}>
                  ← Back to posts
                </Button>
                <div>
                  <h3 className="font-semibold">
                    {previewPost.title || previewPost.projectName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {statusLabel[previewPost.status]} ·{" "}
                    {new Date(previewPost.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {previewPost.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {previewPost.description}
                    </p>
                  )}
                  {previewPost.error && <p className="mt-2 text-sm text-destructive">{previewPost.error}</p>}
                </div>
                {previewPost.status === "failed" && <Button variant="outline" disabled={busy} onClick={() => void onRetry(previewPost.id)}>Retry failed post</Button>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previewPost.images.map((src, index) => (
                    <div key={src}>
                      <Image
                        src={src}
                        alt={`Slide ${index + 1}`}
                        width={240}
                        height={320}
                        unoptimized
                        className="w-full rounded border object-contain"
                      />
                      <p className="mt-1 text-center text-xs text-muted-foreground">
                        Slide {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

  </>;
}
