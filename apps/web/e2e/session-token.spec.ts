import { test, expect } from '@playwright/test';

test.describe('Session Token API', () => {
  test('should require authentication', async ({ request }) => {
    const response = await request.post('/api/auth/session-token');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('No active web session found');
  });

  // Note: We can't easily test the success case without mocking the session
  // or having a full login flow in the test. 
  // For now, we verify it's protected.
  // A full integration test would log in first.
});
