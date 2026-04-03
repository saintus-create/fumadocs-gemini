'use client';

import { Button, Card, Chip } from '@heroui/react';
import { Bot, Compass, MessagesSquare, PanelLeftOpen, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';

const STORAGE_KEY = '__ai_search_input';

const suggestions = [
  'What should I read first in these docs?',
  'Summarize the most important concepts here.',
  'Show me the docs pages most relevant to setup.',
  'What are the key workflows covered in this site?',
];

export function DocsAIHome() {
  const router = useRouter();
  const { setOpenSearch } = useSearchContext();
  const { setCollapsed } = useSidebar();

  const openAssistant = (prompt?: string) => {
    if (typeof window !== 'undefined') {
      if (prompt) {
        window.localStorage.setItem(STORAGE_KEY, prompt);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setOpenSearch(true);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-5xl flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-3xl text-center">
        <Chip variant="secondary" className="mb-5">
          AI-first docs
        </Chip>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
          Ask the docs instead of hunting through them.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-fd-muted-foreground sm:text-lg">
          This docs space is built to feel more like a research assistant than a file tree. Start with a
          question, then dive into the cited pages when you need detail.
        </p>
      </div>

      <Card variant="secondary" className="mx-auto mt-10 w-full max-w-3xl border shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-fd-primary/10 p-3 text-fd-primary">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fd-foreground">Start with the assistant</p>
              <p className="mt-1 text-sm leading-6 text-fd-muted-foreground">
                Ask broad questions, get grounded answers, and follow citations back into the underlying docs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onPress={() => openAssistant()}>
              <MessagesSquare className="size-4" />
              Open Assistant
            </Button>
            <Button variant="secondary" onPress={() => setCollapsed(false)}>
              <PanelLeftOpen className="size-4" />
              Show Sidebar
            </Button>
            <Button variant="ghost" onPress={() => router.push('/docs/test')}>
              <Compass className="size-4" />
              Browse a Page
            </Button>
          </div>
        </div>
      </Card>

      <div className="mx-auto mt-8 grid w-full max-w-4xl gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => openAssistant(suggestion)}
            className="rounded-xl border bg-fd-card px-4 py-4 text-left transition-colors hover:bg-fd-accent/50"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-fd-primary">
                <Sparkles className="size-4" />
              </div>
              <p className="text-sm leading-6 text-fd-foreground">{suggestion}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="mx-auto mt-6 text-sm text-fd-muted-foreground">
        The docs navigation starts collapsed by design. Use `Show Sidebar` whenever you want the full tree.
      </p>
    </div>
  );
}
