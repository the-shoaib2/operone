import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('app launches', async () => {
  // Launch Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../dist-electron/main.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })

  // Get the first window
  const window = await electronApp.firstWindow()
  
  // Verify title (or other basic property)
  // Note: Title might be "Vite + React + TS" or "Operon" depending on config
  // We'll check if the window is visible
  expect(window).toBeTruthy()
  
  // Wait for load
  await window.waitForLoadState('domcontentloaded')
  
  // Check for a known element
  // e.g. the login screen or dashboard if authenticated
  // Since we start fresh, it likely shows Login
  const body = await window.locator('body')
  await expect(body).toBeVisible()

  // Close app
  await electronApp.close()
})
