import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { AISearchDialog } from '@/components/ai/search';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      }}
    >
      <body
        className="flex flex-col min-h-screen"
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        }}
      >
        <TooltipProvider>
          <RootProvider search={{ SearchDialog: AISearchDialog }}>{children}</RootProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
