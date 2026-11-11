import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, SendHorizonal, X, Store, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useMessages,
  useSendMessage,
  markConversationRead,
  markConversationDelivered,
  useChatPresence,
  formatLastSeen,
  type Conversation,
  type ChatMessage,
} from "@/lib/messages";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function ChatAvatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initial = (name ?? "K").charAt(0).toUpperCase();
  const dim =
    size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary",
        dim,
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** WhatsApp-style ticks: sent → delivered → read */
function MessageTicks({
  delivered,
  read,
  onPrimary,
}: {
  delivered: boolean;
  read: boolean;
  onPrimary?: boolean;
}) {
  if (read) {
    return (
      <CheckCheck
        size={14}
        className={cn("shrink-0", onPrimary ? "text-sky-200" : "text-sky-500")}
        aria-label="Read"
      />
    );
  }
  if (delivered) {
    return (
      <CheckCheck
        size={14}
        className={cn(
          "shrink-0 opacity-80",
          onPrimary ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
        aria-label="Delivered"
      />
    );
  }
  return (
    <Check
      size={14}
      className={cn(
        "shrink-0 opacity-70",
        onPrimary ? "text-primary-foreground/70" : "text-muted-foreground",
      )}
      aria-label="Sent"
    />
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupByDay(messages: ChatMessage[]) {
  const groups: { label: string; items: ChatMessage[] }[] = [];
  let current = "";
  for (const m of messages) {
    const label = dayLabel(m.created_at);
    if (label !== current) {
      groups.push({ label, items: [m] });
      current = label;
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }
  return groups;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 px-0.5" aria-label="Typing">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}

/** Profile sheet — WhatsApp-style contact view */
function ChatProfileSheet({
  open,
  onClose,
  name,
  shopName,
  shopSlug,
  isSeller,
  online,
  lastSeenAt,
  typing,
}: {
  open: boolean;
  onClose: () => void;
  name?: string | null;
  shopName?: string | null;
  shopSlug?: string | null;
  isSeller: boolean;
  online: boolean;
  lastSeenAt: string | null;
  typing: boolean;
}) {
  if (!open) return null;

  const status = typing
    ? "typing…"
    : online
      ? "Online"
      : formatLastSeen(lastSeenAt);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/50" onClick={onClose}>
      <div
        className="mt-auto max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card shadow-elevated md:mx-auto md:mt-16 md:max-h-[80vh] md:w-full md:max-w-md md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <h2 className="text-base font-bold text-foreground">Contact info</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center px-6 pb-6 pt-8">
          <ChatAvatar name={name} size="lg" className="ring-4 ring-primary/10" />
          <h3 className="mt-4 text-center text-xl font-extrabold text-foreground">
            {name || "Kivora user"}
          </h3>
          {shopName && shopName !== name && (
            <p className="mt-1 text-sm text-muted-foreground">{shopName}</p>
          )}
          <p
            className={cn(
              "mt-2 text-sm font-medium",
              typing || online ? "text-success" : "text-muted-foreground",
            )}
          >
            {status}
          </p>
        </div>

        <div className="space-y-1 border-t border-border px-3 py-3">
          {isSeller && shopSlug && (
            <Link
              to="/shop/$slug"
              params={{ slug: shopSlug }}
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Store size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">View shop</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {shopName || name}
                </span>
              </span>
            </Link>
          )}
          <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <User size={18} />
            </span>
            <span>
              <span className="block font-semibold text-foreground">
                {isSeller ? "Seller on Kivora" : "Buyer on Kivora"}
              </span>
              <span className="block text-xs">Chat is only for this order or product inquiry</span>
            </span>
          </div>
        </div>

        <div className="border-t border-border px-4 py-4">
          <p className="text-center text-[11px] text-muted-foreground">
            Messages are private between you and this contact.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ChatThread({
  conversation,
  userId,
  onBack,
}: {
  conversation: Conversation;
  userId: string;
  onBack?: () => void;
}) {
  const isCustomer = conversation.customer_id === userId;
  const otherUserId = isCustomer ? conversation.seller_id : conversation.customer_id;
  const otherIsSeller = isCustomer; // if I'm customer, other is seller

  const { data: messages, isLoading } = useMessages(conversation.id, userId);
  const send = useSendMessage(conversation.id);
  const { partner, notifyTyping, notifyStoppedTyping } = useChatPresence(
    conversation.id,
    userId,
    otherUserId,
  );

  const [text, setText] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load seller slug for profile → shop link
  useEffect(() => {
    if (!otherIsSeller) {
      setShopSlug(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("slug")
        .eq("user_id", otherUserId)
        .maybeSingle();
      if (!cancelled) setShopSlug(data?.slug ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [otherIsSeller, otherUserId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [
    messages?.length,
    messages?.[messages.length - 1]?.read,
    messages?.[messages.length - 1]?.delivered,
    partner.typing,
  ]);

  useEffect(() => {
    void markConversationDelivered(conversation.id, userId);
    void markConversationRead(conversation.id, userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const groups = useMemo(() => groupByDay(messages ?? []), [messages]);

  const statusLine = partner.typing
    ? "typing…"
    : partner.online
      ? "Online"
      : formatLastSeen(partner.lastSeenAt);

  const displayName = conversation.other_name || conversation.other_shop || "Kivora user";

  const submit = () => {
    if (!text.trim() || send.isPending) return;
    notifyStoppedTyping();
    send.mutate(
      { body: text, senderId: userId },
      {
        onSuccess: () => {
          setText("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        },
        onError: (e: unknown) => {
          const msg =
            e instanceof Error
              ? e.message
              : typeof e === "object" && e && "message" in e
                ? String((e as { message: unknown }).message)
                : "Couldn't send message";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-[calc(100dvh-11rem)]">
      {/* Sticky WhatsApp-style header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90 md:px-3 md:pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-full p-2 text-foreground hover:bg-muted md:hidden"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-muted/60 active:bg-muted"
        >
          <div className="relative shrink-0">
            <ChatAvatar name={displayName} />
            {partner.online && (
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success"
                title="Online"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight text-foreground">
              {displayName}
            </p>
            <p
              className={cn(
                "truncate text-[11px] leading-tight",
                partner.typing
                  ? "font-medium text-primary"
                  : partner.online
                    ? "font-medium text-success"
                    : "text-muted-foreground",
              )}
            >
              {partner.typing ? (
                <span className="inline-flex items-center gap-1.5">
                  typing <TypingDots />
                </span>
              ) : (
                statusLine
              )}
            </p>
          </div>
        </button>
      </header>

      {/* Chat background + messages */}
      <div
        ref={scrollRef}
        className="relative flex-1 space-y-0.5 overflow-y-auto px-2 py-3 sm:px-3"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.06) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      >
        {isLoading ? (
          <div className="space-y-2 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-10 max-w-[70%] animate-pulse rounded-2xl bg-foreground/10 ${i % 2 ? "ml-auto" : ""}`}
              />
            ))}
          </div>
        ) : (messages?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
            <button type="button" onClick={() => setProfileOpen(true)}>
              <ChatAvatar name={displayName} size="lg" />
            </button>
            <p className="mt-3 text-sm font-semibold text-foreground">{displayName}</p>
            <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
              Say hello — your conversation starts here. You’ll see when they receive and read your
              messages.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="space-y-1">
              <div className="sticky top-0 z-[1] flex justify-center py-2">
                <span className="rounded-full border border-border/80 bg-card/90 px-3 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur">
                  {g.label}
                </span>
              </div>
              {g.items.map((m, idx) => {
                const mine = m.sender_id === userId;
                const prev = g.items[idx - 1];
                const next = g.items[idx + 1];
                const sameAsPrev = prev && prev.sender_id === m.sender_id;
                const sameAsNext = next && next.sender_id === m.sender_id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                      sameAsPrev ? "mt-0.5" : "mt-2",
                    )}
                  >
                    <div
                      className={cn(
                        "relative max-w-[85%] px-3 py-1.5 text-[15px] leading-snug shadow-sm sm:max-w-[75%]",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-foreground",
                        // bubble tails / grouping
                        mine
                          ? sameAsNext
                            ? "rounded-2xl rounded-br-md"
                            : "rounded-2xl rounded-br-sm"
                          : sameAsNext
                            ? "rounded-2xl rounded-bl-md"
                            : "rounded-2xl rounded-bl-sm",
                        !sameAsPrev && mine && "rounded-tr-2xl",
                        !sameAsPrev && !mine && "rounded-tl-2xl",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <div
                        className={cn(
                          "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                          mine ? "text-primary-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        <span>
                          {new Date(m.created_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {mine && (
                          <MessageTicks
                            delivered={!!m.delivered}
                            read={!!m.read}
                            onPrimary
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {partner.typing && (
          <div className="flex justify-start pt-1">
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-muted-foreground shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
              if (e.target.value.trim()) notifyTyping();
              else notifyStoppedTyping();
            }}
            onBlur={() => notifyStoppedTyping()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Type a message"
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-3xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || send.isPending}
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full gradient-primary text-primary-foreground shadow-sm transition active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>

      <ChatProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={displayName}
        shopName={conversation.other_shop}
        shopSlug={shopSlug}
        isSeller={otherIsSeller}
        online={partner.online}
        lastSeenAt={partner.lastSeenAt}
        typing={partner.typing}
      />
    </div>
  );
}
