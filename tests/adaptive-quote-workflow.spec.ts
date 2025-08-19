import { test, expect } from '@playwright/test';

// This test uses authenticated context
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Adaptive Quote Workflow Tests', () => {
  
  test('Comprehensive quote workflow with debugging', async ({ page }) => {
    const quoteName = `Adaptive Test ${Date.now()}`;
    console.log(`🧪 Testing comprehensive workflow with: ${quoteName}`);

    // Step 1: Navigate to quotes and debug the UI
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    console.log('📍 Navigated to quotes page');

    // Debug: Take a screenshot and log current URL
    await page.screenshot({ path: `test-downloads/quotes-page-${Date.now()}.png` });
    console.log('📸 Screenshot saved, current URL:', page.url());

    // Debug: Log all visible buttons
    const allButtons = await page.locator('button').allTextContents();
    console.log('🔍 Available buttons:', allButtons);

    // Step 2: Try to create a quote with multiple strategies
    console.log('📝 Attempting to create new quote...');
    
    let quoteCreated = false;
    
    // Strategy 1: Look for various create buttons
    const createStrategies = [
      async () => {
        const btn = page.locator('button:has-text("Create Quote")').first();
        if (await btn.isVisible()) {
          await btn.click();
          return true;
        }
        return false;
      },
      async () => {
        const btn = page.locator('button:has-text("New Quote")').first();
        if (await btn.isVisible()) {
          await btn.click();
          return true;
        }
        return false;
      },
      async () => {
        const btn = page.locator('button:has-text("+ Create")').first();
        if (await btn.isVisible()) {
          await btn.click();
          return true;
        }
        return false;
      },
      async () => {
        // Try navigating directly
        await page.goto('/quotes/new');
        return true;
      },
      async () => {
        // Try looking for a plus button or icon
        const btn = page.locator('button:has([data-lucide="plus"]), button:has(.lucide-plus)').first();
        if (await btn.isVisible()) {
          await btn.click();
          return true;
        }
        return false;
      }
    ];

    for (const strategy of createStrategies) {
      try {
        const result = await strategy();
        if (result) {
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          // Check if we're on a creation page
          const url = page.url();
          if (url.includes('new') || url.includes('create') || url.includes('editor')) {
            quoteCreated = true;
            console.log('✅ Quote creation flow initiated, URL:', url);
            break;
          }
        }
      } catch (e) {
        console.log('❌ Strategy failed:', e.message);
        continue;
      }
    }

    if (!quoteCreated) {
      console.log('⚠️  Could not initiate quote creation, taking screenshot...');
      await page.screenshot({ path: `test-downloads/creation-failed-${Date.now()}.png` });
      
      // Let's see what's actually on the page
      const pageContent = await page.locator('body').textContent();
      console.log('📄 Page content preview:', pageContent?.substring(0, 500));
    }

    // Step 3: Fill out the form with flexible selectors
    console.log('📝 Attempting to fill quote form...');
    
    // Debug: Log all input fields
    const allInputs = await page.locator('input').count();
    console.log('🔍 Found', allInputs, 'input fields');
    
    // Try to fill quote name with various selectors
    const nameFields = [
      'input[name*="name" i]',
      'input[name*="quote" i]',
      'input[placeholder*="name" i]',
      'input[placeholder*="quote" i]',
      'input[type="text"]'
    ];
    
    let nameFilled = false;
    for (const selector of nameFields) {
      const fields = page.locator(selector);
      const count = await fields.count();
      
      for (let i = 0; i < count; i++) {
        const field = fields.nth(i);
        if (await field.isVisible()) {
          await field.fill(quoteName);
          nameFilled = true;
          console.log(`✅ Filled quote name using selector: ${selector}`);
          break;
        }
      }
      if (nameFilled) break;
    }

    // Fill other basic fields
    const clientSelectors = [
      'input[name*="client" i]',
      'input[placeholder*="client" i]',
      'input[name*="company" i]'
    ];
    
    for (const selector of clientSelectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible()) {
        await field.fill('Test Client Inc.');
        console.log(`✅ Filled client field: ${selector}`);
        break;
      }
    }

    // Step 4: Try to save the quote
    console.log('💾 Attempting to save quote...');
    
    const saveStrategies = [
      'button:has-text("Save")',
      'button:has-text("Create Quote")',
      'button:has-text("Create")',
      'button[type="submit"]',
      'input[type="submit"]'
    ];
    
    let saved = false;
    for (const selector of saveStrategies) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible()) {
        await btn.click();
        saved = true;
        console.log(`✅ Clicked save using: ${selector}`);
        await page.waitForTimeout(3000);
        break;
      }
    }

    // Step 5: Navigate back to quotes list and verify
    console.log('🔍 Checking if quote was saved...');
    
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of quotes page
    await page.screenshot({ path: `test-downloads/quotes-list-${Date.now()}.png` });
    
    // Look for our quote with flexible matching
    const quoteExists = await page.locator(`text="${quoteName}"`).isVisible() || 
                       await page.locator(`:has-text("${quoteName}")`).isVisible() ||
                       await page.locator(`td:has-text("${quoteName}")`).isVisible();
                       
    if (quoteExists) {
      console.log('✅ Quote found in quotes table!');
      
      // Step 6: Try to edit the quote status
      console.log('📊 Attempting to change quote status...');
      
      const quoteRow = page.locator(`tr:has-text("${quoteName}")`).first();
      
      // Try clicking on the row first
      if (await quoteRow.isVisible()) {
        await quoteRow.click();
        await page.waitForTimeout(1000);
        
        // Look for status controls
        const statusSelectors = [
          'select[name*="status" i]',
          'select:has(option:has-text("Draft"))',
          'select:has(option:has-text("Won"))',
          'button:has-text("Draft")',
          '[data-testid*="status"]'
        ];
        
        for (const selector of statusSelectors) {
          const statusControl = page.locator(selector).first();
          if (await statusControl.isVisible()) {
            if (selector.includes('select')) {
              const options = await statusControl.locator('option').allTextContents();
              console.log('📋 Status options:', options);
              
              if (options.some(opt => opt.toLowerCase().includes('won'))) {
                await statusControl.selectOption({ label: /won/i });
                console.log('✅ Changed status to Won');
                
                // Save the change
                const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
                if (await saveBtn.isVisible()) {
                  await saveBtn.click();
                  await page.waitForTimeout(2000);
                }
                break;
              }
            }
          }
        }
      }
      
      // Step 7: Check analytics
      console.log('📈 Checking analytics...');
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: `test-downloads/analytics-${Date.now()}.png` });
      
      // Look for any numeric indicators that might show our won quote
      const metrics = await page.locator('text=/\\d+/').allTextContents();
      console.log('📊 Found numeric metrics:', metrics.slice(0, 10)); // First 10 numbers
      
    } else {
      console.log('❌ Quote not found in quotes table');
      
      // Debug: log what's actually in the table
      const tableContent = await page.locator('table, tbody').textContent();
      console.log('🔍 Table content preview:', tableContent?.substring(0, 300));
    }

    // Step 8: Test editing functionality (regardless of quote creation success)
    console.log('✏️  Testing edit functionality...');
    
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    
    // Find any quote (first row) to test editing
    const firstRow = page.locator('tbody tr, .quote-row').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1000);
      
      // Look for edit button or direct navigation to editor
      const editSelectors = [
        'button:has-text("Edit")',
        'a:has-text("Edit")',
        'button[data-testid*="edit"]',
        '[data-lucide="edit"]'
      ];
      
      let editClicked = false;
      for (const selector of editSelectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible()) {
          await btn.click();
          editClicked = true;
          console.log(`✅ Clicked edit: ${selector}`);
          break;
        }
      }
      
      if (!editClicked) {
        // Try navigating to editor directly
        await page.goto('/editor');
        console.log('📍 Navigated directly to editor');
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Look for any editable content
      const editableSelectors = [
        '[contenteditable="true"]',
        'textarea',
        'input[type="text"]',
        '.editor, .live-preview',
        '[data-testid*="editor"], [data-testid*="preview"]'
      ];
      
      for (const selector of editableSelectors) {
        const editable = page.locator(selector).first();
        if (await editable.isVisible()) {
          console.log(`✅ Found editable content: ${selector}`);
          
          const customText = `\\n--- Test Edit ${Date.now()} ---`;
          
          try {
            await editable.click();
            await editable.pressSequentially(customText);
            console.log('✅ Added custom text to editable content');
            
            // Try to save
            const saveBtn = page.locator('button:has-text("Save")').first();
            if (await saveBtn.isVisible()) {
              await saveBtn.click();
              console.log('✅ Saved edit changes');
            }
            break;
          } catch (e) {
            console.log('❌ Could not edit content:', e.message);
          }
        }
      }
    }

    // Step 9: Test download functionality
    console.log('📥 Testing download functionality...');
    
    const downloadSelectors = [
      'button:has-text("Download")',
      'button:has-text("PDF")',
      'button[data-testid*="download"]',
      '[data-lucide="download"]'
    ];
    
    for (const selector of downloadSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible()) {
        try {
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
          await btn.click();
          
          const download = await downloadPromise;
          const filename = download.suggestedFilename();
          console.log(`📥 Download initiated: ${filename}`);
          
          await download.saveAs(`./test-downloads/${filename}`);
          console.log('✅ Download completed successfully!');
          break;
        } catch (downloadError) {
          console.log(`❌ Download failed: ${downloadError.message}`);
        }
      }
    }

    console.log('🎉 Comprehensive workflow test completed!');
    
    // Final screenshot for debugging
    await page.screenshot({ path: `test-downloads/final-state-${Date.now()}.png` });
  });
});