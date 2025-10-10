-- ============================================================================
-- Form Builder System - Test Tables Migration
-- ============================================================================
-- This migration creates isolated test tables for the form builder system
-- All tables use _test suffix to avoid affecting production data
-- ============================================================================

-- ============================================================================
-- PART 1: PRODUCT HIERARCHY TABLES
-- ============================================================================

-- Product Type (Top Level)
CREATE TABLE IF NOT EXISTS product_types_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name for UI
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Product Manufacturer (Level 2)
CREATE TABLE IF NOT EXISTS product_manufacturers_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id UUID REFERENCES product_types_test(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_type_id, name)
);

-- Product Category (Level 3)
CREATE TABLE IF NOT EXISTS product_categories_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES product_manufacturers_test(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manufacturer_id, name)
);

-- Product Series (Level 4)
CREATE TABLE IF NOT EXISTS product_series_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories_test(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Product Model (Level 5 - Leaf Node with Full Specs)
CREATE TABLE IF NOT EXISTS product_models_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES product_series_test(id) ON DELETE CASCADE,
  model_number TEXT NOT NULL,
  model_name TEXT NOT NULL,

  -- Full product specifications (flexible JSONB)
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"weight": "50 lbs", "dimensions": "24x36x48", "power": "110V"}

  -- Pricing information
  base_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  price_unit TEXT DEFAULT 'unit', -- per unit, per sq ft, etc.

  -- Field definitions for dynamic forms
  field_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {
  --     "id": "quantity",
  --     "label": "Quantity",
  --     "type": "number",
  --     "required": true,
  --     "min": 1,
  --     "placeholder": "Enter quantity"
  --   },
  --   {
  --     "id": "dimensions",
  --     "label": "Dimensions",
  --     "type": "text",
  --     "required": true,
  --     "pattern": "^\\d+x\\d+$",
  --     "placeholder": "e.g., 10x12"
  --   }
  -- ]

  -- Display and metadata
  description TEXT,
  image_urls TEXT[],
  documentation_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Tags for search
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(series_id, model_number)
);

-- ============================================================================
-- PART 2: ENHANCED FORM BUILDER TABLES
-- ============================================================================

