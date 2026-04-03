'use client';

import { useEffect } from 'react';
import {
  SidebarProvider,
  type SidebarProviderProps,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';

function CollapseOnMount() {
  const { setCollapsed } = useSidebar();

  useEffect(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  return null;
}

export function CollapsedSidebarProvider(props: SidebarProviderProps) {
  return (
    <SidebarProvider {...props}>
      <CollapseOnMount />
      {props.children}
    </SidebarProvider>
  );
}
