'use client';

import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  Sidebar,
  SidebarTrigger,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { CollapsedSidebarProvider } from '@/components/docs/collapsed-sidebar-provider';

export function DocsLayoutShell({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      slots={{
        sidebar: {
          provider: CollapsedSidebarProvider,
          root: Sidebar,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
