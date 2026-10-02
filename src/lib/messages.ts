import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_id", customerId)
    .eq("seller_id", sellerId)
    .is("product_id", productId)
    .is("order_id", orderId)
    .maybeSingle();
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
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
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

/** Messages in one conversation, live-updating via realtime. */
export function useMessages(conversationId: string | undefined) {
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
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}

export function useSendMessage(conversationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, senderId }: { body: string; senderId: string }) => {
      const text = body.trim();
      if (!text) throw new Error("Type a message first.");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId!, sender_id: senderId, body: text });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Mark messages sent by the other party as read. */
export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .eq("read", false)
    .neq("sender_id", userId);
}

/** Total unread chat messages for the badge. */
export function useUnreadChatCount(userId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["chat-unread", userId],
    queryFn: async () => {
      const { data: convos } = await supabase.from("conversations").select("id");
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}
