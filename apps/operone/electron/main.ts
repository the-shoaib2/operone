import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import Store from 'electron-store'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const store = new Store()

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// Suppress harmless warnings
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-dev-shm-usage')

import { OSAgent } from '@repo/ai-engine'
import { openai } from '@ai-sdk/openai'

// AI Service placeholder - will be initialized when needed
let aiService: any = null

async function initializeAIService() {
  if (aiService) return aiService

  const apiKey = store.get('settings.openaiApiKey') as string || process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn('No OpenAI API key found')
  }

  // Initialize agent
  const agent = new OSAgent({
    model: openai('gpt-4o'),
    allowedPaths: [app.getPath('home'), app.getPath('documents'), app.getPath('downloads')],
    allowedCommands: ['ls', 'echo', 'grep', 'cat', 'git', 'npm']
  })
  
  aiService = {
    sendMessage: async (message: string) => {
      try {
        // Simple Think-Act loop
        console.log('User message:', message)
        const thought = await agent.think(message)
        console.log('Agent thought:', thought)
        
        if (thought.includes('FINAL ANSWER:')) {
          const answer = thought.split('FINAL ANSWER:')[1];
          return answer ? answer.trim() : thought;
        }
        
        // If it's an action, execute it
        await agent.act(thought)
        const observation = await agent.observe()
        
        return `Executed: ${thought}\nResult: ${observation}`
      } catch (error: any) {
        console.error('AI Error:', error)
        return `Error: ${error.message}`
      }
    },
    ingestDocument: async (data: any) => {
      console.log('Ingesting document:', data.id)
    },
    queryMemory: async (_query: string) => {
      return []
    },
    getStats: async () => {
      return { vectorDocuments: 0, shortTermMemory: 0 }
    }
  }

  return aiService
}

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    if (VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(VITE_DEV_SERVER_URL)
      mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })
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
    }
  }
}

// IPC Handlers
function setupIPCHandlers() {
  // AI Chat
  ipcMain.handle('ai:sendMessage', async (_event, message: string) => {
    const service = await initializeAIService()
    return await service.sendMessage(message)
  })

  // Memory operations
  ipcMain.handle('ai:ingestDocument', async (_event, data) => {
    const service = await initializeAIService()
    return await service.ingestDocument(data)
  })

  ipcMain.handle('ai:queryMemory', async (_event, query: string) => {
    const service = await initializeAIService()
    return await service.queryMemory(query)
  })

  ipcMain.handle('ai:getStats', async () => {
    const service = await initializeAIService()
    return await service.getStats()
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
}

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
