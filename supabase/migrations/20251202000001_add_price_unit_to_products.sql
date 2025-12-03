-- Add price_unit column to products table
-- Allows products to specify how they are priced (per hour, per day, flat, etc.)

ALTER TABLE products
ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'Flat';

-- Add comment for documentation
COMMENT ON COLUMN products.price_unit IS 'Pricing unit type: Flat, Per Hour, Per Day, Per Unit, Per Sq Ft, Per Linear Ft';
