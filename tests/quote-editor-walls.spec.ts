import { test, expect } from '@playwright/test';

test.describe('Quote Editor - Wall Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to quotes page (authenticated via setup)
    await page.goto('/quotes');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Try to find quotes page indicators - could be various selectors
    try {
      await page.waitForSelector('[data-testid="quotes-page"]', { timeout: 5000 });
    } catch {
      // Alternative: wait for any indication we're on the quotes page
      await expect(page.locator('h1, h2, [role="heading"]')).toContainText(/quotes/i, { timeout: 10000 });
    }
  });

  test('should open unified quote editor', async ({ page }) => {
    // Look for a way to create or edit a quote
    const newQuoteButton = page.getByRole('button', { name: /new quote/i });
    const editQuoteButton = page.getByRole('button', { name: /edit/i }).first();
    
    if (await newQuoteButton.isVisible()) {
      await newQuoteButton.click();
    } else if (await editQuoteButton.isVisible()) {
      await editQuoteButton.click();
    } else {
      // Try to find any quote to edit
      const quoteRow = page.locator('[data-testid="quote-row"]').first();
      if (await quoteRow.isVisible()) {
        await quoteRow.click();
      }
    }
    
    // Wait for the unified quote editor to load
    await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
  });

  test('should expand walls section in data panel', async ({ page }) => {
    // First open the quote editor
    await test.step('Open quote editor', async () => {
      const newQuoteButton = page.getByRole('button', { name: /new quote/i });
      if (await newQuoteButton.isVisible()) {
        await newQuoteButton.click();
      }
      await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
    });

    // Find and click the walls section to expand it
    const wallsSection = page.getByRole('button', { name: /walls/i });
    await expect(wallsSection).toBeVisible();
    await wallsSection.click();
    
    // Verify the walls section is expanded and shows the add wall button
    await expect(page.getByRole('button', { name: /add wall/i })).toBeVisible();
  });

  test('should add a new wall successfully', async ({ page }) => {
    // Open quote editor and expand walls section
    await test.step('Setup - Open editor and expand walls', async () => {
      const newQuoteButton = page.getByRole('button', { name: /new quote/i });
      if (await newQuoteButton.isVisible()) {
        await newQuoteButton.click();
      }
      await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
      
      const wallsSection = page.getByRole('button', { name: /walls/i });
      await wallsSection.click();
    });

    // Count existing walls before adding
    const wallCountBefore = await page.locator('[data-testid^="wall-card-"]').count();
    
    // Click add wall button
    const addWallButton = page.getByRole('button', { name: /add wall/i });
    await addWallButton.click();
    
    // Verify a new wall was added
    const wallCountAfter = await page.locator('[data-testid^="wall-card-"]').count();
    expect(wallCountAfter).toBe(wallCountBefore + 1);
    
    // Verify the new wall has a default name like "Wall 1", "Wall 2", etc.
    const newWallCard = page.locator('[data-testid^="wall-card-"]').last();
    await expect(newWallCard).toContainText(/Wall \d+/);
  });

  test('should fill wall details and update live preview', async ({ page }) => {
    // Setup - Open editor, expand walls, and add a wall
    await test.step('Setup - Add a wall', async () => {
      const newQuoteButton = page.getByRole('button', { name: /new quote/i });
      if (await newQuoteButton.isVisible()) {
        await newQuoteButton.click();
      }
      await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
      
      const wallsSection = page.getByRole('button', { name: /walls/i });
      await wallsSection.click();
      
      const addWallButton = page.getByRole('button', { name: /add wall/i });
      await addWallButton.click();
    });

    // Get the first/newest wall card
    const wallCard = page.locator('[data-testid^="wall-card-"]').first();
    
    // Fill in wall dimensions
    await wallCard.getByLabel(/length.*feet/i).fill('12');
    await wallCard.getByLabel(/length.*inches/i).fill('6');
    await wallCard.getByLabel(/height.*feet/i).fill('8');
    await wallCard.getByLabel(/height.*inches/i).fill('0');
    
    // Fill in panel count
    await wallCard.getByLabel(/panel count/i).fill('3');
    
    // Select wall system type
    const wallSystemSelect = wallCard.getByRole('combobox', { name: /wall system type/i });
    await wallSystemSelect.click();
    await page.getByRole('option', { name: /operable wall/i }).click();
    
    // Wait for live preview to update
    await page.waitForTimeout(1000);
    
    // Check that the live preview panel shows updated content
    const livePreview = page.getByTestId('live-preview-panel');
    await expect(livePreview).toBeVisible();
    
    // The preview should contain wall specifications
    await expect(livePreview).toContainText('12\' 6"'); // Length
    await expect(livePreview).toContainText('8\' 0"');  // Height
  });

  test('should update existing wall and reflect changes in preview', async ({ page }) => {
    // Setup - Add a wall with initial values
    await test.step('Setup - Add wall with initial values', async () => {
      const newQuoteButton = page.getByRole('button', { name: /new quote/i });
      if (await newQuoteButton.isVisible()) {
        await newQuoteButton.click();
      }
      await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
      
      const wallsSection = page.getByRole('button', { name: /walls/i });
      await wallsSection.click();
      
      const addWallButton = page.getByRole('button', { name: /add wall/i });
      await addWallButton.click();
      
      // Fill initial values
      const wallCard = page.locator('[data-testid^="wall-card-"]').first();
      await wallCard.getByLabel(/length.*feet/i).fill('10');
      await wallCard.getByLabel(/height.*feet/i).fill('9');
    });

    // Update the wall dimensions
    const wallCard = page.locator('[data-testid^="wall-card-"]').first();
    
    // Clear and update length
    await wallCard.getByLabel(/length.*feet/i).clear();
    await wallCard.getByLabel(/length.*feet/i).fill('15');
    
    // Clear and update height
    await wallCard.getByLabel(/height.*feet/i).clear();
    await wallCard.getByLabel(/height.*feet/i).fill('10');
    
    // Wait for preview to update
    await page.waitForTimeout(1000);
    
    // Verify the updated values appear in the live preview
    const livePreview = page.getByTestId('live-preview-panel');
    await expect(livePreview).toContainText('15\' 0"'); // Updated length
    await expect(livePreview).toContainText('10\' 0"'); // Updated height
    
    // Should not contain old values
    await expect(livePreview).not.toContainText('10\' 0".*9\' 0"'); // Old dimensions pattern
  });

  test('should remove wall and update preview', async ({ page }) => {
    // Setup - Add two walls
    await test.step('Setup - Add multiple walls', async () => {
      const newQuoteButton = page.getByRole('button', { name: /new quote/i });
      if (await newQuoteButton.isVisible()) {
        await newQuoteButton.click();
      }
      await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
      
      const wallsSection = page.getByRole('button', { name: /walls/i });
      await wallsSection.click();
      
      // Add first wall
      const addWallButton = page.getByRole('button', { name: /add wall/i });
      await addWallButton.click();
      
      // Add second wall
      await addWallButton.click();
    });

    // Count walls before removal
    const wallCountBefore = await page.locator('[data-testid^="wall-card-"]').count();
    expect(wallCountBefore).toBe(2);
    
    // Remove the first wall
    const firstWallCard = page.locator('[data-testid^="wall-card-"]').first();
    const removeButton = firstWallCard.getByRole('button', { name: /remove/i });
    await removeButton.click();
    
    // Verify wall count decreased
    const wallCountAfter = await page.locator('[data-testid^="wall-card-"]').count();
    expect(wallCountAfter).toBe(wallCountBefore - 1);
    
    // Wait for preview to update
    await page.waitForTimeout(1000);
    
    // Verify the live preview reflects the removal
    const livePreview = page.getByTestId('live-preview-panel');
    await expect(livePreview).toBeVisible();
  });

  test('should validate wall form fields', async ({ page }) => {
    // Setup - Open editor and add a wall
    await test.step('Setup', async () => {
      const newQuoteButton = page.getByRole('button', { name: /new quote/i });
      if (await newQuoteButton.isVisible()) {
        await newQuoteButton.click();
      }
      await expect(page.getByTestId('unified-quote-editor')).toBeVisible({ timeout: 15000 });
      
      const wallsSection = page.getByRole('button', { name: /walls/i });
      await wallsSection.click();
      
      const addWallButton = page.getByRole('button', { name: /add wall/i });
      await addWallButton.click();
    });

    const wallCard = page.locator('[data-testid^="wall-card-"]').first();
    
    // Test invalid length (negative number)
    await wallCard.getByLabel(/length.*feet/i).fill('-5');
    await wallCard.getByLabel(/height.*feet/i).click(); // Trigger validation
    
    // Should show validation error or reset to valid value
    const lengthField = wallCard.getByLabel(/length.*feet/i);
    const lengthValue = await lengthField.inputValue();
    expect(lengthValue).not.toBe('-5'); // Should not accept negative
    
    // Test invalid panel count (non-numeric)
    await wallCard.getByLabel(/panel count/i).fill('abc');
    await wallCard.getByLabel(/height.*feet/i).click(); // Trigger validation
    
    const panelField = wallCard.getByLabel(/panel count/i);
    const panelValue = await panelField.inputValue();
    expect(panelValue).not.toBe('abc'); // Should not accept non-numeric
  });
});