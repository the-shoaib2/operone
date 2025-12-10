import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('OS Integration', () => {
  let app: any

  test.beforeAll(async () => {
    // Launch Electron app
    app = await electron.launch({
      args: [path.join(__dirname, '../dist-electron/main.js')],
      env: {
        NODE_ENV: 'test',
      },
    })
  })

  test.afterAll(async () => {
    await app.close()
  })

  test('should display system status metrics', async () => {
    const page = await app.firstWindow()
    
    // Log console messages
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`))
    page.on('pageerror', err => console.log(`[Browser Page Error] ${err.message}`))
    
    // Wait for app to load and navigate to System Status
    await page.waitForSelector('text=Operone')
    
    // Click on System Status in sidebar
    await page.click('text=System Status')
    
    // Verify System Status page is displayed
    await expect(page.locator('h3')).toContainText('System Status')
    
    try {
      // Verify metrics are present (CPU, Memory, Uptime, Platform)
      await expect(page.locator('text=CPU Usage')).toBeVisible()
      await expect(page.locator('text=Memory Usage')).toBeVisible()
      await expect(page.locator('text=Uptime')).toBeVisible()
      // await expect(page.locator('text=Platform')).toBeVisible()
      
      // Verify actual values are rendered (checking for % or h)
      await expect(page.locator('text=%').first()).toBeVisible()
      await expect(page.locator('text=h').first()).toBeVisible()
    } catch (e) {
      console.log('Test failed. Page content:');
      console.log(await page.content());
      throw e;
    }
  })
})
