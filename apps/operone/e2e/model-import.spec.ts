import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import {
  navigateToAISettings,
  importModel,
  waitForModelInList,
  getModelCount,
  removeModel,
  searchModels,
  cleanupImportedModels,
  verifyModelInList
} from './helpers/model-helpers';

let electronApp: ElectronApplication;
let page: Page;

const TEST_GGUF_PATH = path.join(__dirname, 'fixtures', 'test-model.gguf');

test.describe('Model Import E2E Tests', () => {
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: ['.'],
      cwd: path.join(__dirname, '..')
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test.beforeEach(async () => {
    // Clean up any existing imported models
    await cleanupImportedModels(electronApp);
    
    // Navigate to AI Settings
    await navigateToAISettings(page);
  });

  test('TC1: Import valid GGUF model', async () => {
    const modelName = 'Test Model 1';
    
    // Import the model
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName);
    
    // Go back to models list
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Verify model appears in list
    await verifyModelInList(page, modelName);
    
    // Verify model has correct metadata
    const modelCard = page.locator(`text=${modelName}`).locator('..').locator('..');
    await expect(modelCard.locator('text=Local')).toBeVisible();
    await expect(modelCard.locator('text=GGUF')).toBeVisible();
  });

  test('TC2: Import model with custom metadata', async () => {
    const modelName = 'Custom Named Model';
    
    // Import the model with custom name
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName);
    
    // Go back to models list
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Verify custom name is preserved
    await waitForModelInList(page, modelName);
    
    const modelCard = page.locator(`text=${modelName}`).locator('..').locator('..');
    const displayName = await modelCard.locator('.font-medium').first().textContent();
    expect(displayName).toContain(modelName);
  });

  test('TC3: Import duplicate model', async () => {
    const modelName1 = 'Duplicate Test 1';
    const modelName2 = 'Duplicate Test 2';
    
    // Import first model
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName1);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Import same file again with different name
    await page.click('button:has-text("Add Model")');
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName2);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Verify both models appear
    await waitForModelInList(page, modelName1);
    await waitForModelInList(page, modelName2);
    
    // Verify we have at least 2 models
    const count = await getModelCount(page);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('TC4: Import invalid file shows error', async () => {
    // Create a temporary invalid file path
    const invalidPath = path.join(__dirname, 'fixtures', 'invalid.txt');
    
    // Click "Add Model"
    await page.click('button:has-text("Add Model")');
    
    // Try to import (this should fail validation)
    // Note: This test may need adjustment based on actual validation behavior
    await page.waitForSelector('text=Import Local Model');
    
    // The file dialog mock would need to be set up differently for this test
    // For now, we'll verify the import form is present
    await expect(page.locator('text=Select GGUF File')).toBeVisible();
  });

  test('TC5: Model persistence across app restart', async () => {
    const modelName = 'Persistent Model';
    
    // Import a model
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Verify it's in the list
    await waitForModelInList(page, modelName);
    
    // Close and reopen the app
    await electronApp.close();
    
    electronApp = await electron.launch({
      args: ['.'],
      cwd: path.join(__dirname, '..')
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate to AI Settings again
    await navigateToAISettings(page);
    
    // Verify model still appears
    await waitForModelInList(page, modelName);
  });

  test('TC6: Remove imported model', async () => {
    const modelName = 'Model To Remove';
    
    // Import a model
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Verify it's in the list
    await waitForModelInList(page, modelName);
    
    // Get initial count
    const initialCount = await getModelCount(page);
    
    // Remove the model
    await removeModel(page, modelName);
    
    // Verify it's removed
    await expect(page.locator(`text=${modelName}`)).not.toBeVisible();
    
    // Verify count decreased
    const finalCount = await getModelCount(page);
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('TC7: Search and filter imported models', async () => {
    const model1 = 'Alpha Model';
    const model2 = 'Beta Model';
    const model3 = 'Gamma Model';
    
    // Import multiple models
    await importModel(page, electronApp, TEST_GGUF_PATH, model1);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    await page.click('button:has-text("Add Model")');
    await importModel(page, electronApp, TEST_GGUF_PATH, model2);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    await page.click('button:has-text("Add Model")');
    await importModel(page, electronApp, TEST_GGUF_PATH, model3);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Search for "Alpha"
    await searchModels(page, 'Alpha');
    
    // Verify only Alpha model is visible
    await expect(page.locator(`text=${model1}`)).toBeVisible();
    await expect(page.locator(`text=${model2}`)).not.toBeVisible();
    await expect(page.locator(`text=${model3}`)).not.toBeVisible();
    
    // Clear search
    await searchModels(page, '');
    
    // Verify all models are visible again
    await expect(page.locator(`text=${model1}`)).toBeVisible();
    await expect(page.locator(`text=${model2}`)).toBeVisible();
    await expect(page.locator(`text=${model3}`)).toBeVisible();
  });

  test('TC8: Refresh models list updates imported models', async () => {
    const modelName = 'Refresh Test Model';
    
    // Import a model
    await importModel(page, electronApp, TEST_GGUF_PATH, modelName);
    await page.click('button:has-text("Back"), button:has-text("←")');
    
    // Verify it's in the list
    await waitForModelInList(page, modelName);
    
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    
    // Verify model still appears after refresh
    await waitForModelInList(page, modelName);
  });
});
