import { useEffect, useRef, useState } from "react";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { useMessages, useSendMessage, markConversationRead, type Conversation } from "@/lib/messages";
import { UserAvatar } from "@/components/UserAvatar";

export function ChatThread({
  conversation,
  userId,
  onBack,
}: {
  conversation: Conversation;
  userId: string;
  onBack?: () => void;
}) {
  const { data: messages, isLoading } = useMessages(conversation.id);
  const send = useSendMessage(conversation.id);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    if (conversation.unread && conversation.unread > 0) {
      markConversationRead(conversation.id, userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const submit = () => {
    if (!text.trim() || send.isPending) return;
    send.mutate(
      { body: text, senderId: userId },
      {
        onSuccess: () => setText(""),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send message"),
      },
    );
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-11rem)]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5">
        {onBack && (
          <button onClick={onBack} className="rounded-full p-2 text-foreground hover:bg-muted md:hidden" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
        )}
        <UserAvatar name={conversation.other_name} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{conversation.other_name}</p>
          <p className="text-[11px] text-muted-foreground">Chat on Kivora</p>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-2 overflow-y-auto bg-background px-3 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-9 w-2/3 animate-pulse rounded-2xl bg-foreground/10 ${i % 2 ? "ml-auto" : ""}`} />
            ))}
          </div>
        ) : (messages?.length ?? 0) === 0 ? (
          <p className="pt-10 text-center text-xs text-muted-foreground">
            Say hello — your conversation with {conversation.other_name} starts here.
          </p>
        ) : (
          messages!.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-soft ${
                    mine
                      ? "gradient-primary rounded-br-md text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    {mine && (m.read ? " · Read" : "")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Type a message…"
            className="max-h-28 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || send.isPending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-primary text-primary-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <SendHorizonal size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
