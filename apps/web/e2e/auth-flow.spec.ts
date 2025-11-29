import { test, expect } from '@playwright/test';

test.describe('Auth Flow & Redirection', () => {
  
  test('should show desktop login text when from=desktop', async ({ page }) => {
    await page.goto('/login?from=desktop');
    await expect(page.getByText('Sign in to continue to the desktop app')).toBeVisible();
  });

  test('should redirect to auth-success if already logged in and from=desktop', async ({ page }) => {
    // Mock the session endpoint to return an authenticated user
    await page.route('/api/auth/session', async route => {
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

    // Mock the destination page to bypass middleware checks
    // We use a broad pattern to catch both document requests and Next.js RSC requests
    await page.route('**/auth-success*', async route => {
      console.log('Intercepted request to:', route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><h1>Mocked Auth Success Page</h1></body></html>'
      });
    });

    // Navigate to login page with from=desktop
    await page.goto('/login?from=desktop');

    // Should redirect to auth-success
    // We increase timeout just in case
    await expect(page).toHaveURL(/\/auth-success/, { timeout: 10000 });

    // Verify we reached the mocked page
    await expect(page.getByText('Mocked Auth Success Page')).toBeVisible();
  });

  test('should NOT redirect if logged in but NOT from=desktop', async ({ page }) => {
     // Mock the session endpoint to return an authenticated user
     await page.route('/api/auth/session', async route => {
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
  
      // Navigate to login page WITHOUT from=desktop
      await page.goto('/login');
  
      // Should stay on login page (or redirect to dashboard depending on other logic, 
      // but definitely NOT auth-success with desktop param)
      // The current implementation of LoginPageComponent doesn't auto-redirect to dashboard 
      // if just visiting /login while logged in, unless we add that logic. 
      // Let's check what it does. 
      // Looking at the code: 
      // useEffect(() => { if (status === 'authenticated' && session?.user && isFromDesktop) ... })
      // It ONLY redirects if isFromDesktop is true.
      
      // So it should stay on login page or show "You are already logged in" if that was implemented,
      // but based on code it just renders the login buttons.
      // Wait, usually apps redirect to dashboard if logged in. 
      // But strictly testing the "from=desktop" logic here.
      
      await expect(page).not.toHaveURL(/\/auth-success/);
      await expect(page.getByText('Choose your preferred sign-in method')).toBeVisible();
  });

});
