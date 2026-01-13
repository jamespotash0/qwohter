-- ============================================================================
-- Quotes Form Builder Test Table
-- ============================================================================
-- Creates ONLY a test quotes table using existing product hierarchy
-- Uses existing: product_types, product_manufacturers, product_categories,
--                product_series, product_models, form_definitions, form_submissions
-- ============================================================================

-- Normalized Quotes Table (TEST)
CREATE TABLE IF NOT EXISTS quotes_formbuilder_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  proposal_number TEXT NOT NULL UNIQUE,
  project_name TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Archived')),

  -- Form association (using existing form_definitions table)
  form_definition_id UUID REFERENCES form_definitions(id) ON DELETE SET NULL,

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
  --     "description": "Install new system"
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

  -- Denormalized product items for quick access
  product_items JSONB DEFAULT '[]'::jsonb,

  -- Computed totals
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
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_org ON quotes_formbuilder_test(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_created_by ON quotes_formbuilder_test(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_status ON quotes_formbuilder_test(status);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_proposal ON quotes_formbuilder_test(proposal_number);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_archived ON quotes_formbuilder_test(archived);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_form ON quotes_formbuilder_test(form_definition_id);

-- GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_response_gin ON quotes_formbuilder_test USING GIN (form_response_data);
CREATE INDEX IF NOT EXISTS idx_quotes_formbuilder_test_products_gin ON quotes_formbuilder_test USING GIN (product_items);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE quotes_formbuilder_test ENABLE ROW LEVEL SECURITY;

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
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_quotes_formbuilder_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotes_formbuilder_test_updated_at
  BEFORE UPDATE ON quotes_formbuilder_test
  FOR EACH ROW EXECUTE FUNCTION update_quotes_formbuilder_test_updated_at();

-- ============================================================================
-- Migration Complete
-- ============================================================================
