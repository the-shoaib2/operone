import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { nanoid } from 'nanoid';

export interface Project {
  id: string;
  name: string;
  category: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  conversationIds: string[];
}

export interface Chat {
  id: string;
  title: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: any[];
}

export interface ProjectContextType {
  projects: Project[];
  chats: Chat[];
  currentProject: Project | null;
  currentChat: Chat | null;
  
  // Project operations
  createProject: (name: string, category: string, description?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  
  // Chat operations
  createChat: (projectId?: string) => Chat;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  setCurrentChat: (chat: Chat | null) => void;
  generateChatTitle: (chatId: string, messages: any[]) => Promise<string>;
  
  // Getters
  getProjectChats: (projectId: string) => Chat[];
  getChatById: (chatId: string) => Chat | null;
  getProjectById: (projectId: string) => Project | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);

  // Project operations
  const createProject = useCallback((name: string, category: string, description?: string) => {
    const newProject: Project = {
      id: nanoid(),
      name,
      category,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      conversationIds: []
    };

    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(project => 
      project.id === id 
        ? { ...project, ...updates, updatedAt: new Date() }
        : project
    ));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(project => project.id !== id));
    // Also delete associated chats
    setChats(prev => prev.filter(chat => chat.projectId !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  }, [currentProject]);

  // Chat operations
  const createChat = useCallback((projectId?: string) => {
    const newChat: Chat = {
      id: nanoid(),
      title: 'New Chat',
      projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };

    setChats(prev => [...prev, newChat]);
    
    // Add chat to project if specified
    if (projectId) {
      setProjects(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, conversationIds: [...project.conversationIds, newChat.id] }
          : project
      ));
    }

    return newChat;
  }, []);

  const updateChat = useCallback((id: string, updates: Partial<Chat>) => {
    setChats(prev => prev.map(chat => 
      chat.id === id 
        ? { ...chat, ...updates, updatedAt: new Date() }
        : chat
    ));
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats(prev => prev.filter(chat => chat.id !== id));
    
    // Remove chat from project
    const chatToDelete = chats.find(chat => chat.id === id);
    if (chatToDelete?.projectId) {
      setProjects(prev => prev.map(project => 
        project.id === chatToDelete.projectId 
          ? { ...project, conversationIds: project.conversationIds.filter(chatId => chatId !== id) }
          : project
      ));
    }
    
    if (currentChat?.id === id) {
      setCurrentChat(null);
    }
  }, [chats, currentChat]);

  const generateChatTitle = useCallback(async (chatId: string, messages: any[]) => {
    // For now, generate a simple title. In a real implementation, 
    // you'd call an AI service to generate a meaningful title
    const firstMessage = messages.find(msg => msg.role === 'user');
    if (firstMessage) {
      const content = firstMessage.content || '';
      const title = content.length > 50 
        ? content.substring(0, 47) + '...' 
        : content;
      updateChat(chatId, { title });
      return title;
    }
    return 'New Chat';
  }, [updateChat]);

  // Getters
  const getProjectChats = useCallback((projectId: string) => {
    return chats.filter(chat => chat.projectId === projectId);
  }, [chats]);

  const getChatById = useCallback((chatId: string) => {
    return chats.find(chat => chat.id === chatId) || null;
  }, [chats]);

  const getProjectById = useCallback((projectId: string) => {
    return projects.find(project => project.id === projectId) || null;
  }, [projects]);

  const value: ProjectContextType = {
    projects,
    chats,
    currentProject,
    currentChat,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    createChat,
    updateChat,
    deleteChat,
    setCurrentChat,
    generateChatTitle,
    getProjectChats,
    getChatById,
    getProjectById,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
