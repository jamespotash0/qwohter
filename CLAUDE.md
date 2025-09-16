# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Wall Quote Wizard codebase.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:development` - Build in development mode
- `npm run build:staging` - Build in staging mode
- `npm run build:production` - Build in production mode
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run preview` - Preview production build locally
- `npm run test` - Run unit tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report

## System Overview

Wall Quote Wizard is a sophisticated React-based quote generation system for wall/partition installations, featuring real-time editing, live preview, intelligent content generation, multi-tenant organization management, enhanced pricing with cost breakdowns, and integrated company branding with logo upload capabilities.

## Tech Stack & Dependencies

**Frontend Stack:**
- React 18 + TypeScript (strict mode)
- Vite for build tooling and HMR
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Router for navigation
- Lucide React for iconography
- React Hook Form for form management
- Zod for validation

**Backend & Services:**
- Supabase (auth, database, real-time, file storage)
- TanStack Query for server state management
- PDF generation via Playwright
- Row-level security for multi-tenancy

**Development Tools:**
- ESLint + TypeScript for code quality
- Vitest for unit testing
- Playwright for E2E testing and PDF generation
- PostCSS for CSS processing
- Node.js 18+ runtime

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Wall Quote Wizard                            │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                 │
│  ├── Multi-Tenant Organization Management                      │
│  ├── Enhanced Pricing & Cost Management                        │
│  ├── Company Branding & Logo Upload                            │
│  ├── Quote Management System                                   │
│  ├── Wall Specification Engine                                 │
│  ├── Live Preview with Real-time Updates                       │
│  ├── Template Generation System                                │
│  └── PDF Export via Playwright                                 │
├─────────────────────────────────────────────────────────────────┤
│  State Management (Zustand + Hooks)                            │
│  ├── QuotesStore (CRUD operations)                            │
│  ├── AuthStore (user sessions)                                │
│  ├── Organization Management (useOrganizations)               │
│  ├── Company Settings (useCompanySettings)                    │
│  └── Component State (UI-specific)                            │
├─────────────────────────────────────────────────────────────────┤
│  Backend Services (Supabase)                                   │
│  ├── PostgreSQL Database with JSONB                           │
│  ├── Row-Level Security (Multi-tenant)                        │
│  ├── Real-time Subscriptions                                   │
│  ├── File Storage (Logo uploads)                              │
│  └── Organization Multi-tenancy                                │
└─────────────────────────────────────────────────────────────────┘
```

## Core System Components

### 1. Organization & Multi-Tenancy System
**Location**: `/src/hooks/useOrganizations.ts`, `/src/components/features/settings/`
**Purpose**: Complete multi-tenant organization management

**Key Features:**
- Organization creation and management
- Team member invitations and role management
- Cascading organization deletion (deletes all quotes)
- Organization-based data isolation
- Admin/Member role system

**Key Components:**
- `useOrganizations.ts` - Organization management hook
- `OrganizationSetupForm.tsx` - Organization onboarding
- `CompanySettingsSection.tsx` - Organization settings management

### 2. Enhanced Pricing System
**Location**: `/src/components/features/quotes/forms/pricing/`, `/src/lib/types/pricing/`
**Purpose**: Comprehensive cost breakdown and pricing management

**Key Features:**
- Detailed cost breakdowns (materials, labor, equipment, freight)
- **Dollar-based unseen costs** (changed from percentage to $500 default)
- Markup percentage calculations
- Payment terms configuration
- Auto-calculated totals and profit margins
- Enhanced validation requiring meaningful values (> $0)

**Key Components:**
- `EnhancedPricingForm.tsx` - Main pricing interface (215KB compiled)
- `enhancedPricing.ts` - Data types and calculation logic
- `useWizardValidation.ts` / `useEditingValidation.ts` - Updated validation logic

**Recent Changes:**
- Unseen costs now use dollar amount input with percentage display
- Validation requires meaningful values instead of allowing zeros
- Fax field made conditional based on organization settings

