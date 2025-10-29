# CLAUDE.md

Essential guidance for Claude Code when working with QWOHTER.

## Quick Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build (auto-increments version)
npm run lint && npm run build  # Validate before commits

# Testing
npm run test                   # Unit tests
npm run test:coverage          # Coverage report
```

## Version Management

**⚠️ IMPORTANT: Version is automatically managed - DO NOT manually edit `public/version.json`**

### How Versioning Works:
1. **Automatic Increment**: `scripts/generate-version.js` runs before every build
2. **Format**: `v1.0.{buildNumber}` where buildNumber auto-increments
3. **Build Time**: Timestamp is automatically added
4. **Vercel Integration**: When you push to Vercel, it automatically builds and increments the version

### Version File Location:
- `public/version.json` - Generated automatically during build
- Users are notified when a new version is deployed

### When to Manually Increment Major/Minor Versions:
Only edit `scripts/generate-version.js` if you need to change the major/minor version:
```javascript
const version = `v2.0.${buildNumber}`;  // Change v1.0 to v2.0 for major updates
```

### Deployment Process:
```bash
git add .
git commit -m "feat: description of changes"
git push origin main
# Vercel automatically:
# 1. Runs prebuild script (increments version)
# 2. Builds the app
# 3. Deploys with new version
# 4. Users see update notification
```

### Coding Practices to Follow

<File_length_and_structure>
- never allow a file to exceed 500 lines. 
- If a file approaches 400 lines, break it up immediately.
- use folders and naming conventions to keep small files logically grouped 
</file_length_and_structure>

<oop_first> 
- Every functionality should be in a dedicated class, function, protocol, even if it’s small
- Favor composition over inheritance, but always use object-oriented thinking 
- Code must be built for reuse, not just to “make it work.” 
</oop_first>
<single_responsibility_principle> 
- Every file, class, and function should do one thing only 
- If it has multiple responsibilities, split it immediately. 
- Each view, manager, or utility should be laser-focused on one concern. 
</single_responsibility_principle>
<modular_design> 
- Code should connect like Lego 
- interchangeable, testable, and isolated 
- Ask “how can I reuse this class in a different screen or project? If not, refactor it. 
- Reduce tight couple between components. Favor dependency injection or protocols. 
</modular_design>
<manager_and_coordinator_patterns> 
- Use viewModel, Manager, and coordinator naming conventions for logic separation: 
- UI logic -> viewModel 
- Business logic -> manager 
- Navigiation/state flow -> Coordinator 
- Never mix views and business logic directly. 
</manager_and_coordinator_patterns> 
<naming_and_readability> 
- All class, method, and variable names must be descriptive and intention-revealing. 
- Avoid vague names like data, info, helper, or temp
- ensure that code is easy to read as well and not bloated, try to use the most optimized solution or code, if you can do something in the lease amount of lines that would be most optimal, however don't be blinded by trying to squeeze everything onto 1 line or skimp out on solutions.
</naming_and_readability> 
<scalability_mindset> 
- Always code as if someone else will scale this 
- Include extensions points (e.g. protocol conformance, dependency injection) from day one 
<scalability_mindset> 
<avoid_god_classes> 
- Never let one file or class hold everything (massive viewController, viewModel or service) 
- Split into UI, state, handlers, Networking, etc… 
</avoid_god_classes>
<security>
- Ensure you always have code security in mind whenever handling functions that handle sensitive information
</security>
<full_stack>
- When a feature is request/worked on, think about all aspects of the coding landscape from the frontend, backend, DB, API's so that we have a full working feature that is connected to database and frontend should that be what is required from the feature
</full_stack>
<deletion_of_data>
- Never delete any database under any circumstances, this is strictly prohibited.
</deletion_of_data>
<branching>
- whenever working on a new feature ensure it always branched off so that it doesn't affect the current code
- ensure you give it a proper name -> for features it should be feature/{name}, for important fixes -> hotfix/{name}...
</branching>
<MCP>
- utilize context7 for better content window referencing
</MCP>


## Architecture Overview

**Tech Stack**: React 18 + TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Zustand

**Key Patterns**:
- Multi-tenant with Row-Level Security (RLS)
- JSONB for flexible data storage
- Component-based architecture with TypeScript strict mode
- Real-time updates via Supabase subscriptions

## Core Systems

### 1. Data Flow
```
User Input → Validation → Store/API → Database (JSONB) → Real-time Updates
```

### 2. Quote Structure
```typescript
interface QuoteData {
  quote_details: QuoteDetails;           // Project metadata
  job_details: JobDetails;               // Job information
  wall_details: WallDetails;             // Wall specifications
  price_details: EnhancedPricingData;    // Cost calculations
  delivery_details: DeliveryDetails;     // Timeline
  organization_info?: OrganizationInfo;  // Company branding
}
```

### 3. Current Active Components
- **UnifiedQuoteEditor.tsx** - Main editing interface
- **EnhancedPricingForm.tsx** - Comprehensive pricing system
- **LogoUpload.tsx** - Company branding system
- **LivePreviewPanel.tsx** - Real-time quote preview

## Coding Best Practices

### TypeScript Standards

#### 1. Type Safety
```typescript
// ✅ DO: Use strict typing
interface PricingData {
  materials_cost: number;
  labor_cost: number;
  markup_percentage: number;
}

