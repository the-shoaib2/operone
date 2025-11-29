import { test, expect } from '@playwright/test';

test.describe('Download Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/download');
  });

  test('should render download page with all sections', async ({ page }) => {
    // Hero section
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByText('Get the official desktop application')).toBeVisible();
    
    // Badges
    await expect(page.getByText('Secure')).toBeVisible();
    await expect(page.getByText('Fast')).toBeVisible();
    await expect(page.getByText('Cross-platform')).toBeVisible();
  });

  test('should display all three platform cards', async ({ page }) => {
    // Check for Windows card
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
    await expect(page.getByText('Windows 10 & 11 (64-bit)')).toBeVisible();
    
    // Check for macOS card
    await expect(page.getByRole('heading', { name: 'macOS' })).toBeVisible();
    await expect(page.getByText('macOS 12.0+ (Universal)')).toBeVisible();
    
    // Check for Linux card
    await expect(page.getByRole('heading', { name: 'Linux' })).toBeVisible();
    await expect(page.getByText('AppImage (Universal)')).toBeVisible();
  });

  test('should display version and file sizes', async ({ page }) => {
    // Check version is displayed
    await expect(page.getByText(/Version 1\.0\.0/)).toBeVisible();
    
    // Check file sizes are displayed
    await expect(page.getByText('125 MB')).toBeVisible(); // Windows
    await expect(page.getByText('98 MB')).toBeVisible();  // macOS
    await expect(page.getByText('112 MB')).toBeVisible(); // Linux
  });

  test('should have download buttons for all platforms', async ({ page }) => {
    const downloadButtons = page.getByRole('link', { name: /Download/i });
    await expect(downloadButtons).toHaveCount(3);
    
    // Verify all buttons are visible
    const buttons = await downloadButtons.all();
    for (const button of buttons) {
      await expect(button).toBeVisible();
    }
  });

  test('should display system requirements section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'System Requirements' })).toBeVisible();
    
    // Windows requirements
    await expect(page.getByText('Windows 10 (1903) or later')).toBeVisible();
    
    // macOS requirements
    await expect(page.getByText('macOS 12.0 (Monterey) or later')).toBeVisible();
    
    // Linux requirements
    await expect(page.getByText(/Ubuntu 20\.04\+ \/ Fedora 35\+/)).toBeVisible();
    
    // RAM requirement (should appear 3 times, once per platform)
    const ramText = page.getByText('4 GB RAM minimum');
    await expect(ramText).toHaveCount(3);
  });

  test('should display features section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Why Choose Operone Desktop?' })).toBeVisible();
    
    // Check feature cards
    await expect(page.getByRole('heading', { name: 'Lightning Fast' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Secure by Design' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cross-Platform' })).toBeVisible();
  });

  test('should have CTA buttons', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read Documentation' })).toBeVisible();
  });

  test('should have correct download links', async ({ page }) => {
    // Windows download link
    const windowsLink = page.getByRole('link', { name: /Download/i }).first();
    await expect(windowsLink).toHaveAttribute('href', /Operone-Setup-1\.0\.0\.exe/);
    await expect(windowsLink).toHaveAttribute('download');
    
    // macOS download link
    const macLink = page.getByRole('link', { name: /Download/i }).nth(1);
    await expect(macLink).toHaveAttribute('href', /Operone-1\.0\.0-universal\.dmg/);
    await expect(macLink).toHaveAttribute('download');
    
    // Linux download link
    const linuxLink = page.getByRole('link', { name: /Download/i }).nth(2);
    await expect(linuxLink).toHaveAttribute('href', /Operone-1\.0\.0\.AppImage/);
    await expect(linuxLink).toHaveAttribute('download');
  });
});

test.describe('Platform Detection', () => {
  test('should detect Windows platform', async ({ page, context }) => {
    // Set Windows user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    await page.goto('/download');
    
    // Windows card should be highlighted/recommended
    const windowsCard = page.locator('div').filter({ hasText: /Windows.*Recommended for you/i }).first();
    await expect(windowsCard).toBeVisible();
  });

  test('should detect macOS platform', async ({ page, context }) => {
    // Set macOS user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    await page.goto('/download');
    
    // macOS card should be highlighted/recommended
    const macCard = page.locator('div').filter({ hasText: /macOS.*Recommended for you/i }).first();
    await expect(macCard).toBeVisible();
  });

  test('should detect Linux platform', async ({ page, context }) => {
    // Set Linux user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    await page.goto('/download');
    
    // Linux card should be highlighted/recommended
    const linuxCard = page.locator('div').filter({ hasText: /Linux.*Recommended for you/i }).first();
    await expect(linuxCard).toBeVisible();
  });

  test('should handle unknown platform gracefully', async ({ page, context }) => {
    // Set unknown/mobile user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    
    await page.goto('/download');
    
    // All platforms should be shown without recommendation
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'macOS' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Linux' })).toBeVisible();
    
    // No "Recommended for you" badge should be visible
    await expect(page.getByText('Recommended for you')).not.toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/download');
    
    // Check that content is still visible
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
  });

  test('should be tablet responsive', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/download');
    
    // Check that content is still visible
    await expect(page.getByRole('heading', { name: 'Download Operone' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Windows' })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to login page from Create Account button', async ({ page }) => {
    await page.goto('/download');
    
    await page.getByRole('link', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to docs from Read Documentation button', async ({ page }) => {
    await page.goto('/download');
    
    await page.getByRole('link', { name: 'Read Documentation' }).click();
    await expect(page).toHaveURL('/docs');
  });
});
