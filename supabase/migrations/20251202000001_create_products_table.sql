-- ============================================================================
-- Products Table for Product Catalog
-- ============================================================================
-- Supports simple line items now, with structure for cascading products later

CREATE TABLE IF NOT EXISTS public.products (
  -- Primary Key
  id UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Organization scoping (multi-tenant)
  organization_id UUID NOT NULL,

  -- Product identification
  product_number SERIAL,  -- Auto-generated sequential number
  display_id TEXT,        -- User-facing ID (e.g., "SHIP-001", can be customized)

  -- Core product data
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),  -- Optional price (NULL for variable pricing)

  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT,

  -- Future cascading structure (nullable for Phase 1)
  manufacturer TEXT,
  product_type TEXT,
  series TEXT,
  model TEXT,

  -- Flexible data storage
  specifications JSONB DEFAULT '{}',
  options JSONB DEFAULT '{}',  -- Price modifiers (additions/deductions)

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT products_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT products_unique_display_id_per_org
    UNIQUE (organization_id, display_id)
);

-- Indexes for performance
CREATE INDEX idx_products_organization_id ON public.products(organization_id);
CREATE INDEX idx_products_tags ON public.products USING GIN(tags);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_name ON public.products(name);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_product_number ON public.products(organization_id, product_number);

-- Updated at trigger (uses existing handle_updated_at function)
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.products IS 'Product catalog for organizations. Supports simple line items and future cascading products (Manufacturer > Type > Category > Series > Model).';
COMMENT ON COLUMN public.products.display_id IS 'User-customizable display ID. Falls back to product_number if null.';
COMMENT ON COLUMN public.products.options IS 'JSONB for price modifiers: { additions: [{name, value, type}], deductions: [{name, value, type}] }';
