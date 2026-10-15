"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Workflow, Users, Settings } from "lucide-react";
import icon from "@/app/assets/icon.png";
import { WindowControls } from "@/components/window-controls";

const routes = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardHeader() {
  const pathname = usePathname();

  return <>
    <header className="app-titlebar fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Image src={icon} height={32} width={32} alt="SlideFarm" className="pointer-events-none" />
        </div>
        <span className="font-semibold">SlideFarm</span>
      </div>
      <WindowControls />
    </header>
    <aside className="fixed bottom-0 left-0 top-14 z-30 w-16 border-r border-border bg-card md:w-56">
      <nav className="flex flex-col gap-1 p-2 md:p-3" aria-label="Main navigation">
        {routes.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} title={label}
            className={`flex h-10 items-center justify-center gap-3 rounded-lg px-3 text-sm transition-colors md:justify-start ${active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">{label}</span>
          </Link>;
        })}
      </nav>
    </aside>
  </>;
}
