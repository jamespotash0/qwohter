# Form Builder to Dynamic Quotes Implementation Plan

## Executive Summary
This document outlines the complete implementation strategy for building a dynamic form builder system that integrates with a cascading product database, generates flexible quotes/proposals, and displays them in a standardized, interactive table with detailed overlays.

---

## 1. Database Schema Design

### 1.1 Product Hierarchy Tables (NEW)

```sql
-- Product Type (Top Level)
CREATE TABLE product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Manufacturer (Level 2)
CREATE TABLE product_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id UUID REFERENCES product_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_type_id, name)
);

-- Product Category (Level 3)
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES product_manufacturers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manufacturer_id, name)
);

-- Product Series (Level 4)
CREATE TABLE product_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Product Model (Level 5 - Leaf Node with Full Specs)
CREATE TABLE product_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES product_series(id) ON DELETE CASCADE,
  model_number TEXT NOT NULL,
  model_name TEXT NOT NULL,

  -- Full product specifications (flexible JSONB)
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Pricing information
  base_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',

  -- Field validation rules for forms
  field_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example structure:
  -- [
  --   {
  --     "field_name": "dimensions",
  --     "label": "Dimensions",
  --     "type": "text",
  --     "required": true,
  --     "validation": "regex",
  --     "placeholder": "e.g., 10' x 12'"
  --   }
  -- ]

  -- Display and metadata
  description TEXT,
  image_urls TEXT[],
  documentation_url TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(series_id, model_number)
);

-- Indexes for performance
CREATE INDEX idx_product_manufacturers_type ON product_manufacturers(product_type_id);
CREATE INDEX idx_product_categories_manufacturer ON product_categories(manufacturer_id);
CREATE INDEX idx_product_series_category ON product_series(category_id);
CREATE INDEX idx_product_models_series ON product_models(series_id);
CREATE INDEX idx_product_models_active ON product_models(is_active);
```

### 1.2 Enhanced Form Builder Tables (MODIFY EXISTING) (DONE already)

```sql
-- Add organization_id to form_definitions
ALTER TABLE form_definitions
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add form type and metadata
ALTER TABLE form_definitions
  ADD COLUMN form_type TEXT DEFAULT 'Quote' CHECK (form_type IN ('Quote', 'Proposal', 'Invoice', 'Custom')),
  ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Update tabs structure to support product specs
-- tabs JSONB will contain:
-- [
--   {
--     "id": "tab-1",
--     "name": "Client Information",
--     "fields": [
--       {
--         "id": "field-1",
--         "type": "text",
--         "label": "Client Name",
--         "required": true,
--         "placeholder": "Enter client name"
--       }
--     ]
--   },
--   {
--     "id": "tab-2",
--     "name": "Product Specifications",
--     "fields": [
--       {
--         "id": "field-product-specs",
--         "type": "product_selector",  // Special type!
--         "label": "Product Specifications",
--         "config": {
--           "cascading": true,
--           "allowMultiple": true
--         }
--       }
--     ]
--   }
-- ]
```

### 1.3 Normalized Quotes/Proposals Schema (MAJOR REFACTOR)

```sql
-- New flexible quotes table structure
ALTER TABLE quotes
  DROP COLUMN IF EXISTS labor_details CASCADE,
  DROP COLUMN IF EXISTS pricing_details CASCADE,
  DROP COLUMN IF EXISTS delivery_details CASCADE,
  DROP COLUMN IF EXISTS wall_details CASCADE,
  DROP COLUMN IF EXISTS quote_details CASCADE;

-- Add normalized flexible columns
ALTER TABLE quotes
  ADD COLUMN form_definition_id UUID REFERENCES form_definitions(id),
  ADD COLUMN form_response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "client_info": { "name": "...", "company": "..." },
  --   "products": [
  --     {
  --       "product_model_id": "uuid",
  --       "product_hierarchy": {
  --         "type": "...",
  --         "manufacturer": "...",
  --         "category": "...",
  --         "series": "...",
  --         "model": "..."
  --       },
  --       "specifications": { "quantity": 5, "dimensions": "10x12" },
  --       "pricing": { "unit_price": 100, "total": 500 }
  --     }
  --   ],
  --   "custom_fields": {
  --     "field_id": "value"
  --   }
  -- }

  ADD COLUMN product_items JSONB DEFAULT '[]'::jsonb,
  -- Denormalized product items for quick access

  ADD COLUMN computed_totals JSONB DEFAULT '{}'::jsonb;
  -- {
  --   "subtotal": 5000,
  --   "tax": 500,
  --   "total": 5500,
  --   "currency": "USD"
  -- }
```

