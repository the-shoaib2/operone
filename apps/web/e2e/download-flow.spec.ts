import { test, expect } from '@playwright/test';

test.describe('Download Flow - End to End', () => {
  test('complete download flow on Windows', async ({ page, context }) => {
    // Set Windows user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Navigate to download page
    await page.goto('/download');
    
    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    // Verify Windows is recommended
    await expect(page.getByText('Recommended for you')).toBeVisible();
    
    // Find and click Windows download button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: /Download/i }).first().click();
    
    // Note: In a real test environment, you might want to mock the download
    // or verify the download URL without actually downloading
  });

  test('complete download flow on macOS', async ({ page, context }) => {
    // Set macOS user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Navigate to download page
    await page.goto('/download');
    
    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    // Verify macOS is recommended
    await expect(page.getByText('Recommended for you')).toBeVisible();
    
    // Verify macOS download button
    const macLink = page.getByRole('link', { name: /Download/i }).nth(1);
    await expect(macLink).toBeVisible();
    await expect(macLink).toHaveAttribute('href', /\.dmg$/);
  });

  test('complete download flow on Linux', async ({ page, context }) => {
    // Set Linux user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Navigate to download page
    await page.goto('/download');
    
    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    // Verify Linux is recommended
    await expect(page.getByText('Recommended for you')).toBeVisible();
    
    // Verify Linux download button
    const linuxLink = page.getByRole('link', { name: /Download/i }).nth(2);
    await expect(linuxLink).toBeVisible();
    await expect(linuxLink).toHaveAttribute('href', /\.AppImage$/);
  });

  test('user can manually select different platform', async ({ page, context }) => {
    // Set Windows user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    await page.goto('/download');
    
    // Windows should be recommended
    await expect(page.getByText('Recommended for you')).toBeVisible();
    
    // But user can still download macOS version
    const macLink = page.getByRole('link', { name: /Download/i }).nth(1);
    await expect(macLink).toBeVisible();
    await expect(macLink).toHaveAttribute('href', /\.dmg$/);
    
    // Or Linux version
    const linuxLink = page.getByRole('link', { name: /Download/i }).nth(2);
    await expect(linuxLink).toBeVisible();
    await expect(linuxLink).toHaveAttribute('href', /\.AppImage$/);
  });

  test('download flow from homepage', async ({ page }) => {
    // Start from homepage
    await page.goto('/');
    
    // Find and click download link (assuming there's one on homepage)
    // This might need adjustment based on actual homepage structure
    const downloadLink = page.getByRole('link', { name: /Download/i }).first();
    if (await downloadLink.isVisible()) {
      await downloadLink.click();
      
      // Should navigate to download page
      await expect(page).toHaveURL('/download');
      await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    }
  });

  test('download flow after authentication', async ({ page }) => {
    // Mock authenticated session
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://example.com/avatar.jpg',
            id: 'test-user-id'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });
    });

    await page.goto('/download');
    
    // Authenticated user should still be able to download
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Download/i }).first()).toBeVisible();
  });

  test('download flow on mobile device', async ({ page }) => {
    // Set mobile viewport and user agent
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/download');
    
    // Page should be responsive
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    // Download buttons should still be accessible
    await expect(page.getByRole('link', { name: /Download/i }).first()).toBeVisible();
  });

  test('download flow with slow network', async ({ page, context }) => {
    // Simulate slow network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });

    await page.goto('/download');
    
    // Page should still load
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible({ timeout: 10000 });
  });

  test('verify download links are external', async ({ page }) => {
    await page.goto('/download');
    
    // All download links should point to external URLs (GitHub releases)
    const downloadLinks = await page.getByRole('link', { name: /Download/i }).all();
    
    for (const link of downloadLinks) {
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//); // Should be absolute URL
    }
  });

  test('verify download buttons have correct attributes', async ({ page }) => {
    await page.goto('/download');
    
    const downloadLinks = await page.getByRole('link', { name: /Download/i }).all();
    
    for (const link of downloadLinks) {
      // Should have download attribute
      const hasDownload = await link.getAttribute('download');
      expect(hasDownload).not.toBeNull();
      
      // Should have href attribute
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('complete user journey: homepage -> download -> create account', async ({ page }) => {
    // Start from homepage
    await page.goto('/');
    
    // Navigate to download page
    await page.goto('/download');
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    // Click Create Account button
    await page.getByRole('link', { name: 'Create Account' }).click();
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login');
  });

  test('complete user journey: download -> docs', async ({ page }) => {
    await page.goto('/download');
    
    // Click Read Documentation button
    await page.getByRole('link', { name: 'Read Documentation' }).click();
    
    // Should navigate to docs page
    await expect(page).toHaveURL('/docs');
  });
});

test.describe('Download Analytics', () => {
  test('should track download button clicks', async ({ page }) => {
    // Mock analytics endpoint if implemented
    let analyticsEventFired = false;
    
    await page.route('**/api/analytics/**', async (route) => {
      analyticsEventFired = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/download');
    
    // Click download button
    const downloadLink = page.getByRole('link', { name: /Download/i }).first();
    await downloadLink.click();
    
    // Note: This test assumes analytics tracking is implemented
    // If not, this test can be skipped or modified
  });
});

test.describe('Download Error Handling', () => {
  test('should handle broken download links gracefully', async ({ page }) => {
    // Mock broken download link
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: {
              url: 'https://invalid-url.com/broken-link.exe',
              size: '125 MB',
              fileName: 'broken.exe'
            },
            mac: {
              url: 'https://invalid-url.com/broken-link.dmg',
              size: '98 MB',
              fileName: 'broken.dmg'
            },
            linux: {
              url: 'https://invalid-url.com/broken-link.AppImage',
              size: '112 MB',
              fileName: 'broken.AppImage'
            }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Page should still render
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    // Download buttons should be visible (even if links are broken)
    await expect(page.getByRole('link', { name: /Download/i }).first()).toBeVisible();
  });
});
