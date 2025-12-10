import { test, expect } from '@playwright/test'
import { 
  launchElectronApp, 
  waitForAppReady
} from './test-utils'

test('chat interface works with mocked AI', async () => {
  // Launch Electron app
  const electronApp = await launchElectronApp()

  // Setup IPC mocks in main process
  await electronApp.evaluate(({ ipcMain }) => {
    // Mock auth:getUser
    ipcMain.removeHandler('auth:getUser')
    ipcMain.handle('auth:getUser', () => {
      return { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    })
  })

  await electronApp.evaluate(({ ipcMain, BrowserWindow }) => {
    // Mock ai:sendMessageStreaming
    ipcMain.removeHandler('ai:sendMessageStreaming')
    ipcMain.handle('ai:sendMessageStreaming', async (event, message) => {
      const sender = event.sender
      // Simulate streaming response
      setTimeout(() => {
        sender.send('ai:stream:token', 'Hello ')
      }, 100)
      setTimeout(() => {
        sender.send('ai:stream:token', 'World!')
      }, 200)
      setTimeout(() => {
        sender.send('ai:stream:complete', 'Hello World!')
      }, 300)
      return { success: true }
    })

    // Mock ai:model:list
    ipcMain.removeHandler('ai:model:list')
    ipcMain.handle('ai:model:list', () => [])

    // Mock ai:provider:getActive
    ipcMain.removeHandler('ai:provider:getActive')
    ipcMain.handle('ai:provider:getActive', () => null)
  })

  // Get the first window
  const window = await electronApp.firstWindow()
  

  // Reload the window to ensure mocks are active
  await window.reload()
  
  // Wait for app to be ready
  await waitForAppReady(window)
  
  // Wait extra time for React to fully render
  await window.waitForTimeout(3000)
  

  
  // Debug: Log page content
  const bodyText = await window.locator('body').textContent()
  console.log('Page body text:', bodyText?.substring(0, 300))
  


  
  // Look for the chat input area
  const inputArea = window.locator('[data-testid="chat-input"]')
  
  try {
    await expect(inputArea).toBeVisible({ timeout: 20000 })
  } catch (e) {
    // Log HTML for debugging
    const html = await window.content()
    console.log('Full page HTML length:', html.length)
    console.log('Page HTML preview:', html.substring(0, 2000))
    throw e
  }
  
  // Press keys to type a message
  await inputArea.press('H')
  await inputArea.press('e')
  await inputArea.press('l')
  await inputArea.press('l')
  await inputArea.press('o')
  await inputArea.press('Space')
  await inputArea.press('A')
  await inputArea.press('I')
  
  // Submit via Enter
  await inputArea.press('Enter')
  
  // Verify input is cleared
  await expect(inputArea).toHaveValue('', { timeout: 5000 })
  await expect(inputArea).toBeEmpty()
  
  // Verify user message appears
  await expect(window.locator('text=Hello AI')).toBeVisible({ timeout: 5000 })
  
  // Wait for AI response
  await window.waitForTimeout(1000)
  
  // Check for AI response
  await expect(window.locator('text=Hello World!')).toBeVisible({ timeout: 20000 })

  // Close app
  await electronApp.close()
})

test('OpenRouter integration works with real API', async () => {
  // Launch Electron app
  const electronApp = await launchElectronApp()

  // Setup minimal mocks (only auth, let AI use real OpenRouter)
  await electronApp.evaluate(({ ipcMain }) => {
    // Mock auth:getUser
    ipcMain.removeHandler('auth:getUser')
    ipcMain.handle('auth:getUser', () => {
      return { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    })
  })

  // Get the first window
  const window = await electronApp.firstWindow()
  
  // Wait for app to be ready
  await waitForAppReady(window)
  
  // Wait extra time for React to fully render
  await window.waitForTimeout(3000)
  
  // Look for the chat input area
  const inputArea = window.locator('[data-testid="chat-input"]')
  
  await expect(inputArea).toBeVisible({ timeout: 20000 })
  
  // Type a simple test message
  await inputArea.fill('Say "OpenRouter works!" and nothing else.')
  
  // Submit via Enter
  await inputArea.press('Enter')
  
  // Verify input is cleared
  await expect(inputArea).toHaveValue('', { timeout: 5000 })
  
  // Verify user message appears
  await expect(window.locator('text=Say "OpenRouter works!"')).toBeVisible({ timeout: 5000 })
  
  // Wait for AI response (real API call, may take longer)
  await window.waitForTimeout(5000)
  
  // Check for AI response containing "OpenRouter"
  // Note: The exact response may vary, so we check for partial match
  const responseLocator = window.locator('[role="article"]').filter({ hasText: 'OpenRouter' })
  await expect(responseLocator).toBeVisible({ timeout: 30000 })

  // Close app
  await electronApp.close()
})