---

## 2. Component Architecture

### 2.1 Form Builder Components

```
src/components/features/form-builder/
├── FormBuilderEditor.tsx          # Main form builder interface
├── FormBuilderPreview.tsx         # Live preview of form
├── FormFieldEditor.tsx            # Individual field configuration
├── FormTabManager.tsx             # Tab management UI
├── fieldTypes/
│   ├── TextFieldConfig.tsx
│   ├── NumberFieldConfig.tsx
│   ├── ProductSelectorConfig.tsx  # Special product field
│   └── index.ts
└── FormBuilderStore.ts            # Zustand store for builder state
```

### 2.2 Product Selector Components

```
src/components/features/products/
├── CascadingProductSelector.tsx   # Main cascading selector
├── ProductTypeSelector.tsx        # Level 1
├── ManufacturerSelector.tsx       # Level 2
├── CategorySelector.tsx           # Level 3
├── SeriesSelector.tsx             # Level 4
├── ModelSelector.tsx              # Level 5 + specs
├── ProductSpecsForm.tsx           # Dynamic form based on model
└── ProductSelectorStore.ts        # Zustand store for product state
```

### 2.3 Quote/Proposal Components (REFACTOR)

```
src/components/features/quotes/
├── creation/
│   ├── DynamicQuoteForm.tsx       # Renders form from definition
│   ├── QuoteFormRenderer.tsx      # Field renderer
│   └── ProductItemsManager.tsx    # Manage multiple products
├── table/
│   ├── StandardizedQuotesTable.tsx  # NEW: Standardized table
│   ├── QuoteDetailOverlay.tsx       # NEW: Full quote modal
│   ├── QuoteStatsCard.tsx           # Stats display
│   └── QuoteRowActions.tsx          # Action buttons
└── display/
    ├── QuoteProductList.tsx         # Display products
    └── QuoteTotalsSummary.tsx       # Display totals
```

---

## 3. Implementation Phases

### Phase 1: Database Foundation (Week 1)
**Goal**: Set up all database tables and relationships

**Tasks**:
1. Create product hierarchy migration file
   - product_types
   - product_manufacturers
   - product_categories
   - product_series
   - product_models
2. Modify form_definitions table
3. Create quotes schema migration (breaking change!)
4. Add RLS policies for all new tables
5. Create indexes for performance
6. Seed sample product data for testing

**Deliverables**:
- Migration file: `20250111000000_create_product_hierarchy.sql`
- Migration file: `20250111000001_normalize_quotes_schema.sql`
- Seed data script: `seed_products.sql`

---

### Phase 2: Product Management System (Week 2)
**Goal**: Build admin UI for managing products

**Tasks**:
1. Create product management pages
   - `/settings/products` - List all products
   - `/settings/products/new` - Create new product
   - `/settings/products/:id` - Edit product
2. Build cascading product hierarchy UI
3. Create product model editor with field definitions
4. Implement product import/export (CSV)
5. Add product search and filtering

**Components to Build**:
- `ProductManagementPage.tsx`
- `ProductHierarchyTree.tsx`
- `ProductModelEditor.tsx`
- `ProductFieldDefinitionEditor.tsx`

---

### Phase 3: Cascading Product Selector (Week 3)
**Goal**: Build the cascading product selection component

**Tasks**:
1. Create `CascadingProductSelector` component
2. Implement level-by-level filtering logic
3. Build dynamic specs form based on `field_definitions`
4. Add validation for required fields
5. Create product preview/summary card
6. Implement multi-product selection
7. Add product search within selector

**Components to Build**:
- `CascadingProductSelector.tsx`
- `ProductSpecsForm.tsx`
- `ProductPreviewCard.tsx`
- `ProductSelectorStore.ts` (Zustand)

