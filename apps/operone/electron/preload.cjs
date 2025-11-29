const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // AI Namespace
    ai: {
        sendMessage: (message, mode) => ipcRenderer.invoke('ai:sendMessage', message, mode),
        sendMessageStreaming: (message, mode) => ipcRenderer.invoke('ai:sendMessageStreaming', message, mode),

        // Provider Management
        getActiveProvider: () => ipcRenderer.invoke('ai:provider:getActive'),
        getAllProviders: () => ipcRenderer.invoke('ai:provider:getAll'),
        setActiveProvider: (id) => ipcRenderer.invoke('ai:provider:setActive', id),
        addProvider: (id, config) => ipcRenderer.invoke('ai:provider:add', { id, config }),
        removeProvider: (id) => ipcRenderer.invoke('ai:provider:remove', id),
        updateProvider: (id, config) => ipcRenderer.invoke('ai:provider:update', { id, config }),
        testProvider: (id) => ipcRenderer.invoke('ai:provider:test', id),
        getModels: (providerType) => ipcRenderer.invoke('ai:getModels', providerType),

        // Streaming Events
        onStreamToken: (callback) => {
            const subscription = (_event, token) => callback(token)
            ipcRenderer.on('ai:stream:token', subscription)
            return () => ipcRenderer.removeListener('ai:stream:token', subscription)
        },
        onStreamComplete: (callback) => {
            const subscription = (_event, fullText) => callback(fullText)
            ipcRenderer.on('ai:stream:complete', subscription)
            return () => ipcRenderer.removeListener('ai:stream:complete', subscription)
        },
        onStreamError: (callback) => {
            const subscription = (_event, error) => callback(error)
            ipcRenderer.on('ai:stream:error', subscription)
            return () => ipcRenderer.removeListener('ai:stream:error', subscription)
        },

        // Agent Events (Thinking/Planning)
        onAgentEvent: (callback) => {
            const subscription = (_event, payload) => callback(payload)
            ipcRenderer.on('agent:event', subscription)
            return () => ipcRenderer.removeListener('agent:event', subscription)
        }
    },

    // Memory operations
    ingestDocument: (id, content, metadata) =>
        ipcRenderer.invoke('ai:ingestDocument', { id, content, metadata }),
    queryMemory: (query) => ipcRenderer.invoke('ai:queryMemory', query),
    getStats: () => ipcRenderer.invoke('ai:getStats'),

    // OS File operations
    fs: {
        read: (path) => ipcRenderer.invoke('os:fs:read', path),
        write: (path, content) => ipcRenderer.invoke('os:fs:write', path, content),
        list: (path) => ipcRenderer.invoke('os:fs:list', path),
    },

    // OS Shell operations
    shell: {
        execute: (command, args) => ipcRenderer.invoke('os:shell:execute', command, args),
    },

    // System operations
    system: {
        getMetrics: () => ipcRenderer.invoke('os:system:metrics'),
    },

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

    // Authentication
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    setUser: (user, token) => ipcRenderer.invoke('auth:setUser', { user, token }),
    onAuthSuccess: (callback) => {
        ipcRenderer.on('auth-success', callback)
        return () => ipcRenderer.removeListener('auth-success', callback)
    },
})
