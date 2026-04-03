'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MessageCircleIcon, Mic, RefreshCw, SearchIcon, Send, X } from 'lucide-react';
import { Button, Card, Spinner } from '@heroui/react';
import { cn } from '../../lib/cn';
import { buttonVariants } from '../ui/button';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { DefaultChatTransport, type Tool, type UIToolInvocation } from 'ai';
import { Markdown } from '../markdown';
import { Presence } from '@radix-ui/react-presence';
import type { ChatUIMessage, SearchTool } from '../../app/api/chat/route';
import Vapi from '@vapi-ai/web';
import { Matrix, loader, pulse, type Frame } from '../ui/matrix';

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: UseChatHelpers<ChatUIMessage>;
  voiceActive: boolean;
  voiceConnecting: boolean;
  voiceState: 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking';
  toggleVoice: () => void;
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

export function AISearchPanelHeader({ className, ...props }: ComponentProps<'div'>) {
  const { setOpen, voiceActive, voiceState } = useAISearchContext();

  return (
    <div
      className={cn(
        'sticky top-0 flex items-start gap-2 border rounded-xl bg-fd-secondary text-fd-secondary-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <div className="px-3 py-2 flex-1">
        <p className="text-sm font-medium mb-2">AI Chat</p>
        <p className="text-xs text-fd-muted-foreground">
          {voiceActive
            ? voiceState === 'speaking'
              ? 'Agent is speaking...'
              : voiceState === 'thinking'
                ? 'Agent is thinking...'
                : voiceState === 'listening'
                  ? 'Listening...'
                  : voiceState === 'connecting'
                    ? 'Connecting voice...'
                    : 'Voice active'
            : 'AI can be inaccurate, please verify the answers.'}
        </p>
      </div>

      <Button
        aria-label="Close"
        isIconOnly
        size="sm"
        variant="ghost"
        className="mt-2 me-2 rounded-full text-fd-muted-foreground"
        onPress={() => setOpen(false)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function AISearchInputActions() {
  const { messages, status, setMessages, regenerate } = useChatContext();
  const isLoading = status === 'streaming';

  if (messages.length === 0) return null;

  return (
    <>
      {!isLoading && messages.at(-1)?.role === 'assistant' && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-full"
          onPress={() => regenerate()}
        >
          <RefreshCw className="size-4" />
          Retry
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="rounded-full"
        onPress={() => setMessages([])}
      >
        Clear Chat
      </Button>
    </>
  );
}

const StorageKeyInput = '__ai_search_input';

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

export function AISearchInput(props: ComponentProps<'form'>) {
  const { status, sendMessage, stop } = useChatContext();
  const { voiceActive, voiceConnecting, voiceState, toggleVoice } = useAISearchContext();
  const [input, setInput] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(StorageKeyInput) ?? '' : '',
  );
  const isLoading = status === 'streaming' || status === 'submitted';
  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (message.length === 0) return;

    void sendMessage(createUserMessage(message));
    setInput('');
    localStorage.removeItem(StorageKeyInput);
  };

  useEffect(() => {
    if (isLoading) document.getElementById('nd-ai-input')?.focus();
  }, [isLoading]);

  const voiceMatrix = getVoiceMatrixConfig(voiceState);

  return (
    <form {...props} className={cn('flex items-start gap-2 px-2 pb-2', props.className)} onSubmit={onStart}>
      {voiceActive && (
        <div className="flex items-center ps-1 pt-2">
          <Matrix
            rows={voiceMatrix.pattern ? voiceMatrix.pattern.length : 7}
            cols={voiceMatrix.pattern ? voiceMatrix.pattern[0].length : 7}
            frames={voiceMatrix.frames}
            pattern={voiceMatrix.pattern}
            fps={voiceMatrix.fps}
            size={6}
            gap={1.5}
            palette={voiceMatrix.palette}
            loop
            ariaLabel="Voice active"
          />
        </div>
      )}
      <Input
        value={input}
        placeholder={isLoading ? 'AI is answering...' : voiceActive ? 'Voice active — speak or type' : 'Ask a question'}
        autoFocus
        className="p-3"
        disabled={status === 'streaming' || status === 'submitted'}
        onChange={(e) => {
          setInput(e.target.value);
          localStorage.setItem(StorageKeyInput, e.target.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === 'Enter') {
            onStart(event);
          }
        }}
      />
      <Button
        type="button"
        aria-label={voiceActive ? 'Stop voice' : 'Start voice'}
        isIconOnly
        variant={voiceActive ? 'secondary' : 'ghost'}
        className={cn('mt-2 rounded-full transition-all', voiceActive && 'ring-2 ring-fd-primary/30')}
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
      {isLoading ? (
        <Button
          key="bn"
          type="button"
          variant="secondary"
          className="mt-2 rounded-full"
          onPress={stop}
        >
          <Spinner size="sm" />
          Abort Answer
        </Button>
      ) : (
        <Button
          key="bn"
          type="submit"
          isIconOnly
          variant="primary"
          className="mt-2 rounded-full"
          isDisabled={input.length === 0}
        >
          <Send className="size-4" />
        </Button>
      )}
    </form>
  );
}

function getVoiceMatrixConfig(state: 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking'): { frames?: Frame[]; pattern?: Frame; fps: number; palette: { on: string; off: string } } {
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

function List(props: Omit<ComponentProps<'div'>, 'dir'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    function callback() {
      const container = containerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'instant',
      });
    }

    const observer = new ResizeObserver(callback);
    callback();

    const element = containerRef.current?.firstElementChild;

    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn('fd-scroll-container overflow-y-auto min-w-0 flex flex-col', props.className)}
    >
      {props.children}
    </div>
  );
}

function Input(props: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1', props.className);

  return (
    <div className="grid flex-1">
      <textarea
        id="nd-ai-input"
        {...props}
        className={cn(
          'resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none',
          shared,
        )}
      />
      <div ref={ref} className={cn(shared, 'break-all invisible')}>
        {`${props.value?.toString() ?? ''}\n`}
      </div>
    </div>
  );
}

const roleName: Record<string, string> = {
  user: 'you',
  assistant: 'fumadocs',
};

function Message({ message, ...props }: { message: ChatUIMessage } & ComponentProps<'div'>) {
  let markdown = '';
  const searchCalls: UIToolInvocation<SearchTool>[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === 'text') {
      markdown += part.text;
      continue;
    }

    if (part.type.startsWith('tool-')) {
      const toolName = part.type.slice('tool-'.length);
      const p = part as UIToolInvocation<Tool>;

      if (toolName !== 'search' || !p.toolCallId) continue;
      searchCalls.push(p);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()} {...props}>
      <p
        className={cn(
          'mb-1 text-sm font-medium text-fd-muted-foreground',
          message.role === 'assistant' && 'text-fd-primary',
        )}
      >
        {roleName[message.role] ?? 'unknown'}
      </p>
      <div className="prose text-sm">
        <Markdown text={markdown} />
      </div>

      {searchCalls.map((call) => {
        return (
          <div
            key={call.toolCallId}
            className="flex flex-row gap-2 items-center mt-3 rounded-lg border bg-fd-secondary text-fd-muted-foreground text-xs p-2"
          >
            <SearchIcon className="size-4" />
            {call.state === 'output-error' || call.state === 'output-denied' ? (
              <p className="text-fd-error">{call.errorText ?? 'Failed to search'}</p>
            ) : (
              <p>{!call.output ? 'Searching…' : `${call.output.length} search results`}</p>
            )}
          </div>
        );
      })}
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
  const lastVoiceTranscriptRef = useRef<string>('');
  const lastSpokenAssistantMessageRef = useRef<string>('');
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

  useEffect(() => {
    if (!voiceActive) return;

    if (chat.status === 'submitted' || chat.status === 'streaming') {
      setVoiceState((current) => (current === 'speaking' ? current : 'thinking'));
      return;
    }

    const lastAssistantMessage = [...chat.messages].reverse().find((message) => message.role === 'assistant');
    if (!lastAssistantMessage) {
      return;
    }

    const text = lastAssistantMessage.parts
      ?.filter((part): part is Extract<(typeof lastAssistantMessage.parts)[number], { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim();

    if (!text || text === lastSpokenAssistantMessageRef.current) {
      return;
    }

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
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    });

    vapi.on('speech-start', () => setVoiceState('speaking'));
    vapi.on('speech-end', () => {
      setVoiceState(chat.status === 'submitted' || chat.status === 'streaming' ? 'thinking' : 'listening');
    });

    vapi.on('message', (msg: any) => {
      if (msg?.type === 'transcript' && msg?.role === 'user' && msg?.transcriptType === 'final') {
        const transcript = typeof msg?.transcript === 'string' ? msg.transcript.trim() : '';
        if (!transcript || transcript === lastVoiceTranscriptRef.current) {
          return;
        }

        lastVoiceTranscriptRef.current = transcript;
        lastSpokenAssistantMessageRef.current = '';
        setVoiceState('thinking');
        void chat.sendMessage(createUserMessage(transcript));
      }
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
    } else {
      try {
        setVoiceConnecting(true);
        setVoiceState('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!;
        await vapiRef.current?.start(assistantId);
      } catch {
        setVoiceConnecting(false);
        setVoiceState('idle');
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [voiceActive]);

  return (
    <Context value={useMemo(() => ({ chat, open, setOpen, voiceActive, voiceConnecting, voiceState, toggleVoice }), [chat, open, voiceActive, voiceConnecting, voiceState, toggleVoice])}>{children}</Context>
  );
}

export function AISearchDialog(props: AISearchDialogProps) {
  return (
    <AISearch open={props.open} onOpenChange={props.onOpenChange}>
      <AISearchPanel />
    </AISearch>
  );
}

export function AISearchTrigger({
  position = 'default',
  className,
  ...props
}: ComponentProps<'button'> & { position?: 'default' | 'float' }) {
  const { open, setOpen } = useAISearchContext();

  return (
    <button
      data-state={open ? 'open' : 'closed'}
      className={cn(
        position === 'float' && [
          'fixed bottom-4 gap-3 w-24 inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] shadow-lg z-20 transition-[translate,opacity]',
          open && 'translate-y-10 opacity-0',
        ],
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {props.children}
    </button>
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
          className="fixed inset-0 z-30 backdrop-blur-xs bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out lg:hidden"
          onClick={() => setOpen(false)}
        />
      </Presence>
      <Presence present={open}>
        <div
          className={cn(
            'overflow-hidden z-30 bg-fd-card text-fd-card-foreground [--ai-chat-width:400px] 2xl:[--ai-chat-width:460px]',
            'max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:border max-lg:rounded-2xl max-lg:shadow-xl',
            'lg:sticky lg:top-0 lg:h-dvh lg:border-s lg:ms-auto lg:in-[#nd-docs-layout]:[grid-area:toc] lg:in-[#nd-notebook-layout]:row-span-full lg:in-[#nd-notebook-layout]:col-start-5',
            open
              ? 'animate-fd-dialog-in lg:animate-[ask-ai-open_200ms]'
              : 'animate-fd-dialog-out lg:animate-[ask-ai-close_200ms]',
          )}
        >
          <div className="flex flex-col size-full p-2 lg:p-3 lg:w-(--ai-chat-width)">
            <AISearchPanelHeader />
            <AISearchPanelList className="flex-1" />
            <Card variant="secondary" className="has-focus-visible:shadow-md">
              <AISearchInput />
              <div className="flex items-center gap-1.5 px-2 pb-2 empty:hidden">
                <AISearchInputActions />
              </div>
            </Card>
          </div>
        </div>
      </Presence>
    </>
  );
}

export function AISearchPanelList({ className, style, ...props }: ComponentProps<'div'>) {
  const chat = useChatContext();
  const messages = chat.messages.filter((msg) => msg.role !== 'system');

  return (
    <List
      className={cn('py-4 overscroll-contain', className)}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)',
        ...style,
      }}
      {...props}
    >
      {messages.length === 0 ? (
        <div className="text-sm text-fd-muted-foreground/80 size-full flex flex-col items-center justify-center text-center gap-2">
          <MessageCircleIcon fill="currentColor" stroke="none" />
          <p onClick={(e) => e.stopPropagation()}>Start a new chat below.</p>
        </div>
      ) : (
        <div className="flex flex-col px-3 gap-4">
          {messages.map((item) => (
            <Message key={item.id} message={item} />
          ))}
        </div>
      )}
    </List>
  );
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();
  const openRef = useRef(open);
  openRef.current = open;

  const onKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && openRef.current) {
      setOpen(false);
      e.preventDefault();
    }

    if (e.key === '/' && (e.metaKey || e.ctrlKey) && !openRef.current) {
      setOpen(true);
      e.preventDefault();
    }
  }, [setOpen]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, [onKeyPress]);
}

export function useAISearchContext() {
  return use(Context)!;
}

function useChatContext() {
  return use(Context)!.chat;
}
