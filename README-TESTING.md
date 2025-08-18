# Testing Setup Instructions

## Authentication Setup for E2E Tests

The Playwright tests now include authentication setup to access protected routes like `/quotes` and `/dashboard`.

### Step 1: Configure Test Credentials

1. Copy `.env.test` to `.env.test.local`:
   ```bash
   cp .env.test .env.test.local
   ```

2. Update `.env.test.local` with actual test account credentials:
   ```env
   # Update these with real test account credentials
   TEST_USER_EMAIL=your-test-user@example.com
   TEST_USER_PASSWORD=your-test-password
   BASE_URL=http://localhost:8080
   ```

### Step 2: Create Test User Account

Make sure you have a valid user account in your application that can be used for testing. This account should have access to:
- Dashboard
- Quotes page
- Analytics page
- Quote editor functionality

### Step 3: Running Tests

Now you can run the tests with authentication:

```bash
# Run all tests with visible browser
npm run test:e2e:headed

# Run tests in UI mode
npm run test:e2e:ui

# Run tests in headless mode
npm run test:e2e
```

### What the Setup Does

1. **Authentication Setup**: Runs first to log in and save authentication state
2. **State Reuse**: All other tests use the saved authentication state
3. **No Re-login**: Tests don't need to log in again, making them faster
4. **Cross-browser**: Works with Chrome, Firefox, and Safari

### Troubleshooting

If tests fail due to authentication:

1. Verify your test credentials are correct in `.env.test.local`
2. Check that the test user account exists and can access the application
3. Make sure your dev server is running on the correct port (8080)
4. Review the auth setup logs in the test output

The auth setup will log detailed information to help diagnose any login issues.