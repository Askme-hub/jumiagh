import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { useConversations, type Conversation } from "@/lib/messages";
import { ChatThread, ChatAvatar } from "@/components/ChatThread";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export function MessagesPage({
  userId,
  initialConversationId,
}: {
  userId: string;
  initialConversationId?: string;
}) {
  const { data: conversations, isLoading } = useConversations(userId);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  const active = useMemo(
    () => (conversations ?? []).find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return conversations ?? [];
    return (conversations ?? []).filter(
      (c) =>
        (c.other_name ?? "").toLowerCase().includes(term) ||
        (c.other_shop ?? "").toLowerCase().includes(term) ||
        (c.last_body ?? "").toLowerCase().includes(term),
    );
  }, [conversations, q]);

  const isSellerView = (conversations ?? []).some((c) => c.seller_id === userId);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl md:px-4 md:py-4">
        <div className="grid md:grid-cols-[340px_1fr] md:gap-3 md:h-[calc(100dvh-6rem)]">
          {/* Conversation list */}
          <div
            className={cn(
              "flex flex-col md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card",
              active ? "hidden md:flex" : "flex",
            )}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur md:rounded-t-2xl md:pt-4">
              <h1 className="text-xl font-extrabold text-foreground">Messages</h1>
              <p className="text-xs text-muted-foreground">
                Chats with your {isSellerView ? "customers and sellers" : "sellers"}
              </p>
              <div className="relative mt-3">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search chats"
                  className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3">
                      <div className="h-12 w-12 animate-pulse rounded-full bg-foreground/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 animate-pulse rounded bg-foreground/10" />
                        <div className="h-2.5 w-3/4 animate-pulse rounded bg-foreground/10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title={q ? "No matching chats" : "No conversations yet"}
                  description={
                    q
                      ? "Try a different name or message."
                      : "Message a seller from their store or a product page and the chat will appear here."
                  }
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {filtered.map((c) => (
                    <ConversationRow
                      key={c.id}
                      c={c}
                      active={c.id === activeId}
                      onClick={() => setActiveId(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active thread */}
          <div
            className={cn(
              "md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card",
              active ? "block" : "hidden md:block",
            )}
          >
            {active ? (
              <ChatThread
                conversation={active}
                userId={userId}
                onBack={() => setActiveId(null)}
              />
            ) : (
              <div className="hidden h-full min-h-[50vh] place-items-center md:grid">
                <div className="text-center">
                  <MessageCircle size={40} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">Pick a conversation</p>
                  <p className="text-xs text-muted-foreground">Your chats appear on the left.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ConversationRow({
  c,
  active,
  onClick,
}: {
  c: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const name = c.other_name || c.other_shop || "Kivora user";
  const unread = c.unread ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition",
        active ? "bg-primary/8" : "hover:bg-muted/50 active:bg-muted",
      )}
    >
      <ChatAvatar name={name} className="h-12 w-12 text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-[15px] text-foreground",
              unread > 0 ? "font-extrabold" : "font-semibold",
            )}
          >
            {name}
          </p>
          <span
            className={cn(
              "shrink-0 text-[11px]",
              unread > 0 ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {formatListTime(c.last_message_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-[13px]",
              unread > 0 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {c.last_body ?? "No messages yet"}
          </p>
          {unread > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full gradient-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
