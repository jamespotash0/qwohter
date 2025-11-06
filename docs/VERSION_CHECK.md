# Automatic Version Checking

## Overview

This app automatically detects new deployments and forces users to reload their browser to get the latest code. This prevents users from running stale JavaScript after you deploy new features or bug fixes.

## How It Works

### 1. Build-Time Version Generation

When you run `npm run build`, the `prebuild` script automatically generates a `version.json` file:

```bash
npm run build
# Runs: node scripts/generate-version.js && vite build
```

The `version.json` contains:
```json
{
  "version": "v1761758352340",
  "buildTime": "2025-10-29T17:19:12.336Z"
}
```

### 2. Runtime Version Polling

The app polls for version changes every 30 seconds:

- **Initial check**: Fetches `version.json` on app load and stores the version
- **Periodic checks**: Every 30 seconds, fetches `version.json` again
- **Comparison**: If the version changed, a new deployment is detected

### 3. Force Reload

When a new version is detected:

1. Shows toast notification: "New version available! Reloading in 3 seconds..."
2. Waits 3 seconds (gives user time to finish typing, etc.)
3. Clears localStorage cache (except auth tokens)
4. Forces hard reload from server (bypasses browser cache)

## User Experience

- ✅ **Automatic**: Users don't need to manually refresh
- ✅ **Graceful**: 3-second warning before reload
- ✅ **Preserves auth**: Login session maintained across reload
- ✅ **Fast detection**: New version detected within 30 seconds

## Development vs Production

### Development
- Version checking is active but versions don't change automatically
- You can manually test by changing `public/version.json`

### Production
- Every build generates a unique version
- Users automatically reload when you deploy

## Testing

### Test locally:

1. Open the app in browser
2. Check console: `⏱️ Starting version polling (30s interval)...`
3. Change `public/version.json` manually (update the `version` field)
4. Wait up to 30 seconds
5. Toast should appear and page should reload

### Test deployment:

1. Deploy current version
2. Make a code change
3. Build and deploy again
4. Users on old version will automatically reload within 30 seconds

## Configuration

To change the polling interval, edit [MainLayout.tsx:211](../src/components/common/layout/MainLayout.tsx#L211):

```typescript
// Poll every 30 seconds (30000ms)
const pollInterval = setInterval(() => {
  checkVersion();
}, 30000); // Change this value
```

To change the reload delay, edit [MainLayout.tsx:204-206](../src/components/common/layout/MainLayout.tsx#L204-L206):

```typescript
// Reload after 3 seconds
setTimeout(() => {
  versionCheckService.forceReload();
}, 3000); // Change this value
```

## Files

- `/scripts/generate-version.js` - Generates version.json during build
- `/public/version.json` - Version file served as static asset
- `/src/services/versionCheckService.ts` - Version checking logic
- `/src/components/common/layout/MainLayout.tsx` - Polling implementation
