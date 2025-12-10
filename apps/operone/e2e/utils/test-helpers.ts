import type { Page, ElectronApplication } from '@playwright/test'

/**
 * Wait for the chat input to be visible
 */
export async function waitForChatInput(page: Page | any) {
  return await page.waitForSelector('[data-testid="chat-input"]', {
    state: 'visible',
    timeout: 10000
  })
}

/**
 * Send a message in the chat
 */
export async function sendMessage(page: Page | any, message: string) {
  const input = await waitForChatInput(page)
  await input.fill(message)
  const sendButton = page.locator('[data-testid="send-button"]')
  await sendButton.click()
}

/**
 * Wait for a message to appear in the chat
 */
export async function waitForMessage(page: Page | any, text: string, timeout = 5000) {
  return await page.waitForSelector(`text=${text}`, {
    state: 'visible',
    timeout
  })
}

/**
 * Launch Electron app for testing
 */
export async function launchElectronApp(electron: any, mainPath: string) {
  return await electron.launch({
    args: [mainPath],
    env: { ...process.env, NODE_ENV: 'test' }
  })
}

/**
 * Mock IPC handler in Electron
 */
export async function mockIPCHandler(
  electronApp: ElectronApplication,
  channel: string,
  handler: (...args: any[]) => any
) {
  await electronApp.evaluate(({ ipcMain }, { channel, handler }) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler)
  }, { channel, handler: handler.toString() })
}
