"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SchedulePostForm } from "@/components/accounts/schedule-post-form";
import type { Project, ProjectFolder } from "@/types";

type Account = { openId: string; displayName: string; scopes: string[] };

export function SendTikTokDraft({ account, projects, folders, onSetPosted }: {
  account: Account;
  projects: Project[];
  folders: ProjectFolder[];
  onSetPosted: (projectId: string, posted: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Send project to TikTok inbox</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-7xl overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Send project to TikTok inbox</DialogTitle>
          <DialogDescription>Select a project, preview its slides, and send it to TikTok now.</DialogDescription>
        </DialogHeader>
        <SchedulePostForm
          key={open ? "open" : "closed"}
          account={account}
          projects={projects}
          folders={folders}
          onSetPosted={onSetPosted}
          posts={[]}
          initialDay=""
          slotTime=""
          slot={0}
          editingPost={null}
          onSaved={async () => {}}
          immediateDraft
        />
      </DialogContent>
    </Dialog>
  </>;
}