// ❌ DON'T: Use any or loose typing
const pricing: any = { ... };
```

#### 2. Error Handling
```typescript
// ✅ DO: Proper error handling with types
try {
  const result = await quotesService.create(data);
  return { success: true, data: result };
} catch (error) {
  console.error('Quote creation failed:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}

// ❌ DON'T: Silent failures or any types
catch (error: any) { /* ignore */ }
```

#### 3. Component Props
```typescript
// ✅ DO: Explicit interface definitions
interface QuoteFormProps {
  initialData?: QuoteData;
  onSave: (data: QuoteData) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

// ❌ DON'T: Inline types or missing optionals
const QuoteForm = (props: {data: any, onSave: Function}) => { ... }
```

### React Patterns

#### 1. Component Structure
```typescript
// ✅ DO: Consistent component structure
export const QuoteEditor: React.FC<QuoteEditorProps> = ({
  quoteId,
  onSave,
  onCancel
}) => {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [loading, setLoading] = useState(false);
  const { quote, updateQuote } = useQuotes();
  
  // 2. Event handlers
  const handleSave = useCallback(async (data: QuoteData) => {
    setLoading(true);
    try {
      await updateQuote(quoteId, data);
      onSave();
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [quoteId, updateQuote, onSave]);
  
  // 3. Early returns
  if (!quote) return <LoadingSpinner />;
  
  // 4. Render
  return (
    <div className="quote-editor">
      {/* component JSX */}
    </div>
  );
};
```

#### 2. Custom Hooks
```typescript
// ✅ DO: Extract business logic to custom hooks
export const useQuoteValidation = (quoteData: QuoteData) => {
  return useMemo(() => {
    const isValid = !!(
      quoteData.quote_details?.contactName &&
      quoteData.price_details?.materials_cost > 0
    );
    
    return { isValid, errors: /* validation errors */ };
  }, [quoteData]);
};

// ❌ DON'T: Business logic in components
const QuoteForm = () => {
  const [isValid, setIsValid] = useState(false);
  // complex validation logic in component
};
```

#### 3. State Management
```typescript
// ✅ DO: Use Zustand for app state, useState for UI state
// App state (shared across components)
interface QuotesStore {
  quotes: Quote[];
  currentQuote: Quote | null;
  setCurrentQuote: (quote: Quote) => void;
}

// UI state (component-specific)
const [isOpen, setIsOpen] = useState(false);
const [selectedTab, setSelectedTab] = useState('details');
```

### Form Handling

#### 1. Validation Patterns
```typescript
// ✅ DO: Centralized validation with meaningful errors
const validatePricing = (pricing: EnhancedPricingData): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!pricing.materials_cost || pricing.materials_cost <= 0) {
    errors.push({
      field: 'materials_cost',
      message: 'Materials cost must be greater than $0'
    });
  }
  
  if (!pricing.markup_percentage || pricing.markup_percentage <= 0 || pricing.markup_percentage > 100) {
    errors.push({
      field: 'markup_percentage',
      message: 'Markup percentage must be between 1% and 100%'
    });
  }
  
  return { isValid: errors.length === 0, errors };
};

// ❌ DON'T: Inline validation or vague error messages
if (cost <= 0) errors.push("Invalid cost");
```

#### 2. Currency Handling
```typescript
// ✅ DO: Consistent currency handling
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Parse currency input
const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[$,]/g, '')) || 0;
};
```

### Database Patterns

#### 1. Supabase Operations
```typescript
// ✅ DO: Proper error handling and typing
export const quotesService = {
  async create(quoteData: QuoteData): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .insert(quoteData)
      .select()
      .single();
      
    if (error) {
      console.error('Failed to create quote:', error);
      throw new Error(`Quote creation failed: ${error.message}`);
    }
    
    return data;
  },
  
  async update(id: string, updates: Partial<QuoteData>): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Update failed: ${error.message}`);
    return data;
  }
};

// ❌ DON'T: Silent failures or untyped responses
const result = await supabase.from('quotes').insert(data);
// No error checking, no typing
```

