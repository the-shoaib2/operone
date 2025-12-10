import type { Page, ElectronApplication } from '@playwright/test';
import { expect } from '@playwright/test';
import path from 'path';

/**
 * Helper functions for model import e2e tests
 */

/**
 * Navigate to AI Settings page
 */
export async function navigateToAISettings(page: Page) {
  await page.click('[data-testid="settings-button"], [href="/settings"]');
  await page.waitForSelector('text=AI Settings', { timeout: 5000 });
}

/**
 * Import a model through the UI
 */
export async function importModel(
  page: Page,
  electronApp: ElectronApplication,
  filePath: string,
  modelName: string
): Promise<void> {
  // Click "Add Model" button
  await page.click('button:has-text("Add Model")');
  
  // Wait for the import form to appear
  await page.waitForSelector('text=Import Local Model', { timeout: 3000 });

  // Mock the file dialog to return our test file
  await electronApp.evaluate(async ({ dialog }, testFilePath) => {
    // Override dialog.showOpenDialog to return our test file
    const originalShowOpenDialog = dialog.showOpenDialog;
    dialog.showOpenDialog = async () => {
      return {
        canceled: false,
        filePaths: [testFilePath]
      };
    };
    // Restore after a short delay
    setTimeout(() => {
      dialog.showOpenDialog = originalShowOpenDialog;
    }, 1000);
  }, filePath);

  // Click the file selector
  await page.click('text=Select GGUF File');
  
  // Wait for file to be selected
  await page.waitForSelector(`text=${path.basename(filePath)}`, { timeout: 3000 });

  // Enter model name
  await page.fill('input[placeholder*="Llama"]', modelName);

  // Click import button
  await page.click('button:has-text("Import Model")');

  // Wait for success message
  await page.waitForSelector('text=Model imported successfully', { timeout: 10000 });
}

/**
 * Wait for a model to appear in the models list
 */
export async function waitForModelInList(page: Page, modelName: string): Promise<void> {
  await page.waitForSelector(`text=${modelName}`, { timeout: 5000 });
}

/**
 * Get the count of models in the list
 */
export async function getModelCount(page: Page): Promise<number> {
  const models = await page.locator('[data-testid="model-card"]').count();
  return models;
}

/**
 * Remove a model from the list
 */
export async function removeModel(page: Page, modelName: string): Promise<void> {
  // Find the model card
  const modelCard = page.locator(`text=${modelName}`).locator('..').locator('..');
  
  // Click the remove button
  await modelCard.locator('button:has-text("Remove"), button[aria-label="Remove"]').click();
  
  // Confirm deletion if there's a confirmation dialog
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for model to be removed
  await expect(page.locator(`text=${modelName}`)).not.toBeVisible({ timeout: 5000 });
}

/**
 * Search for models using the search filter
 */
export async function searchModels(page: Page, query: string): Promise<void> {
  await page.fill('input[placeholder*="Search"]', query);
  // Wait a bit for the filter to apply
  await page.waitForTimeout(500);
}

/**
 * Clean up all imported models (for test teardown)
 */
export async function cleanupImportedModels(electronApp: ElectronApplication): Promise<void> {
  await electronApp.evaluate(async () => {
    // Access the electron store and clear imported models
    const Store = require('electron-store');
    const store = new Store({ name: 'gguf-models' });
    store.clear();
  });
}

/**
 * Get model metadata from the UI
 */
export async function getModelMetadata(page: Page, modelName: string): Promise<{
  name: string;
  provider: string;
  description: string;
}> {
  const modelCard = page.locator(`text=${modelName}`).locator('..').locator('..');
  
  const name = await modelCard.locator('.font-medium').first().textContent() || '';
  const description = await modelCard.locator('.text-muted-foreground').first().textContent() || '';
  
  // Extract provider from description or badges
  const providerBadge = await modelCard.locator('[data-testid="provider-badge"]').textContent().catch(() => '') || '';
  
  return {
    name: name.trim(),
    provider: providerBadge.trim(),
    description: description.trim()
  };
}

/**
 * Verify model appears in list with correct metadata
 */
export async function verifyModelInList(
  page: Page,
  modelName: string,
  expectedProvider: string = 'local'
): Promise<void> {
  await waitForModelInList(page, modelName);
  
  const metadata = await getModelMetadata(page, modelName);
  expect(metadata.name).toContain(modelName);
  
  // Verify it's marked as local
  const modelCard = page.locator(`text=${modelName}`).locator('..').locator('..');
  await expect(modelCard.locator('text=Local')).toBeVisible();
}