-- Form Definitions (enhanced from existing)
CREATE TABLE IF NOT EXISTS form_definitions_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],

  -- Form structure
  tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example structure:
  -- [
  --   {
  --     "id": "tab-1",
  --     "name": "Client Information",
  --     "icon": "User",
  --     "fields": [
  --       {
  --         "id": "client_name",
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
  --     "icon": "Package",
  --     "fields": [
  --       {
  --         "id": "products",
  --         "type": "product_selector",
  --         "label": "Select Products",
  --         "required": true,
  --         "config": {
  --           "allowMultiple": true,
  --           "showPricing": true
  --         }
  --       }
  --     ]
  --   }
  -- ]

  form_type TEXT DEFAULT 'quote' CHECK (form_type IN ('quote', 'proposal', 'invoice', 'estimate', 'custom')),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_form_id UUID REFERENCES form_definitions_test(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form Submissions (enhanced from existing)
CREATE TABLE IF NOT EXISTS form_submissions_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_definition_id UUID REFERENCES form_definitions_test(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Form response data
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Ownership and status
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'archived'))
);

-- ============================================================================
-- PART 3: NORMALIZED QUOTES TABLE (TEST)
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotes_formbuilder_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  proposal_number TEXT NOT NULL UNIQUE,
  project_name TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Archived')),

  -- Form association
  form_definition_id UUID REFERENCES form_definitions_test(id) ON DELETE SET NULL,

  -- Flexible form response data (replaces all specific columns)
  form_response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "client_info": {
  --     "name": "John Doe",
  --     "company": "Acme Corp",
  --     "email": "john@acme.com",
  --     "phone": "555-1234",
  --     "address": "123 Main St"
  --   },
  --   "job_details": {
  --     "location": "Building A",
  --     "date": "2025-01-15",
  --     "description": "Install new HVAC system"
  --   },
  --   "products": [
  --     {
  --       "product_model_id": "uuid",
  --       "product_hierarchy": {
  --         "type": "HVAC Equipment",
  --         "manufacturer": "Carrier",
  --         "category": "Air Conditioners",
  --         "series": "Infinity Series",
  --         "model": "24ACC6",
  --         "model_name": "Infinity 16"
  --       },
  --       "specifications": {
  --         "quantity": 2,
  --         "dimensions": "24x36",
  --         "custom_field": "value"
  --       },
  --       "pricing": {
  --         "unit_price": 2500.00,
  --         "quantity": 2,
  --         "subtotal": 5000.00
  --       }
  --     }
  --   ],
  --   "custom_fields": {
  --     "field_id": "field_value"
  --   }
  -- }

  -- Denormalized product items for quick access (computed from form_response_data)
  product_items JSONB DEFAULT '[]'::jsonb,

  -- Computed totals (calculated from products + any fees/taxes)
  computed_totals JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "subtotal": 5000.00,
  --   "tax_rate": 0.08,
  --   "tax": 400.00,
  --   "fees": 100.00,
  --   "total": 5500.00,
  --   "currency": "USD"
  -- }

  -- Metadata
  quote_source TEXT DEFAULT 'Manual',
  version INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes_formbuilder_test(id) ON DELETE SET NULL,

  -- Timestamps
  date_last_downloaded TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Flags
  archived BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Product hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_product_types_test_org ON product_types_test(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_types_test_active ON product_types_test(is_active);

CREATE INDEX IF NOT EXISTS idx_product_manufacturers_test_type ON product_manufacturers_test(product_type_id);
CREATE INDEX IF NOT EXISTS idx_product_manufacturers_test_active ON product_manufacturers_test(is_active);

CREATE INDEX IF NOT EXISTS idx_product_categories_test_manufacturer ON product_categories_test(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_test_active ON product_categories_test(is_active);

CREATE INDEX IF NOT EXISTS idx_product_series_test_category ON product_series_test(category_id);
CREATE INDEX IF NOT EXISTS idx_product_series_test_active ON product_series_test(is_active);

CREATE INDEX IF NOT EXISTS idx_product_models_test_series ON product_models_test(series_id);
CREATE INDEX IF NOT EXISTS idx_product_models_test_active ON product_models_test(is_active);

-- Form definitions indexes
CREATE INDEX IF NOT EXISTS idx_form_definitions_test_org ON form_definitions_test(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_definitions_test_created_by ON form_definitions_test(created_by);
CREATE INDEX IF NOT EXISTS idx_form_definitions_test_active ON form_definitions_test(is_active);
CREATE INDEX IF NOT EXISTS idx_form_definitions_test_category ON form_definitions_test(category);

-- Form submissions indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_test_form ON form_submissions_test(form_definition_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_test_org ON form_submissions_test(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_test_submitted_by ON form_submissions_test(submitted_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_test_status ON form_submissions_test(status);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_org ON quotes_formbuilder_test(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_created_by ON quotes_formbuilder_test(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_status ON quotes_formbuilder_test(status);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_proposal ON quotes_formbuilder_test(proposal_number);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_archived ON quotes_formbuilder_test(archived);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_form ON quotes_formbuilder_test(form_definition_id);

-- GIN indexes for JSONB columns (for search)
CREATE INDEX IF NOT EXISTS idx_product_models_test_specs_gin ON product_models_test USING GIN (specifications);
CREATE INDEX IF NOT EXISTS idx_product_models_test_fields_gin ON product_models_test USING GIN (field_definitions);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_response_gin ON quotes_formbuilder_test USING GIN (form_response_data);

-- ============================================================================
-- PART 5: RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE product_types_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_manufacturers_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_series_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_models_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_definitions_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_formbuilder_test ENABLE ROW LEVEL SECURITY;

-- Product Types Policies
CREATE POLICY "Users can view their org's product types"
  ON product_types_test FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Admins can manage product types"
  ON product_types_test FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND status = 'Active'
        AND role IN ('Owner', 'Admin')
    )
  );

-- Product Manufacturers Policies
CREATE POLICY "Users can view manufacturers"
  ON product_manufacturers_test FOR SELECT
  USING (
    product_type_id IN (
      SELECT id FROM product_types_test
      WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND status = 'Active'
      )
    )
  );

CREATE POLICY "Admins can manage manufacturers"
  ON product_manufacturers_test FOR ALL
  USING (
    product_type_id IN (
      SELECT id FROM product_types_test
      WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND status = 'Active'
          AND role IN ('Owner', 'Admin')
      )
    )
  );

-- Similar policies for categories, series, and models
CREATE POLICY "Users can view categories"
  ON product_categories_test FOR SELECT
  USING (
    manufacturer_id IN (
      SELECT pm.id FROM product_manufacturers_test pm
      INNER JOIN product_types_test pt ON pm.product_type_id = pt.id
      WHERE pt.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND status = 'Active'
      )
    )
  );

CREATE POLICY "Admins can manage categories"
  ON product_categories_test FOR ALL
  USING (
    manufacturer_id IN (
      SELECT pm.id FROM product_manufacturers_test pm
      INNER JOIN product_types_test pt ON pm.product_type_id = pt.id
      WHERE pt.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND status = 'Active'
          AND role IN ('Owner', 'Admin')
      )
    )
  );

CREATE POLICY "Users can view series"
  ON product_series_test FOR SELECT
  USING (
    category_id IN (
      SELECT pc.id FROM product_categories_test pc
      INNER JOIN product_manufacturers_test pm ON pc.manufacturer_id = pm.id
      INNER JOIN product_types_test pt ON pm.product_type_id = pt.id
      WHERE pt.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND status = 'Active'
      )
    )
  );

CREATE POLICY "Admins can manage series"
  ON product_series_test FOR ALL
  USING (
    category_id IN (
      SELECT pc.id FROM product_categories_test pc
      INNER JOIN product_manufacturers_test pm ON pc.manufacturer_id = pm.id
      INNER JOIN product_types_test pt ON pm.product_type_id = pt.id
      WHERE pt.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND status = 'Active'
          AND role IN ('Owner', 'Admin')
      )
    )
  );

