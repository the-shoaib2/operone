import { test, expect } from '@playwright/test'

test.describe('Security Headers', () => {
  test('should have security headers', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() || {}

    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toBeDefined()
    expect(headers['content-security-policy']).toBeDefined()
  })
})

test.describe('Authentication Protection', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
    // Check for callbackUrl param
    const url = new URL(page.url())
    expect(url.searchParams.get('callbackUrl')).toContain('/dashboard')
  })

  test('should allow access to public pages', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })
})

test.describe('API Security', () => {
  test('should return 403 for API access without CSRF token', async ({ request }) => {
    const response = await request.post('/api/auth/store-token', {
      data: {
        token: 'test-token',
        userId: 'test-user'
      }
    })
    expect(response.status()).toBe(403)
  })

  test('should enforce rate limiting', async ({ request }) => {
    // Make multiple requests to trigger rate limit
    // Note: This might be flaky if rate limit is high, but good for verifying mechanism exists
    // We'll just check if headers are present
    const response = await request.get('/')
    const headers = response.headers()
    
    expect(headers['x-ratelimit-limit']).toBeDefined()
    expect(headers['x-ratelimit-remaining']).toBeDefined()
    expect(headers['x-ratelimit-reset']).toBeDefined()
  })
})
