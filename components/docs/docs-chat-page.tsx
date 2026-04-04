'use client';

import { Thread } from '@/components/assistant-ui/thread';
import { AISearch, useAISearchContext } from '@/components/ai/search';

function DocsChatPageInner() {
  useAISearchContext();

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] min-h-0 w-full max-w-5xl flex-col overflow-hidden px-0 py-0">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Thread />
      </div>
    </div>
  );
}

export function DocsChatPage() {
  return (
    <AISearch open onOpenChange={() => {}}>
      <DocsChatPageInner />
    </AISearch>
  );
}