### 3. Company Branding & Logo Upload System
**Location**: `/src/services/LogoUploadService.ts`, `/src/components/common/uploads/`
**Purpose**: Complete company branding with logo management

**Key Features:**
- Drag-and-drop logo upload with validation
- Image processing and optimization (440x120px template-optimized)
- Supabase storage integration with public URLs
- Template integration for quote headers
- File type validation (JPG, JPEG, SVG)
- Size validation and automatic resizing

**Key Components:**
- `LogoUploadService.ts` - Complete upload service with image processing
- `LogoUpload.tsx` - Drag-and-drop upload component
- `CompanyInfoDialog.tsx` - Company information management with logo upload
- Template integration in `section-generators.ts`

**Data Flow:**
```
File Upload → Validation → Processing → Supabase Storage → Public URL → Template Display
```

### 4. Quote Management System
**Location**: `/src/components/features/quotes/`
**Architecture**: Domain-driven component organization

```
quotes/
├── creation/           # Quote creation wizard and workflows
├── editing/            # Unified quote editor with live preview
├── forms/              # Reusable form components by category
│   ├── pricing/        # Enhanced pricing forms
│   ├── contact/        # Contact information forms
│   └── walls/          # Wall specification forms
├── specs/              # Wall specification creation forms
├── table/              # Quote listing and management
└── viewing/            # Quote viewing interfaces
```

**Key Components:**
- `UnifiedQuoteEditor.tsx` (262KB compiled) - Main editing interface
- `QuoteCreatorWizard.tsx` (40KB compiled) - Multi-step quote creation
- `LivePreviewPanel.tsx` - Real-time quote preview with pagination

### 5. Wall Specification Engine
**Location**: `/src/components/features/quotes/editing/WallSystemEditor/`
**Purpose**: Comprehensive wall configuration and management

**Supported Wall Types:**
- **Operable Walls** - Moveable partition systems
- **Glass Walls** - Transparent partition systems  
- **Accordion Partitions** - Folding partition systems
- **Custom Configurations** - Extensible system

**Key Components:**
- `WallSystemsSectionCore.tsx` - Central wall management
- `AddWallDialog.tsx` - Wall creation interface
- `WallCard.tsx` - Individual wall editing cards
- Wall-specific forms: `OperableWallEditForm.tsx`, `GlassWallEditForm.tsx`

**Data Flow Pattern:**
```
QuoteData → WallDetails → WallSpecification[] → Template → Live Preview
```

### 6. Template Generation System
**Location**: `/src/templates/`
**Pattern**: Strategy pattern with section-based generation

```
templates/
├── BaseTemplate/
│   ├── BaseQuoteTemplate.ts    # Abstract base class
│   ├── section-generators.ts   # Modular content generation with logo support
│   ├── types.ts               # Template type definitions
│   └── page-break-logic.ts     # Content-aware pagination
├── OperableWallTemplate.tsx    # Primary template implementation
├── SmartQuoteTemplate.ts       # Section-based approach
└── TemplateFactory.ts          # Template routing
```

**Key Features:**
- Section-based content generation
- **Logo integration in template headers** (440x120px optimized)
- Organization info integration
- CSS-based pagination (reliable across browsers)
- Smart content splitting with `ContentSplitter.ts`
- Interactive section editing system

### 7. Live Preview System
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
  job_details: JobDetails;               // Project information
  wall_details: {                       // Wall specifications
    id: string;
    walls: Record<string, WallSpecification>;
  };
  delivery_details: DeliveryDetails;    // Timeline information
  price_details: EnhancedPricingData;   // Enhanced cost calculations
  organization_info?: OrganizationInfo; // Company branding data
  section_overrides?: SectionOverrides; // Custom section content
}
```

**Enhanced Pricing Data Model:**
```typescript
interface EnhancedPricingData {
  // Cost Fields (all required > 0)
  kwik_wall_materials_cost: number;
  misc_materials_cost: number;
  delivery_cost_track: number;
  delivery_cost_panel: number;
  track_equipment_costs: number;
  track_labor_cost: number;
  panel_equipment_costs: number;
  panel_labor_cost: number;
  track_freight_factory: number;
  panel_freight_factory: number;
  local_handling_costs: number;
  
