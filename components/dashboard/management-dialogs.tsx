"use client";

import type { Project, ProjectFolder } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManagementDialogsProps {
  folderDialogOpen: boolean;
  onFolderDialogOpenChange: (open: boolean) => void;
  folderIdToEdit: string | null;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  folderError: string;
  onSaveFolder: () => void;
  confirmBulkDelete: boolean;
  onBulkDeleteOpenChange: (open: boolean) => void;
  selectedProjectCount: number;
  onDeleteProjects: () => void;
  projectToDelete: Project | null;
  onProjectToDeleteChange: (project: Project | null) => void;
  onDeleteProject: (project: Project) => void;
  folderToDelete: ProjectFolder | null;
  onFolderToDeleteChange: (folder: ProjectFolder | null) => void;
  onDeleteFolder: (folder: ProjectFolder) => void;
}

export function ManagementDialogs({
  folderDialogOpen,
  onFolderDialogOpenChange,
  folderIdToEdit,
  folderName,
  onFolderNameChange,
  folderError,
  onSaveFolder,
  confirmBulkDelete,
  onBulkDeleteOpenChange,
  selectedProjectCount,
  onDeleteProjects,
  projectToDelete,
  onProjectToDeleteChange,
  onDeleteProject,
  folderToDelete,
  onFolderToDeleteChange,
  onDeleteFolder,
}: ManagementDialogsProps) {
  return (
    <>
      <Dialog open={folderDialogOpen} onOpenChange={onFolderDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderIdToEdit ? "Rename folder" : "Create folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(event) => onFolderNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSaveFolder();
              }}
              autoFocus
            />
            {folderError && (
              <p className="text-sm text-destructive" role="alert">
                {folderError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={onSaveFolder} disabled={!folderName.trim()}>
              {folderIdToEdit ? "Save folder" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmBulkDelete}
        onOpenChange={onBulkDeleteOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedProjectCount} projects?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={onDeleteProjects}>
                Delete projects
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && onProjectToDeleteChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{projectToDelete?.name}&quot; and
              its slides.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() =>
                  projectToDelete && onDeleteProject(projectToDelete)
                }
              >
                Delete project
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && onFolderToDeleteChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {folderToDelete?.name} will be deleted. Projects in it will be
              moved to Unfiled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => folderToDelete && onDeleteFolder(folderToDelete)}
              >
                Delete folder
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
