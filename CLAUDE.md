# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Wall Quote Wizard codebase.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

## System Overview

Wall Quote Wizard is a sophisticated React-based quote generation system for wall/partition installations, featuring real-time editing, live preview, and intelligent content generation.

## Tech Stack & Dependencies

**Frontend Stack:**
- React 18 + TypeScript (strict mode)
- Vite for build tooling and HMR
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Router for navigation
- Lucide React for iconography

**Backend & Services:**
- Supabase (auth, database, real-time)
- TanStack Query for server state management
- PDF generation via Playwright

**Development Tools:**
- ESLint + TypeScript for code quality
- PostCSS for CSS processing
- Node.js 18+ runtime

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Wall Quote Wizard                            │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                 │
│  ├── Quote Management System                                   │
│  ├── Wall Specification Engine                                 │
│  ├── Live Preview with Real-time Updates                       │
│  ├── Template Generation System                                │
│  └── PDF Export via Playwright                                 │
├─────────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                    │
│  ├── QuotesStore (CRUD operations)                            │
│  ├── AuthStore (user sessions)                                │
│  └── Component State (UI-specific)                            │
├─────────────────────────────────────────────────────────────────┤
│  Backend Services (Supabase)                                   │
│  ├── PostgreSQL Database                                       │
│  ├── Row-Level Security                                        │
│  ├── Real-time Subscriptions                                   │
│  └── Organization Multi-tenancy                                │
└─────────────────────────────────────────────────────────────────┘
```

## Core System Components

### 1. Quote Management System
**Location**: `/src/components/features/quotes/`
**Architecture**: Domain-driven component organization

```
quotes/
├── creation/           # Quote creation wizard and workflows
├── editing/            # Unified quote editor with live preview
├── forms/              # Reusable form components by category
├── specs/              # Wall specification creation forms
├── table/              # Quote listing and management
└── viewing/            # Quote viewing interfaces
```

**Key Components:**
- `UnifiedQuoteEditor.tsx` (633 lines) - Main editing interface
- `QuoteCreatorWizard.tsx` (687 lines) - Multi-step quote creation
- `LivePreviewPanel.tsx` - Real-time quote preview with pagination

### 2. Wall Specification Engine
**Location**: `/src/components/features/quotes/editing/WallSystemEditor/`
**Purpose**: Comprehensive wall configuration and management

**Supported Wall Types:**
- **Operable Walls** - Moveable partition systems
- **Glass Walls** - Transparent partition systems  
- **Accordion Partitions** - Folding partition systems
- **Custom Configurations** - Extensible system

**Key Components:**
- `WallSystemsSectionCore.tsx` - Central wall management
- `AddWallDialog.tsx` (630 lines) - Wall creation interface
- `WallCard.tsx` - Individual wall editing cards
- Wall-specific forms: `OperableWallEditForm.tsx`, `GlassWallEditForm.tsx` (739 lines)

**Data Flow Pattern:**
```
QuoteData → WallDetails → WallSpecification[] → Template → Live Preview
```

### 3. Template Generation System
**Location**: `/src/templates/`
**Pattern**: Strategy pattern with section-based generation

```
templates/
├── BaseTemplate/
│   ├── BaseQuoteTemplate.ts    # Abstract base class
│   ├── section-generators.ts   # Modular content generation (334 lines)
│   └── page-break-logic.ts     # Content-aware pagination
├── OperableWallTemplate.tsx    # Primary template implementation
├── SmartQuoteTemplate.ts       # Section-based approach
└── TemplateFactory.ts          # Template routing
```

**Template Architecture:**
```
BaseQuoteTemplate (abstract)
├── OperableWallTemplate (current default)
├── SmartQuoteTemplate (section-based approach)
└── Future: GlassWallTemplate, AccordionTemplate
```

**Key Features:**
- Section-based content generation
- CSS-based pagination (reliable across browsers)
- Smart content splitting with `ContentSplitter.ts`
- Interactive section editing system

### 4. Live Preview System
**Location**: `/src/components/features/quotes/editing/UnifiedQuoteEditor/LivePreview/`
**Pattern**: Real-time reactive updates with intelligent pagination

**Components:**
- `LivePreviewPanel.tsx` - Main preview container
- `ContentSplitter.ts` - Intelligent page-aware content distribution
- `SectionInteractions.ts` - Click/hover handling for section editing
- `QuickEditModal.tsx` - In-place section editing

**Features:**
- Real-time preview regeneration on data changes
- Content-aware page breaks based on section height
- Interactive section clicking for quick editing
- Zoom controls and responsive design

## Data Models & Type System

### Core Data Structures

**Quote Data Model:**
```typescript
interface QuoteData {
  quote_details: QuoteDetails;           // Metadata and settings
  billing_details: BillingDetails;      // Client information
  wall_details: {                       // Wall specifications
    id: string;
    walls: Record<string, WallSpecification>;
  };
  delivery_details: DeliveryDetails;    // Timeline information
  pricing_details: PricingDetails;      // Cost calculations
  section_overrides?: SectionOverrides; // Custom section content
}
```

**Wall Specification Model:**
```typescript
interface WallSpecification {
  // Basic Properties
  wallSystemType: string;               // 'Operable Wall' | 'Glass Wall'
  lengthFeet: string;
  heightFeet: string;
  panelCount: string;
  