#### 2. JSONB Handling
```typescript
// ✅ DO: Type-safe JSONB operations
interface OrganizationInfo {
  address?: string;
  phone?: string;
  logo_url?: string;
}

const updateOrganizationInfo = async (
  orgId: string, 
  info: Partial<OrganizationInfo>
) => {
  const { data: current } = await supabase
    .from('organizations')
    .select('organization_info')
    .eq('id', orgId)
    .single();
    
  const updatedInfo = {
    ...current?.organization_info,
    ...info,
    updated_at: new Date().toISOString()
  };
  
  // Update with proper typing
  return supabase
    .from('organizations')
    .update({ organization_info: updatedInfo })
    .eq('id', orgId);
};
```

### Performance Best Practices

#### 1. Component Optimization
```typescript
// ✅ DO: Memoize expensive calculations
const PricingDisplay = ({ pricing }: { pricing: EnhancedPricingData }) => {
  const calculations = useMemo(() => {
    const subtotal = pricing.materials_cost + pricing.labor_cost;
    const markup = subtotal * (pricing.markup_percentage / 100);
    const total = subtotal + markup;
    
    return { subtotal, markup, total };
  }, [pricing.materials_cost, pricing.labor_cost, pricing.markup_percentage]);
  
  return <div>{formatCurrency(calculations.total)}</div>;
};

// ✅ DO: Memoize components that receive object props
const QuoteCard = React.memo(({ quote }: { quote: Quote }) => {
  return <div>{quote.project_name}</div>;
});
```

#### 2. API Optimization
```typescript
// ✅ DO: Debounced updates for real-time features
const useAutoSave = (data: QuoteData, delay = 1000) => {
  const debouncedSave = useMemo(
    () => debounce((data: QuoteData) => {
      quotesService.update(data.id, data);
    }, delay),
    [delay]
  );
  
  useEffect(() => {
    debouncedSave(data);
    return () => debouncedSave.cancel();
  }, [data, debouncedSave]);
};
```

### Error Handling Patterns

#### 1. User-Facing Errors
```typescript
// ✅ DO: Meaningful error messages for users
const createQuote = async (data: QuoteData) => {
  try {
    return await quotesService.create(data);
  } catch (error) {
    const userMessage = error instanceof Error && error.message.includes('permission')
      ? 'You do not have permission to create quotes'
      : 'Failed to create quote. Please try again.';
      
    toast({
      title: 'Error Creating Quote',
      description: userMessage,
      variant: 'destructive'
    });
    throw error;
  }
};
```

#### 2. Validation Error Display
```typescript
// ✅ DO: Structured validation error handling
interface ValidationError {
  field: string;
  message: string;
}

const displayValidationErrors = (errors: ValidationError[]) => {
  errors.forEach(error => {
    const fieldElement = document.querySelector(`[name="${error.field}"]`);
    if (fieldElement) {
      // Show error near the field
      showFieldError(fieldElement, error.message);
    }
  });
};
```

## File Organization

### Preferred Structure
```
src/
├── components/
│   ├── features/           # Feature-specific components
│   │   ├── quotes/
│   │   ├── pricing/
│   │   └── settings/
│   ├── common/            # Reusable components
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom hooks
├── services/              # API services
├── stores/                # Zustand stores
├── lib/                   # Utilities and types
│   ├── types/
│   ├── utils/
│   └── validations/
└── pages/                 # Route components
```


## Security Requirements

### Data Protection
- All user inputs must be validated and sanitized
- Use RLS policies for multi-tenant isolation
- No sensitive data in logs or client-side storage
- Validate file uploads (type, size, content)

### API Security
- Authenticate all requests
- Validate permissions before data access
- Use parameterized queries only
- Implement rate limiting on public endpoints


### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Working Directory
Main application code is in `/wall-quote-wizard/`. Always work from this directory for npm commands.

---

*Keep this file focused and actionable. Move detailed architecture docs to separate planning files.*