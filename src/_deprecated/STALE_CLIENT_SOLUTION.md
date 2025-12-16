# Stale Client Problem & Solution

## The Problem

When users keep your app open for days without refreshing:

1. **Old JavaScript Running**: Their browser executes old bundled code even after new deployments
2. **Breaking Changes**: New deployments might include:
   - Database schema changes (new/removed columns)
   - Updated RLS policies
   - Modified API response structures
   - TypeScript type changes
3. **Error Result**: Old JavaScript fails when processing new data format
   - "No Organization Available" errors
   - "Column does not exist" database errors
   - "Permission denied" from updated RLS policies
   - Null reference errors from schema changes

## Real-World Scenario

```bash
Day 1, 9:00 AM:
- User opens app (loads v1.0.14)
- Keeps tab open for 3 days

Day 3, 2:00 PM:
- You deploy v1.0.17 with new organization.logo_data column
- User's browser still running v1.0.14 JavaScript

Day 3, 3:00 PM:
- User tries to load organization data
- v1.0.14 code doesn't know about logo_data column
- Old code expects different data structure
- ERROR: "No Organization Available"
```

## The Solution (Now Implemented)

### 1. **Version Tracking** ([main.tsx:10-14](src/main.tsx#L10-L14))
```typescript
// Initialize version tracking on app load
initializeVersionCheck()
```
- Stores current deployed version when app loads
- Provides baseline for future version checks

### 2. **Automatic Version Checking** ([App.tsx:31-36](src/App.tsx#L31-L36))
```typescript
useVersionCheck({
  checkInterval: 5 * 60 * 1000, // Check every 5 minutes
  autoReloadDelay: 30, // Auto-reload after 30s
});
```
- Checks for new deployments every 5 minutes
- Shows user-friendly notification when update detected
- Auto-reloads after 30 seconds if user doesn't respond

### 3. **Automatic Error Recovery** ([queryClient.ts:65-69](src/lib/queryClient.ts#L65-L69))
```typescript
onError: (error: unknown) => {
  // Detects errors like "No Organization Available"
  // Checks if new version deployed
  // Prompts user to reload
  handleErrorWithRecovery(error, queryClient);
}
```
- Detects stale client error patterns
- Automatically checks for new version
- Offers user choice to reload
- Logs to Sentry for monitoring

### 4. **Cache Busting** ([queryClient.ts:381](src/lib/queryClient.ts#L381))
```typescript
buster: 'v3.0.0-stale-client-fix'
```
- Clears old cached data when cache format changes
- Prevents stale localStorage data issues

## How It Works

### Normal Flow (No Issues)
```
User keeps app open for 2 days
  ↓
Background check runs every 5 minutes
  ↓
[No new version] → Continue normally
```

### New Deployment Flow
```
User keeps app open for 2 days
  ↓
You deploy new version (v1.0.18)
  ↓
Background check runs (within 5 minutes)
  ↓
Detects version mismatch (local: v1.0.14, server: v1.0.18)
  ↓
Shows toast notification:
  "New version available! Reload to get latest features."
  [Reload Now] button
  Auto-reload in 30s
  ↓
User clicks "Reload Now" OR waits 30s
  ↓
Page reloads → Fresh JavaScript (v1.0.18) ✅
```

### Error Recovery Flow
```
User encounters "No Organization Available" error
  ↓
Global error handler detects stale client pattern
  ↓
Checks for new version
  ↓
[New version exists]
  ↓
Shows dialog:
  "A new version is available that may fix this issue. Reload now?"
  ↓
User confirms
  ↓
Page reloads → Fresh JavaScript → Error fixed ✅
```

## Files Changed

1. **[src/main.tsx](src/main.tsx)** - Initialize version tracking
2. **[src/App.tsx](src/App.tsx)** - Add periodic version checking
3. **[src/hooks/useVersionCheck.ts](src/hooks/useVersionCheck.ts)** - NEW: Version check hook
4. **[src/utils/staleClientRecovery.ts](src/utils/staleClientRecovery.ts)** - NEW: Error recovery logic
5. **[src/lib/queryClient.ts](src/lib/queryClient.ts)** - Add global error handler

