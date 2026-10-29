"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { Card } from "@/components/ui/card";
import { AccountCalendar } from "@/components/accounts/account-calendar";
import { dateKey, postDate, timeValue } from "@/components/accounts/calendar-utils";
import { AccountPostDialog } from "@/components/accounts/account-post-dialog";
import { AccountPageHeader } from "@/components/accounts/account-page-header";
import { SendTikTokDraft } from "@/components/accounts/send-tiktok-draft";
import { DemoAccountCalendar } from "@/components/accounts/demo-account-calendar";
import { DEMO_ACCOUNT_ID, demoAccountEnabled } from "@/lib/demo-account";
import { useAccountBootstrap } from "@/components/accounts/use-account-bootstrap";
import { loadPosts as fetchPosts } from "@/components/accounts/load-calendar-posts";
import { useProjectStore } from "@/stores/project-store";
import type { ScheduledPost } from "@/lib/server/tiktok-schedule";
import type { PostTimes } from "@/lib/server/tiktok-post-settings";

type Creator = { creator_nickname?: string; privacy_level_options?: string[] };

const defaultPostTimes: PostTimes = ["03:00", "18:00"];
export default function AccountCalendarPage({
  params,
}: {
  params: { openId: string };
}) {
  if (params.openId === DEMO_ACCOUNT_ID) return <DemoAccountGate />;
  return <ConnectedAccountCalendarPage params={params} />;
}

function DemoAccountGate() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(demoAccountEnabled()); }, []);
  if (enabled) return <DemoAccountCalendar />;
  return <DashboardShell><main className="mx-auto max-w-5xl px-6 py-8"><Card className="p-6">This demo account is unavailable. <Link href="/accounts" className="underline">View accounts</Link></Card></main></DashboardShell>;
}

