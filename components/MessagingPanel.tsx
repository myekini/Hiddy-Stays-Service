"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Send,
  MessageSquare,
  User,
  X,
  ChevronLeft,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useRealtimeConversations } from "@/hooks/useRealtimeConversations";
import type { Message as RealtimeMessage } from "@/hooks/useRealtimeMessages";
import type { Conversation as RealtimeConversation } from "@/hooks/useRealtimeConversations";

interface MessagingPanelProps {
  propertyId?: string;
  hostId?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Use types from hooks
type Conversation = RealtimeConversation;
type Message = RealtimeMessage;

export function MessagingPanel({
  propertyId,
  hostId,
  isOpen,
  onClose,
}: MessagingPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use realtime hooks for conversations and messages
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    profileId: conversationsProfileId,
    refreshConversations,
  } = useRealtimeConversations({
    userId: user?.id || null,
    onNewConversation: (conv) => {
      console.log("New conversation received:", conv);
    },
    onConversationUpdate: (conv) => {
      console.log("Conversation updated:", conv);
    },
  });

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    profileId: messagesProfileId,
    refreshMessages,
  } = useRealtimeMessages({
    conversationId: selectedConversation?.id || null,
    userId: user?.id || null,
    onNewMessage: (msg) => {
      console.log("New message received:", msg);
      // Auto-scroll to bottom when new message arrives
      setTimeout(() => scrollToBottom(), 100);
    },
    onMessageUpdate: (msg) => {
      console.log("Message updated:", msg);
    },
  });

  // Use the profile ID from either hook
  const currentProfileId = messagesProfileId || conversationsProfileId;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      // Mark messages as read via API
      fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          mark_all_read: true,
        }),
      }).catch((error) => {
        console.error("Error marking messages as read:", error);
      });
    }
  }, [selectedConversation, messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation?.id,
          property_id: propertyId,
          recipient_id: hostId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // If this was a new conversation
        if (!selectedConversation && data.conversation_id) {
          // Refresh conversations to get the new one
          await refreshConversations();
          // Find and select the new conversation
          setTimeout(() => {
            const newConv = conversations.find(
              (c) => c.id === data.conversation_id
            );
            if (newConv) {
              setSelectedConversation(newConv);
            } else {
              // If not found yet, try refreshing again
              refreshConversations().then(() => {
                const updatedConv = conversations.find(
                  (c) => c.id === data.conversation_id
                );
                if (updatedConv) setSelectedConversation(updatedConv);
              });
            }
          }, 200);
        }

        // Message will be added automatically via realtime subscription
        // But we can clear the input immediately
        setNewMessage("");
        // Scroll will happen automatically when new message arrives via realtime
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getUserInfo = (conversation: Conversation) => {
    // Determine if current user is guest or host based on profile ID
    const isGuest = currentProfileId === conversation.guest_id;

    return {
      name: isGuest
        ? `${conversation.host_first_name} ${conversation.host_last_name}`
        : `${conversation.guest_first_name} ${conversation.guest_last_name}`,
      avatar: isGuest ? conversation.host_avatar : conversation.guest_avatar,
      role: isGuest ? "Host" : "Guest",
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages
              </h2>
            </div>

            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 text-center text-slate-600">
                  Loading...
                </div>
              ) : conversationsError ? (
                <div className="p-4 text-center text-red-600">
                  Error loading conversations
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const info = getUserInfo(conversation);
                  const unreadCount =
                    currentProfileId === conversation.guest_id
                      ? conversation.guest_unread_count
                      : conversation.host_unread_count;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-4 border-b hover:bg-slate-50 transition-colors text-left ${
                        selectedConversation?.id === conversation.id
                          ? "bg-slate-100"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={info.avatar} />
                          <AvatarFallback>
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-slate-900 truncate">
                              {info.name}
                            </h3>
                            {unreadCount > 0 && (
                              <Badge className="ml-2 bg-blue-500">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mb-1 truncate">
                            {conversation.property_title}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {conversation.last_message_content}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Avatar>
                      <AvatarImage
                        src={getUserInfo(selectedConversation).avatar}
                      />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {getUserInfo(selectedConversation).name}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {selectedConversation.property_title}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="p-4 text-center text-slate-600">
                      Loading messages...
                    </div>
                  ) : messagesError ? (
                    <div className="p-4 text-center text-red-600">
                      Error loading messages
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        // Compare profile IDs, not user IDs
                        const isOwnMessage = message.sender_id === currentProfileId;
                        const showAvatar =
                          index === 0 ||
                          messages[index - 1]?.sender_id !== message.sender_id;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isOwnMessage ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`flex gap-2 max-w-[70%] ${
                                isOwnMessage ? "flex-row-reverse" : "flex-row"
                              }`}
                            >
                              {showAvatar && message.sender ? (
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={message.sender.avatar_url} />
                                  <AvatarFallback>
                                    {message.sender.first_name?.[0] || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="w-8" />
                              )}
                              <div>
                                <div
                                  className={`rounded-2xl px-4 py-2 ${
                                    isOwnMessage
                                      ? "bg-blue-500 text-white"
                                      : "bg-slate-100 text-slate-900"
                                  }`}
                                >
                                  <p className="text-sm">{message.content}</p>
                                </div>
                                <p
                                  className={`text-xs text-slate-500 mt-1 ${
                                    isOwnMessage ? "text-right" : "text-left"
                                  }`}
                                >
                                  {formatTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
