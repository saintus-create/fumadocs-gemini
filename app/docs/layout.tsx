import { DocsLayoutShell } from '@/components/docs/docs-layout-shell';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return <DocsLayoutShell>{children}</DocsLayoutShell>;
}
