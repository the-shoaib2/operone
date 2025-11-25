import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAI } from "@/contexts/ai-context";
import { useChat } from "@/contexts/chat-context";
import type { FileUIPart, ChatStatus } from "ai";

// AI Component Imports
import { ChatPromptInput } from "./prompt-input";
import { Message, MessageContent, MessageLoading } from "@/components/ai/message";
import { Shimmer } from "@/components/ai/shimmer";
import { 
  ChatLayout as ChatLayoutContainer,
  ChatMain,
  ChatContent,
  ChatMessages,
  ChatMessagesContainer,
  ChatInputContainer,
  ChatEmptyState,
  ChatMessageList,
  ChatStatusBar
} from "./chat-layout";

// Chat Layout Props Interface
interface ChatLayoutProps {
  className?: string;
}


// Main Chat Component using structured layout
export const ChatLayout = React.memo(function ChatLayout({ 
  className
}: ChatLayoutProps) {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  
  const { 
    sendMessageStreaming, 
    isLoading, 
    streamingMessage
  } = useAI();
  
  const {
    currentChat,
    createNewChat,
    switchToChat,
    addMessageToChat,
    updateChatMessages
  } = useChat();
  
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle chat ID from URL
  useEffect(() => {
    if (chatId) {
      // If there's a chatId in URL, switch to that chat
      switchToChat(chatId);
    } else {
      // If no chatId, create a new chat and navigate to it
      const newChatId = createNewChat();
      navigate(`/dashboard/chat/${newChatId}`, { replace: true });
    }
  }, [chatId, switchToChat, createNewChat, navigate]);

  // Use current chat's messages
  const messages = currentChat?.messages || [];

  // Optimized auto-scroll with useCallback
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !currentChat) return;

    // Add user message to current chat
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: content.trim(),
      timestamp: new Date(),
    };
    
    addMessageToChat(currentChat.id, userMessage);
    setInput("");
    setChatStatus("streaming");

    try {
      // Send message to AI
      await sendMessageStreaming(content);
      setChatStatus("ready");
    } catch (error) {
      console.error("Failed to send message:", error);
      setChatStatus("error");
    }
  }, [content, isLoading, currentChat, addMessageToChat, sendMessageStreaming]);

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    const newChatId = createNewChat();
    navigate(`/dashboard/chat/${newChatId}`);
  }, [createNewChat, navigate]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  }, [input, handleSendMessage]);

  // Memoize chat messages for performance
  const chatMessages = useMemo(() => {
    return messages.map((message, index) => (
      <Message key={message.id || `msg-${index}`} from={message.role}>
        <MessageContent>
          {message.content}
        </MessageContent>
      </Message>
    ));
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <ChatLayoutContainer className={className}>
      <ChatMain>
        <ChatContent>
          {hasMessages ? (
            <ChatMessagesContainer>
              <ChatMessages>
                <ChatMessageList>
                  {chatMessages}
                  {isLoading && streamingMessage && (
                    <MessageLoading streamingMessage={streamingMessage} />
                  )}
                  <div ref={scrollRef} />
                </ChatMessageList>
              </ChatMessages>
              <ChatStatusBar>
                {chatStatus === "streaming" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shimmer />
                    <span>Operone is thinking...</span>
                  </div>
                )}
                {chatStatus === "error" && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <span>Something went wrong. Please try again.</span>
                  </div>
                )}
              </ChatStatusBar>
            </ChatMessagesContainer>
          ) : (
            <ChatEmptyState>
              <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl font-semibold">Start a conversation</h2>
                </div>
                <p className="text-muted-foreground">
                  Ask me anything! I'm here to help with your questions and tasks.
                </p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <span>💬 Try: "Help me write a Python script"</span>
                  <span>🔍 Try: "Explain quantum computing"</span>
                  <span>📝 Try: "Review this code for bugs"</span>
                </div>
              </div>
            </ChatEmptyState>
          )}
        </ChatContent>
        
        <ChatInputContainer>
          <ChatPromptInput
            value={input}
            onChange={handleInputChange}
            onSend={handleSendMessage}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            placeholder={
              hasMessages 
                ? "Continue the conversation..." 
                : "Type your message here..."
            }
            leftActions={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleNewChat}
                className="rounded-full"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
            }
          />
        </ChatInputContainer>
      </ChatMain>
    </ChatLayoutContainer>
  );
});

export default function Chat() {
  return <ChatLayout />;
}

