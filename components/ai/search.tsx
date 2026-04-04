'use client';

import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, X } from 'lucide-react';
import { Button, Spinner } from '@heroui/react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Presence } from '@radix-ui/react-presence';
import Vapi from '@vapi-ai/web';
import { Thread } from '@/components/assistant-ui/thread';
import type { ChatUIMessage } from '@/app/api/chat/route';
import { cn } from '@/lib/utils';
import { Matrix, loader, pulse, type Frame } from '@/components/ui/matrix';

const StorageKeyInput = '__ai_search_input';

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  voiceActive: boolean;
  voiceConnecting: boolean;
  voiceState: 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking';
  toggleVoice: () => void;
  clearChat: () => void;
} | null>(null);

type AISearchProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type AISearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function createUserMessage(text: string): ChatUIMessage {
  return {
    id: `voice-${crypto.randomUUID()}`,
    role: 'user',
    parts: [
      {
        type: 'data-client',
        data: {
          location: typeof window !== 'undefined' ? window.location.href : '',
        },
      },
      {
        type: 'text',
        text,
      },
    ],
  };
}

function getVoiceMatrixConfig(state: 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking'): {
  frames?: Frame[];
  pattern?: Frame;
  fps: number;
  palette: { on: string; off: string };
} {
  switch (state) {
    case 'connecting':
      return { frames: loader, fps: 12, palette: { on: '#ffffff', off: 'rgba(255,255,255,0.08)' } };
    case 'speaking':
      return { frames: pulse, fps: 16, palette: { on: '#ffffff', off: 'rgba(255,255,255,0.06)' } };
    case 'thinking':
      return { frames: loader, fps: 10, palette: { on: '#ffffff', off: 'rgba(255,255,255,0.06)' } };
    case 'listening':
      return { frames: pulse, fps: 8, palette: { on: '#ffffff', off: 'rgba(255,255,255,0.08)' } };
    default:
      return {
        pattern: [
          [0, 0, 1, 0, 0],
          [0, 1, 1, 1, 0],
          [1, 1, 1, 1, 1],
          [0, 0, 1, 0, 0],
          [0, 0, 1, 0, 0],
          [0, 1, 0, 1, 0],
          [1, 0, 0, 0, 1],
        ],
        fps: 1,
        palette: { on: '#ffffff', off: 'rgba(255,255,255,0.08)' },
      };
  }
}

