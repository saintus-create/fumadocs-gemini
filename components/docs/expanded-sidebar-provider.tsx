'use client';

import { useEffect } from 'react';
import {
  SidebarProvider,
  type SidebarProviderProps,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';

function ExpandOnMount() {
  const { setCollapsed } = useSidebar();

  useEffect(() => {
    setCollapsed(false);
  }, [setCollapsed]);

  return null;
}

export function ExpandedSidebarProvider(props: SidebarProviderProps) {
  return (
    <SidebarProvider {...props}>
      <ExpandOnMount />
      {props.children}
    </SidebarProvider>
  );
}
