import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  // AI Chat
  sendMessage: (message) => ipcRenderer.invoke("ai:sendMessage", message),
  // Memory operations
  ingestDocument: (id, content, metadata) => ipcRenderer.invoke("ai:ingestDocument", { id, content, metadata }),
  queryMemory: (query) => ipcRenderer.invoke("ai:queryMemory", query),
  getStats: () => ipcRenderer.invoke("ai:getStats"),
  // File operations
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("file:write", { filePath, content }),
  listDirectory: (dirPath) => ipcRenderer.invoke("file:list", dirPath),
  // Shell operations
  executeCommand: (command) => ipcRenderer.invoke("shell:execute", command),
  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings) => ipcRenderer.invoke("settings:update", settings),
  // Authentication
  login: () => ipcRenderer.invoke("auth:login"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  getUser: () => ipcRenderer.invoke("auth:getUser"),
  setUser: (user, token) => ipcRenderer.invoke("auth:setUser", { user, token }),
  onAuthSuccess: (callback) => {
    ipcRenderer.on("auth-success", callback);
    return () => ipcRenderer.removeListener("auth-success", callback);
  }
});
