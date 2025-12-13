"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  conversation_id: string;
  created_at: string;
  read: boolean;
  message_type?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

interface UseRealtimeMessagesOptions {
  conversationId: string | null;
  userId: string | null;
  onNewMessage?: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
}

/**
 * Hook for subscribing to real-time message updates using Supabase Realtime
 * 
 * @param conversationId - The ID of the conversation to subscribe to
 * @param userId - The current user's ID
 * @param onNewMessage - Optional callback when a new message is received
 * @param onMessageUpdate - Optional callback when a message is updated
 * @returns Object with messages array and loading state
 */
export function useRealtimeMessages({
  conversationId,
  userId,
  onNewMessage,
  onMessageUpdate,
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user profile to determine profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      setProfileId(profile.id);

      // Fetch messages for the conversation
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Transform messages to match expected format
      const transformedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        conversation_id: msg.conversation_id || "",
        created_at: msg.created_at || new Date().toISOString(),
        read: msg.is_read || false,
        message_type: msg.message_type || undefined,
        sender: msg.sender
          ? {
              id: msg.sender.id,
              first_name: msg.sender.first_name || "",
              last_name: msg.sender.last_name || "",
              avatar_url: msg.sender.avatar_url || "",
            }
          : undefined,
      }));

      setMessages(transformedMessages);
    } catch (err) {
      console.error("Error loading messages:", err);
      setError(err instanceof Error ? err : new Error("Failed to load messages"));
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Load initial messages
    loadMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on<Message>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: RealtimePostgresChangesPayload<Message>) => {
          console.log("New message received:", payload);

          if (payload.eventType === "INSERT" && payload.new) {
            // Fetch the full message with sender details
            const { data: messageData, error: msgError } = await supabase
              .from("messages")
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey (
                  id,
                  first_name,
                  last_name,
                  avatar_url
                )
              `)
              .eq("id", payload.new.id)
              .single();

            if (!msgError && messageData) {
              const newMessage: Message = {
                id: messageData.id,
                content: messageData.content,
                sender_id: messageData.sender_id,
                recipient_id: messageData.recipient_id,
                conversation_id: messageData.conversation_id || "",
                created_at: messageData.created_at || new Date().toISOString(),
                read: (messageData as any).is_read || false,
                message_type: messageData.message_type || undefined,
                sender: messageData.sender
                  ? {
                      id: messageData.sender.id,
                      first_name: messageData.sender.first_name || "",
                      last_name: messageData.sender.last_name || "",
                      avatar_url: messageData.sender.avatar_url || "",
                    }
                  : undefined,
              };

              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });

              // Call optional callback
              if (onNewMessage) {
                onNewMessage(newMessage);
              }
            }
          }
        }
      )
      .on<Message>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          console.log("Message updated:", payload);

          if (payload.eventType === "UPDATE" && payload.new) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? {
                      ...msg,
                      ...payload.new,
                      read: (payload.new as any).is_read || (payload.new as any).read || false,
                      sender: msg.sender, // Preserve sender info
                    }
                  : msg
              )
            );

            // Call optional callback
            if (onMessageUpdate && payload.new) {
              const updatedMessage: Message = {
                ...payload.new,
                read: (payload.new as any).is_read || (payload.new as any).read || false,
                conversation_id: (payload.new as any).conversation_id || "",
                sender: messages.find((m) => m.id === payload.new.id)?.sender,
              } as Message;
              onMessageUpdate(updatedMessage);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to messages");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to messages");
          setError(new Error("Failed to subscribe to messages"));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, onNewMessage, onMessageUpdate]);

  return {
    messages,
    loading,
    error,
    profileId,
    refreshMessages: loadMessages,
  };
}