**API Endpoints** (Supabase functions):
- `getProductTypes()`
- `getManufacturersByType(typeId)`
- `getCategoriesByManufacturer(manufacturerId)`
- `getSeriesByCategory(categoryId)`
- `getModelsBySeries(seriesId)`
- `getModelDetails(modelId)`

---

### Phase 4: Enhanced Form Builder (Week 4)
**Goal**: Integrate product selector into form builder

**Tasks**:
1. Extend form builder to support `product_selector` field type
2. Create configuration UI for product selector settings
3. Implement form preview with live product selection
4. Add form validation rules
5. Create form templates (Quote, Proposal, Invoice)
6. Implement form versioning
7. Add form duplication feature

**Components to Build**:
- `FormBuilderEditor.tsx` (enhanced)
- `ProductSelectorFieldConfig.tsx`
- `FormBuilderPreview.tsx`
- `FormTemplateSelector.tsx`

---

### Phase 5: Dynamic Quote Creation (Week 5)
**Goal**: Enable users to create quotes using forms

**Tasks**:
1. Create `DynamicQuoteForm` component
2. Implement form field rendering from definition
3. Integrate cascading product selector
4. Add real-time quote total calculation
5. Implement draft saving (auto-save)
6. Add quote submission workflow
7. Create quote PDF generation with products

**Components to Build**:
- `DynamicQuoteForm.tsx`
- `QuoteFormRenderer.tsx`
- `ProductItemsManager.tsx`
- `QuoteTotalsCalculator.tsx`
- `QuotePDFGenerator.tsx` (enhanced)

**Store**:
- `dynamicQuotesStore.ts`

---

### Phase 6: Standardized Quotes Table (Week 6)
**Goal**: Create a unified table for displaying all quotes

**Tasks**:
1. Design standardized table columns:
   - Project Name
   - Proposal Number
   - Client Name
   - Job Location
   - Total (computed)
   - Status
   - Created By
   - Created Date
   - Actions
2. Implement sorting and filtering
3. Add search across all fields
4. Create row actions (View, Edit, Delete, Archive, Download)
5. Add bulk operations
6. Implement pagination

**Components to Build**:
- `StandardizedQuotesTable.tsx`
- `QuoteTableRow.tsx`
- `QuoteTableFilters.tsx`
- `QuoteTableSearch.tsx`

**Data Access**:
- Fetch quotes with computed totals from `form_response_data`
- Extract client name from `form_response_data.client_info`
- Extract job location from `form_response_data.job_details`

---

### Phase 7: Quote Detail Overlay (Week 7)
**Goal**: Build comprehensive quote detail modal

**Tasks**:
1. Create full-screen overlay/modal component
2. Design tabbed interface:
   - Overview (summary stats)
   - Client Information
   - Products & Specifications
   - Pricing & Totals
   - Activity Timeline
   - Attachments
3. Implement data visualization:
   - Product list with specs
   - Pricing breakdown (table format)
   - Status history timeline
4. Add quick actions (Edit, Download, Change Status)
5. Make it responsive for mobile

**Components to Build**:
- `QuoteDetailOverlay.tsx`
- `QuoteOverviewTab.tsx`
- `QuoteProductsTab.tsx`
- `QuotePricingTab.tsx`
- `QuoteActivityTab.tsx`
- `QuoteAttachmentsTab.tsx`

**UI Design**:
```tsx
<QuoteDetailOverlay quote={selectedQuote}>
  <Tabs>
    <Tab label="Overview">
      <QuoteStatsCards />
      <QuickInfoGrid />
    </Tab>
    <Tab label="Products">
      <ProductItemsTable />
    </Tab>
    <Tab label="Pricing">
      <PricingBreakdownTable />
    </Tab>
    <Tab label="Activity">
      <ActivityTimeline />
    </Tab>
  </Tabs>
</QuoteDetailOverlay>
```

---

## 4. Data Migration Strategy

### 4.1 Migration Script for Existing Quotes