function ConnectedAccountCalendarPage({
  params,
}: {
  params: { openId: string };
}) {
  const selected = params.openId;
  const [creator, setCreator] = useState<Creator | null>(null);
  const { projects, folders, setPosted } = useProjectStore();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [viewStart, setViewStart] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<"list" | "form" | "preview">(
    "list",
  );
  const [previewId, setPreviewId] = useState("");
  const [formPost, setFormPost] = useState<ScheduledPost | null>(null);
  const [postTimes, setPostTimes] = useState<PostTimes>(defaultPostTimes);
  const [postTimesLoaded, setPostTimesLoaded] = useState(false);
  const [formSlot, setFormSlot] = useState(0);
  const [formTime, setFormTime] = useState(defaultPostTimes[0]);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const { accounts, configured } = useAccountBootstrap(setError, setMessage);
  const loadPosts = (openId: string, isActive?: () => boolean) =>
    fetchPosts(openId, setPosts, isActive);

  useEffect(() => {
    setCreator(null);
    setPosts([]);
    setFormPost(null);
    if (!selected) return;
    setPostTimes(defaultPostTimes);
    setPostTimesLoaded(false);
    let active = true;
    void fetch(
      `/api/tiktok/post-settings?openId=${encodeURIComponent(selected)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const result = (await response.json()) as {
          times?: PostTimes;
          error?: string;
        };
        if (!response.ok || !result.times)
          throw new Error(result.error || "Could not load posting times.");
        return result.times;
      })
      .then((times) => {
        if (active) {
          setPostTimes(times);
          setPostTimesLoaded(true);
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load posting times.",
          );
      });
    void fetch(`/api/tiktok/creator?openId=${encodeURIComponent(selected)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          creator?: Creator;
          error?: string;
        };
        if (!response.ok || !result.creator)
          throw new Error(result.error || "Could not load creator settings.");
        return result.creator;
      })
      .then((result) => {
        if (active) setCreator(result);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load creator settings.",
          );
      });
    void loadPosts(selected, () => active).catch((cause) => {
      if (active)
        setError(
          cause instanceof Error ? cause.message : "Could not load calendar.",
        );
    });
    const timer = setInterval(
      () => void loadPosts(selected, () => active).catch(() => {}),
      30_000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selected]);

  const editPost = (post: ScheduledPost) => {
    const scheduled = new Date(post.scheduledAt);
    setDay(postDate(post));
    setViewStart(
      new Date(
        scheduled.getFullYear(),
        scheduled.getMonth(),
        scheduled.getDate(),
      ),
    );
    setFormPost(post);
    setFormSlot(
      Math.max(
        0,
        posts
          .filter(
            (item) =>
              postDate(item) === postDate(post) && item.status !== "canceled",
          )
          .findIndex((item) => item.id === post.id),
      ),
    );
    setFormTime(timeValue(scheduled));
    setFormKey((current) => current + 1);
    setDialogView("form");
  };
  const cancelPost = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tiktok/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "Could not cancel post.");
      await loadPosts(selected);
      setMessage("Scheduled post canceled.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not cancel post.",
      );
    } finally {
      setBusy(false);
    }
  };
  const retryPost = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tiktok/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id, calendarDate: dateKey(new Date()) }),
      });
      const result = await response.json() as { post?: ScheduledPost; error?: string };
      if (!response.ok || !result.post) throw new Error(result.error || "Could not retry post.");
      await loadPosts(selected);
      setDay(result.post.calendarDate);
      setViewStart(new Date(`${result.post.calendarDate}T12:00`));
      setDialogView("list");
      setMessage("Post queued to retry shortly.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry post.");
    } finally { setBusy(false); }
  };

  const dayPosts = posts.filter(
    (post) => postDate(post) === day && post.status !== "canceled",
  );
  const previewPost = dayPosts.find((post) => post.id === previewId);
  const activeAccount = accounts.find((account) => account.openId === selected);
  const openNewForm = (slot?: number) => {
    if (!postTimesLoaded) return;
    const chosenSlot = slot ?? dayPosts.length;
    setFormPost(null);
    setFormSlot(chosenSlot);
    setFormTime(postTimes[chosenSlot]);
    setFormKey((current) => current + 1);
    setDialogView("form");
  };

  const openSlot = (date: string, slot: number, post?: ScheduledPost) => {
    setDay(date);
    setDialogOpen(true);
    setError("");
    setMessage("");
    if (post) {
      setPreviewId(post.id);
      setDialogView("preview");
    } else openNewForm(slot);
  };

  return (
    <DashboardShell>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <AccountPageHeader
          selected={selected}
          displayName={activeAccount?.displayName}
          error={error}
          message={message}
          configured={configured}
        />
        {!activeAccount ? (
          <Card className="p-10 text-center text-muted-foreground">
            This account is not connected.{" "}
            <Link href="/accounts" className="underline">
              View accounts
            </Link>
          </Card>
        ) : (
          <>
          <SendTikTokDraft account={activeAccount} projects={projects} folders={folders} onSetPosted={setPosted} />
          <AccountCalendar
            viewStart={viewStart}
            posts={posts}
            postTimes={postTimes}
            postTimesLoaded={postTimesLoaded}
            onViewStartChange={setViewStart}
            onDayOpen={(date) => {
              setDay(date);
              setDialogView("list");
              setDialogOpen(true);
            }}
            openSlot={openSlot}
          />
          </>
        )}
        <AccountPostDialog
          dialogOpen={dialogOpen}
          dialogView={dialogView}
          day={day}
          error={error}
          message={message}
          formPost={formPost}
          dayPosts={dayPosts}
          previewPost={previewPost}
          busy={busy}
          postTimesLoaded={postTimesLoaded}
          canPublish={Boolean(activeAccount?.scopes.includes("video.upload") || (creator && activeAccount?.scopes.includes("video.publish")))}
          activeAccount={activeAccount}
          formKey={formKey}
          projects={projects}
          folders={folders}
          setPosted={setPosted}
          posts={posts}
          formTime={formTime}
          formSlot={formSlot}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setDialogView("list");
          }}
          onPreview={(id) => {
            setPreviewId(id);
            setDialogView("preview");
          }}
          onBack={() => setDialogView("list")}
          onEdit={editPost}
          onRetry={retryPost}
          onCancel={cancelPost}
          onAdd={openNewForm}
          onSaved={async (post) => {
            await loadPosts(selected);
            setDay(post.calendarDate);
            setViewStart(new Date(`${post.calendarDate}T12:00`));
            setDialogView("list");
            setMessage("Post saved to the calendar.");
          }}
        />
      </main>
    </DashboardShell>
  );
}
