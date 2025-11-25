import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { ChatMessage } from '@repo/types';

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  // Chat management
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  
  // Actions
  createNewChat: () => string;
  deleteChat: (id: string) => void;
  switchToChat: (id: string) => void;
  updateChatTitle: (id: string, title: string) => void;
  addMessageToChat: (chatId: string, message: ChatMessage) => void;
  updateChatMessages: (chatId: string, messages: ChatMessage[]) => void;
  
  // Utility
  generateChatTitle: (messages: ChatMessage[]) => Promise<string>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('operone-chats');
    const savedCurrentChatId = localStorage.getItem('operone-current-chat-id');
    
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt)
        }));
        setChats(parsedChats);
      } catch (error) {
        console.error('Failed to load chats from localStorage:', error);
      }
    }
    
    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId);
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('operone-chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Save current chat ID to localStorage
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('operone-current-chat-id', currentChatId);
    }
  }, [currentChatId]);

  const currentChat = currentChatId 
    ? chats.find(chat => chat.id === currentChatId) || null
    : null;

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: nanoid(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    
    return newChat.id;
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats(prev => prev.filter(chat => chat.id !== id));
    
    // If deleting current chat, switch to the most recent chat or create a new one
    if (id === currentChatId) {
      const remainingChats = chats.filter(chat => chat.id !== id);
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0].id);
      } else {
        createNewChat();
      }
    }
  }, [currentChatId, chats, createNewChat]);

  const switchToChat = useCallback((id: string) => {
    setCurrentChatId(id);
  }, []);

  const updateChatTitle = useCallback((id: string, title: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === id 
        ? { ...chat, title, updatedAt: new Date() }
        : chat
    ));
  }, []);

  const addMessageToChat = useCallback((chatId: string, message: ChatMessage) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, message],
            updatedAt: new Date()
          }
        : chat
    ));
  }, []);

  const updateChatMessages = useCallback((chatId: string, messages: ChatMessage[]) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages,
            updatedAt: new Date()
          }
        : chat
    ));
  }, []);

  const generateChatTitle = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    if (messages.length === 0) return 'New Chat';
    
    // Get the first user message
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return 'New Chat';
    
    // Simple title generation - take first 50 characters of the first message
    const content = firstUserMessage.content;
    const title = content.length > 50 
      ? content.substring(0, 50) + '...'
      : content;
    
    return title || 'New Chat';
  }, []);

  // Auto-generate title when first message is added to a chat
  useEffect(() => {
    if (currentChat && currentChat.messages.length === 1 && currentChat.title === 'New Chat') {
      generateChatTitle(currentChat.messages).then(title => {
        updateChatTitle(currentChat.id, title);
      });
    }
  }, [currentChat, currentChat?.messages, generateChatTitle, updateChatTitle]);

  const value: ChatContextType = {
    chats,
    currentChatId,
    currentChat,
    createNewChat,
    deleteChat,
    switchToChat,
    updateChatTitle,
    addMessageToChat,
    updateChatMessages,
    generateChatTitle
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
