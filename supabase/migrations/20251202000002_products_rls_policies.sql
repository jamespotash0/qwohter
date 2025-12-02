-- ============================================================================
-- RLS Policies for Products Table
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Active members can view products in their organization
CREATE POLICY "Users can view products in their organization"
  ON public.products FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
    )
  );

-- Policy: Active members can insert products
CREATE POLICY "Active members can insert products"
  ON public.products FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
    )
  );

-- Policy: Active members can update products
CREATE POLICY "Active members can update products"
  ON public.products FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
    )
  );

-- Policy: Only Owners and Admins can delete products
CREATE POLICY "Owners and Admins can delete products"
  ON public.products FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
      AND role IN ('Owner', 'Admin')
    )
  );

-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
