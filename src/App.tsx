import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "@/router";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { initializeAuth } from "@/lib/auth-config";
import { useEffect } from "react";

const queryClient = new QueryClient();

/**
 * Main App component with enhanced routing structure
 *
 * Features:
 * - React Query for server state management
 * - Enhanced routing with lazy loading and protected routes
 * - Global UI providers (Toaster, Tooltip, etc.)
 * - Supabase Auth with automatic session management
 * - Comprehensive error boundaries
 */
const App = () => {
  useEffect(() => {
    // Initialize auth configuration on app start
    initializeAuth();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;