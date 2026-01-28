/**
 * Test Render Utilities
 *
 * Custom render function that wraps components with all required providers.
 */

import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRoute?: string;
  useMemoryRouter?: boolean;
}

/**
 * Wrapper component with all providers
 */
function AllProviders({
  children,
  queryClient,
  initialRoute = '/',
  useMemoryRouter = false,
}: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter ? { initialEntries: [initialRoute] } : {};

  return (
    <QueryClientProvider client={client}>
      <Router {...routerProps}>{children}</Router>
    </QueryClientProvider>
  );
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
  useMemoryRouter?: boolean;
}

/**
 * Custom render function that includes all providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderWithProvidersOptions
) {
  const { queryClient, initialRoute, useMemoryRouter, ...renderOptions } = options || {};
  const testQueryClient = queryClient || createTestQueryClient();

  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllProviders
          queryClient={testQueryClient}
          initialRoute={initialRoute}
          useMemoryRouter={useMemoryRouter}
        >
          {children}
        </AllProviders>
      ),
      ...renderOptions,
    }),
    queryClient: testQueryClient,
  };
}

/**
 * Wrapper for testing hooks with providers
 */
export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };
}
