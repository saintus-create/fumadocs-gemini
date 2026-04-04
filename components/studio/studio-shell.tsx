'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, CardContent, Chip, Separator } from '@heroui/react';
import {
  Bot,
  FileCode2,
  FolderTree,
  Hammer,
  Play,
  ScrollText,
  Search,
  Settings2,
  TerminalSquare,
} from 'lucide-react';
import { Thread } from '@/components/assistant-ui/thread';
import { AISearch } from '@/components/ai/search';

const initialFiles: Record<string, string> = {
  'app/studio/page.tsx': `import { StudioShell } from '@/components/studio/studio-shell';

export default function StudioPage() {
  return <StudioShell />;
}`,
  'app/docs/[[...slug]]/page.tsx': `import { DocsChatPage } from '@/components/docs/docs-chat-page';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  if (!params.slug || params.slug.length === 0) return <DocsChatPage />;
}`,
  'app/api/chat/route.ts': `export async function POST(req: Request) {
  return new Response('chat route');
}`,
  'components/studio/studio-shell.tsx': `export function StudioShell() {
  return <div>Studio</div>;
}`,
  'components/assistant-ui/thread.tsx': `export const Thread = () => {
  return <div>Assistant Thread</div>;
};`,
  'components/ai/search.tsx': `export function AISearchDialog() {
  return null;
}`,
  'content/docs/index.mdx': `# Welcome

Ask the docs or open the studio.`,
  'content/docs/getting-started.mdx': `# Getting Started

1. Open /studio
2. Ask the assistant
3. Run your workspace`,
};

const tree = [
  {
    name: 'app',
    items: ['studio/page.tsx', 'docs/[[...slug]]/page.tsx', 'api/chat/route.ts'],
  },
  {
    name: 'components',
    items: ['studio/studio-shell.tsx', 'assistant-ui/thread.tsx', 'ai/search.tsx'],
  },
  {
    name: 'content',
    items: ['docs/index.mdx', 'docs/getting-started.mdx'],
  },
];

const editorTabs = ['studio-shell.tsx', 'page.tsx', 'route.ts'];
const runPanels = ['Console', 'Tasks', 'Preview'];
const initialConsoleLines = [
  '$ workspace boot',
  '✓ Studio loaded',
  '✓ Assistant attached',
  '✓ Docs available at /docs',
];

const taskLines = [
  'Ship a lean coding workspace',
  'Keep docs one click away',
  'Use the assistant for code + docs context',
];

const toolRail = [
  { icon: FolderTree, label: 'Files', active: true },
  { icon: Search, label: 'Search' },
  { icon: Hammer, label: 'Build' },
  { icon: TerminalSquare, label: 'Console' },
  { icon: Bot, label: 'Assistant' },
];

