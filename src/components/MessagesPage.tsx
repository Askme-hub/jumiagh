import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useConversations, type Conversation } from "@/lib/messages";
import { ChatThread } from "@/components/ChatThread";
import { UserAvatar } from "@/components/UserAvatar";
import { EmptyState } from "@/components/EmptyState";

export function MessagesPage({
  userId,
  initialConversationId,
}: {
  userId: string;
  initialConversationId?: string;
}) {
  const { data: conversations, isLoading } = useConversations(userId);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  const active = useMemo(
    () => (conversations ?? []).find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-5xl md:px-4 md:py-4">
        <div className="grid md:grid-cols-[320px_1fr] md:gap-4">
          {/* thread list — hidden on mobile while a chat is open */}
          <div className={`${active ? "hidden md:block" : "block"}`}>
            <div className="border-b border-border px-4 py-4 md:rounded-t-2xl md:border md:border-b-0 md:bg-card">
              <h1 className="text-xl font-bold text-foreground">Messages</h1>
              <p className="text-xs text-muted-foreground">Chats with your {conversations?.some((c) => c.seller_id === userId) ? "customers and sellers" : "sellers"}</p>
            </div>

            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-foreground/10" />
                ))}
              </div>
            ) : (conversations?.length ?? 0) === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                description="Message a seller from their store or a product page and the chat will appear here."
              />
            ) : (
              <div className="divide-y divide-border md:rounded-b-2xl md:border md:border-t-0 md:bg-card md:divide-border/60">
                {conversations!.map((c) => (
                  <ConversationRow key={c.id} c={c} active={c.id === activeId} onClick={() => setActiveId(c.id)} />
                ))}
              </div>
            )}
          </div>

          {/* chat panel */}
          <div className={`${active ? "block" : "hidden md:block"} md:rounded-2xl md:border md:border-border md:bg-card md:overflow-hidden`}>
            {active ? (
              <ChatThread conversation={active} userId={userId} onBack={() => setActiveId(null)} />
            ) : (
              <div className="hidden h-full min-h-[50vh] place-items-center md:grid">
                <div className="text-center">
                  <MessageCircle size={36} className="mx-auto mb-2 text-muted-foreground" />
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

function ConversationRow({ c, active, onClick }: { c: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60 ${active ? "bg-primary/5" : ""}`}
    >
      <UserAvatar name={c.other_name} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold text-foreground">{c.other_name}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {new Date(c.last_message_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{c.last_body ?? "No messages yet"}</p>
          {(c.unread ?? 0) > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full gradient-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {c.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