## Testing

### Test Scenario 1: Version Check Notification
```bash
1. Deploy app with version v1.0.14
2. Open app in browser
3. Update version.json to v1.0.15 on server
4. Wait 5-30 seconds
5. Should see toast: "New version available!"
6. Click "Reload Now" → Page should refresh
```

### Test Scenario 2: Error Recovery
```bash
1. Simulate stale client error:
   - Throw new Error("No organization available")
2. Error handler should:
   - Check for new version
   - Show reload prompt
   - Log to Sentry
```

### Test Scenario 3: Cache Busting
```bash
1. Open DevTools → Application → Local Storage
2. Find key: REACT_QUERY_OFFLINE_CACHE
3. Check value contains: "buster": "v3.0.0-stale-client-fix"
4. Change buster in code
5. Reload app
6. Old cache should be cleared
```

## Monitoring

### Sentry Events to Watch

1. **Stale Client Detections**
   - Tag: `recovery_type: stale_client`
   - Level: `warning`
   - Indicates users running old code

2. **Recovery Failures**
   - Tag: `recovery_status: failed`
   - Level: `error`
   - Indicates recovery system isn't working

3. **Common Error Patterns**
   - "No organization available"
   - "Column does not exist"
   - "Permission denied"
   - These should decrease after implementation

## Configuration Options

### Adjust Check Frequency
```typescript
// In App.tsx
useVersionCheck({
  checkInterval: 10 * 60 * 1000, // Change to 10 minutes
});
```

### Adjust Auto-Reload Delay
```typescript
// In App.tsx
useVersionCheck({
  autoReloadDelay: 60, // Wait 60 seconds before auto-reload
});
```

### Disable for Specific Environments
```typescript
// In App.tsx
useVersionCheck({
  enabled: import.meta.env.PROD, // Only in production
});
```

## Best Practices Going Forward

### 1. Breaking Changes
When making breaking changes (schema, API, types):
```typescript
// Update cache buster in queryClient.ts
buster: 'v3.1.0-schema-update'
```

### 2. Version Increment Strategy
- **Patch (v1.0.X)**: Bug fixes, minor updates
- **Minor (v1.X.0)**: New features, non-breaking changes
- **Major (vX.0.0)**: Breaking changes, schema updates

### 3. Deployment Communication
For major updates:
1. Update version in `generate-version.js` if needed
2. Update cache buster in `queryClient.ts`
3. Monitor Sentry for stale client errors after deployment
4. Expect user reloads within 5-30 minutes

## Version.json Git Tracking

**Current**: version.json IS tracked in git
**Recommended**: Remove from git tracking

```bash
# To remove from tracking
echo "public/version.json" >> .gitignore
git rm --cached public/version.json
git commit -m "chore: ignore auto-generated version.json"
```

**Why?**
- Prevents confusion about local vs deployed version
- Vercel generates it fresh on every build
- Local development doesn't need version tracking

## Success Metrics

After deployment, you should see:
- ✅ Zero "No Organization Available" errors from stale clients
- ✅ Users automatically reload within 5-30 minutes of deployment
- ✅ Sentry logs showing version check activity
- ✅ No breaking error spikes after deployments

## Troubleshooting

### Version checks not working?
1. Check [versionCheckService.ts](src/services/versionCheckService.ts)
2. Verify version.json is accessible at `/version.json`
3. Check browser console for version check logs

### Users not reloading?
1. Check toast notification is showing
2. Verify auto-reload timer is working
3. Check if users are blocking notifications

### Still seeing stale client errors?
1. Check Sentry for error patterns
2. Verify error recovery is triggering
3. May need to add new error patterns to [staleClientRecovery.ts](src/utils/staleClientRecovery.ts)

---

**Created**: 2025-11-18
**Author**: Claude Code
**Version**: 1.0.0
