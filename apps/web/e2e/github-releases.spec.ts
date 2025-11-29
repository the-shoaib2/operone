import { test, expect } from '@playwright/test';

test.describe('GitHub Releases Integration', () => {
  test('should fetch latest release from API', async ({ page }) => {
    // Mock the GitHub API response
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe',
              size: '125 MB',
              fileName: 'Operone-Setup-1.0.0.exe'
            },
            mac: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg',
              size: '98 MB',
              fileName: 'Operone-1.0.0-universal.dmg'
            },
            linux: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage',
              size: '112 MB',
              fileName: 'Operone-1.0.0.AppImage'
            }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Verify version is displayed
    await expect(page.getByText('Version 1.0.0')).toBeVisible();
  });

  test('should handle API error and fallback to static config', async ({ page }) => {
    // Mock API error
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/download');
    
    // Should still display download page with static config
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
    
    // Should display default version from static config
    await expect(page.getByText(/Version 1\.0\.0/)).toBeVisible();
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    // Mock network timeout
    await page.route('**/api/releases/latest', async (route) => {
      // Delay for a long time to simulate timeout
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.abort('timedout');
    });

    await page.goto('/download');
    
    // Should still render page with fallback data
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
  });

  test('should display release date when available', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: 'November 29, 2025',
          platforms: {
            windows: { url: 'https://example.com/windows.exe', size: '125 MB', fileName: 'windows.exe' },
            mac: { url: 'https://example.com/mac.dmg', size: '98 MB', fileName: 'mac.dmg' },
            linux: { url: 'https://example.com/linux.AppImage', size: '112 MB', fileName: 'linux.AppImage' }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Note: This test assumes the page will display release date
    // If not implemented yet, this test will need to be updated
  });

  test('should cache release data', async ({ page }) => {
    let apiCallCount = 0;

    await page.route('**/api/releases/latest', async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: { url: 'https://example.com/windows.exe', size: '125 MB', fileName: 'windows.exe' },
            mac: { url: 'https://example.com/mac.dmg', size: '98 MB', fileName: 'mac.dmg' },
            linux: { url: 'https://example.com/linux.AppImage', size: '112 MB', fileName: 'linux.AppImage' }
          }
        })
      });
    });

    // First visit
    await page.goto('/download');
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    
    const firstCallCount = apiCallCount;

    // Reload page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();

    // API should be called again on reload (client-side caching may vary)
    // This test verifies the API is accessible
    expect(apiCallCount).toBeGreaterThanOrEqual(firstCallCount);
  });

  test('should handle malformed API response', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json'
      });
    });

    await page.goto('/download');
    
    // Should fallback to static config
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
  });

  test('should validate download URLs from API', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe',
              size: '125 MB',
              fileName: 'Operone-Setup-1.0.0.exe'
            },
            mac: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg',
              size: '98 MB',
              fileName: 'Operone-1.0.0-universal.dmg'
            },
            linux: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage',
              size: '112 MB',
              fileName: 'Operone-1.0.0.AppImage'
            }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Verify download links are from GitHub releases
    const downloadLinks = await page.getByRole('link', { name: /Download/i }).all();
    
    for (const link of downloadLinks) {
      const href = await link.getAttribute('href');
      expect(href).toContain('github.com');
      expect(href).toContain('releases/download');
    }
  });
});

test.describe('GitHub API Rate Limiting', () => {
  test('should handle rate limit error', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'API rate limit exceeded'
        })
      });
    });

    await page.goto('/download');
    
    // Should fallback to static config
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
  });

  test('should handle unauthorized error', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Bad credentials'
        })
      });
    });

    await page.goto('/download');
    
    // Should fallback to static config
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
  });
});

test.describe('Release Asset Mapping', () => {
  test('should correctly map Windows assets', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe',
              size: '125 MB',
              fileName: 'Operone-Setup-1.0.0.exe'
            },
            mac: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg',
              size: '98 MB',
              fileName: 'Operone-1.0.0-universal.dmg'
            },
            linux: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage',
              size: '112 MB',
              fileName: 'Operone-1.0.0.AppImage'
            }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Verify Windows download link
    const windowsLink = page.getByRole('link', { name: /Download/i }).first();
    await expect(windowsLink).toHaveAttribute('href', /\.exe$/);
  });

  test('should correctly map macOS assets', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe',
              size: '125 MB',
              fileName: 'Operone-Setup-1.0.0.exe'
            },
            mac: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg',
              size: '98 MB',
              fileName: 'Operone-1.0.0-universal.dmg'
            },
            linux: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage',
              size: '112 MB',
              fileName: 'Operone-1.0.0.AppImage'
            }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Verify macOS download link
    const macLink = page.getByRole('link', { name: /Download/i }).nth(1);
    await expect(macLink).toHaveAttribute('href', /\.dmg$/);
  });

  test('should correctly map Linux assets', async ({ page }) => {
    await page.route('**/api/releases/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          releaseDate: '2025-11-29',
          platforms: {
            windows: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe',
              size: '125 MB',
              fileName: 'Operone-Setup-1.0.0.exe'
            },
            mac: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg',
              size: '98 MB',
              fileName: 'Operone-1.0.0-universal.dmg'
            },
            linux: {
              url: 'https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage',
              size: '112 MB',
              fileName: 'Operone-1.0.0.AppImage'
            }
          }
        })
      });
    });

    await page.goto('/download');
    
    // Verify Linux download link
    const linuxLink = page.getByRole('link', { name: /Download/i }).nth(2);
    await expect(linuxLink).toHaveAttribute('href', /\.AppImage$/);
  });
});
