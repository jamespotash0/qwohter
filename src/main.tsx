import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSentry } from './lib/sentry'
import { initializeVersionCheck } from './services/versionCheckService'

// Initialize error tracking and performance monitoring
initializeSentry();

// Initialize version tracking to prevent stale client issues
// This stores the current deployed version when the app loads
initializeVersionCheck().catch((error) => {
  console.warn('⚠️ Version check initialization failed:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
