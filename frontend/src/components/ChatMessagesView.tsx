import type React from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Pencil, ArrowUpCircle } from "lucide-react";
import { InputForm } from "@/components/InputForm";
import { Button } from "@/components/ui/button";
import { useState, ReactNode, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ActivityTimeline,
  ProcessedEvent,
} from "@/components/ActivityTimeline"; // Assuming ActivityTimeline is in the same dir or adjust path
import { Textarea } from "@/components/ui/textarea";

// Markdown component props type from former ReportView
type MdComponentProps = {
  className?: string;
  children?: ReactNode;
  [key: string]: any;
};

// Markdown components (from former ReportView.tsx)
const mdComponents = {
  h1: ({ className, children, ...props }: MdComponentProps) => (
    <h1 className={cn("text-2xl font-bold mt-4 mb-2", className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }: MdComponentProps) => (
    <h2 className={cn("text-xl font-bold mt-3 mb-2", className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: MdComponentProps) => (
    <h3 className={cn("text-lg font-bold mt-3 mb-1", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, children, ...props }: MdComponentProps) => (
    <p className={cn("mb-3 leading-7", className)} {...props}>
      {children}
    </p>
  ),
  a: ({ className, children, href, ...props }: MdComponentProps) => (
    <Badge className="text-xs mx-0.5">
      <a
        className={cn("text-blue-400 hover:text-blue-300 text-xs", className)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    </Badge>
  ),
  ul: ({ className, children, ...props }: MdComponentProps) => (
    <ul className={cn("list-disc pl-6 mb-3", className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ className, children, ...props }: MdComponentProps) => (
    <ol className={cn("list-decimal pl-6 mb-3", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ className, children, ...props }: MdComponentProps) => (
    <li className={cn("mb-1", className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ className, children, ...props }: MdComponentProps) => (
    <blockquote
      className={cn(
        "border-l-4 border-neutral-600 pl-4 italic my-3 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }: MdComponentProps) => (
    <code
      className={cn(
        "bg-neutral-900 rounded px-1 py-0.5 font-mono text-xs",
        className
      )}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ className, children, ...props }: MdComponentProps) => (
    <pre
      className={cn(
        "bg-neutral-900 p-3 rounded-lg overflow-x-auto font-mono text-xs my-3",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  hr: ({ className, ...props }: MdComponentProps) => (
    <hr className={cn("border-neutral-600 my-4", className)} {...props} />
  ),
  table: ({ className, children, ...props }: MdComponentProps) => (
    <div className="my-3 overflow-x-auto">
      <table className={cn("border-collapse w-full", className)} {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ className, children, ...props }: MdComponentProps) => (
    <th
      className={cn(
        "border border-neutral-600 px-3 py-2 text-left font-bold",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ className, children, ...props }: MdComponentProps) => (
    <td
      className={cn("border border-neutral-600 px-3 py-2", className)}
      {...props}
    >
      {children}
    </td>
  ),
};

// Props for HumanMessageBubble
interface HumanMessageBubbleProps {
  message: Message;
  mdComponents: typeof mdComponents;
}

// HumanMessageBubble Component
const HumanMessageBubble: React.FC<HumanMessageBubbleProps> = ({
  message,
  mdComponents,
}) => {
  return (
    <div
      className={`text-white rounded-3xl break-words min-h-7 bg-neutral-700 max-w-[100%] sm:max-w-[90%] px-4 pt-3 rounded-br-lg`}
    >
      <ReactMarkdown components={mdComponents}>
        {typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)}
      </ReactMarkdown>
    </div>
  );
};

// Props for AiMessageBubble
interface AiMessageBubbleProps {
  message: Message;
  historicalActivity: ProcessedEvent[] | undefined;
  liveActivity: ProcessedEvent[] | undefined;
  isLastMessage: boolean;
  isOverallLoading: boolean;
  mdComponents: typeof mdComponents;
  aspectRatio?: string;
  imageSize?: string;
}

// AiMessageBubble Component
const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  message,
  historicalActivity,
  liveActivity,
  isLastMessage,
  isOverallLoading,
  mdComponents,
  aspectRatio,
  imageSize,
}) => {
  type PageImageState = {
    status: "idle" | "pending" | "done" | "error";
    images: { url: string; id: string }[];
    activeIndex: number;
    error?: string;
    draft: string;
    isEditing: boolean;
  };

  const messageKey = message.id ?? "ai";
  const [pageStates, setPageStates] = useState<Record<string, PageImageState>>({});

  const parsedPages = (() => {
    const raw = message.content;
    let data: any = raw;
    if (typeof raw === "string") {
      try {
        data = JSON.parse(raw);
      } catch (_e) {
        return null;
      }
    }
    if (
      Array.isArray(data) &&
      data.every(
        (p) =>
          p &&
          typeof p === "object" &&
          "id" in p &&
          "detail" in p &&
          typeof p.id === "number" &&
          typeof p.detail === "string"
      )
    ) {
      return data as { id: number; detail: string }[];
    }
    return null;
  })();

  // Determine which activity events to show and if it's for a live loading message
  const activityForThisBubble =
    isLastMessage && isOverallLoading ? liveActivity : historicalActivity;
  const isLiveActivityForThisBubble = isLastMessage && isOverallLoading;

  useEffect(() => {
    if (!parsedPages) return;
    setPageStates((prev) => {
      let changed = false;
      const next = { ...prev };
      parsedPages.forEach((page) => {
        const key = `${messageKey}-${page.id}`;
        if (!next[key]) {
          next[key] = {
            status: "idle",
            images: [],
            activeIndex: 0,
            draft: page.detail,
            isEditing: false,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [parsedPages, messageKey]);

  const requestImage = useCallback(
    async (key: string, prompt: string) => {
      const backendBase = import.meta.env.DEV
        ? "http://localhost:2024"
        : "http://localhost:8123";
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) return;

      setPageStates((prev) => {
        const current =
          prev[key] ||
          ({
            status: "idle",
            images: [],
            activeIndex: 0,
            draft: trimmedPrompt,
            isEditing: false,
          } as PageImageState);
        return {
          ...prev,
          [key]: {
            ...current,
            status: "pending",
            error: undefined,
            draft: trimmedPrompt,
          },
        };
      });

      try {
        const res = await fetch(`${backendBase}/generate_image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            number_of_images: 1,
            aspect_ratio: aspectRatio || "16:9",
            image_size: imageSize || "1K",
          }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        const url =
          data?.images && Array.isArray(data.images) ? data.images[0] : null;
        if (!url) throw new Error("No image returned");
        setPageStates((prev) => {
          const current =
            prev[key] ||
            ({
              status: "idle",
              images: [],
              activeIndex: 0,
              draft: trimmedPrompt,
              isEditing: false,
            } as PageImageState);
          const newImages = [
            ...(current.images || []),
            {
              url,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            },
          ];
          return {
            ...prev,
            [key]: {
              ...current,
              status: "done",
              images: newImages,
              activeIndex: newImages.length - 1,
              error: undefined,
              draft: trimmedPrompt,
            },
          };
        });
      } catch (err) {
        setPageStates((prev) => {
          const current =
            prev[key] ||
            ({
              status: "idle",
              images: [],
              activeIndex: 0,
              draft: trimmedPrompt,
              isEditing: false,
            } as PageImageState);
          return {
            ...prev,
            [key]: {
              ...current,
              status: "error",
              error: String(err),
            },
          };
        });
      }
    },
    [aspectRatio, imageSize]
  );

  useEffect(() => {
    if (!parsedPages) return;
    parsedPages.forEach((page) => {
      const key = `${messageKey}-${page.id}`;
      const state = pageStates[key];
      if (!state || (state.status === "idle" && state.images.length === 0)) {
        requestImage(key, state?.draft ?? page.detail);
      }
    });
  }, [parsedPages, messageKey, pageStates, requestImage]);

  const handlePromptChange = (key: string, value: string) => {
    setPageStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          draft: value,
        },
      };
    });
  };

  const handleToggleEdit = (key: string) => {
    setPageStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          isEditing: !current.isEditing,
        },
      };
    });
  };

  const handleSubmitPrompt = (key: string, fallbackPrompt: string) => {
    const promptToUse =
      (pageStates[key]?.draft || fallbackPrompt || "").trim();
    if (!promptToUse) return;
    requestImage(key, promptToUse);
    setPageStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          isEditing: false,
        },
      };
    });
  };

  const handleSetActiveImage = (key: string, idx: number) => {
    setPageStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          activeIndex: idx,
        },
      };
    });
  };

  return (
    <div className={`relative break-words flex flex-col`}>
      {activityForThisBubble && activityForThisBubble.length > 0 && (
        <div className="mb-3 border-b border-neutral-700 pb-3 text-xs">
          <ActivityTimeline
            processedEvents={activityForThisBubble}
            isLoading={isLiveActivityForThisBubble}
          />
        </div>
      )}
      {parsedPages ? (
        <div className="space-y-3">
          {parsedPages.map((page) => {
            const key = `${messageKey}-${page.id}`;
            const pageState = pageStates[key];
            const images = pageState?.images || [];
            const activeIndex =
              images.length > 0
                ? Math.min(pageState?.activeIndex ?? 0, images.length - 1)
                : 0;
            const activeImage =
              images.length > 0 ? images[activeIndex] : undefined;
            const isPending = pageState?.status === "pending";
            return (
              <div
                key={page.id}
                className="rounded-xl border border-neutral-700 bg-neutral-800/80 p-3 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="text-xs uppercase tracking-wide text-neutral-400">
                    Page {page.id}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-300 hover:text-white hover:bg-neutral-700"
                      onClick={() => handleToggleEdit(key)}
                      aria-label="Edit prompt"
                      title="Edit prompt"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      className="h-8 w-8 text-blue-300 hover:text-blue-100 hover:bg-blue-500/10 disabled:opacity-60"
                      onClick={() => handleSubmitPrompt(key, page.detail)}
                      aria-label="Regenerate image"
                      title="Regenerate image"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {pageState?.isEditing ? (
                  <Textarea
                    value={pageState.draft}
                    onChange={(e) => handlePromptChange(key, e.target.value)}
                    className="mt-1 bg-neutral-900 border-neutral-700 text-neutral-100"
                    rows={3}
                    autoFocus
                  />
                ) : (
                  <ReactMarkdown components={mdComponents}>
                    {pageState?.draft ?? page.detail}
                  </ReactMarkdown>
                )}

                <div className="mt-1 space-y-2">
                  {activeImage ? (
                    <div className="relative">
                      <img
                        src={activeImage.url}
                        alt={`Page ${page.id} illustration`}
                        className="w-full rounded-lg border border-neutral-700"
                      />
                      {isPending && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : pageState?.status === "error" ? (
                    <div className="text-xs text-red-400">
                      Image generation failed: {pageState.error}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-neutral-400 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating image...</span>
                    </div>
                  )}

                  {pageState?.status === "error" && activeImage && (
                    <div className="text-xs text-red-400">
                      Image generation failed: {pageState.error}
                    </div>
                  )}

                  {images.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          className={`relative border ${
                            idx === activeIndex
                              ? "border-blue-400"
                              : "border-neutral-700"
                          } rounded-lg overflow-hidden`}
                          onClick={() => handleSetActiveImage(key, idx)}
                          aria-label={`Show version ${idx + 1}`}
                        >
                          <img
                            src={img.url}
                            alt={`Version ${idx + 1}`}
                            className="h-16 w-24 object-cover"
                          />
                          {idx === activeIndex && (
                            <div className="absolute inset-0 ring-2 ring-blue-400/60 rounded-lg pointer-events-none" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ReactMarkdown components={mdComponents}>
          {typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content)}
        </ReactMarkdown>
      )}
    </div>
  );
};

interface ChatMessagesViewProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (
    inputValue: string,
    effort: string,
    model: string,
    language: string,
    aspectRatio: string,
    imageSize: string
  ) => void;
  onCancel: () => void;
  liveActivityEvents: ProcessedEvent[];
  historicalActivities: Record<string, ProcessedEvent[]>;
  aspectRatio?: string;
  imageSize?: string;
}

export function ChatMessagesView({
  messages,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
  liveActivityEvents,
  historicalActivities,
  aspectRatio,
  imageSize,
}: ChatMessagesViewProps) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
        <div className="p-4 md:p-6 space-y-2 max-w-4xl mx-auto pt-16">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            return (
              <div key={message.id || `msg-${index}`} className="space-y-3">
                <div
                  className={`flex items-start gap-3 ${
                    message.type === "human" ? "justify-end" : ""
                  }`}
                >
                  {message.type === "human" ? (
                    <HumanMessageBubble
                      message={message}
                      mdComponents={mdComponents}
                    />
                  ) : (
                    <AiMessageBubble
                      message={message}
                      historicalActivity={historicalActivities[message.id!]}
                      liveActivity={liveActivityEvents} // Pass global live events
                      isLastMessage={isLast}
                      isOverallLoading={isLoading} // Pass global loading state
                      mdComponents={mdComponents}
                      aspectRatio={aspectRatio}
                      imageSize={imageSize}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {isLoading &&
            (messages.length === 0 ||
              messages[messages.length - 1].type === "human") && (
              <div className="flex items-start gap-3 mt-3">
                {" "}
                {/* AI message row structure */}
                <div className="relative group max-w-[85%] md:max-w-[80%] rounded-xl p-3 shadow-sm break-words bg-neutral-800 text-neutral-100 rounded-bl-none w-full min-h-[56px]">
                  {liveActivityEvents.length > 0 ? (
                    <div className="text-xs">
                      <ActivityTimeline
                        processedEvents={liveActivityEvents}
                        isLoading={true}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-start h-full">
                      <Loader2 className="h-5 w-5 animate-spin text-neutral-400 mr-2" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </ScrollArea>
      <InputForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={messages.length > 0}
      />
    </div>
  );
}
