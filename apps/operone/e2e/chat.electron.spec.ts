import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('chat interface works', async () => {
  // Launch Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../dist-electron/main.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })

  // Mock the auth:getUser IPC handler in the main process
  await electronApp.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('auth:getUser')
    ipcMain.handle('auth:getUser', () => {
      return { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    })
  })

  // Mock the ai:sendMessage IPC handler
  await electronApp.evaluate(({ ipcMain, BrowserWindow }) => {
    ipcMain.removeHandler('ai:sendMessage')
    ipcMain.handle('ai:sendMessage', async (event) => {
      const window = BrowserWindow.getAllWindows()[0]
      // Simulate streaming response
      setTimeout(() => {
        window.webContents.send('ai:stream:token', 'Hello ')
      }, 100)
      setTimeout(() => {
        window.webContents.send('ai:stream:token', 'World!')
      }, 200)
      setTimeout(() => {
        window.webContents.send('ai:stream:complete', 'Hello World!')
      }, 300)
      return null
    })
  })

  // Get the first window
  const window = await electronApp.firstWindow()
  
  // Reload the window to trigger the auth check again with the mocked handler
  await window.reload()
  
  // Wait for load
  await window.waitForLoadState('domcontentloaded')
  
  // Look for the chat input area using data-testid
  const inputArea = window.locator('[data-testid="chat-input"]')
  await expect(inputArea).toBeVisible()
  
  // Type a message
  await inputArea.fill('Hello AI')
  
  // Click send button using data-testid
  const sendButton = window.locator('[data-testid="send-button"]')
  await sendButton.click()
  
  // Verify user message appears
  await expect(window.locator('text=Hello AI')).toBeVisible()
  
  // Wait a bit for response
  await window.waitForTimeout(1000)
  
  // Check for AI response
  await expect(window.locator('text=Hello World!')).toBeVisible()

  // Close app
  await electronApp.close()
})
