'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics/events';

function pageName(pathname: string): string {
  if (pathname === '/') return 'dashboard';
  if (pathname.startsWith('/editor/')) return 'editor';
  if (pathname === '/workflows/new') return 'workflow_new';
  if (pathname === '/workflows/media') return 'workflow_media';
  if (pathname.startsWith('/workflows/')) return 'workflow_editor';
  if (pathname === '/workflows') return 'workflows';
  if (pathname.startsWith('/accounts/')) return 'account';
  if (pathname === '/accounts') return 'accounts';
  if (pathname === '/images') return 'images';
  if (pathname === '/media') return 'media';
  if (pathname === '/settings') return 'settings';
  return 'other';
}

export function PageTracker() {
  const pathname = usePathname();
  const previousPath = useRef<string>();

  useEffect(() => {
    if (!pathname || previousPath.current === pathname) return;
    previousPath.current = pathname;
    trackEvent('page_view', { page: pageName(pathname) });
  }, [pathname]);

  return null;
}