```sql
-- Migrate existing quotes to new schema
-- This script converts old structure to new flexible format

CREATE OR REPLACE FUNCTION migrate_existing_quotes()
RETURNS void AS $$
DECLARE
  quote_record RECORD;
BEGIN
  FOR quote_record IN SELECT * FROM quotes WHERE form_response_data IS NULL
  LOOP
    UPDATE quotes
    SET form_response_data = jsonb_build_object(
      'client_info', jsonb_build_object(
        'name', quote_record.job_details->>'client_name',
        'company', quote_record.job_details->>'client_company',
        'address', quote_record.job_details->>'client_address'
      ),
      'job_details', jsonb_build_object(
        'location', quote_record.job_details->>'job_location',
        'date', quote_record.job_details->>'date'
      ),
      'legacy_data', jsonb_build_object(
        'labor_details', quote_record.labor_details,
        'pricing_details', quote_record.price_details,
        'delivery_details', quote_record.delivery_details,
        'wall_details', quote_record.wall_details
      )
    ),
    computed_totals = jsonb_build_object(
      'total', COALESCE(quote_record.total_value, 0),
      'subtotal', COALESCE(quote_record.subtotal, 0),
      'currency', 'USD'
    )
    WHERE id = quote_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Backward Compatibility

- Keep old columns temporarily with deprecation warnings
- Add computed columns that extract data from new structure
- Create views for old API consumers
- Gradual migration over 2-3 releases

---

## 5. Key Features & Behavior

### 5.1 Cascading Product Selection Flow

```
1. User selects Product Type (e.g., "HVAC Equipment")
   ↓
2. System loads Manufacturers for that type (e.g., "Carrier", "Trane")
   ↓
3. User selects Manufacturer
   ↓
4. System loads Categories (e.g., "Air Conditioners", "Furnaces")
   ↓
5. User selects Category
   ↓
6. System loads Series (e.g., "Infinity Series", "Performance Series")
   ↓
7. User selects Series
   ↓
8. System loads Models with specifications
   ↓
9. User selects Model
   ↓
10. System displays dynamic form based on field_definitions
    ↓
11. User fills in specifications (quantity, dimensions, etc.)
    ↓
12. System calculates pricing and adds to quote
```

### 5.2 Form Builder - Product Selector Configuration

When adding a "Product Specifications" field to a form:

```tsx
{
  id: "product-specs",
  type: "product_selector",
  label: "Product Specifications",
  required: true,
  config: {
    allowMultiple: true,  // Allow multiple products
    showPricing: true,    // Show price calculator
    cascadingMode: true,  // Enable cascading selectors
    defaultType: null,    // Optional: pre-select type
  }
}
```

### 5.3 Quote Display - Standardized Table

**Columns**:
1. **Project Name** - Extracted from `form_response_data.project_name` or `project_name` column
2. **Proposal #** - `proposal_number`
3. **Client** - Extracted from `form_response_data.client_info.name`
4. **Location** - Extracted from `form_response_data.job_details.location`
5. **Total** - Extracted from `computed_totals.total`
6. **Status** - `status` (with badge colors)
7. **Created By** - `creator_name`
8. **Date** - `created_at` (formatted)
9. **Actions** - Dropdown menu

**Row Click Behavior**:
- Opens `QuoteDetailOverlay` modal
- Shows full quote information in tabs
- Allows quick actions (Edit, Download, Status Change)

---

## 6. API & Store Structure

### 6.1 Product Store

```typescript
// productStore.ts
interface ProductState {
  // Hierarchy data
  types: ProductType[];
  manufacturers: Map<string, Manufacturer[]>;
  categories: Map<string, Category[]>;
  series: Map<string, Series[]>;
  models: Map<string, Model[]>;

  // Selected state
  selectedType: string | null;
  selectedManufacturer: string | null;
  selectedCategory: string | null;
  selectedSeries: string | null;
  selectedModel: string | null;

  // Actions
  fetchTypes: () => Promise<void>;
  fetchManufacturers: (typeId: string) => Promise<void>;
  fetchCategories: (manufacturerId: string) => Promise<void>;
  fetchSeries: (categoryId: string) => Promise<void>;
  fetchModels: (seriesId: string) => Promise<void>;
  getModelDetails: (modelId: string) => Promise<Model>;

  // Selection
  selectType: (typeId: string) => void;
  selectManufacturer: (manufacturerId: string) => void;
  // ... etc

