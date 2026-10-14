"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ScheduledPost } from "@/lib/server/tiktok-schedule";
import type { PostTimes } from "@/lib/server/tiktok-post-settings";
import { dateKey, postDate, shiftDays } from "./calendar-utils";

type Props = {
  viewStart: Date;
  posts: ScheduledPost[];
  postTimes: PostTimes;
  postTimesLoaded: boolean;
  onViewStartChange: (date: Date) => void;
  onDayOpen: (day: string) => void;
  openSlot: (day: string, slot: number, post?: ScheduledPost) => void;
};

export function AccountCalendar({ viewStart, posts, postTimes, postTimesLoaded, onViewStartChange, onDayOpen, openSlot }: Props) {
  const cells = Array.from({ length: 28 }, (_, index) => shiftDays(viewStart, index));
  const viewEnd = cells[cells.length - 1];
  return (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous week"
                onClick={() => onViewStartChange(shiftDays(viewStart, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">
                  {viewStart.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {viewEnd.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    onViewStartChange(
                      new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                      ),
                    );
                  }}
                >
                  Today
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next week"
                onClick={() => onViewStartChange(shiftDays(viewStart, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[1050px] grid-cols-7">
                {cells.map((date) => {
                  const key = dateKey(date);
                  const entries = posts.filter(
                    (post) =>
                      postDate(post) === key && post.status !== "canceled",
                  );
                  return (
                    <div
                      key={key}
                      className={`min-w-0 border-b border-r ${key === dateKey(new Date()) ? "bg-primary/5" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onDayOpen(key);
                        }}
                        className="w-full border-b px-2 py-2 text-center text-sm font-medium hover:bg-accent"
                      >
                        {date.toLocaleDateString(undefined, {
                          weekday: "short",
                        })}{" "}
                        {date.getDate()}
                        {key === dateKey(new Date()) && (
                          <span className="ml-1 text-xs text-primary">
                            Today
                          </span>
                        )}
                      </button>
                      <div className="space-y-3 p-2">
                        {[0, 1].map((slot) => {
                          const post = entries[slot];
                          const label = post
                            ? new Date(post.scheduledAt).toLocaleTimeString(
                                [],
                                { hour: "numeric", minute: "2-digit" },
                              )
                            : new Date(
                                `${key}T${postTimes[slot]}`,
                              ).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              });
                          return (
                            <div key={slot}>
                              <button
                                type="button"
                                disabled={!post && !postTimesLoaded}
                                aria-label={
                                  post
                                    ? `Preview ${post.projectName} on ${key}`
                                    : `Add post ${slot + 1} on ${key}`
                                }
                                onClick={() => openSlot(key, slot, post)}
                                className={`relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border text-center transition-colors hover:bg-accent ${post ? "border-solid" : "border-dashed border-muted-foreground/35"}`}
                              >
                                {post?.images[0] ? (
                                  <>
                                    <Image
                                      src={post.images[0]}
                                      alt=""
                                      width={170}
                                      height={220}
                                      unoptimized
                                      className="h-full w-full object-cover"
                                    />
                                    <span className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-xs font-medium text-white line-clamp-2">
                                      {post.title || post.projectName}
                                    </span>
                                  </>
                                ) : (
                                  <Plus className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                              <p className="mt-1 text-center text-xs text-muted-foreground">
                                {label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>{" "}
          </Card>
  );
}