function AISearchPanelHeader() {
  const { clearChat, setOpen, toggleVoice, voiceActive, voiceConnecting, voiceState } = useAISearchContext();
  const voiceMatrix = getVoiceMatrixConfig(voiceState);

  return (
    <div className="sticky top-0 flex items-start gap-3 rounded-2xl border bg-background/95 px-3 py-3 shadow-sm backdrop-blur">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Docs Assistant</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {voiceActive
            ? voiceState === 'speaking'
              ? 'Speaking'
              : voiceState === 'thinking'
                ? 'Thinking'
                : voiceState === 'listening'
                  ? 'Listening'
                  : voiceState === 'connecting'
                    ? 'Connecting voice'
                    : 'Voice active'
            : 'Ask about the docs or browse a page when you need the source material.'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" className="rounded-full" onPress={clearChat}>
          Clear
        </Button>
        <Button
          aria-label={voiceActive ? 'Stop voice' : 'Start voice'}
          isIconOnly
          size="sm"
          variant={voiceActive ? 'primary' : 'secondary'}
          className={cn('rounded-full', voiceActive && 'ring-2 ring-primary/20')}
          onPress={toggleVoice}
          isDisabled={voiceConnecting}
        >
          {voiceConnecting ? (
            <Spinner size="sm" />
          ) : voiceActive ? (
            <Matrix
              rows={voiceMatrix.pattern ? voiceMatrix.pattern.length : 7}
              cols={voiceMatrix.pattern ? voiceMatrix.pattern[0].length : 7}
              frames={voiceMatrix.frames}
              pattern={voiceMatrix.pattern}
              fps={voiceMatrix.fps}
              size={4}
              gap={1}
              palette={voiceMatrix.palette}
              loop
              className="size-4"
            />
          ) : (
            <Mic className="size-4" />
          )}
        </Button>
        <Button aria-label="Close" isIconOnly size="sm" variant="ghost" className="rounded-full" onPress={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AISearch({ children, open: controlledOpen, onOpenChange }: AISearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking'>('idle');
  const vapiRef = useRef<Vapi | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lastVoiceTranscriptRef = useRef('');
  const lastSpokenAssistantMessageRef = useRef('');
  const open = controlledOpen ?? internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );

  const chat = useChat<ChatUIMessage>({
    id: 'search',
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const runtime = useAISDKRuntime(chat);

  useEffect(() => {
    if (!open) return;

    const queued = localStorage.getItem(StorageKeyInput)?.trim();
    if (!queued) return;

    localStorage.removeItem(StorageKeyInput);
    void chat.sendMessage(createUserMessage(queued));
  }, [chat, open]);

  useEffect(() => {
    if (!voiceActive) return;

    if (chat.status === 'submitted' || chat.status === 'streaming') {
      setVoiceState((current) => (current === 'speaking' ? current : 'thinking'));
      return;
    }

    const lastAssistantMessage = [...chat.messages].reverse().find((message) => message.role === 'assistant');
    if (!lastAssistantMessage) return;

    const text = lastAssistantMessage.parts
      ?.filter((part): part is Extract<(typeof lastAssistantMessage.parts)[number], { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim();

    if (!text || text === lastSpokenAssistantMessageRef.current) return;

    lastSpokenAssistantMessageRef.current = text;
    setVoiceState('speaking');
    vapiRef.current?.say(text, false, true, true);
  }, [chat.messages, chat.status, voiceActive]);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!publicKey || !assistantId) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setVoiceActive(true);
      setVoiceConnecting(false);
      setVoiceState('listening');
      lastVoiceTranscriptRef.current = '';
      lastSpokenAssistantMessageRef.current = '';
      vapi.send({
        type: 'control',
        control: 'mute-assistant',
      });
    });

    vapi.on('call-end', () => {
      setVoiceActive(false);
      setVoiceConnecting(false);
      setVoiceState('idle');
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    });

    vapi.on('speech-start', () => setVoiceState('speaking'));
    vapi.on('speech-end', () => {
      setVoiceState(chat.status === 'submitted' || chat.status === 'streaming' ? 'thinking' : 'listening');
    });

    vapi.on('message', (message: any) => {
      if (message?.type !== 'transcript' || message?.role !== 'user' || message?.transcriptType !== 'final') {
        return;
      }

      const transcript = typeof message?.transcript === 'string' ? message.transcript.trim() : '';
      if (!transcript || transcript === lastVoiceTranscriptRef.current) return;

      lastVoiceTranscriptRef.current = transcript;
      lastSpokenAssistantMessageRef.current = '';
      setVoiceState('thinking');
      void chat.sendMessage(createUserMessage(transcript));
    });

    vapi.on('error', () => {
      setVoiceConnecting(false);
      setVoiceState('idle');
    });

    return () => {
      vapi.removeAllListeners();
      vapi.stop();
    };
  }, [chat, chat.status]);

  const toggleVoice = useCallback(async () => {
    if (voiceActive) {
      vapiRef.current?.stop();
      return;
    }

    try {
      setVoiceConnecting(true);
      setVoiceState('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      await vapiRef.current?.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
    } catch {
      setVoiceConnecting(false);
      setVoiceState('idle');
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, [voiceActive]);

  const clearChat = useCallback(() => {
    lastVoiceTranscriptRef.current = '';
    lastSpokenAssistantMessageRef.current = '';
    chat.setMessages([]);
  }, [chat]);

  return (
    <Context
      value={useMemo(
        () => ({ open, setOpen, voiceActive, voiceConnecting, voiceState, toggleVoice, clearChat }),
        [clearChat, open, setOpen, toggleVoice, voiceActive, voiceConnecting, voiceState],
      )}
    >
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </Context>
  );
}

export function AISearchDialog(props: AISearchDialogProps) {
  return (
    <AISearch open={props.open} onOpenChange={props.onOpenChange}>
      <AISearchPanel />
    </AISearch>
  );
}

export function AISearchPanel() {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

  return (
    <>
      <style>
        {`
        @keyframes ask-ai-open {
          from {
            translate: 100% 0;
          }
          to {
            translate: 0 0;
          }
        }
        @keyframes ask-ai-close {
          from {
            width: var(--ai-chat-width);
          }
          to {
            width: 0px;
          }
        }`}
      </style>
      <Presence present={open}>
        <div
          data-state={open ? 'open' : 'closed'}
          className="fixed inset-0 z-30 bg-fd-overlay/70 backdrop-blur-xs data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out lg:hidden"
          onClick={() => setOpen(false)}
        />
      </Presence>
      <Presence present={open}>
        <div
          className={cn(
            'overflow-hidden z-30 bg-card text-card-foreground [--ai-chat-width:420px] 2xl:[--ai-chat-width:480px]',
            'max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:rounded-3xl max-lg:border max-lg:shadow-xl',
            'lg:sticky lg:top-0 lg:h-dvh lg:border-s lg:ms-auto lg:in-[#nd-docs-layout]:[grid-area:toc] lg:in-[#nd-notebook-layout]:row-span-full lg:in-[#nd-notebook-layout]:col-start-5',
            open
              ? 'animate-fd-dialog-in lg:animate-[ask-ai-open_200ms]'
              : 'animate-fd-dialog-out lg:animate-[ask-ai-close_200ms]',
          )}
        >
          <div className="flex size-full flex-col gap-3 p-2 lg:w-(--ai-chat-width) lg:p-3">
            <AISearchPanelHeader />
            <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border bg-background">
              <Thread />
            </div>
          </div>
        </div>
      </Presence>
    </>
  );
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();
  const openRef = useRef(open);
  openRef.current = open;

  const onKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openRef.current) {
        setOpen(false);
        event.preventDefault();
      }

      if (event.key === '/' && (event.metaKey || event.ctrlKey) && !openRef.current) {
        setOpen(true);
        event.preventDefault();
      }
    },
    [setOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, [onKeyPress]);
}

export function useAISearchContext() {
  return use(Context)!;
}
