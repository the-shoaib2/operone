import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAI } from "@/contexts/ai-context";
import { useProject } from "@/contexts/project-context";
import { useLocation } from "react-router-dom";
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
  const { 
    messages, 
    sendMessageStreaming, 
    isLoading, 
    streamingMessage
  } = useAI();
  
  const { 
    currentChat, 
    updateChat, 
    generateChatTitle 
  } = useProject();
  
  const location = useLocation();
  
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Optimized auto-scroll with useCallback
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingMessage, scrollToBottom]);

  // Generate chat title when messages are available and chat doesn't have a proper title
  useEffect(() => {
    if (currentChat && messages.length > 0 && currentChat.title === 'New Chat') {
      generateChatTitle(currentChat.id, messages);
    }
  }, [messages, currentChat, generateChatTitle]);

  // Update chat messages in project context
  useEffect(() => {
    if (currentChat && messages.length > 0) {
      updateChat(currentChat.id, { 
        messages: messages,
        updatedAt: new Date()
      });
    }
  }, [messages, currentChat, updateChat]);

  // Update chat status based on loading state
  useEffect(() => {
    if (isLoading) {
      setChatStatus("submitted");
    } else if (streamingMessage) {
      setChatStatus("streaming");
    } else {
      setChatStatus("ready");
    }
  }, [isLoading, streamingMessage]);

  // Memoized submit handler with proper error handling
  const handleSubmit = useCallback(async (message: { text: string; files: FileUIPart[] }) => {
    if (!message.text.trim()) return;
    
    setInput("");
    
    try {
      await sendMessageStreaming(message.text);
    } catch (error) {
      console.error("Failed to send message:", error);
      setChatStatus("error");
    }
  }, [sendMessageStreaming]);

  // Memoized transformed messages with proper typing
  const transformedMessages = useMemo(() => 
    messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
    })),
    [messages]
  );

  // Memoized suggestion buttons with shadcn-friendly labels
  const suggestionButtons = useMemo(() => [
    "Start a conversation",
    "Explain the architecture", 
    "Create a code example",
    "Generate an artifact"
  ], []);

  // Memoized suggestion click handler
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, []);

  // Memoized status display with shadcn styling patterns
  const statusDisplay = useMemo(() => {
    return null;
  }, []);

  // Memoized message count display with shadcn typography
  const messageCountDisplay = useMemo(() => (
    <span className="text-sm text-muted-foreground">{messages.length} messages</span>
  ), [messages.length]);

  return (
    <ChatLayoutContainer className={className}>
      <ChatMain>
        <ChatContent>
          <ChatMessages>
            <ChatMessagesContainer>
              {messages.length === 0 ? (
                <ChatEmptyState
                  icon={<Sparkles className="w-5 h-5 text-primary-foreground" />}
                  actions={
                    suggestionButtons.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {suggestion}
                      </Button>
                    ))
                  }
                />
              ) : (
                <ChatMessageList>
                  {transformedMessages.map((message) => (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.content}
                        </div>
                      </MessageContent>
                    </Message>
                  ))}
                </ChatMessageList>
              )}
              
              {/* Optimized loading indicator */}
              <MessageLoading 
                isLoading={isLoading} 
                streamingMessage={streamingMessage || undefined}
              />
              
              {/* Streaming message with shadcn shimmer */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <Message from="assistant">
                    <MessageContent>
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {streamingMessage}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Shimmer>Typing...</Shimmer>
                      </div>
                    </MessageContent>
                  </Message>
                </div>
              )}

              <div ref={scrollRef} />
            </ChatMessagesContainer>
          </ChatMessages>

          <ChatInputContainer>
            <ChatStatusBar status={statusDisplay} messageCount={messageCountDisplay} />
            <ChatPromptInput
              input={input}
              setInput={setInput}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onSubmit={handleSubmit}
              status={chatStatus}
            />
          </ChatInputContainer>
        </ChatContent>
      </ChatMain>
    </ChatLayoutContainer>
  );
});

export default function Chat() {
  return <ChatLayout />;
}