export function StudioShell() {
  const [files, setFiles] = useState(initialFiles);
  const [activeFile, setActiveFile] = useState<keyof typeof initialFiles>('components/studio/studio-shell.tsx');
  const [activeRunPanel, setActiveRunPanel] = useState('Console');
  const [consoleLines, setConsoleLines] = useState(initialConsoleLines);

  const activeContent = files[activeFile];
  const lineCount = activeContent.split('\n').length;

  const openTabs = Array.from(
    new Set([
      activeFile.split('/').at(-1) ?? activeFile,
      ...editorTabs,
    ]),
  ).slice(0, 4);

  const handleRun = () => {
    const nextLines = [
      '$ npm run workspace',
      `> opening ${activeFile}`,
      `> ${activeContent.split('\n').length} lines parsed`,
      `✓ ${activeFile} ready`,
      `✓ preview synced at ${new Date().toLocaleTimeString()}`,
    ];

    setConsoleLines(nextLines);
    setActiveRunPanel('Console');
  };

  return (
    <AISearch open onOpenChange={() => {}}>
      <div className="grid min-h-[100dvh] grid-cols-[56px_220px_minmax(0,1fr)] bg-background text-foreground xl:grid-cols-[56px_220px_minmax(0,1fr)_360px]">
        <aside className="flex flex-col border-r bg-content1">
          <div className="flex h-14 items-center justify-center border-b">
            <div className="rounded-medium border bg-content2 px-2 py-1 text-xs font-semibold">S</div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 px-2 py-3">
            {toolRail.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                className={`inline-flex size-10 items-center justify-center rounded-large transition-colors ${
                  item.active ? 'bg-default-100 text-foreground' : 'text-default-500 hover:bg-default-50'
                }`}
              >
                <item.icon className="size-4" />
              </button>
            ))}
          </div>
          <div className="border-t p-2">
            <button
              type="button"
              aria-label="Settings"
              className="inline-flex size-10 items-center justify-center rounded-large text-default-500 transition-colors hover:bg-default-50"
            >
              <Settings2 className="size-4" />
            </button>
          </div>
        </aside>

        <aside className="hidden border-r bg-content1/60 lg:flex lg:flex-col">
          <div className="flex h-14 items-center justify-between px-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-default-500">Explorer</p>
            <Link href="/docs" className="text-default-500 transition-colors hover:text-foreground">
              <ScrollText className="size-4" />
            </Link>
          </div>
          <Separator />
          <div className="flex-1 overflow-auto px-2 py-3">
            {tree.map((group) => (
              <div key={group.name} className="mb-4">
                <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-default-400">
                  {group.name}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const path = `${group.name}/${item}` as keyof typeof initialFiles;
                    const active = activeFile === path;

                    return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => setActiveFile(path)}
                      className={`flex w-full items-center gap-2 rounded-medium px-2 py-2 text-left text-sm ${
                        active ? 'bg-default-100 text-foreground' : 'text-default-600 hover:bg-default-50'
                      }`}
                    >
                      <FileCode2 className="size-4 shrink-0" />
                      <span className="truncate">{item}</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="grid min-w-0 grid-rows-[56px_minmax(0,1fr)_220px] bg-background">
          <header className="flex items-center justify-between border-b px-3">
            <div className="flex items-center gap-2 overflow-auto">
              {openTabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`rounded-medium px-3 py-1.5 text-sm ${
                    index === 0 ? 'bg-default-100 text-foreground' : 'text-default-500 hover:bg-default-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="soft" color="accent">
                {activeFile}
              </Chip>
              <Button size="sm" variant="secondary" onPress={handleRun}>
                <Play className="size-4" />
                Run
              </Button>
            </div>
          </header>

          <section className="grid min-h-0 min-w-0 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 overflow-hidden xl:border-r">
              <div className="grid h-full min-h-0 grid-cols-[52px_minmax(0,1fr)]">
                <div className="border-r bg-content1/40 px-2 py-4 text-right text-xs text-default-400">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className="leading-7">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  value={activeContent}
                  onChange={(event) =>
                    setFiles((current) => ({
                      ...current,
                      [activeFile]: event.target.value,
                    }))
                  }
                  spellCheck={false}
                  className="h-full w-full resize-none overflow-auto bg-transparent px-5 py-4 font-mono text-sm leading-7 text-foreground outline-none"
                />
              </div>
            </div>

            <div className="hidden min-h-0 xl:block">
              <Card className="h-full rounded-none border-0 shadow-none">
                <CardContent className="h-full min-h-0 p-0">
                  <Thread />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="border-t bg-content1/35">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              {runPanels.map((panel) => (
                <button
                  key={panel}
                  type="button"
                  onClick={() => setActiveRunPanel(panel)}
                  className={`rounded-medium px-3 py-1.5 text-sm ${
                    activeRunPanel === panel ? 'bg-default-100 text-foreground' : 'text-default-500 hover:bg-default-50'
                  }`}
                >
                  {panel}
                </button>
              ))}
            </div>
            <div className="h-[171px] overflow-auto px-4 py-3">
              {activeRunPanel === 'Console' && (
                <div className="font-mono text-sm leading-7 text-default-700">
                  {consoleLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              )}
              {activeRunPanel === 'Tasks' && (
                <div className="space-y-2">
                  {taskLines.map((line, index) => (
                    <div key={line} className="rounded-large bg-content2 px-4 py-3 text-sm">
                      {index + 1}. {line}
                    </div>
                  ))}
                </div>
              )}
              {activeRunPanel === 'Preview' && (
                <div className="rounded-large border bg-content2/60 px-4 py-6 text-sm text-default-600">
                  <p className="font-medium text-foreground">{activeFile}</p>
                  <p className="mt-2">Live buffer snapshot</p>
                  <pre className="mt-3 overflow-auto rounded-medium bg-background px-3 py-3 font-mono text-xs leading-6 text-default-700">
                    <code>{activeContent.slice(0, 700)}</code>
                  </pre>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </AISearch>
  );
}
