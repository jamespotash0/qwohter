import React, { useEffect, useState } from 'react';
import { useAppStore, useUIStore } from '@/stores';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [initError, setInitError] = useState<string | null>(null);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const initializeApp = useAppStore((state) => state.initialize);
  const { loading: globalLoading, message: loadingMessage } = useUIStore((state) => ({
    loading: state.globalLoading,
    message: state.loadingMessage,
  }));

  // Initialize the application on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('Store initialization failed:', error);
        setInitError(
          error instanceof Error 
            ? error.message 
            : 'Failed to initialize application'
        );
      }
    };

    if (!isInitialized) {
      init();
    }
  }, [initializeApp, isInitialized]);

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-foreground">Initialization Error</h1>
          <p className="text-muted-foreground">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Show loading state during initialization
  if (!isInitialized || globalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-foreground">
            {loadingMessage || 'Initializing Qwohter...'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Setting up your workspace
          </p>
        </div>
      </div>
    );
  }

  // Render children once fully initialized
  return <>{children}</>;
};

export default StoreProvider;