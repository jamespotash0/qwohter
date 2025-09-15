import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Targeted Quote Workflow', () => {
  
  test('Discover and test quote creation flow', async ({ page }) => {
    console.log('🧪 Discovering quote creation flow...');
    
    // Navigate to quotes page
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-downloads/01-quotes-page.png', fullPage: true });
    
    // Click New Quote button (we know this exists from previous test)
    await page.click('button:has-text("New Quote")');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of new quote page
    await page.screenshot({ path: 'test-downloads/02-new-quote-page.png', fullPage: true });
    
    console.log('📍 Current URL:', page.url());
    
    // Debug: Log all form elements, not just inputs
    const formElements = await page.locator('input, textarea, select, [contenteditable]').count();
    console.log('🔍 Found form elements:', formElements);
    
    // Debug: Log all interactive elements
    const interactiveElements = await page.locator('button, a, input, textarea, select').allTextContents();
    console.log('🔍 Interactive elements:', interactiveElements.slice(0, 20));
    
    // Look for any wizard or step-based interface
    const wizardSteps = await page.locator('[data-testid*="step"], .step, .wizard-step').count();
    if (wizardSteps > 0) {
      console.log('🪄 Found wizard interface with', wizardSteps, 'steps');
    }
    
    // Look for form sections or cards
    const sections = await page.locator('form, .form, .card, [role="form"]').count();
    console.log('📋 Found', sections, 'form sections/cards');
    
    // Try to find any text inputs by looking at all input elements
    const allInputs = await page.locator('input').all();
    console.log('📝 Input field details:');
    for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const visible = await input.isVisible();
      console.log(`  Input ${i}: type="${type}", name="${name}", placeholder="${placeholder}", visible=${visible}`);
    }
    
    // If we find visible inputs, try to fill them
    for (const input of allInputs.slice(0, 5)) {
      if (await input.isVisible()) {
        const placeholder = await input.getAttribute('placeholder') || '';
        const name = await input.getAttribute('name') || '';
        
        if (placeholder.toLowerCase().includes('name') || name.toLowerCase().includes('name')) {
          await input.fill('E2E Test Quote');
          console.log('✅ Filled name field');
        } else if (placeholder.toLowerCase().includes('client') || name.toLowerCase().includes('client')) {
          await input.fill('Test Client');
          console.log('✅ Filled client field');
        }
      }
    }
    
    // Look for any submit or continue buttons
    const actionButtons = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Continue"), button:has-text("Next")').all();
    console.log('🎯 Found', actionButtons.length, 'action buttons');
    
    for (let i = 0; i < actionButtons.length; i++) {
      const btn = actionButtons[i];
      const text = await btn.textContent();
      const visible = await btn.isVisible();
      console.log(`  Action button ${i}: "${text}", visible=${visible}`);
    }
    
    // Try clicking the first visible action button
    for (const btn of actionButtons) {
      if (await btn.isVisible()) {
        const text = await btn.textContent();
        console.log(`🖱️  Clicking action button: "${text}"`);
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Take screenshot after action
    await page.screenshot({ path: 'test-downloads/03-after-action.png', fullPage: true });
    console.log('📍 URL after action:', page.url());
    
    console.log('✅ Quote creation flow discovery completed');
  });
  
  test('Test existing quote interactions', async ({ page }) => {
    console.log('🧪 Testing interactions with existing quotes...');
    
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-downloads/04-quotes-list.png', fullPage: true });
    
    // Look for existing quotes in the table
    const rows = await page.locator('tbody tr').count();
    console.log('📊 Found', rows, 'quote rows');
    
    if (rows > 0) {
      // Get details about the first quote
      const firstRow = page.locator('tbody tr').first();
      const rowText = await firstRow.textContent();
      console.log('🔍 First quote row:', rowText?.substring(0, 100));
      
      // Look for action buttons in the row
      const actionButtons = firstRow.locator('button, a');
      const actionCount = await actionButtons.count();
      console.log('🎯 Actions in first row:', actionCount);
      
      for (let i = 0; i < actionCount; i++) {
        const action = actionButtons.nth(i);
        const text = await action.textContent();
        console.log(`  Action ${i}: "${text}"`);
      }
      
      // Try clicking the first action
      if (actionCount > 0) {
        const firstAction = actionButtons.first();
        const actionText = await firstAction.textContent();
        console.log(`🖱️  Clicking first action: "${actionText}"`);
        
        await firstAction.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log('📍 URL after action:', page.url());
        await page.screenshot({ path: 'test-downloads/05-after-quote-action.png', fullPage: true });
      }
    }
    
    console.log('✅ Existing quote interactions test completed');
  });
  
  test('Explore analytics page', async ({ page }) => {
    console.log('🧪 Exploring analytics page...');
    
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Let any charts/data load
    
    await page.screenshot({ path: 'test-downloads/06-analytics.png', fullPage: true });
    
    // Look for metrics/numbers
    const numbers = await page.locator('text=/\\d+/').allTextContents();
    console.log('📊 Metrics found:', numbers.slice(0, 15));
    
    // Look for any status indicators
    const statusElements = await page.locator('text=/draft/i, text=/won/i, text=/lost/i, text=/pending/i').allTextContents();
    console.log('📈 Status indicators:', statusElements);
    
    console.log('✅ Analytics exploration completed');
  });
  
  test('Test download functionality if available', async ({ page }) => {
    console.log('🧪 Testing download functionality...');
    
    // Go to quotes page first
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Look for any download buttons on the page
    const downloadButtons = await page.locator('button:has-text("Download"), button:has-text("PDF"), [data-lucide="download"]').count();
    console.log('📥 Download buttons found:', downloadButtons);
    
    if (downloadButtons > 0) {
      const downloadBtn = page.locator('button:has-text("Download"), button:has-text("PDF")').first();
      
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await downloadBtn.click();
        
        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        console.log(`📥 Download initiated: ${filename}`);
        
        await download.saveAs(`./test-downloads/${filename}`);
        console.log('✅ Download successful!');
        
      } catch (e) {
        console.log('❌ Download failed:', e.message);
      }
    } else {
      // Try navigating to editor to look for download there
      await page.goto('/editor');
      await page.waitForLoadState('networkidle');
      
      const editorDownloads = await page.locator('button:has-text("Download"), button:has-text("PDF")').count();
      console.log('📥 Editor download buttons:', editorDownloads);
      
      if (editorDownloads > 0) {
        try {
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
          await page.click('button:has-text("Download"), button:has-text("PDF")');
          
          const download = await downloadPromise;
          console.log(`📥 Editor download: ${download.suggestedFilename()}`);
          await download.saveAs(`./test-downloads/${download.suggestedFilename()}`);
          console.log('✅ Editor download successful!');
        } catch (e) {
          console.log('❌ Editor download failed:', e.message);
        }
      }
    }
    
    console.log('✅ Download test completed');
  });
});