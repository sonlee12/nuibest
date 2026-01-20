"use client";

import React from "react"

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ChatMessage {
  id: string;
  odisplayName: string;
  displayName: string;
  text: string;
  createdAt: Date;
}

interface WatchPartyChatProps {
  roomId: string;
}

export function WatchPartyChat({ roomId }: WatchPartyChatProps) {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load messages with real-time updates
  useEffect(() => {
    if (!db || !roomId) return;

    const q = query(
      collection(db, "watchParties", roomId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs
          .filter((doc) => !doc.data().isSignal) // Filter out WebRTC signal messages
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as ChatMessage[];
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading messages:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userProfile || !db || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      await addDoc(collection(db, "watchParties", roomId, "messages"), {
        odisplayName: user.uid,
        displayName: userProfile.displayName || user.email?.split("@")[0] || "Guest",
        text: messageText,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (odisplayName: string) => {
    const colors = [
      "from-red-500 to-pink-600",
      "from-blue-500 to-cyan-600",
      "from-green-500 to-emerald-600",
      "from-yellow-500 to-orange-600",
      "from-purple-500 to-violet-600",
      "from-pink-500 to-rose-600",
    ];
    let hash = 0;
    for (let i = 0; i < odisplayName.length; i++) {
      hash = odisplayName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground text-sm text-center">
        Sign in to chat with other viewers
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-foreground font-semibold text-sm">Party Chat</h3>
        <p className="text-muted-foreground text-xs">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              const isOwnMessage = msg.odisplayName === user.uid;
              const showAvatar =
                idx === 0 || messages[idx - 1].odisplayName !== msg.odisplayName;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  {showAvatar ? (
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                        msg.odisplayName
                      )} flex items-center justify-center text-white text-xs font-medium shrink-0`}
                    >
                      {getInitials(msg.displayName)}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}

                  <div
                    className={`flex flex-col ${
                      isOwnMessage ? "items-end" : "items-start"
                    } max-w-[75%]`}
                  >
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium ${
                            isOwnMessage ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {isOwnMessage ? "You" : msg.displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm break-words ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "glass-card rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="text-sm"
            disabled={sending}
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sending}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
