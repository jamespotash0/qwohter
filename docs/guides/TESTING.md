# Testing Guide

## Framework

**Vitest 3.2.4** with jsdom environment

## Commands

```bash
npm run test              # Watch mode (development)
npm run test:run          # Single run (CI)
npm run test:coverage     # With coverage report
npm run test:ui           # Visual UI dashboard
```

## Configuration

**Location:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
```

## Test Structure

```
src/test/
├── setup.ts                    # Global mocks and setup
├── config/
│   ├── testEnv.ts              # Test environment variables
│   └── testClient.ts           # Supabase test client
├── fixtures/
│   └── proposals.ts            # Mock data factories
└── utils/
    ├── renderWithProviders.tsx # Custom render helper
    └── *.test.ts               # Utility tests
```

## Setup File

**Location:** `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
```

## Custom Render Helper

**Location:** `src/test/utils/renderWithProviders.tsx`

```typescript
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface CustomRenderOptions extends RenderOptions {
  initialRoute?: string;
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialRoute = '/', queryClient = createTestQueryClient(), ...renderOptions } = options;

  window.history.pushState({}, 'Test page', initialRoute);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};
```

## Mock Data Factories

**Location:** `src/test/fixtures/proposals.ts`

```typescript
import { Proposal } from '@/lib/types/proposal';

export const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: crypto.randomUUID(),
  organization_id: 'org-123',
  proposal_number: 'SR-1001',
  form_id: 'form-123',
  form_data: {},
  status: 'Draft',
  project_name: 'Test Project',
  client_name: 'John Doe',
  client_company: 'Acme Corp',
  total_value: 10000,
  is_main_version: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockVersionChain = (baseNumber: string, count: number) => {
  const proposals: Proposal[] = [];
  let parentId: string | undefined;

  for (let i = 1; i <= count; i++) {
    const proposal = createMockProposal({
      proposal_number: `${baseNumber}.${i}`,
      parent_proposal_id: parentId,
      is_main_version: i === count,
    });
    proposals.push(proposal);
    parentId = proposal.id;
  }

  return proposals;
};
```

## Writing Tests

### Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils/renderWithProviders';
import { ProposalCard } from '@/components/features/proposals/ProposalCard';
import { createMockProposal } from '@/test/fixtures/proposals';

describe('ProposalCard', () => {
  it('renders proposal information', () => {
    const proposal = createMockProposal({
      project_name: 'Office Renovation',
      client_name: 'Jane Smith',
    });

    renderWithProviders(<ProposalCard proposal={proposal} />);

    expect(screen.getByText('Office Renovation')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const proposal = createMockProposal();

    renderWithProviders(<ProposalCard proposal={proposal} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(proposal.id);
  });
});
```

### Hook Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProposals } from '@/hooks/queries/useProposals';

// Mock the service
vi.mock('@/services/proposalsService', () => ({
  proposalsService: {
    getAll: vi.fn().mockResolvedValue([
      { id: '1', project_name: 'Test' },
    ]),
  },
}));

describe('useProposals', () => {
  it('fetches proposals', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProposals('org-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].project_name).toBe('Test');
  });
});
```

### Utility Test

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency } from '@/utils/currency';

describe('currency utilities', () => {
  describe('formatCurrency', () => {
    it('formats number as USD currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('handles zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('handles negative numbers', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
    });
  });

  describe('parseCurrency', () => {
    it('parses currency string to number', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
    });

    it('returns 0 for invalid input', () => {
      expect(parseCurrency('invalid')).toBe(0);
    });
  });
});
```

## Testing Patterns

### Mocking Supabase

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
  },
}));
```

### Testing Async Operations

```typescript
it('handles loading state', async () => {
  renderWithProviders(<ProposalsList orgId="123" />);

  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});
```

### Testing Error States

```typescript
it('displays error message on failure', async () => {
  vi.mocked(proposalsService.getAll).mockRejectedValue(new Error('Network error'));

  renderWithProviders(<ProposalsList orgId="123" />);

  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
```

## Coverage Areas

Current test coverage focuses on:

- Form validation (`validation.test.ts`)
- Number formatting (`numberingConfigService.test.ts`)
- Version grouping (`proposalVersionGrouping.test.ts`)
- Email generation (`emailGeneration.test.ts`)
- Notification service (`scheduledNotificationsService.test.ts`)

## Key Files

- `vitest.config.ts` - Vitest configuration
- `src/test/setup.ts` - Global test setup
- `src/test/utils/renderWithProviders.tsx` - Custom render helper
- `src/test/fixtures/` - Mock data factories
