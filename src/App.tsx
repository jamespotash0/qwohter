import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouter } from "@/router";

const queryClient = new QueryClient();

/**
 * Main App component with enhanced routing structure
 * 
 * Features:
 * - React Query for server state management
 * - Enhanced routing with lazy loading and protected routes
 * - Global UI providers (Toaster, Tooltip, etc.)
 * - Comprehensive error boundaries
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppRouter />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;