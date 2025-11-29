import { test, expect } from '@playwright/test';

test('login page renders correctly for desktop', async ({ page }) => {
  await page.goto('/login?from=desktop');
  // Check for the specific text that indicates desktop login flow
  // Note: Adjust the text selector if the actual UI text is different
  await expect(page.getByText(/Sign in to continue to the desktop app/i)).toBeVisible();
});

test('validate-token api requires token', async ({ request }) => {
  const response = await request.post('/api/auth/validate-token', {
    data: {}
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Invalid input');
});

test('validate-token api rejects invalid token', async ({ request }) => {
  const response = await request.post('/api/auth/validate-token', {
    data: { token: 'invalid-token-123' }
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error).toBe('Invalid or expired token');
});
