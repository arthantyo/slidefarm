import type { ScheduledPost } from "@/lib/server/tiktok-schedule";

export const loadPosts = async (
    openId: string,
    setPosts: (posts: ScheduledPost[]) => void,
    isActive: () => boolean = () => true,
  ) => {
    const response = await fetch(
      `/api/tiktok/schedule?openId=${encodeURIComponent(openId)}`,
      { cache: "no-store" },
    );
    const result = (await response.json()) as {
      posts?: ScheduledPost[];
      error?: string;
    };
    if (!response.ok || !result.posts)
      throw new Error(result.error || "Could not load calendar.");
    if (isActive()) setPosts(result.posts);
  };

