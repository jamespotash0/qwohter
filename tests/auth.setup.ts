import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Get test credentials from environment or use defaults
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'test';
  
  console.log('Setting up authentication for tests...');
  
  try {
    // Navigate to the login page
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Try different common selectors for email/username field
    const emailField = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], [data-testid="email"]').first();
    await emailField.waitFor({ timeout: 10000 });
    await emailField.fill(testEmail);
    
    // Try different common selectors for password field
    const passwordField = await page.locator('input[type="password"], input[name="password"], [data-testid="password"]').first();
    await passwordField.waitFor({ timeout: 10000 });
    await passwordField.fill(testPassword);
    
    // Try different common selectors for submit button
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In"), [data-testid="sign-in"]').first();
    await submitButton.click();
    
    // Wait for successful login - try multiple approaches
    try {
      // Try waiting for dashboard redirect
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    } catch {
      try {
        // Try waiting for quotes page
        await page.waitForURL('**/quotes', { timeout: 5000 });
      } catch {
        // Try waiting for any navigation away from auth page
        await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 10000 });
      }
    }
    
    console.log('Authentication successful, current URL:', page.url());
    
    // Save authenticated state to file
    await page.context().storageState({ path: authFile });
    console.log('Auth state saved to:', authFile);
    
  } catch (error) {
    console.error('Authentication setup failed:', error);
    console.log('Current URL:', page.url());
    console.log('Page content:', await page.content());
    throw error;
  }
});