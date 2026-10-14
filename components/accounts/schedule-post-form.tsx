"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportSlide } from "@/lib/export";
import { slideToDataURL } from "@/lib/export/svg-renderer";
import type { ScheduledPost } from "@/lib/server/tiktok-schedule";
import type { Project, ProjectFolder, TextElement } from "@/types";

type Account = { openId: string; displayName: string; scopes: string[] };
type Creator = { creator_nickname?: string; privacy_level_options?: string[]; comment_disabled?: boolean };

interface Props {
  account: Account;
  projects: Project[];
  folders: ProjectFolder[];
  onSetPosted: (projectId: string, posted: boolean) => void;
  posts: ScheduledPost[];
  initialDay: string;
  slotTime: string;
  slot: number;
  editingPost: ScheduledPost | null;
  onSaved: (post: ScheduledPost) => Promise<void>;
  immediateDraft?: boolean;
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const postDate = (post: ScheduledPost) =>
  post.calendarDate || dateKey(new Date(post.scheduledAt));
const defaultCaptionPrompt =
  "Write an engaging TikTok caption for this slideshow. Use its actual content, keep claims accurate, and include a short call to action when it fits. Return only the caption.";
const captionPromptsKey = "slidefarm-caption-prompts";
type CaptionPrompt = { id: string; name: string; prompt: string };

export function SchedulePostForm({
  account,
  projects,
  folders,
  onSetPosted,
  posts,
  initialDay: day,
  slotTime,
  slot,
  editingPost,
  onSaved,
  immediateDraft = false,
}: Props) {
  const [projectId, setProjectId] = useState(editingPost?.projectId ?? "");
  const [projectSearch, setProjectSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const [projectPreviews, setProjectPreviews] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [description, setDescription] = useState(
    editingPost?.description ?? "",
  );
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<CaptionPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("default");
  const [promptName, setPromptName] = useState("Default caption");
  const [captionPrompt, setCaptionPrompt] = useState(defaultCaptionPrompt);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState("");
  const [latestCreator, setLatestCreator] = useState<Creator | null>(null);
  const [creatorError, setCreatorError] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [postMode, setPostMode] = useState<"DIRECT_POST" | "MEDIA_UPLOAD">(immediateDraft ? "MEDIA_UPLOAD" : editingPost?.postMode ?? (account.scopes.includes("video.publish") ? "DIRECT_POST" : "MEDIA_UPLOAD"));
  const [disableComment, setDisableComment] = useState(
    editingPost?.disableComment ?? true,
  );
  const [autoAddMusic, setAutoAddMusic] = useState(
    editingPost?.autoAddMusic ?? true,
  );
  const [isAigc, setIsAigc] = useState(editingPost?.isAigc ?? false);
  const [brandContent, setBrandContent] = useState(
    editingPost?.brandContent ?? false,
  );
  const [brandOrganic, setBrandOrganic] = useState(
    editingPost?.brandOrganic ?? false,
  );
  const [commercialDisclosure, setCommercialDisclosure] = useState(Boolean(editingPost?.brandContent || editingPost?.brandOrganic));
  const [postingConsent, setPostingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [publishId, setPublishId] = useState("");

  useEffect(() => {
    if (!immediateDraft || !publishId) return;
    const check = async () => {
      try {
        const response = await fetch("/api/tiktok/post/status", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ openId: account.openId, publishId }),
        });
        const result = await response.json() as { status?: string; failReason?: string };
        if (!response.ok) return;
        if (result.status === "SEND_TO_USER_INBOX") {
          setUploadMessage("TikTok sent the notification. Open your TikTok inbox to finish and publish the post.");
          setPublishId("");
        } else if (result.status === "FAILED") {
          setError(`TikTok could not deliver the draft${result.failReason ? `: ${result.failReason}` : "."}`);
          setPublishId("");
        }
      } catch { /* Keep checking while the form is open. */ }
    };
    void check();
    const timer = setInterval(() => void check(), 10_000);
    return () => clearInterval(timer);
  }, [immediateDraft, publishId, account.openId]);

