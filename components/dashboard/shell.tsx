import type { ReactNode } from 'react';
import { DashboardHeader } from './header';

export function DashboardShell({ children }: { children: ReactNode }) {
  return <div className="h-screen overflow-hidden bg-background">
    <DashboardHeader />
    <div className="fixed bottom-0 right-0 top-14 left-16 overflow-y-auto md:left-56">
      {children}
    </div>
  </div>;
}
