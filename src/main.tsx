import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSentry } from './lib/sentry'
import { initializeVersionCheck } from './services/versionCheckService'
import { handleErrorWithRecovery } from './utils/staleClientRecovery'

// Initialize error tracking and performance monitoring
initializeSentry();

// Initialize version tracking to prevent stale client issues
// This stores the current deployed version when the app loads
initializeVersionCheck().catch((error) => {
  console.warn('⚠️ Version check initialization failed:', error);
});

// Global error handler for module loading errors (stale client detection)
window.addEventListener('error', (event) => {
  // Check if this is a module loading error
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Failed to load module script') ||
    event.message?.includes('MIME type')
  ) {
    console.error('🔴 Module loading error detected:', event.message);
    // Trigger stale client recovery (will show toast and reload)
    handleErrorWithRecovery(new Error(event.message));
    event.preventDefault(); // Prevent default error handling
  }
});

createRoot(document.getElementById("root")!).render(<App />);
