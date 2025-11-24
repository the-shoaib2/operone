import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // AI Chat
  sendMessage: (message: string) => ipcRenderer.invoke('ai:sendMessage', message),
  
  // Memory operations
  ingestDocument: (id: string, content: string, metadata?: any) => 
    ipcRenderer.invoke('ai:ingestDocument', { id, content, metadata }),
  queryMemory: (query: string) => ipcRenderer.invoke('ai:queryMemory', query),
  getStats: () => ipcRenderer.invoke('ai:getStats'),
  
  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('file:write', { filePath, content }),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('file:list', dirPath),
  
  // Shell operations
  executeCommand: (command: string) => ipcRenderer.invoke('shell:execute', command),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  
  // Authentication
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getUser: () => ipcRenderer.invoke('auth:getUser'),
  setUser: (user: any, token: string) => ipcRenderer.invoke('auth:setUser', { user, token }),
  onAuthSuccess: (callback: (event: any, data: { token: string }) => void) => {
    ipcRenderer.on('auth-success', callback)
    return () => ipcRenderer.removeListener('auth-success', callback)
  },
})

// Type definitions for TypeScript
export interface ElectronAPI {
  sendMessage: (message: string) => Promise<string>
  ingestDocument: (id: string, content: string, metadata?: any) => Promise<void>
  queryMemory: (query: string) => Promise<any[]>
  getStats: () => Promise<{ vectorDocuments: number; shortTermMemory: number }>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  listDirectory: (dirPath: string) => Promise<string[]>
  executeCommand: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  getSettings: () => Promise<any>
  updateSettings: (settings: any) => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  getUser: () => Promise<{ id: string; email: string; name: string; image?: string } | null>
  setUser: (user: any, token: string) => Promise<void>
  onAuthSuccess: (callback: (event: any, data: { token: string }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
