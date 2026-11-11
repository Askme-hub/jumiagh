import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { flushMyPushes } from "./push.functions";

export type Conversation = {
  id: string;
  customer_id: string;
  seller_id: string;
  order_id: string | null;
  product_id: string | null;
  last_message_at: string;
  created_at: string;
  // joined display fields
  other_name?: string | null;
  other_shop?: string | null;
  last_body?: string | null;
  unread?: number;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  /** True once the recipient client received the message */
  delivered: boolean;
  /** True once the recipient opened the conversation */
  read: boolean;
  created_at: string;
};

/** Find or create the conversation between the current user (customer) and a seller. */
export async function startConversation(input: {
  customerId: string;
  sellerId: string;
  productId?: string | null;
  orderId?: string | null;
}) {
  const { customerId, sellerId, productId = null, orderId = null } = input;

  let query = supabase
    .from("conversations")
    .select("id")
    .eq("customer_id", customerId)
    .eq("seller_id", sellerId);
  query = productId ? query.eq("product_id", productId) : query.is("product_id", null);
  query = orderId ? query.eq("order_id", orderId) : query.is("order_id", null);
  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ customer_id: customerId, seller_id: sellerId, product_id: productId, order_id: orderId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Conversations for the signed-in user (customer or seller), with the other party's name. */
export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      // Explicit filter so we never surface other users' chats even if RLS is misconfigured
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`customer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const convos = (data ?? []) as Conversation[];
      if (convos.length === 0) return convos;

      const isCustomer = (c: Conversation) => c.customer_id === userId;
      const otherIds = [...new Set(convos.map((c) => (isCustomer(c) ? c.seller_id : c.customer_id)))];

      const [{ data: profiles }, { data: shops }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", otherIds),
        supabase.from("seller_profiles").select("user_id, shop_name").in("user_id", otherIds),
      ]);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      const shopMap = new Map((shops ?? []).map((s) => [s.user_id, s.shop_name]));

      const convoIds = convos.map((c) => c.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id, body, read, sender_id, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      const lastMap = new Map<string, string>();
      const unreadMap = new Map<string, number>();
      for (const m of msgs ?? []) {
        if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m.body);
        if (!m.read && m.sender_id !== userId) {
          unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
        }
      }

      return convos.map((c) => {
        const other = isCustomer(c) ? c.seller_id : c.customer_id;
        return {
          ...c,
          other_shop: shopMap.get(other) ?? null,
          other_name: shopMap.get(other) ?? nameMap.get(other) ?? "Kivora user",
          last_body: lastMap.get(c.id) ?? null,
          unread: unreadMap.get(c.id) ?? 0,
        };
      });
    },
    enabled: !!userId,
  });
}

/** Mark messages from the other party as delivered (recipient's client received them). */
export async function markConversationDelivered(conversationId: string, userId: string) {
  await supabase
    .from("messages")
    .update({ delivered: true })
    .eq("conversation_id", conversationId)
    .eq("delivered", false)
    .neq("sender_id", userId);
}

/** Mark messages sent by the other party as read (and delivered). */
export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("messages")
    .update({ read: true, delivered: true })
    .eq("conversation_id", conversationId)
    .eq("read", false)
    .neq("sender_id", userId);
}

/** Touch last_seen_at on the current user's profile (best-effort). */
export async function touchLastSeen(userId: string) {
  try {
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    /* column may not exist yet — ignore */
  }
}

/** Messages in one conversation, live-updating via realtime (insert + status updates). */
export function useMessages(conversationId: string | undefined, userId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        ...m,
        delivered: !!(m as ChatMessage).delivered,
        read: !!m.read,
      })) as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (userId && row.sender_id !== userId && !row.delivered) {
            void supabase
              .from("messages")
              .update({ delivered: true })
              .eq("id", row.id)
              .then(() => {
                qc.invalidateQueries({ queryKey: ["messages", conversationId] });
              });
          }
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["chat-unread"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["chat-unread"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, qc]);

  return query;
}

export function useSendMessage(conversationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, senderId }: { body: string; senderId: string }) => {
      const text = body.trim();
      if (!text) throw new Error("Type a message first.");
      // Don't send delivered/read here — DB defaults handle them after migration 0022.
      // Inserting unknown columns would fail before the migration is applied.
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId!,
        sender_id: senderId,
        body: text,
      });
      if (error) throw error;

      void flushMyPushes().catch(() => {});
      void touchLastSeen(senderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Total unread chat messages for the badge. */
export function useUnreadChatCount(userId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["chat-unread", userId],
    queryFn: async () => {
      // Only count conversations the current user belongs to
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`customer_id.eq.${userId},seller_id.eq.${userId}`);
      const ids = (convos ?? []).map((c) => c.id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .eq("read", false)
        .neq("sender_id", userId!);
      return count ?? 0;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("chat-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-unread", userId] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-unread", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}

// ---------------------------------------------------------------------------
// Presence + typing (Realtime Presence + Broadcast — no extra tables required)
// ---------------------------------------------------------------------------

export type PartnerPresence = {
  online: boolean;
  typing: boolean;
  lastSeenAt: string | null;
};

/**
 * Join a conversation presence channel:
 * - Tracks online/offline for the other party
 * - Broadcasts typing state
 * - Loads/updates last_seen_at on profiles
 */
export function useChatPresence(
  conversationId: string | undefined,
  userId: string | undefined,
  otherUserId: string | undefined,
) {
  const [partner, setPartner] = useState<PartnerPresence>({
    online: false,
    typing: false,
    lastSeenAt: null,
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypedAt = useRef(0);

  // Load persisted last_seen for the partner
  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("last_seen_at")
        .eq("id", otherUserId)
        .maybeSingle();
      if (!cancelled && data?.last_seen_at) {
        setPartner((p) => ({ ...p, lastSeenAt: data.last_seen_at as string }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [otherUserId]);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`presence:chat:${conversationId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    const syncPresence = () => {
      const state = channel.presenceState() as Record<
        string,
        Array<{ user_id?: string; online_at?: string }>
      >;
      let online = false;
      let seen: string | null = null;
      for (const [key, metas] of Object.entries(state)) {
        if (key === userId) continue;
        if (otherUserId && key !== otherUserId) continue;
        online = true;
        const at = metas?.[0]?.online_at;
        if (at) seen = at;
      }
      setPartner((p) => ({
        ...p,
        online,
        lastSeenAt: seen ?? p.lastSeenAt,
        // clear typing if they went offline
        typing: online ? p.typing : false,
      }));
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, () => {
        syncPresence();
        // Partner left — refresh last_seen from DB shortly
        if (otherUserId) {
          void supabase
            .from("profiles")
            .select("last_seen_at")
            .eq("id", otherUserId)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.last_seen_at) {
                setPartner((p) => ({ ...p, lastSeenAt: data.last_seen_at as string, online: false }));
              }
            });
        }
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.user_id === userId) return;
        setPartner((p) => ({ ...p, typing: !!payload.typing }));
        if (payload.typing) {
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => {
            setPartner((p) => ({ ...p, typing: false }));
          }, 3000);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
          void touchLastSeen(userId);
        }
      });

    // Heartbeat last_seen while the thread is open
    const heartbeat = setInterval(() => {
      void touchLastSeen(userId);
      void channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }, 45_000);

    return () => {
      clearInterval(heartbeat);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      void touchLastSeen(userId);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, userId, otherUserId]);

  /** Call while the user is typing in the composer (throttled). */
  const notifyTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !userId) return;
    const now = Date.now();
    if (now - lastTypedAt.current < 800) return;
    lastTypedAt.current = now;
    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, typing: true },
    });
  }, [userId]);

  /** Call when the composer is cleared / message sent. */
  const notifyStoppedTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !userId) return;
    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, typing: false },
    });
  }, [userId]);

  return { partner, notifyTyping, notifyStoppedTyping };
}

/** Human-readable last-seen label. */
export function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return "Offline";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Offline";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Last seen just now";
  if (diff < 3_600_000) return `Last seen ${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `Last seen ${Math.floor(diff / 3_600_000)}h ago`;
  return `Last seen ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}
