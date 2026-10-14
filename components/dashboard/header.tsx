"use client";

import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import Image from "next/image";
import Link from "next/link";
import icon from "@/app/assets/icon.png";

interface DashboardHeaderProps {
  onToggleTheme?: () => void;
  isDark?: boolean;
}

export function DashboardHeader({
  onToggleTheme,
  isDark,
}: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const dark = isDark ?? theme === "dark";
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Image src={icon} height={150} width={150} alt={"test"} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Slidefarm</h1>
          </div>
        </div>

        <nav
          className="flex items-center gap-1 sm:gap-3"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-sm hover:bg-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/workflows"
            className="rounded-md px-2 py-1 text-sm hover:bg-accent"
          >
            Workflows
          </Link>
          <Link
            href="/media"
            className="rounded-md px-2 py-1 text-sm hover:bg-accent"
          >
            Media
          </Link>
          <Link href="/accounts" className="rounded-md px-2 py-1 text-sm hover:bg-accent">
            Accounts
          </Link>
        </nav>
        <button
          onClick={onToggleTheme ?? (() => setTheme(dark ? "light" : "dark"))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
