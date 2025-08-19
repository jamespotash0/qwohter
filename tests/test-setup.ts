import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'fs/promises';

setup.beforeAll(async () => {
  // Create test downloads directory
  try {
    await mkdir('./test-downloads', { recursive: true });
    console.log('📁 Created test-downloads directory');
  } catch (error) {
    console.log('📁 test-downloads directory already exists or could not be created');
  }
});

// Common test utilities
export class QuoteTestUtils {
  static generateQuoteName(): string {
    return `Test Quote ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  static async waitForElementWithMultipleSelectors(page: any, selectors: string[], timeout = 5000) {
    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: timeout / selectors.length });
        return element;
      } catch (e) {
        continue;
      }
    }
    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }
  
  static async fillFormField(page: any, fieldSelectors: string[], value: string) {
    for (const selector of fieldSelectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible()) {
        await field.fill(value);
        return true;
      }
    }
    console.log(`⚠️  Could not find form field with selectors: ${fieldSelectors.join(', ')}`);
    return false;
  }
  
  static async clickButton(page: any, buttonSelectors: string[]) {
    for (const selector of buttonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        await button.click();
        return true;
      }
    }
    console.log(`⚠️  Could not find button with selectors: ${buttonSelectors.join(', ')}`);
    return false;
  }
}