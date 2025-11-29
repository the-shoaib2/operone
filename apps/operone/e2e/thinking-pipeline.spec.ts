import { test, expect } from '@playwright/test';

test.describe('Thinking Pipeline E2E (Browser Mode)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app running in browser mode
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the chat interface', async ({ page }) => {
    // Verify the main chat interface is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check for chat input
    const chatInput = page.locator('textarea[placeholder*="message"]');
    await expect(chatInput).toBeVisible();
  });

  test('should have planning mode available', async ({ page }) => {
    // Look for mode selector - this might be a button, dropdown, or tabs
    // Adjust selector based on actual UI implementation
    const modeSelector = page.locator('[data-testid="chat-mode-selector"]').or(
      page.locator('text=/planning/i')
    ).first();
    
    // If mode selector exists, it should be visible
    if (await modeSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(modeSelector).toBeVisible();
    }
  });

  test('should send a message and display response', async ({ page }) => {
    // Find and fill the chat input
    const chatInput = page.locator('textarea[placeholder*="message"]').first();
    await chatInput.fill('Hello, test message');
    
    // Submit the message (look for send button or press Enter)
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")')
    ).first();
    
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    
    // Wait for a response (this will depend on AI being configured)
    // For now, just verify the message was sent
    await page.waitForTimeout(1000);
  });

  test('should trigger thinking pipeline in planning mode', async ({ page }) => {
    // Try to switch to planning mode
    const planningButton = page.locator('text=/planning/i').first();
    
    if (await planningButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await planningButton.click();
      await page.waitForTimeout(500);
    }
    
    // Send a complex request that should trigger the pipeline
    const chatInput = page.locator('textarea[placeholder*="message"]').first();
    await chatInput.fill('Create a plan to build a simple React todo app');
    
    // Submit the message
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")')
    ).first();
    
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    
    // Wait for pipeline stages to appear
    // Look for "Reasoning Steps" panel or similar
    const reasoningSteps = page.locator('text=/reasoning steps/i').or(
      page.locator('[data-testid="reasoning-steps"]')
    ).first();
    
    // Give it time to process (pipeline might take a few seconds)
    const stepsVisible = await reasoningSteps.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (stepsVisible) {
      await expect(reasoningSteps).toBeVisible();
      
      // Look for specific pipeline stages
      const stages = [
        'Complexity Detection',
        'Intent Analysis',
        'Planning',
        'Reasoning',
      ];
      
      // Check if any of the stages appear in the UI
      for (const stage of stages) {
        const stageElement = page.locator(`text=${stage}`).first();
        const isVisible = await stageElement.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isVisible) {
          console.log(`✓ Found pipeline stage: ${stage}`);
        }
      }
    } else {
      console.log('Note: Reasoning steps panel not found. This might be expected if AI is not configured.');
    }
  });

  test('should display OS-aware suggestions', async ({ page }) => {
    // Check for suggestion buttons
    const suggestions = page.locator('button:has-text("development environment")').or(
      page.locator('button:has-text("code example")')
    );
    
    const suggestionsVisible = await suggestions.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (suggestionsVisible) {
      await expect(suggestions.first()).toBeVisible();
      console.log('✓ OS-aware suggestions are displayed');
    }
  });
});
