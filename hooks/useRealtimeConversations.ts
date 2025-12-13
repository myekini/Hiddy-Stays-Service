"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface Conversation {
  id: string;
  property_title: string;
  property_address: string;
  property_images: string[];
  guest_id: string;
  host_id: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_avatar: string;
  host_first_name: string;
  host_last_name: string;
  host_avatar: string;
  last_message_content: string;
  last_message_at: string;
  guest_unread_count: number;
  host_unread_count: number;
}

interface UseRealtimeConversationsOptions {
  userId: string | null;
  onNewConversation?: (conversation: Conversation) => void;
  onConversationUpdate?: (conversation: Conversation) => void;
}

/**
 * Hook for subscribing to real-time conversation updates using Supabase Realtime
 * 
 * @param userId - The current user's ID
 * @param onNewConversation - Optional callback when a new conversation is created
 * @param onConversationUpdate - Optional callback when a conversation is updated
 * @returns Object with conversations array, loading state, and refresh function
 */
export function useRealtimeConversations({
  userId,
  onNewConversation,
  onConversationUpdate,
}: UseRealtimeConversationsOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Get user profile ID
  useEffect(() => {
    const getProfileId = async () => {
      if (!userId) {
        setProfileId(null);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setProfileId(profile.id);
        }
      } catch (err) {
        console.error("Error getting profile ID:", err);
      }
    };

    getProfileId();
  }, [userId]);

  // Load initial conversations
  const loadConversations = useCallback(async () => {
    if (!userId || !profileId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch conversations with related data using joins
      const { data, error: fetchError } = await supabase
        .from("conversations")
        .select(`
          *,
          property:properties!conversations_property_id_fkey(
            id,
            title,
            address,
            property_images:property_images!property_images_property_id_fkey(
              image_url,
              sort_order,
              created_at
            )
          ),
          guest:profiles!conversations_guest_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          host:profiles!conversations_host_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .or(`guest_id.eq.${profileId},host_id.eq.${profileId}`)
        .order("last_message_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Get last message for each conversation
      const conversationIds = (data || []).map((c: any) => c.id);
      const lastMessages: Record<string, string> = {};
      
      if (conversationIds.length > 0) {
        const { data: messagesData } = await supabase
          .from("messages")
          .select("conversation_id, content")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false });

        // Get the last message for each conversation
        const seenConversations = new Set<string>();
        messagesData?.forEach((msg: any) => {
          if (!seenConversations.has(msg.conversation_id)) {
            lastMessages[msg.conversation_id] = msg.content || "";
            seenConversations.add(msg.conversation_id);
          }
        });
      }

      // Transform conversations to match expected format
      const transformedConversations: Conversation[] = (data || []).map(
        (conv: any) => {
          // Extract property images
          const propertyImages = conv.property?.property_images
            ?.sort((a: any, b: any) => {
              if (a.sort_order !== b.sort_order) {
                return (a.sort_order || 999) - (b.sort_order || 999);
              }
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
            .slice(0, 5)
            .map((img: any) => img.image_url) || [];

          return {
            id: conv.id,
            property_title: conv.property?.title || "",
            property_address: conv.property?.address || "",
            property_images: propertyImages,
            guest_id: conv.guest_id,
            host_id: conv.host_id,
            guest_first_name: conv.guest?.first_name || "",
            guest_last_name: conv.guest?.last_name || "",
            guest_avatar: conv.guest?.avatar_url || "",
            host_first_name: conv.host?.first_name || "",
            host_last_name: conv.host?.last_name || "",
            host_avatar: conv.host?.avatar_url || "",
            last_message_content: lastMessages[conv.id] || "",
            last_message_at: conv.last_message_at || conv.created_at,
            guest_unread_count: conv.guest_unread_count || 0,
            host_unread_count: conv.host_unread_count || 0,
          };
        }
      );

      setConversations(transformedConversations);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError(err instanceof Error ? err : new Error("Failed to load conversations"));
    } finally {
      setLoading(false);
    }
  }, [userId, profileId]);

  // Set up real-time subscription for conversations
  useEffect(() => {
    if (!userId || !profileId) {
      setConversations([]);
      return;
    }

    // Load initial conversations
    loadConversations();

    // Set up real-time subscription for conversation updates
    // We subscribe to both conversations table and messages table
    // since messages trigger conversation updates via triggers

    // Subscribe to conversation updates
    const conversationChannel = supabase
      .channel(`conversations:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `guest_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("Conversation update (guest):", payload);
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `host_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("Conversation update (host):", payload);
          loadConversations();
        }
      )
      .subscribe((status) => {
        console.log("Conversation subscription status:", status);
        if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to conversations");
          setError(new Error("Failed to subscribe to conversations"));
        }
      });

    // Also subscribe to messages to detect new conversations
    // When a new message is inserted, it might create or update a conversation
    const messageChannel = supabase
      .channel(`conversation-messages:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("New message sent, refreshing conversations:", payload);
          // Small delay to allow trigger to update conversation
          setTimeout(() => {
            loadConversations();
          }, 100);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("New message received, refreshing conversations:", payload);
          // Small delay to allow trigger to update conversation
          setTimeout(() => {
            loadConversations();
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log("Message subscription status (for conversations):", status);
      });

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [userId, profileId]);

  return {
    conversations,
    loading,
    error,
    profileId,
    refreshConversations: loadConversations,
  };
}