  // Utilities
  reset: () => void;
  clearFrom: (level: 'manufacturer' | 'category' | 'series' | 'model') => void;
}
```

### 6.2 Dynamic Quote Store

```typescript
// dynamicQuoteStore.ts
interface DynamicQuoteState {
  // Form state
  currentForm: FormDefinition | null;
  formData: Record<string, any>;
  selectedProducts: ProductSelection[];

  // Computed
  subtotal: number;
  tax: number;
  total: number;

  // Actions
  setForm: (form: FormDefinition) => void;
  updateField: (fieldId: string, value: any) => void;
  addProduct: (product: ProductSelection) => void;
  removeProduct: (index: number) => void;
  updateProduct: (index: number, updates: Partial<ProductSelection>) => void;
  calculateTotals: () => void;

  // Submission
  saveDraft: () => Promise<string>; // Returns quote ID
  submitQuote: () => Promise<string>;

  // Utilities
  reset: () => void;
  loadDraft: (quoteId: string) => Promise<void>;
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Product hierarchy data fetching
- Cascading selector logic
- Form field validation
- Quote total calculations
- Data transformation utilities

### 7.2 Integration Tests
- Form creation → Quote submission flow
- Product selection → Specs validation
- Quote creation → Table display
- Quote detail overlay → Data display

### 7.3 E2E Tests
- Complete quote creation workflow
- Form builder usage
- Product management
- Quote search and filtering

---

## 8. Performance Considerations

### 8.1 Data Fetching
- Implement caching for product hierarchy
- Use SWR/React Query for optimistic updates
- Lazy load product models (only fetch when needed)
- Implement pagination for large product lists

### 8.2 Rendering Optimization
- Virtualize long product lists
- Memoize expensive calculations
- Use React.memo for stable components
- Debounce search inputs

### 8.3 Database Optimization
- Add composite indexes on frequently queried columns
- Use materialized views for complex aggregations
- Implement database connection pooling
- Monitor slow queries and optimize

---

## 9. Security & Permissions

### 9.1 RLS Policies
- Products: Organization-scoped (owners can CRUD their products)
- Forms: Organization-scoped with role-based access
- Quotes: Organization-scoped with member visibility
- Submissions: User-scoped for drafts, org-scoped for submitted

### 9.2 Role-Based Access
- **Owner**: Full access to products, forms, quotes
- **Admin**: Can create forms, manage products, view all quotes
- **Member**: Can create quotes, view assigned quotes

---

## 10. Future Enhancements

1. **Product Catalog Management**
   - Bulk import from CSV/Excel
   - Product images and documentation
   - Product variants and options

2. **Advanced Form Features**
   - Conditional logic (show/hide fields)
   - Calculated fields
   - File uploads
   - E-signature integration

3. **Quote Workflow**
   - Approval workflows
   - Client self-service portal
   - Online quote acceptance
   - Automated follow-ups

4. **Analytics & Reporting**
   - Product performance tracking
   - Quote conversion rates
   - Popular product combinations
   - Revenue by product type

---

## 11. Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Database Foundation | 1 week | Not Started |
| 2. Product Management | 1 week | Not Started |
| 3. Cascading Selector | 1 week | Not Started |
| 4. Form Builder Enhancement | 1 week | Not Started |
| 5. Dynamic Quote Creation | 1 week | Not Started |
| 6. Standardized Table | 1 week | Not Started |
| 7. Quote Detail Overlay | 1 week | Not Started |
| **Total** | **7 weeks** | **Planning** |

---

## 12. Success Criteria

✅ **Database**
- All product hierarchy tables created
- Quotes normalized with flexible schema
- Migration script successfully converts old data

✅ **Product System**
- Cascading product selector works smoothly
- Products can be managed via admin UI
- Field definitions dynamically generate forms

✅ **Form Builder**
- Forms can include product selector fields
- Forms can be previewed before saving
- Multiple form templates available

✅ **Quote Creation**
- Users can create quotes using custom forms
- Products are selected via cascading UI
- Totals calculate automatically

✅ **Quote Display**
- Standardized table shows all quotes
- Table is searchable and filterable
- Click opens detailed overlay
- Overlay shows all quote data in organized tabs

---

**Document Version**: 1.0
**Last Updated**: 2025-01-10
**Author**: Claude Code Planning Assistant
