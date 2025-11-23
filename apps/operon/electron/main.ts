import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import Store from 'electron-store'

const store = new Store()

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
}

// Register protocol handler for operon://
function registerProtocolHandler() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('operon', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('operon')
  }
}

// Handle deep links
function handleDeepLink(url: string) {
  if (!url.startsWith('operon://')) return

  const urlObj = new URL(url)
  
  if (urlObj.pathname === 'auth' || urlObj.host === 'auth') {
    const token = urlObj.searchParams.get('token')
    
    if (token && mainWindow) {
      store.set('authToken', token)
      mainWindow.webContents.send('auth-success', { token })
    }
  }
}

app.whenReady().then(() => {
  registerProtocolHandler()
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
  const url = process.argv.find(arg => arg.startsWith('operon://'))
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
