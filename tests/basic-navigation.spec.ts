import { test, expect } from '@playwright/test';

test.describe('Wall Quote Wizard - Basic Navigation', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for expected elements on the homepage
    // The test account belongs to "Randsall Inc" organization
    await expect(page).toHaveTitle(/Randsall Inc/i);
    
    // Since we're authenticated, we should see the main app interface
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to quotes page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for navigation elements and click to quotes
    const quotesLink = page.getByRole('link', { name: /quotes/i });
    await expect(quotesLink).toBeVisible();
    await quotesLink.click();
    await expect(page).toHaveURL(/.*quotes.*/i);
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for dashboard navigation
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    await expect(page).toHaveURL(/.*dashboard.*/i);
  });

  test('should navigate to analytics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for analytics navigation
    const analyticsLink = page.getByRole('link', { name: /analytics/i });
    await expect(analyticsLink).toBeVisible();
    await analyticsLink.click();
    await expect(page).toHaveURL(/.*analytics.*/i);
  });
});