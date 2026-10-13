import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Project, ProjectFolder } from "@/types";

export interface ProjectFileData {
  projects: Project[];
  folders: ProjectFolder[];
}

export function dataDirectory() {
  const base =
    process.platform === "win32"
      ? process.env.APPDATA || join(homedir(), "AppData", "Roaming")
      : process.platform === "darwin"
        ? join(homedir(), "Library", "Application Support")
        : process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return process.env.SLIDEFARM_DATA_DIR || join(base, "SlideFarm");
}

function dataPath() {
  const directory = dataDirectory();
  return { directory, file: join(directory, "projects.json") };
}

export async function readProjectFile(): Promise<ProjectFileData | null> {
  try {
    const data = JSON.parse(
      await readFile(dataPath().file, "utf8"),
    ) as ProjectFileData;
    if (!Array.isArray(data.projects) || !Array.isArray(data.folders)) {
      throw new Error("Invalid project file");
    }
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProjectFile(data: ProjectFileData): Promise<void> {
  const { directory, file } = dataPath();
  await mkdir(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(data), "utf8");
  await rename(temporary, file);
}
