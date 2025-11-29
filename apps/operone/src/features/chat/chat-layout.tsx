"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Chat Layout Components
export interface ChatLayoutProps {
  children: ReactNode;
  className?: string;
}

export const ChatLayout = ({ children, className }: ChatLayoutProps) => (
  <div className={cn("flex flex-col h-screen max-h-screen min-h-screen overflow-hidden bg-background w-full", className)}>
    {children}
  </div>
);

export interface ChatMainProps {
  children: ReactNode;
  className?: string;
}

export const ChatMain = ({ children, className }: ChatMainProps) => (
  <div className={cn("flex-1 flex overflow-hidden min-h-0 h-full w-full", className)}>
    {children}
  </div>
);

export interface ChatContentProps {
  children: ReactNode;
  className?: string;
}

export const ChatContent = ({ children, className }: ChatContentProps) => (
  <div className={cn("flex-1 flex flex-col min-h-0 relative h-full w-full", className)}>
    {children}
  </div>
);

export interface ChatPanelProps {
  children: ReactNode;
  className?: string;
  isOpen?: boolean;
  width?: string;
}

export const ChatPanel = ({ children, className, isOpen = false, width = "400px" }: ChatPanelProps) => {
  if (!isOpen) return null;

  return (
    <div
      className={cn("border-l bg-background hidden md:flex flex-col h-full transition-all duration-300 ease-in-out", className)}
      style={{ width }}
    >
      {children}
    </div>
  );
};

export interface ChatMessagesProps {
  children: ReactNode;
  className?: string;
  onScroll?: () => void;
}

export const ChatMessages = ({ children, className, onScroll }: ChatMessagesProps) => (
  <div className={cn("flex-1 overflow-hidden relative", className)}>
    <ScrollArea className="h-full w-full" onScroll={onScroll}>
      <div className="pr-2">
        {children}
      </div>
    </ScrollArea>
  </div>
);

export interface ChatMessagesContainerProps {
  children: ReactNode;
  className?: string;
}

export const ChatMessagesContainer = ({ children, className }: ChatMessagesContainerProps) => (
  <div className={cn("max-w-[600px] mx-auto px-2 py-3 sm:px-3", className)}>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export interface ChatInputContainerProps {
  children: ReactNode;
  className?: string;
}

export const ChatInputContainer = ({ children, className }: ChatInputContainerProps) => (
  <div className={cn("flex-shrink-0 bg-background border-t", className)}>
    <div className="max-w-[600px] mx-auto p-2 sm:p-3">
      {children}
    </div>
  </div>
);

export interface ChatEmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const ChatEmptyState = ({
  title = "Start a conversation",
  description = "Ask me anything! I'm here to help with your questions and tasks.",
  icon,
  actions,
  className
}: ChatEmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center py-6 px-2 text-center", className)}>
    {icon && (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-lg">
        {icon}
      </div>
    )}
    <h2 className="text-lg font-semibold mb-2 text-foreground">{title}</h2>
    <p className="text-muted-foreground mb-3 max-w-[200px] text-sm">{description}</p>
    {actions && <div className="flex flex-wrap gap-2 justify-center">{actions}</div>}
  </div>
);

export interface ChatMessageListProps {
  children: ReactNode;
  className?: string;
}

export const ChatMessageList = ({ children, className }: ChatMessageListProps) => (
  <div className={cn("space-y-4 pb-4", className)}>
    {children}
  </div>
);

export interface ChatStatusBarProps {
  status?: ReactNode;
  className?: string;
}

export const ChatStatusBar = ({ status, className }: ChatStatusBarProps) => (
  <div className={cn("flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1", className)}>
    {status}
  </div>
);

// Compound component for easy usage
export const Chat = {
  Layout: ChatLayout,
  Main: ChatMain,
  Content: ChatContent,
  Messages: ChatMessages,
  MessagesContainer: ChatMessagesContainer,
  InputContainer: ChatInputContainer,
  EmptyState: ChatEmptyState,
  MessageList: ChatMessageList,
  StatusBar: ChatStatusBar,
};

export default Chat;
