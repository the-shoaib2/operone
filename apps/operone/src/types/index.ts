export type View = 'chat' | 'memory' | 'settings' | 'ui-demo'

export interface User {
  id: string
  email: string
  name: string
  image?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface MemoryStats {
  vectorDocuments: number
  shortTermMemory: number
}

export interface Settings {
  openaiApiKey?: string
}

// Electron API types (from preload.ts)
export interface ElectronAPI {
  sendMessage: (message: string) => Promise<string>
  ingestDocument: (id: string, content: string, metadata?: any) => Promise<void>
  queryMemory: (query: string) => Promise<any[]>
  getStats: () => Promise<MemoryStats>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  listDirectory: (dirPath: string) => Promise<string[]>
  executeCommand: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Settings) => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  getUser: () => Promise<User | null>
  setUser: (user: User, token: string) => Promise<void>
  onAuthSuccess: (callback: (event: any, data: { token: string }) => void) => () => void
  
  // AI Provider methods
  ai: {
    sendMessage: (message: string, mode?: 'chat' | 'planning') => Promise<string>
    sendMessageStreaming: (message: string, mode?: 'chat' | 'planning') => Promise<void>
    getActiveProvider: () => Promise<any>
    getAllProviders: () => Promise<Record<string, any>>
    setActiveProvider: (id: string) => Promise<boolean>
    addProvider: (id: string, config: any) => Promise<void>
    removeProvider: (id: string) => Promise<boolean>
    updateProvider: (id: string, config: any) => Promise<void>
    testProvider: (id: string) => Promise<{ success: boolean; error?: string }>
    getModels: (providerType: string) => Promise<any[]>
    
    // Streaming & Events
    onStreamToken: (callback: (token: string) => void) => () => void
    onStreamComplete: (callback: (fullText: string) => void) => () => void
    onStreamError: (callback: (error: string) => void) => () => void
    onAgentEvent: (callback: (payload: any) => void) => () => void
  }
}