  const selectedProject = projects.find((project) => project.id === projectId);
  const folderNames = new Map(
    folders.map((folder) => [folder.id, folder.name]),
  );
  const projectFolder = (project: Project) =>
    folderNames.get(project.folderId ?? "") ?? "Unfiled";
  const search = projectSearch.trim().toLowerCase();
  const availableProjects = projects.filter((project) => !project.posted);
  const projectGroups = [
    ...folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      projects: availableProjects.filter(
        (project) => project.folderId === folder.id,
      ),
    })),
    {
      id: "unfiled",
      name: "Unfiled",
      projects: availableProjects.filter(
        (project) => !project.folderId || !folderNames.has(project.folderId),
      ),
    },
  ]
    .map((group) => ({
      ...group,
      projects:
        search && !group.name.toLowerCase().includes(search)
          ? group.projects.filter((project) =>
              project.name.toLowerCase().includes(search),
            )
          : group.projects,
    }))
    .filter(
      (group) =>
        !search ||
        group.name.toLowerCase().includes(search) ||
        group.projects.length > 0,
    );
  const toggleFolder = (id: string) => {
    const expanded =
      expandedFolders[id] ??
      (Boolean(search) ||
        selectedProject?.folderId === id ||
        (id === "unfiled" && selectedProject && !selectedProject.folderId));
    setExpandedFolders((current) => ({ ...current, [id]: !expanded }));
  };
  const dayIsFull =
    posts.filter(
      (post) =>
        post.status !== "canceled" &&
        post.id !== editingPost?.id &&
        postDate(post) === day,
    ).length >= 2;

  useEffect(() => {
    let active = true;
    void fetch(`/api/tiktok/creator?openId=${encodeURIComponent(account.openId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { creator?: Creator; error?: string };
        if (!response.ok || !result.creator) throw new Error(result.error || "Could not load TikTok creator settings.");
        return result.creator;
      }).then((result) => { if (active) setLatestCreator(result); })
      .catch((cause) => { if (active) setCreatorError(cause instanceof Error ? cause.message : "Could not load TikTok creator settings."); });
    return () => { active = false; };
  }, [account.openId]);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(captionPromptsKey) || "[]",
      );
      if (Array.isArray(stored))
        setSavedPrompts(
          stored.filter(
            (item): item is CaptionPrompt =>
              item &&
              typeof item.id === "string" &&
              typeof item.name === "string" &&
              typeof item.prompt === "string",
          ),
        );
    } catch {
      /* Keep the built-in prompt if local storage is unavailable. */
    }
  }, []);

  const persistPrompts = (prompts: CaptionPrompt[]) => {
    try {
      localStorage.setItem(captionPromptsKey, JSON.stringify(prompts));
      setSavedPrompts(prompts);
      setCaptionError("");
    } catch {
      setCaptionError("Could not save prompts in this browser.");
    }
  };

  const selectPrompt = (prompt: CaptionPrompt) => {
    setSelectedPromptId(prompt.id);
    setPromptName(prompt.name);
    setCaptionPrompt(prompt.prompt);
  };

  const savePrompt = () => {
    if (!promptName.trim() || !captionPrompt.trim()) return;
    const id =
      selectedPromptId === "default" || selectedPromptId === "new"
        ? crypto.randomUUID()
        : selectedPromptId;
    const prompt = {
      id,
      name: promptName.trim(),
      prompt: captionPrompt.trim(),
    };
    persistPrompts([...savedPrompts.filter((item) => item.id !== id), prompt]);
    setSelectedPromptId(id);
  };

  useEffect(() => {
    if (!selectedProject) {
      setProjectPreviews([]);
      return;
    }
    let active = true;
    setProjectPreviews([]);
    setActivePreviewIndex(0);
    setPreviewError("");
    setPreviewLoading(true);
    void (async () => {
      try {
        const previews: string[] = [];
        for (const slide of selectedProject.slides) {
          const image = await slideToDataURL(
            slide,
            selectedProject.dimensions.width,
            selectedProject.dimensions.height,
          );
          if (!active) return;
          previews.push(image);
          setProjectPreviews([...previews]);
        }
      } catch (cause) {
        if (active)
          setPreviewError(
            cause instanceof Error
              ? cause.message
              : "Could not preview this project.",
          );
      } finally {
        if (active) setPreviewLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedProject]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (postMode === "DIRECT_POST" && !latestCreator?.privacy_level_options?.includes(privacy)) throw new Error("Choose an available privacy setting.");
      if (postMode === "MEDIA_UPLOAD" && !account.scopes.includes("video.upload")) throw new Error("Reconnect this TikTok account with video.upload access.");
      if (!postingConsent) throw new Error("Agree to TikTok's posting terms before sending.");
      if (postMode === "DIRECT_POST" && commercialDisclosure && !brandContent && !brandOrganic) throw new Error("Choose what your commercial content promotes.");
      if (postMode === "DIRECT_POST" && brandContent && privacy === "SELF_ONLY") throw new Error("Branded content cannot be private.");
      if (
        !selectedProject ||
        !selectedProject.slides.length ||
        selectedProject.slides.length > 35
      )
        throw new Error("Choose a project with 1-35 slides.");
      if (!immediateDraft && dayIsFull)
        throw new Error("Only two posts can be planned for this day.");
      const scheduledAt = immediateDraft ? 0 : new Date(`${day}T${slotTime}`).getTime();
      if (!immediateDraft && (!Number.isFinite(scheduledAt) || scheduledAt < Date.now()))
        throw new Error(
          "This posting slot has passed. Choose a future day or update the daily posting time.",
        );
      let images =
        editingPost?.projectId === projectId ? editingPost.images : undefined;
      if (!images) {
        const form = new FormData();
        for (const slide of selectedProject.slides)
          form.append(
            "images",
            await exportSlide(
              slide,
              selectedProject.dimensions.width,
              selectedProject.dimensions.height,
              "jpg",
            ),
            "slide.jpg",
          );
        const uploaded = await fetch("/api/tiktok/assets", {
          method: "POST",
          body: form,
        });
        const result = (await uploaded.json()) as {
          urls?: string[];
          error?: string;
        };
        if (!uploaded.ok || !result.urls)
          throw new Error(
            result.error || "Could not prepare slides for TikTok.",
          );
        images = result.urls;
      }
      if (immediateDraft) {
        const response = await fetch("/api/tiktok/draft", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ openId: account.openId, title, description, images, isAigc, uploadConsent: postingConsent }),
        });
        const result = await response.json() as { publishId?: string; error?: string };
        if (!response.ok || !result.publishId) throw new Error(result.error || "Could not send slides to TikTok.");
        setPublishId(result.publishId);
        setUploadMessage("TikTok accepted the slides. Waiting for the inbox notification; this may take a few minutes.");
        return;
      }
      const response = await fetch("/api/tiktok/schedule", {
        method: editingPost ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPost?.id,
          openId: account.openId,
          projectId,
          projectName: selectedProject.name,
          calendarDate: day,
          title,
          description,
          images,
          privacyLevel: postMode === "MEDIA_UPLOAD" ? "SELF_ONLY" : privacy,
          postMode,
          disableComment: disableComment || Boolean(latestCreator?.comment_disabled),
          autoAddMusic,
          isAigc,
          brandContent,
          brandOrganic,
          postingConsent,
          scheduledAt,
        }),
      });
      const result = (await response.json()) as {
        post?: ScheduledPost;
        error?: string;
      };
      if (!response.ok || !result.post)
        throw new Error(result.error || "Could not schedule post.");
      await onSaved(result.post);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not schedule post.",
      );
    } finally {
      setBusy(false);
    }
  };

  const generateCaption = async () => {
    if (!selectedProject || !captionPrompt.trim()) return;
    setCaptionLoading(true);
    setCaptionError("");
    try {
      const response = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: captionPrompt,
          additionalInstructions,
          projectName: selectedProject.name,
          slides: selectedProject.slides.map((slide) => ({
            name: slide.name,
            notes: slide.notes,
            text: slide.elements
              .filter(
                (element): element is TextElement =>
                  element.type === "text" && element.visible,
              )
              .map((element) => element.text),
          })),
        }),
      });
      const result = (await response.json()) as {
        caption?: string;
        error?: string;
      };
      if (!response.ok || !result.caption)
        throw new Error(result.error || "Could not generate a caption.");
      setDescription(result.caption);
      setCaptionDialogOpen(false);
    } catch (cause) {
      setCaptionError(
        cause instanceof Error
          ? cause.message
          : "Could not generate a caption.",
      );
    } finally {
      setCaptionLoading(false);
    }
  };

  return (
    <div className="flex h-[90vh] flex-col lg:relative lg:block lg:h-[78vh]">
      <section
        className="flex h-[45vh] min-w-0 flex-none flex-col bg-muted/60 lg:mr-[340px] lg:h-full"
        aria-label="Project preview"
      >
        <div className="mx-auto rounded-b-2xl bg-background px-5 py-2 text-center text-sm font-medium shadow-sm">
          {immediateDraft ? "Send now" : `Post ${slot + 1}`}
        </div>
        <div className="relative flex min-h-0 flex-1 items-center px-6 py-6">
          {projectPreviews.length > 0 ? (
            <div className="grid w-full grid-cols-3 items-center gap-3">
              {projectPreviews
                .slice(activePreviewIndex, activePreviewIndex + 3)
                .map((src, offset) => (
                  <button
                    key={activePreviewIndex + offset}
                    type="button"
                    onClick={() =>
                      setActivePreviewIndex(activePreviewIndex + offset)
                    }
                    style={{
                      aspectRatio: `${selectedProject?.dimensions.width ?? 9} / ${selectedProject?.dimensions.height ?? 16}`,
                    }}
                    className="min-w-0 max-h-[22vh] overflow-hidden rounded-xl bg-background shadow-sm lg:max-h-[55vh]"
                  >
                    <Image
                      src={src}
                      alt={`Slide ${activePreviewIndex + offset + 1} of ${selectedProject?.name ?? "project"}`}
                      width={selectedProject?.dimensions.width ?? 320}
                      height={selectedProject?.dimensions.height ?? 560}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
            </div>
          ) : (
            <p className="w-full text-center text-sm text-muted-foreground">
              {previewLoading
                ? "Rendering slide preview…"
                : selectedProject
                  ? "Preview will appear here."
                  : "Choose a project to preview its slides."}
            </p>
          )}
          {activePreviewIndex > 0 && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Previous slide"
              onClick={() => setActivePreviewIndex(activePreviewIndex - 1)}
              className="absolute left-2 top-1/2 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {activePreviewIndex < projectPreviews.length - 1 && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Next slide"
              onClick={() => setActivePreviewIndex(activePreviewIndex + 1)}
              className="absolute right-2 top-1/2 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        {previewError && (
          <p role="alert" className="px-6 text-xs text-destructive">
            {previewError}
          </p>
        )}
        {projectPreviews.length > 0 && (
          <div
            className="flex justify-center gap-2 pb-4"
            aria-label="Slide pagination"
          >
            {projectPreviews.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={activePreviewIndex === index}
                onClick={() => setActivePreviewIndex(index)}
                className={`h-2 w-2 rounded-full ${activePreviewIndex === index ? "bg-primary" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 border-t bg-background/90 px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
            {account.displayName.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {latestCreator?.creator_nickname ?? account.displayName}
            </p>
            <p className="truncate text-sm font-medium">
              {title || selectedProject?.name || "Post title"}
            </p>
            <p className="line-clamp-2 break-words text-xs text-muted-foreground">
              {description || "Post description"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {selectedProject?.slides.length ?? 0} slides
          </span>
        </div>
      </section>
      <section
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto border-l bg-background px-5 py-6 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[340px]"
        aria-label="TikTok post details"
      >
        <div className="pr-8">
          <h3 className="text-lg font-semibold">
            {immediateDraft ? "Send to TikTok inbox" : editingPost ? "Edit post" : "Schedule post"}
          </h3>
          <p className="text-sm text-muted-foreground">{latestCreator?.creator_nickname ?? account.displayName}</p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {uploadMessage && <p role="status" className="rounded-md border p-3 text-sm">{uploadMessage}</p>}
        <div className="space-y-2">
          <Label htmlFor="schedule-project-search">Project</Label>
          <Input
            id="schedule-project-search"
            value={projectSearch}
            onChange={(event) => {
              setProjectSearch(event.target.value);
              setExpandedFolders({});
            }}
            placeholder="Search projects or folders"
          />
          <div
            className="max-h-56 overflow-y-auto rounded-md border p-1"
            aria-label="Project folders"
          >
            {projectGroups.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No matching folders or projects.
              </p>
            ) : (
              projectGroups.map((group) => {
                const expanded =
                  expandedFolders[group.id] ??
                  (Boolean(search) ||
                    selectedProject?.folderId === group.id ||
                    (group.id === "unfiled" &&
                      selectedProject &&
                      !selectedProject.folderId));
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      aria-expanded={Boolean(expanded)}
                      onClick={() => toggleFolder(group.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {group.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {group.projects.length}
                      </span>
                    </button>
                    {expanded && (
                      <div className="ml-5 border-l pl-1">
                        {group.projects.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            No projects
                          </p>
                        ) : (
                          group.projects.map((project) => (
                            <div
                              key={project.id}
                              className="flex items-center rounded hover:bg-accent"
                            >
                              <button
                                type="button"
                                aria-pressed={projectId === project.id}
                                onClick={() => setProjectId(project.id)}
                                className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-sm ${projectId === project.id ? "bg-primary/10 font-medium" : ""}`}
                              >
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">
                                  {project.name}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {project.slides.length} slides
                                </span>
                              </button>
                              {!immediateDraft && <button
                                type="button"
                                title={`Mark ${project.name} as posted`}
                                aria-label={`Mark ${project.name} as posted`}
                                onClick={() => {
                                  onSetPosted(project.id, true);
                                  if (projectId === project.id)
                                    setProjectId("");
                                }}
                                className="rounded p-2 text-muted-foreground hover:text-foreground"
                              >
                                <Check className="h-4 w-4" />
                              </button>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {selectedProject && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedProject.name} ·{" "}
              {projectFolder(selectedProject)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule-title">Title</Label>
          <Input
            id="schedule-title"
            maxLength={90}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule-description">Description</Label>
          <div className="relative">
            <Textarea
              id="schedule-description"
              rows={4}
              maxLength={4000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="pb-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Generate caption with AI"
              aria-label="Generate caption with AI"
              onClick={() => {
                setCaptionError("");
                setCaptionDialogOpen(true);
              }}
              className="absolute bottom-1 right-1 h-8 w-8 m-1 bg-primary"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!immediateDraft && <div className="space-y-2">
          <Label htmlFor="schedule-post-mode">Delivery</Label>
          <select id="schedule-post-mode" value={postMode} onChange={(event) => setPostMode(event.target.value as "DIRECT_POST" | "MEDIA_UPLOAD")} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="DIRECT_POST">Post automatically</option>
            <option value="MEDIA_UPLOAD">Send to TikTok inbox to finish</option>
          </select>
          {postMode === "MEDIA_UPLOAD" && <p className="text-xs text-muted-foreground">TikTok will notify you in its app. Open the notification to edit and publish the post yourself. {!account.scopes.includes("video.upload") && <>This account connection has not granted video.upload. <a href="/api/tiktok/connect" className="underline">Reconnect to grant it</a>.</>}</p>}
        </div>}
        {immediateDraft && !account.scopes.includes("video.upload") && <p role="alert" className="text-sm text-destructive">This account connection has not granted video.upload. <a href="/api/tiktok/connect" className="underline">Reconnect to grant it</a>.</p>}
        {postMode === "DIRECT_POST" && <div className="space-y-2">
          <Label htmlFor="schedule-privacy">Who can view</Label>
          <select
            id="schedule-privacy"
            value={privacy}
            onChange={(event) => setPrivacy(event.target.value)}
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>Select privacy</option>
            {latestCreator?.privacy_level_options?.map((option) => (
              <option key={option} value={option} disabled={brandContent && option === "SELF_ONLY"}>
                {option.replaceAll("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
          {creatorError && <p role="alert" className="text-xs text-destructive">{creatorError}</p>}
        </div>}
        {postMode === "DIRECT_POST" && <div className="space-y-2 text-sm">
          <label className={`flex items-center gap-2 ${latestCreator?.comment_disabled ? "text-muted-foreground" : ""}`}><input type="checkbox" checked={!disableComment && !latestCreator?.comment_disabled} disabled={latestCreator?.comment_disabled} onChange={(event) => setDisableComment(!event.target.checked)} />Allow comments</label>
          {latestCreator?.comment_disabled && <p className="text-xs text-muted-foreground">Comments are disabled in this TikTok account&apos;s settings.</p>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={autoAddMusic} onChange={(event) => setAutoAddMusic(event.target.checked)} />Add recommended music</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={commercialDisclosure} onChange={(event) => { setCommercialDisclosure(event.target.checked); if (!event.target.checked) { setBrandContent(false); setBrandOrganic(false); } }} />This content promotes a brand, product, or service</label>
          {commercialDisclosure && <div className="ml-5 space-y-2"><label className="flex items-center gap-2"><input type="checkbox" checked={brandOrganic} onChange={(event) => setBrandOrganic(event.target.checked)} />Your brand</label><label className={`flex items-center gap-2 ${privacy === "SELF_ONLY" ? "text-muted-foreground" : ""}`}><input type="checkbox" checked={brandContent} disabled={privacy === "SELF_ONLY"} onChange={(event) => setBrandContent(event.target.checked)} />Branded content / paid partnership</label>{privacy === "SELF_ONLY" && <p className="text-xs text-muted-foreground">Branded content cannot be private.</p>}{(brandContent || brandOrganic) && <p className="text-xs text-muted-foreground">Your post will be labeled {brandContent ? "Paid partnership" : "Promotional content"}.</p>}{!brandContent && !brandOrganic && <p className="text-xs text-destructive">Choose at least one option before scheduling.</p>}</div>}
        </div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isAigc} onChange={(event) => setIsAigc(event.target.checked)} />AI-generated content</label>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={postingConsent} onChange={(event) => setPostingConsent(event.target.checked)} className="mt-0.5" /><span>By {immediateDraft ? "sending" : "scheduling"} this {postMode === "MEDIA_UPLOAD" ? "upload" : "post"}, you agree to TikTok&apos;s {postMode === "DIRECT_POST" && brandContent && <><a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer" className="underline">Branded Content Policy</a> and </>}<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="underline">Music Usage Confirmation</a>. Slide images will be sent to TikTok {immediateDraft ? "now" : "at the scheduled time"}.</span></label>
        <Button
          className="w-full"
          disabled={
            busy ||
            (!immediateDraft && dayIsFull) ||
            (postMode === "DIRECT_POST" && !latestCreator) ||
            !projectId ||
            (postMode === "DIRECT_POST" && !privacy) ||
            !postingConsent ||
            Boolean(publishId) ||
            Boolean(uploadMessage && !error) ||
            (postMode === "DIRECT_POST" && commercialDisclosure && !brandContent && !brandOrganic) ||
            (postMode === "DIRECT_POST" && brandContent && privacy === "SELF_ONLY") ||
            !account.scopes.includes(postMode === "MEDIA_UPLOAD" ? "video.upload" : "video.publish")
          }
          onClick={() => void save()}
        >
          {busy ? (immediateDraft ? "Sending..." : "Saving...") : publishId ? "Waiting for TikTok..." : immediateDraft ? "Send to TikTok inbox" : editingPost ? "Save changes" : "Schedule post"}
        </Button>
        {!immediateDraft && dayIsFull && (
          <p className="text-xs text-destructive">
            Only two posts can be planned for this day.
          </p>
        )}
        {!immediateDraft && <p className="text-xs text-muted-foreground">
          Slides are prepared in R2 when you save. Scheduled delivery runs while
          the local server is on. {postMode === "MEDIA_UPLOAD" ? "After TikTok receives the slides, open its inbox notification to finish and publish." : "After TikTok receives a post, it may take a few minutes to appear on your profile."} Check the calendar for its status.
        </p>}
      </section>
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate caption</DialogTitle>
            <DialogDescription>
              Choose a saved system prompt, add instructions for this post, then
              generate a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Saved prompts</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedPromptId("new");
                  setPromptName("");
                  setCaptionPrompt("");
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                New
              </Button>
            </div>
            <div
              className="max-h-28 space-y-1 overflow-y-auto rounded-md border p-1"
              aria-label="Saved caption prompts"
            >
              {[
                {
                  id: "default",
                  name: "Default caption",
                  prompt: defaultCaptionPrompt,
                },
                ...savedPrompts,
              ].map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  aria-pressed={selectedPromptId === prompt.id}
                  onClick={() => selectPrompt(prompt)}
                  className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent ${selectedPromptId === prompt.id ? "bg-primary/10 font-medium" : ""}`}
                >
                  {prompt.name}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption-prompt-name">Prompt name</Label>
              <Input
                id="caption-prompt-name"
                maxLength={100}
                value={promptName}
                onChange={(event) => setPromptName(event.target.value)}
                placeholder="Name this prompt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption-system-prompt">System prompt</Label>
              <Textarea
                id="caption-system-prompt"
                rows={4}
                maxLength={4000}
                value={captionPrompt}
                onChange={(event) => setCaptionPrompt(event.target.value)}
                placeholder="How should the AI write captions?"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!promptName.trim() || !captionPrompt.trim()}
                onClick={savePrompt}
              >
                Save prompt
              </Button>
              {selectedPromptId !== "default" && selectedPromptId !== "new" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    persistPrompts(
                      savedPrompts.filter(
                        (item) => item.id !== selectedPromptId,
                      ),
                    );
                    selectPrompt({
                      id: "default",
                      name: "Default caption",
                      prompt: defaultCaptionPrompt,
                    });
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption-extra-instructions">
                Additional instructions for this caption
              </Label>
              <Textarea
                id="caption-extra-instructions"
                rows={3}
                maxLength={2000}
                value={additionalInstructions}
                onChange={(event) =>
                  setAdditionalInstructions(event.target.value)
                }
                placeholder="Optional tone, audience, hashtags, or details to include"
              />
            </div>
            {captionError && (
              <p role="alert" className="text-sm text-destructive">
                {captionError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={
                captionLoading || !selectedProject || !captionPrompt.trim()
              }
              onClick={() => void generateCaption()}
            >
              {captionLoading ? "Generating..." : "Generate caption"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