  // Operable Wall Specific
  panelConfiguration?: string;
  series?: string;
  model?: string;
  panelSkin?: string;
  stcRating?: string;
  
  // Glass Wall Specific  
  glasswallModel?: string;
  glasswallOperation?: string;
  glasswallGlassType?: string;
  
  // Accessories
  pocketDoors?: {
    foldType: string;
    foldStyle: string;
  };
  
  // Infrastructure
  trackSystem?: string;
  structureSupport?: string;
}
```

### Database Schema (Supabase)

**Tables:**
- `organizations` - Multi-tenant organization management
- `profiles` - User profiles linked to organizations  
- `quotes` - Quote data stored as JSONB with metadata

**Key Features:**
- Row-level security for multi-tenancy
- JSONB storage for flexible quote data structures
- Custom functions for organization-based access control

## Current vs Legacy Patterns

### ✅ **Active/Current Patterns (Use These)**

1. **Unified Editor Approach**
   - Single source of truth: `UnifiedQuoteEditor.tsx`
   - Real-time preview updates
   - Section override system for customization
   - Type-safe data handling throughout

2. **Component-based Wall Management**
   - Per-wall configuration objects
   - Flexible wall specification system
   - Database-synced state management
   - Auto-generated wall naming (Wall A, Wall B, etc.)

3. **Smart Template Generation**
   - Section-based approach with dependencies
   - Content-aware formatting and pagination
   - CSS-based page breaks (browser-reliable)
   - Interactive section editing

4. **Modern Form Patterns**
   - Controlled components with validation
   - Cascading field dependencies
   - Real-time preview updates
   - Type-safe form handling

### ⚠️ **Legacy/Deprecated Patterns (Avoid or Migrate)**

1. **Global Pocket Door Configuration** (Deprecated)
   - **Location**: `PocketDoorsData` interface in `types/quote.ts`
   - **Issue**: Should use per-wall `WallSpecification.pocketDoors`
   - **Migration**: All new code should use per-wall configuration

2. **Monolithic Form Components** (Refactor Needed)
   - **Legacy**: `WallSpecificationForm.tsx` (407 lines)
   - **Issue**: Complex monolithic forms with embedded business logic
   - **Current**: Component-based forms in `WallSystemEditor/`

3. **Simple Template Factory** (Enhancement Needed)
   - **Current**: Only routes to `OperableWallTemplate`
   - **Issue**: Should be more dynamic based on wall types
   - **Future**: Template selection based on wall system analysis

## Code Quality & Refactoring Guidelines

### 🚨 **Large Files Requiring Immediate Refactoring**

#### **Priority 1: Critical Refactoring**

1. **GlassWallEditForm.tsx** (739 lines)
   - **Issues**: Massive component with repetitive JSX, hardcoded cascading logic
   - **Strategy**: Split into focused sub-components by feature area
   - **Recommended Breakdown**:
     ```
     GlassWallEditForm/
     ├── GlassWallBasicFields.tsx      # model, operation, configuration
     ├── GlassWallSpecificationFields.tsx # glass type, STC, support  
     ├── GlassWallTrackFields.tsx       # track type, finish, guides
     ├── GlassWallAccessoryFields.tsx   # doors, seals, closures
     └── hooks/useGlassWallCascading.ts # business logic extraction
     ```

2. **QuoteCreatorWizard.tsx** (687 lines)
   - **Issues**: Monolithic wizard with complex state management
   - **Strategy**: Extract step components and business logic
   - **Recommended Breakdown**:
     ```
     QuoteCreatorWizard/
     ├── components/WizardSteps/
     ├── hooks/useWizardFlow.ts
     ├── hooks/useWizardValidation.ts  
     └── types/wizardTypes.ts
     ```

3. **UnifiedQuoteEditor.tsx** (633 lines)
   - **Issues**: Complex state management, mixed concerns
   - **Strategy**: Extract custom hooks and utility functions
   - **Recommended Breakdown**:
     ```
     UnifiedQuoteEditor/
     ├── hooks/
     │   ├── useQuoteSync.ts           # data synchronization
     │   ├── usePreviewGeneration.ts   # HTML generation
     │   └── useSectionOverrides.ts    # section management
     └── utils/quoteSyncEngine.ts      # business logic
     ```

#### **Priority 2: Consolidation Opportunities**

**Wall Form Duplication** - Multiple overlapping components:
- Creation vs Edit forms (should be unified)
- Glass vs Operable logic (should share common patterns)
- Form validation (should be centralized)

**Recommended Consolidation:**
```
src/components/features/quotes/walls/
├── shared/
│   ├── WallBasicFields.tsx      # dimensions, quantity, type
│   ├── WallValidation.tsx       # centralized validation
│   └── WallCascading.tsx        # field dependency logic
├── WallEditor.tsx               # unified edit/create interface
└── types/wallEditorTypes.ts     # consolidated types
```

### **Clean Code Principles for This Codebase**

1. **Component Size Limits**
   - **Max 300 lines** per component file
   - **Max 50 props** per component
   - **Max 10 useEffect hooks** per component

2. **Separation of Concerns**
   - Business logic in custom hooks (`hooks/`)
   - UI logic in components only
   - Data transformation in utilities (`utils/`)
   - Type definitions in separate files (`types/`)

3. **State Management Patterns**
   - Use Zustand stores for application state
   - Component state only for UI-specific data
   - React Query for server state management
   - Avoid prop drilling beyond 3 levels

4. **File Organization Standards**
   ```
   ComponentName/
   ├── index.ts              # Public API
   ├── ComponentName.tsx     # Main component (< 300 lines)
   ├── ComponentName.test.tsx
   ├── hooks/                # Component-specific hooks
   ├── components/           # Sub-components
   ├── types.ts              # Component-specific types
   └── utils.ts              # Component-specific utilities
   ```

## Form Handling Patterns

### **Current Best Practices**

1. **Cascading Field Dependencies**
   ```typescript
   // ✅ Good: Declarative dependency definitions
   const WALL_FIELD_DEPENDENCIES = {
     wallSystemType: ['panelConfiguration', 'series', 'model'],
     panelConfiguration: ['series', 'model'],
     series: ['model', 'panelThickness']
   };
   
   // ✅ Good: Reusable cascading hook
   const useCascadingFields = (dependencies) => {
     return useCallback((field, value, currentData) => {
       const fieldsToReset = dependencies[field] || [];
       return fieldsToReset.reduce((acc, fieldToReset) => ({
         ...acc, [fieldToReset]: ""
       }), { [field]: value });
     }, [dependencies]);
   };
   ```

2. **Form Validation Strategy**
   ```typescript
   // ✅ Good: Centralized validation with clear rules
   const useWallValidation = () => {
     return useMemo(() => ({
       required: ['wallSystemType', 'lengthFeet', 'heightFeet', 'panelCount'],
       conditional: {
         operableWall: ['panelConfiguration', 'series', 'model'],
         glassWall: ['glasswallModel', 'glasswallOperation']
       }
     }), []);
   };
   ```

### **Patterns to Avoid**

```typescript
// ❌ Bad: Hardcoded dependencies in components  
if (field === "wallSystemType") {
  setWallData({
    ...wallData,
    panelConfiguration: "",
    series: "",
    model: "",
    // ... 20+ field resets
  });
}