CREATE POLICY "Users can view models"
  ON product_models_test FOR SELECT
  USING (
    series_id IN (
      SELECT ps.id FROM product_series_test ps
      INNER JOIN product_categories_test pc ON ps.category_id = pc.id
      INNER JOIN product_manufacturers_test pm ON pc.manufacturer_id = pm.id
      INNER JOIN product_types_test pt ON pm.product_type_id = pt.id
      WHERE pt.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid() AND status = 'Active'
      )
    )
  );

CREATE POLICY "Admins can manage models"
  ON product_models_test FOR ALL
  USING (
    series_id IN (
      SELECT ps.id FROM product_series_test ps
      INNER JOIN product_categories_test pc ON ps.category_id = pc.id
      INNER JOIN product_manufacturers_test pm ON pc.manufacturer_id = pm.id
      INNER JOIN product_types_test pt ON pm.product_type_id = pt.id
      WHERE pt.organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND status = 'Active'
          AND role IN ('Owner', 'Admin')
      )
    )
  );

-- Form Definitions Policies
CREATE POLICY "Users can view their org's forms"
  ON form_definitions_test FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Admins can manage forms"
  ON form_definitions_test FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND status = 'Active'
        AND role IN ('Owner', 'Admin')
    )
  );

-- Form Submissions Policies
CREATE POLICY "Users can view their org's submissions"
  ON form_submissions_test FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Members can create submissions"
  ON form_submissions_test FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
    AND submitted_by = auth.uid()
  );

CREATE POLICY "Users can update their own submissions"
  ON form_submissions_test FOR UPDATE
  USING (submitted_by = auth.uid());

-- Quotes Policies
CREATE POLICY "Users can view their org's quotes"
  ON quotes_formbuilder_test FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Members can create quotes"
  ON quotes_formbuilder_test FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Members can update quotes"
  ON quotes_formbuilder_test FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Admins can delete quotes"
  ON quotes_formbuilder_test FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND status = 'Active'
        AND role IN ('Owner', 'Admin')
    )
  );

-- ============================================================================
-- PART 6: TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_test()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_types_test_updated_at
  BEFORE UPDATE ON product_types_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_product_manufacturers_test_updated_at
  BEFORE UPDATE ON product_manufacturers_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_product_categories_test_updated_at
  BEFORE UPDATE ON product_categories_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_product_series_test_updated_at
  BEFORE UPDATE ON product_series_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_product_models_test_updated_at
  BEFORE UPDATE ON product_models_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_form_definitions_test_updated_at
  BEFORE UPDATE ON form_definitions_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_form_submissions_test_updated_at
  BEFORE UPDATE ON form_submissions_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

CREATE TRIGGER update_quotes_formbuilder_test_updated_at
  BEFORE UPDATE ON quotes_formbuilder_test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_test();

-- ============================================================================
-- Migration Complete
-- ============================================================================
