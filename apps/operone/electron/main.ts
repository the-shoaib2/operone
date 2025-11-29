// Suppress security warnings in development (before any other imports)
if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

import { app, BrowserWindow, shell, ipcMain, session } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import Store from 'electron-store'
import type { ProviderType } from '@repo/types'
import fs from 'fs/promises'
import os from 'os'
import { exec } from 'child_process'
import util from 'util'

const execAsync = util.promisify(exec)

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const store = new Store()

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// Suppress harmless warnings and prevent GPU crashes
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-dev-shm-usage')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')

import { getAIService } from './services/ai-service'
import { getStorageService } from './services/storage-service'

// AI Service - initialized lazily
let aiService: ReturnType<typeof getAIService> | null = null

function getOrCreateAIService() {
  if (!aiService) {
    aiService = getAIService()
  }
  return aiService
}
function createWindow() {
  try {
    // Set CSP at session level for early application
    const defaultSession = session.defaultSession
    
    // Set CSP directly on session
    defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src 'self' https: http: ws: wss:; font-src 'self' data:;"]
        }
      })
    })

    // Additional security settings
    defaultSession.setPermissionRequestHandler((_webContents: any, _permission: any, callback: any) => {
      callback(false) // Deny all permission requests by default
    })

    mainWindow = new BrowserWindow({
      title: 'Operone',
      width: 1200,
      height: 800,
      minWidth: 600,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, '../dist-electron/preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
      },
    })

    if (VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(VITE_DEV_SERVER_URL)
      mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // Ensure CSP is applied
    mainWindow.webContents.on('did-finish-load', () => {
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
          if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src 'self' https: http: ws: wss:; font-src 'self' data:;";
            document.head.appendChild(meta);
          }
        `)
      }
    })

    mainWindow.on('closed', () => {
      mainWindow = null
    })

    // Pass mainWindow to AIService for event forwarding
    const service = getOrCreateAIService()
    service.setMainWindow(mainWindow)
  } catch (error) {
    console.error('Failed to create window:', error)
    throw error
  }
}

// Register protocol handler for operone://
function registerProtocolHandler() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('operone', process.execPath, [path.resolve(process.argv[1] as string)])
    }
  } else {
    app.setAsDefaultProtocolClient('operone')
  }
}

// Handle deep links
function handleDeepLink(url: string) {
  if (!url.startsWith('operone://')) return

  const urlObj = new URL(url)
  
  if (urlObj.pathname === 'auth' || urlObj.host === 'auth') {
    const token = urlObj.searchParams.get('token')
    
    if (token && mainWindow) {
      // Store token temporarily
      store.set('authToken', token)
      // Notify renderer process
      mainWindow.webContents.send('auth-success', { token })
    } else {
        console.error('Token missing or mainWindow not available', { token, mainWindow: !!mainWindow })
    }
  }
}

// IPC Handlers
function setupIPCHandlers() {
  // Legacy AI Chat (for backward compatibility)
  ipcMain.handle('ai:sendMessage', async (_event, message: string, mode: 'chat' | 'planning' = 'chat') => {
    const service = getOrCreateAIService()
    return await service.sendMessage(message, mode)
  })

  ipcMain.handle('ai:sendMessageStreaming', async (_event, message: string, mode: 'chat' | 'planning' = 'chat') => {
    const service = getOrCreateAIService()
    return await service.sendMessageStreaming(message, mode)
  })

  // Memory operations
  ipcMain.handle('ai:ingestDocument', async (_event, { id, content, metadata }) => {
    const service = getOrCreateAIService()
    return await service.ingestDocument(id, content, metadata)
  })

  ipcMain.handle('ai:queryMemory', async (_event, _query: string) => {
    // Not implemented yet
    return []
  })

  ipcMain.handle('ai:getStats', async () => {
    const service = getOrCreateAIService()
    return service.getMemoryStats()
  })

  // AI Provider Management
  ipcMain.handle('ai:provider:sendMessage', async (_event, message: string) => {
    const service = getOrCreateAIService()
    return await service.sendMessage(message)
  })

  ipcMain.handle('ai:provider:getActive', async () => {
    const service = getOrCreateAIService()
    return service.getActiveProviderConfig()
  })

  ipcMain.handle('ai:provider:getAll', async () => {
    const service = getOrCreateAIService()
    return service.getAllProviderConfigs()
  })

  ipcMain.handle('ai:provider:setActive', async (_event, id: string) => {
    const service = getOrCreateAIService()
    return service.setActiveProvider(id)
  })

  ipcMain.handle('ai:provider:add', async (_event, { id, config }) => {
    const service = getOrCreateAIService()
    service.addProvider(id, config)
  })

  ipcMain.handle('ai:provider:remove', async (_event, id: string) => {
    const service = getOrCreateAIService()
    return service.removeProvider(id)
  })

  ipcMain.handle('ai:provider:update', async (_event, { id, config }) => {
    const service = getOrCreateAIService()
    service.updateProvider(id, config)
  })

  ipcMain.handle('ai:provider:test', async (_event, id: string) => {
    const service = getOrCreateAIService()
    return await service.testProvider(id)
  })

  ipcMain.handle('ai:getModels', async (_event, providerType: ProviderType) => {
    const service = getOrCreateAIService()
    return service.getModels(providerType)
  })


// ... existing code ...



  // Chat Management
  ipcMain.handle('chat:create', async (_event, chat: any) => {
    const service = getStorageService()
    service.createChat(chat)
    return chat
  })

  ipcMain.handle('chat:getAll', async () => {
    const service = getStorageService()
    return service.getAllChats()
  })

  ipcMain.handle('chat:getById', async (_event, chatId: string) => {
    const service = getStorageService()
    return service.getChat(chatId)
  })



  ipcMain.handle('chat:update', async (_event, { id, updates }: { id: string; updates: any }) => {
    const service = getStorageService()
    service.updateChat(id, updates)
    return service.getChat(id)
  })

  ipcMain.handle('chat:delete', async (_event, chatId: string) => {
    const service = getStorageService()
    service.deleteChat(chatId)
    return true
  })

  ipcMain.handle('chat:setActive', async (_event, chatId: string) => {
    store.set('activeChat', chatId)
    return true
  })

  ipcMain.handle('chat:getActive', async () => {
    return store.get('activeChat', null)
  })

  // Settings
  ipcMain.handle('settings:get', async () => {
    return store.get('settings', {})
  })

  ipcMain.handle('settings:update', async (_event, settings) => {
    store.set('settings', settings)
    return true
  })

  // Authentication
  ipcMain.handle('auth:login', async () => {
    // Open browser to web app login page with desktop parameter
    const loginUrl = 'http://localhost:3000/login?from=desktop'
    shell.openExternal(loginUrl)
  })

  ipcMain.handle('auth:logout', async () => {
    // Clear stored authentication data
    store.delete('authToken')
    store.delete('user')
    return true
  })

  ipcMain.handle('auth:getUser', async () => {
    // Return mock user in test environment
    if (process.env.NODE_ENV === 'test') {
      return {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        image: null
      }
    }
    // Return stored user data if available
    const user = store.get('user')
    return user || null
  })

  ipcMain.handle('auth:setUser', async (_event, { user, token }) => {
    // Store user data and token
    store.set('user', user)
    store.set('authToken', token)
    return true
  })

  // OS Capability Handlers
  // Imports are moved to top-level
  
  // File System
  ipcMain.handle('os:fs:read', async (_event, filePath: string) => {
    return await fs.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('os:fs:write', async (_event, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('os:fs:list', async (_event, dirPath: string) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((entry: any) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }));
  });

  // Shell
  ipcMain.handle('os:shell:execute', async (_event, command: string) => {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return { stdout: '', stderr: error.message, exitCode: error.code || 1 };
    }
  });

  // System Metrics
  ipcMain.handle('os:system:metrics', async () => {
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc: number, cpu: any) => {
        const times = cpu.times as { user: number; nice: number; sys: number; idle: number; irq: number };
        const total = Object.values(times).reduce((a: number, b: number) => a + b, 0);
        const idle = times.idle;
        return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      cpu: {
        usage: cpuUsage,
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      uptime: os.uptime(),
      platform: os.platform() + ' ' + os.release()
    };
  });
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    // Handle deep link on Windows/Linux
    const url = commandLine.find(arg => arg.startsWith('operone://'))
    if (url) {
      handleDeepLink(url)
    }
  })

  app.whenReady().then(() => {
    registerProtocolHandler()
    setupIPCHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle deep links on macOS
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// Handle deep links on Windows/Linux
if (process.platform === 'win32' || process.platform === 'linux') {
  const url = process.argv.find(arg => arg.startsWith('operone://'))
  if (url) {
    handleDeepLink(url)
  }
}

// Handle external link clicks
app.on('web-contents-created', (_event: any, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
})