// ❌ Bad: Mixed concerns in form components
const WallForm = () => {
  // UI state + business logic + API calls all mixed together
  const [formData, setFormData] = useState({});
  const saveToDatabase = async () => { /* API logic */ };
  const validateFields = () => { /* Business logic */ };
  // 500+ lines of mixed concerns
};
```

## Testing Strategy

### **Current Test Coverage**
- **Unit Tests**: Limited coverage, needs expansion
- **Integration Tests**: Not implemented
- **E2E Tests**: Not implemented

### **Testing Recommendations**

1. **Priority Testing Areas**
   ```typescript
   // High Priority
   - Wall specification forms (complex business logic)
   - Template generation system (critical functionality)
   - Quote creation workflow (user journey)
   - PDF generation (external dependency)
   
   // Medium Priority  
   - Component state management
   - Form validation logic
   - Database operations
   
   // Low Priority
   - UI component rendering
   - Style consistency
   ```

2. **Testing Stack Recommendations**
   ```
   Unit Tests: Vitest + React Testing Library
   Integration Tests: Vitest + MSW (API mocking)
   E2E Tests: Playwright (already available for PDF generation)
   ```

## Performance Considerations

### **Current Performance Profile**
- **Strengths**: React 18, efficient component updates, CSS-based pagination
- **Concerns**: Large component re-renders, complex form state management

### **Optimization Opportunities**

1. **Component Memoization**
   ```typescript
   // ✅ Memoize expensive computations
   const wallValidationResults = useMemo(() => 
     validateWallSpecification(wallData), [wallData]
   );
   
   // ✅ Memoize callback functions
   const handleWallChange = useCallback((field, value) => {
     // Only recreate if dependencies change
   }, [dependencies]);
   ```

2. **State Update Optimization**
   ```typescript
   // ✅ Batch state updates
   const updateWallSystem = useCallback((updates) => {
     setWallData(prevData => ({
       ...prevData,
       ...updates
     }));
   }, []);
   ```

## 🔄 Frontend–Backend Sync Requirements

> 📌 **Critical**: Always maintain type safety between frontend and backend

### **Sync Protocol**

1. **Type Definition Updates**
   ```typescript
   // When adding new wall fields:
   // 1. Update WallSpecification interface in src/types/quote.ts
   // 2. Update Supabase schema if needed
   // 3. Update form validation rules
   // 4. Update template generation logic
   ```

2. **Database Schema Changes**
   - Update Supabase migrations
   - Regenerate TypeScript types from schema
   - Test with existing data structures
   - Update seed data if applicable

3. **API Integration Points**
   ```typescript
   // Key integration areas requiring sync:
   - Quote CRUD operations (QuotesStore)
   - Wall specification persistence
   - Organization-based data access
   - PDF generation workflows
   ```

## Development Workflow Best Practices

### **Code Review Guidelines**

1. **Architecture Review Points**
   - Component size and single responsibility
   - State management patterns
   - Type safety and error handling
   - Performance implications

2. **Wall System Changes**
   - Test with multiple wall configurations
   - Verify template generation
   - Check live preview updates
   - Validate PDF output

### **Debugging Strategies**

1. **Common Debug Points**
   ```typescript
   // Wall specification issues
   console.log('Wall data:', data.wall_details?.walls);
   
   // Template generation problems  
   console.log('Template sections:', SmartQuoteHelper.extractSections(html));
   
   // Form state debugging
   console.log('Form validation:', validationResults);
   ```

2. **Live Preview Debugging**
   - Check browser console for template errors
   - Verify section extraction in SmartQuoteHelper
   - Monitor content splitter page calculations
   - Test across different browser zoom levels

## Security Considerations

### **Current Security Implementation**
- Row-level security in Supabase
- Organization-based data isolation
- Secure authentication flow
- Input sanitization in forms

### **Security Best Practices**
- Never store sensitive data in quote JSON
- Validate all user inputs on both client and server
- Use parameterized queries for any raw SQL
- Implement proper error boundaries to prevent data leaks

## Future Architecture Considerations

### **Scalability Planning**
- Component library extraction for reusability
- Micro-frontend architecture for large teams
- Advanced caching strategies for template generation
- Real-time collaboration features

### **Technology Evolution**
- React Server Components for better performance
- Advanced PDF generation with custom layouts
- AI-powered quote suggestions
- Mobile-first responsive design improvements

---

## Working Directory

The main application code is located in `/wall-quote-wizard/` subdirectory. Always work from this directory for npm commands and file operations.

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # Code quality check

# Testing (when implemented)
npm run test                   # Unit tests
npm run test:e2e              # End-to-end tests
npm run test:coverage         # Coverage report

# Database
npm run db:generate-types     # Regenerate Supabase types
npm run db:reset              # Reset local database
```

---

*Last Updated: 2025-08-27*
*Version: 2.0 - Comprehensive Architecture Analysis*