  // Dollar-based unseen costs (changed from percentage)
  unseen_costs: number;                 // Default $500
  unseen_costs_percentage: number;      // Auto-calculated
  unseen_costs_locked: boolean;
  
  // Markup percentages (required > 0)
  materials_markup_percentage: number;
  shipping_markup_percentage: number;
  
  // Auto-calculated fields
  cost_subtotal: number;
  base_selling_price: number;
  final_selling_price: number;
  // ... profit calculations
}
```

**Organization Info Model:**
```typescript
interface OrganizationInfo {
  address?: string;
  phone?: string;
  fax?: string;                        // Conditional validation
  website?: string;
  // Logo data
  logo_url?: string;                   // Storage path
  logo_file_name?: string;
  logo_public_url?: string;            // Template display URL
  logo_updated_at?: string;
}
```

### Database Schema (Supabase)

**Tables:**
- `organizations` - Multi-tenant organization management with JSONB organization_info
- `profiles` - User profiles linked to organizations with roles
- `quotes` - Quote data stored as JSONB with metadata and organization_id (CASCADE DELETE)

**Storage:**
- `organization-logos` - Public bucket for logo files

**Key Features:**
- Row-level security for multi-tenancy
- JSONB storage for flexible data structures
- CASCADE DELETE for organization → quotes
- Public file storage for logos
- Custom functions for organization-based access control

## Current vs Legacy Patterns

### ✅ **Active/Current Patterns (Use These)**

1. **Enhanced Pricing Approach**
   - Dollar-based unseen costs with percentage display
   - Comprehensive cost breakdown validation
   - Meaningful value requirements (> $0, not just ≥ $0)
   - Auto-calculated profit margins and totals

2. **Organization-Centric Architecture**
   - Multi-tenant organization management
   - Cascading deletion patterns
   - Role-based access control
   - Organization info integration in templates

3. **Modern Logo & Branding System**
   - Drag-and-drop upload with validation
   - Template-optimized image processing (440x120px)
   - Supabase storage integration
   - Public URL generation for template display

4. **Unified Editor Approach**
   - Single source of truth: `UnifiedQuoteEditor.tsx`
   - Real-time preview updates
   - Section override system for customization
   - Type-safe data handling throughout

5. **Component-based Wall Management**
   - Per-wall configuration objects
   - Flexible wall specification system
   - Database-synced state management
   - Auto-generated wall naming (Wall A, Wall B, etc.)

### ⚠️ **Legacy/Deprecated Patterns (Avoid or Migrate)**

1. **Basic Pricing Form** (Deprecated)
   - **Location**: `PricingForm.tsx` (marked deprecated)
   - **Issue**: Simple base price + freight model
   - **Current**: Use `EnhancedPricingForm.tsx` for all pricing

2. **Percentage-based Unseen Costs** (Recently Changed)
   - **Old**: Percentage input with dollar display
   - **Current**: Dollar input with percentage display
   - **Migration**: Updated in `enhancedPricing.ts` calculation logic

3. **Global Pocket Door Configuration** (Deprecated)
   - **Location**: `PocketDoorsData` interface in `types/quote.ts`
   - **Issue**: Should use per-wall `WallSpecification.pocketDoors`
   - **Migration**: All new code should use per-wall configuration

## Recent Major Features & Updates

### 🆕 **Enhanced Pricing System (v2.0)**
- **Dollar-based unseen costs** instead of percentage-based
- Comprehensive cost validation requiring meaningful values
- Auto-calculated profit margins and breakdowns
- Payment terms integration

### 🆕 **Logo Upload & Company Branding**
- Complete logo upload system with drag-and-drop interface
- Image processing and template optimization (440x120px)
- Supabase storage integration with public URLs
- Template header integration with company logos

### 🆕 **Multi-Tenant Organization Management**
- Organization creation and team management
- Role-based access control (admin/member)
- Cascading deletion for organization cleanup
- Organization-based data isolation

### 🆕 **Conditional Validation System**
- Fax field made conditional based on organization settings
- Context-aware validation in both creator and editor
- Organization info integration in validation hooks

## Code Quality & Refactoring Guidelines

### 🚨 **Large Files Requiring Attention**

#### **Current Large Components**

1. **EnhancedPricingForm.tsx** (215KB compiled)
   - **Status**: Recently updated and working well
   - **Features**: Comprehensive pricing with all cost categories
   - **Performance**: Optimized with memoization and debounced updates

2. **UnifiedQuoteEditor.tsx** (262KB compiled)
   - **Status**: Core editing interface - consider breaking down
   - **Strategy**: Extract hooks and utility functions
   - **Priority**: Medium (working well but could be modularized)

3. **QuoteEdit.tsx** (262KB compiled)
   - **Strategy**: Extract custom hooks and utility functions
   - **Recommended Breakdown**:
     ```
     QuoteEdit/
     ├── hooks/
     │   ├── useQuoteSync.ts           # data synchronization
     │   ├── usePreviewGeneration.ts   # HTML generation
     │   └── useSectionOverrides.ts    # section management
     └── utils/quoteSyncEngine.ts      # business logic
     ```

### **Clean Code Principles for This Codebase**

1. **Component Size Limits**
   - **Max 300 lines** per component file (exceptions for complex forms)
   - **Max 50 props** per component
   - **Max 10 useEffect hooks** per component

2. **Separation of Concerns**
   - Business logic in custom hooks (`hooks/`)
   - UI logic in components only
   - Data transformation in utilities (`utils/`)
   - Type definitions in separate files (`types/`)

3. **State Management Patterns**
   - Use Zustand stores for application state
   - Custom hooks for feature-specific state
   - Component state only for UI-specific data
   - Avoid prop drilling beyond 3 levels

## Form Handling Patterns

### **Current Best Practices**

1. **Enhanced Pricing Validation**
   ```typescript
   // ✅ Current: Meaningful value validation
   const isPricingValid = useMemo(() => {
     return !!(
       // Required cost fields must have meaningful values (> 0)
       isNumericFieldValid(pricing.kwik_wall_materials_cost) && 
       pricing.kwik_wall_materials_cost! > 0 &&
       
       // Markup percentages must be meaningful (> 0, <= 100)
       isNumericFieldValid(pricing.materials_markup_percentage) &&
       pricing.materials_markup_percentage! > 0 &&
       pricing.materials_markup_percentage! <= 100 &&
       
       // Unseen costs (dollar-based, not percentage)
       isNumericFieldValid(pricing.unseen_costs) && 
       pricing.unseen_costs! > 0
     );
   }, [pricing]);
   ```

2. **Conditional Validation (Fax Field)**
   ```typescript
   // ✅ Context-aware validation based on organization
   const isContactInfoValid = useMemo(() => {
     const isFaxRequired = organizationInfo?.fax && organizationInfo.fax.trim() !== '';
     const basicRequirements = !!(contactInfo.contactName && 
                                 contactInfo.contactEmail && 
                                 contactInfo.address && 
                                 contactInfo.phone && 
                                 contactInfo.website);
     
     return isFaxRequired ? basicRequirements && !!contactInfo.fax : basicRequirements;
   }, [contactInfo, organizationInfo]);
   ```

3. **Logo Upload Integration**
   ```typescript
   // ✅ Logo data persistence in form state
   const handleLogoUpload = async (result: LogoUploadResult) => {
     if (result.success) {
       const updatedFormData = {
         ...formData,
         logo_url: result.url || '',
         logo_file_name: result.fileName || '',
         logo_public_url: result.publicUrl || '',
       };
       setFormData(updatedFormData);
     }
   };
   ```

## Testing Strategy

### **Current Test Coverage**
- **Unit Tests**: Vitest setup with basic coverage
- **Integration Tests**: Limited implementation
- **E2E Tests**: Playwright available for PDF generation

### **Testing Recommendations**

1. **Priority Testing Areas**
   ```typescript
   // High Priority
   - Enhanced pricing calculations and validation
   - Logo upload and processing workflow
   - Organization management and multi-tenancy
   - Quote creation wizard validation
   - Template generation with logos
   
   // Medium Priority  
   - Component state management
   - Form validation logic
   - Database operations
   
   // Low Priority
   - UI component rendering
   - Style consistency
   ```

## Performance Considerations

### **Current Performance Profile**
- **Strengths**: React 18, Vite HMR, optimized pricing calculations
- **Concerns**: Large form components, image processing

### **Optimization Opportunities**

1. **Image Processing Optimization**
   ```typescript
   // ✅ Logo processing with template dimensions
   const scale = Math.min(
     TEMPLATE_DIMENSIONS.width / width,
     TEMPLATE_DIMENSIONS.height / height,
     1 // Don't upscale
   );
   ```

2. **Form State Optimization**
   ```typescript
   // ✅ Debounced updates for pricing calculations
   useEffect(() => {
     const timeoutId = setTimeout(() => {
       onUpdate(calculatedData);
     }, 150);
     return () => clearTimeout(timeoutId);
   }, [localData]);
   ```

## Security Considerations

### **Current Security Implementation**
- Row-level security in Supabase with organization isolation
- Secure file upload with validation and processing
- Input sanitization in forms and file uploads
- Organization-based access control

### **Security Best Practices**
- File upload validation for type, size, and content
- Public storage bucket with secure file naming
- Organization data isolation via RLS
- No sensitive data in quote JSON or logs

## Development Workflow Best Practices

### **Logo & Branding Changes**
- Test with different image formats (JPG, SVG)
- Verify template display across different quote types
- Check mobile responsiveness
- Validate storage quotas and file cleanup

### **Pricing System Changes**
- Test edge cases (zero values, large numbers)
- Verify calculation accuracy across all cost categories
- Test validation in both creator and editor workflows
- Check PDF generation with pricing data

### **Organization Management Changes**
- Test multi-tenant data isolation
- Verify cascading deletion safety
- Test role-based access controls
- Validate member invitation workflows

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # Code quality check
npm run lint:fix               # Auto-fix linting issues

# Testing
npm run test                   # Unit tests
npm run test:ui                # Test UI
npm run test:coverage          # Coverage report

# Build variants
npm run build:development      # Development build
npm run build:staging          # Staging build
npm run build:production       # Production build
```

## File Upload & Storage Integration

```typescript
// Logo upload with Supabase storage
const { data, error } = await supabase.storage
  .from('organization-logos')
  .upload(filePath, processedFile, {
    cacheControl: '3600',
    upsert: false
  });

// Get public URL for template display
const { data: urlData } = supabase.storage
  .from('organization-logos')
  .getPublicUrl(filePath);
```

## Database Migration Examples

```sql
-- Organization cascade deletion
ALTER TABLE quotes 
ADD CONSTRAINT fk_quotes_organization_id 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- Logo storage index
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id 
ON quotes(organization_id);
```

---

## Working Directory

The main application code is located in `/wall-quote-wizard/` subdirectory. Always work from this directory for npm commands and file operations.

---

*Last Updated: 2025-01-16*
*Version: 3.0 - Enhanced Pricing, Logo Upload & Multi-Tenant Architecture*