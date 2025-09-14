# Wall Quote Wizard - Application Architecture Guide

## Overview
Wall Quote Wizard is a comprehensive quote management system for commercial partition dealers. This guide provides a detailed breakdown of the application structure to facilitate easier editing and development.

## 📁 **src/** - Application Source Root

---

### 📁 **components/** - React UI Components
*Organized by domain and feature areas*

#### 📁 **common/** - Shared/Reusable Components
- **charts/**: Analytics visualization components
  - `AnalyticsCharts.tsx` - Dashboard-level charts (monthly trends, status distribution)
  - `AnalyticsPageCharts.tsx` - Full analytics page charts with advanced metrics
  - Purpose: Data visualization for quote metrics, revenue tracking, conversion rates
- **layout/**: Application shell components
  - `AppSidebar.tsx` - Main navigation sidebar with user management
  - Purpose: Navigation, user profile, logout functionality
- **ui/**: Base UI components (shadcn/ui based)
  - Form inputs, buttons, dialogs, cards, tables
  - Purpose: Consistent design system across application

#### 📁 **features/** - Domain-Specific Feature Components

##### 📁 **quotes/** - Core Quote Management Features
*The heart of the application - all quote-related functionality*

**📁 creation/** - Quote Creation Workflow
- **QuoteCreatorWizard/** - Multi-step quote creation process
  - `QuoteCreatorWizard.tsx` (687 lines) - Main wizard orchestrator
  - **components/**: Step components, navigation, content areas
  - **hooks/**: Wizard state management, validation logic
  - **types/**: TypeScript interfaces for wizard data
  - Purpose: Guided quote creation with validation and real-time preview

**📁 editing/** - Quote Modification Interface
- **UnifiedQuoteEditor/** - Main quote editing interface
  - `UnifiedQuoteEditor.tsx` (633 lines) - Central editing orchestrator
  - **LivePreview/**: Real-time quote preview with pagination
  - **QuoteDataPanel/**: Collapsible sections for quote data editing
    - `PricingSection.tsx` - Enhanced pricing with cost breakdowns
    - Contact, job details, delivery, labor sections
  - **WallSystemEditor/**: Wall configuration management
    - `AddWallDialog.tsx` - Add new wall systems
    - `WallCard.tsx` - Individual wall editing interface
    - Wall-specific forms for different types (operable, glass, accordion)
  - Purpose: Unified interface for all quote modifications with live preview

**📁 forms/** - Reusable Form Components
- **pricing/**: Pricing form components
  - `EnhancedPricingForm.tsx` - Advanced cost breakdown with markup calculations
  - `PricingForm.tsx` - (DEPRECATED) Legacy simple pricing
- **specs/**: Wall specification forms
- Purpose: Modular, reusable forms for different quote aspects

**📁 table/** - Quote Listing and Management
- `QuotesTable.tsx` - Main quotes dashboard table
- Purpose: Quote browsing, sorting, status management, bulk operations

**📁 viewing/** - Quote Display/Preview
- Components for viewing finalized quotes
- Purpose: Read-only quote presentation

**📁 specs/** - Wall Specification Creation
- Forms for creating detailed wall configurations
- Purpose: Technical specification input for different wall types

---

### 📁 **hooks/** - Custom React Hooks
*Business logic and state management abstractions*

- `useQuotes.ts` - Core quote CRUD operations, database integration
- `useOrganizations.ts` - Multi-tenant organization management
- `useUserProfile.ts` - User profile and authentication state
- `useFormValidation.ts` - Form validation utilities
- Purpose: Reusable business logic, API integration, state management

---

### 📁 **integrations/** - External Service Integration

#### 📁 **supabase/** - Database and Authentication
- `client.ts` - Supabase client configuration
- `types.ts` - Generated TypeScript types for database schema
- Purpose: PostgreSQL database operations, user authentication, real-time updates

---

### 📁 **lib/** - Shared Libraries and Utilities

#### 📁 **types/** - TypeScript Type Definitions
- `quote.ts` - Core quote data structures
- `enhancedPricing.ts` - Enhanced pricing system types
- Wall specification interfaces
- Purpose: Type safety, data structure definitions

#### 📁 **utils/** - Utility Functions
- Form validation helpers
- Data transformation utilities
- Number formatting, currency handling
- Purpose: Pure functions, data manipulation, formatting

---

### 📁 **pages/** - Route-Level Page Components
*Top-level page components that correspond to routes*

- `Dashboard.tsx` - Main dashboard with quotes overview
- `Analytics.tsx` - Comprehensive analytics and reporting page
- `Auth.tsx` - Authentication/login page
- Purpose: Route handlers, page-level state management, layout orchestration

---

### 📁 **services/** - Business Services
*External API integrations and complex business logic*

- PDF generation services
- External API wrappers
- Purpose: Third-party integrations, complex business operations

---

### 📁 **stores/** - Global State Management
*Zustand-based state stores*

#### 📁 **quotes/** - Quote-Related State
- `quotesStore.ts` - Global quote state management
- Purpose: Application-wide quote state, cross-component communication

---

### 📁 **styles/** - Styling and CSS
- Global styles, Tailwind configuration
- Component-specific stylesheets
- Purpose: Visual presentation, theming, responsive design

---

### 📁 **templates/** - Quote Template Generation
*PDF/Document generation system*

#### 📁 **BaseTemplate/** - Template Foundation
- `BaseQuoteTemplate.ts` - Abstract base template class
- `section-generators.ts` (334 lines) - Modular content generation
- `types.ts` - Template data structures and helpers
- Purpose: Template architecture, content generation, formatting

**Template System Features:**
- Section-based content generation
- CSS-based pagination for reliable printing
- Smart content splitting with page awareness
- Support for multiple wall types (operable, glass, accordion)
- Professional PDF output with company branding

---

## 🔄 **Data Flow Architecture**

### **Quote Creation Flow:**
1. **User Input** → QuoteCreatorWizard
2. **Validation** → Wizard validation hooks
3. **State Management** → useWizardState hook
4. **Database Storage** → useQuotes hook → Supabase
5. **Live Preview** → Template generation → PDF output

### **Quote Editing Flow:**
1. **Data Loading** → useQuotes hook → Supabase
2. **UI Rendering** → UnifiedQuoteEditor → QuoteDataPanel sections
3. **Live Updates** → Real-time preview generation
4. **Auto-save** → Debounced updates to database

### **Enhanced Pricing System:**
1. **Input Fields** → Material costs, labor, equipment, delivery
2. **Calculations** → Markup percentages, gross profit calculations
3. **Auto-computed** → Cost subtotals, selling prices, final totals
4. **Display** → Real-time cost breakdowns in multiple formats

---

## 🎯 **Key Features by Section**

### **Quote Management**
- Multi-step wizard creation process
- Real-time editing with live preview
- Complex wall system configurations
- Enhanced cost breakdown and pricing

### **Wall Systems Support**
- **Operable Walls** - Moveable partitions with track systems
- **Glass Walls** - Transparent partition systems
- **Accordion Partitions** - Folding partition systems
- **Custom Configurations** - Flexible specification system

### **Enhanced Pricing System**
- Detailed cost breakdowns (materials, labor, equipment, delivery)
- Markup percentage and gross profit calculations
- Real-time cost calculations and updates
- Professional pricing displays for client presentations

### **Analytics & Reporting**
- Quote volume and conversion tracking
- Revenue analysis and forecasting
- Status distribution and pipeline management
- Monthly and weekly trend analysis

### **Template Generation**
- Professional PDF quote generation
- Multiple template formats
- Smart page breaking and content layout
- Company branding integration

---

## 📝 **Development Guidelines**

### **🎯 Specific Editing Scenarios - Where to Make Changes:**

---

#### **💰 PRICING SYSTEM CHANGES**

**Enhanced Pricing Fields (costs, markups, calculations):**
- **Types**: `src/lib/types/pricing/enhancedPricing.ts` - Add new pricing fields
- **Form Logic**: `src/components/features/quotes/forms/pricing/EnhancedPricingForm.tsx` - Update input fields and calculations
- **PDF Output**: `src/templates/BaseTemplate/section-generators.ts` → `generatePricingSection()` - Change how pricing appears in quotes
- **Database**: Update `useQuotes.ts` and `QuoteCreatorWizard.tsx` to save new fields
- **Analytics**: Update chart components to use new pricing fields for revenue calculations

**Pricing Display Format:**
- **Quote Editor**: `src/components/features/quotes/editing/UnifiedQuoteEditor/QuoteDataPanel/PricingSection.tsx` - Live pricing preview
- **PDF Templates**: `src/templates/BaseTemplate/section-generators.ts` → `generatePricingSection()` - Final quote pricing layout
- **Dashboard**: `src/components/features/quotes/table/QuotesTable.tsx` - Pricing column display

---

#### **🏗️ WALL SYSTEM CHANGES**

**Adding New Wall Types (beyond Operable/Glass/Accordion):**
- **Types**: `src/lib/types/` - Add new wall specification interfaces
- **Forms**: `src/components/features/quotes/editing/WallSystemEditor/` - Create new wall-specific form
- **Templates**: Create new template class `src/templates/NewWallTypeTemplate.tsx` (extends BaseQuoteTemplate)
- **Template Factory**: `src/templates/TemplateFactory.ts` - Add routing for new wall type

**Wall-Specific Content Changes:**
- **Operable Wall Details**: `src/templates/OperableWallTemplate.tsx` → `generatePanelsSection()`, `generateTrackSection()`, etc.
- **Glass Wall Logic**: Wall-specific forms and template sections
- **Wall Configuration**: `src/components/features/quotes/editing/WallSystemEditor/AddWallDialog.tsx`

**Wall Table/Display Format:**
- **PDF Output**: `src/templates/OperableWallTemplate.tsx` → `generateWallTable()` - Wall specifications table
- **Live Preview**: Wall editor components in UnifiedQuoteEditor

---

#### **📄 QUOTE TEMPLATE CHANGES**

**Common Sections (Header, Terms, Billing):**
- **File**: `src/templates/BaseTemplate/section-generators.ts`
- **Methods**:
  - `generateHeader()` - Company info, contact details
  - `generateBillingAndJobInfo()` - Client details, project info  
  - `generateTermsAndSignature()` - Legal terms, payment terms
  - `generatePricingSection()` - **Enhanced pricing display**

**Wall-Specific Template Content:**
- **File**: `src/templates/OperableWallTemplate.tsx` (or other wall-type templates)
- **Methods**:
  - `generateWallTable()` - Wall specifications layout
  - `generatePanelsSection()` - Panel descriptions
  - `generateTrackSection()` - Track system details
  - `generateSupportSection()` - Support structure info

**Template Selection Logic:**
- **File**: `src/templates/TemplateFactory.ts` - Routes to appropriate template based on wall types

---

#### **📊 ANALYTICS & REPORTING**

**Dashboard Charts:**
- **File**: `src/components/common/charts/AnalyticsCharts.tsx` - Main dashboard charts
- **Metrics**: Monthly trends, status distribution, weekly activity

**Full Analytics Page:**
- **File**: `src/components/common/charts/AnalyticsPageCharts.tsx` - Advanced analytics
- **Metrics**: Revenue vs quoted amounts, conversion tracking, 12-month data

**Analytics Data Processing:**
- **File**: `src/pages/Analytics.tsx` - Page-level metrics calculations
- **Database**: `src/hooks/useQuotes.ts` - Core quote data retrieval and processing

**Quote Table Display:**
- **File**: `src/components/features/quotes/table/QuotesTable.tsx` - Main quotes listing with pricing

---

#### **🔄 QUOTE WORKFLOW CHANGES**

**Quote Creation Process:**
- **Wizard Flow**: `src/components/features/quotes/creation/QuoteCreatorWizard/QuoteCreatorWizard.tsx`
- **Step Components**: `src/components/features/quotes/creation/QuoteCreatorWizard/components/StepContent.tsx`
- **Validation**: Wizard validation hooks for step-by-step validation

**Quote Editing Interface:**
- **Main Editor**: `src/components/features/quotes/editing/UnifiedQuoteEditor/UnifiedQuoteEditor.tsx`
- **Live Preview**: `LivePreview/` subfolder - Real-time quote preview generation
- **Data Panels**: `QuoteDataPanel/` subfolder - Collapsible editing sections

**Database Operations:**
- **CRUD Logic**: `src/hooks/useQuotes.ts` - Create, read, update, delete operations
- **Save Operations**: Both wizard and editor save through this hook

---

#### **🎨 UI/UX CHANGES**

**Visual Design System:**
- **Base Components**: `src/components/common/ui/` - Buttons, inputs, dialogs (shadcn/ui based)
- **Global Styles**: `src/styles/` - Tailwind configuration, global CSS
- **Layout Components**: `src/components/common/layout/AppSidebar.tsx` - Navigation

**Application Layout:**
- **Pages**: `src/pages/` - Top-level page layout and routing
- **Sidebar**: `src/components/common/layout/AppSidebar.tsx` - Main navigation

---

#### **🔧 BUSINESS LOGIC CHANGES**

**Custom Hooks (Reusable Logic):**
- **Quotes**: `src/hooks/useQuotes.ts` - Quote CRUD, database integration
- **Organizations**: `src/hooks/useOrganizations.ts` - Multi-tenant logic
- **Form Validation**: `src/hooks/useFormValidation.ts` - Form validation utilities

**Global State Management:**
- **Quote State**: `src/stores/quotes/quotesStore.ts` - Application-wide quote state
- **Pattern**: Zustand-based state management

---

#### **🗄️ DATABASE & TYPES**

**Adding New Database Fields:**
1. **Update Supabase Schema** (via Supabase dashboard or migrations)
2. **Regenerate Types**: `src/integrations/supabase/types.ts`
3. **Update Interfaces**: `src/lib/types/` - Add TypeScript interfaces
4. **Update Forms**: Add input fields to relevant form components
5. **Update Templates**: Add fields to PDF generation if needed

**Type Definitions:**
- **Core Types**: `src/lib/types/quote.ts` - Main quote data structures
- **Enhanced Pricing**: `src/lib/types/pricing/enhancedPricing.ts` - Pricing system types
- **Wall Types**: `src/lib/types/` - Wall specification interfaces

---

### **🚀 Common Development Workflows:**

#### **Adding New Pricing Field:**
1. `enhancedPricing.ts` - Add field to interface
2. `EnhancedPricingForm.tsx` - Add input field
3. `section-generators.ts` - Add to PDF output
4. `useQuotes.ts` + `QuoteCreatorWizard.tsx` - Save to database
5. Analytics files - Include in revenue calculations

#### **Changing Quote PDF Layout:**
1. **Common sections**: Edit `section-generators.ts` methods
2. **Wall-specific**: Edit `OperableWallTemplate.tsx` methods  
3. **CSS styling**: Update inline styles within generators

#### **Adding New Analytics Metric:**
1. `src/hooks/useQuotes.ts` - Add data processing logic
2. `src/components/common/charts/` - Add chart visualization
3. `src/pages/Analytics.tsx` - Add to analytics page

#### **Creating New Quote Step:**
1. `QuoteCreatorWizard/` - Add step component
2. `wizardSteps.ts` - Register new step
3. `useWizardValidation.ts` - Add validation logic
4. Database save logic in wizard

---

### **⚡ Quick Reference - "I Want To Change..."**

| **What You Want to Change** | **Primary File to Edit** |
|------------------------------|---------------------------|
| Pricing calculations | `EnhancedPricingForm.tsx` |
| PDF pricing layout | `section-generators.ts` → `generatePricingSection()` |
| Wall specifications table | `OperableWallTemplate.tsx` → `generateWallTable()` |
| Company header/contact info | `section-generators.ts` → `generateHeader()` |
| Quote creation steps | `QuoteCreatorWizard.tsx` + step components |
| Analytics charts | `AnalyticsCharts.tsx` or `AnalyticsPageCharts.tsx` |
| Quote table columns | `QuotesTable.tsx` |
| Form validation | Respective form files + validation hooks |
| Database schema | Supabase → regenerate `types.ts` |
| Navigation/sidebar | `AppSidebar.tsx` |

---

## 🚀 **Current Architecture Strengths**

1. **Modular Design** - Clear separation of concerns
2. **Type Safety** - Comprehensive TypeScript coverage
3. **Real-time Updates** - Live preview and auto-save
4. **Scalable Structure** - Domain-driven organization
5. **Enhanced Pricing** - Sophisticated cost calculation system
6. **Professional Output** - High-quality PDF generation
7. **Analytics Integration** - Comprehensive business metrics

---

*Last Updated: 2025-01-08*
*Architecture Version: 3.0 - Enhanced Pricing System Integration*