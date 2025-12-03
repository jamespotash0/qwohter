-- Rename price column to amount in products table
-- Also rename price_unit to amount_unit for consistency

ALTER TABLE products
RENAME COLUMN price TO amount;

ALTER TABLE products
RENAME COLUMN price_unit TO amount_unit;

-- Update comments
COMMENT ON COLUMN products.amount IS 'The monetary amount or rate for this product';
COMMENT ON COLUMN products.amount_unit IS 'Unit type: Flat, Per Hour, Per Day, Per Unit, Per Sq Ft, Per Linear Ft';
