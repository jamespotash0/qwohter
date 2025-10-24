-- Migration: Add department field to memberships table
-- This allows organizations to categorize members by department (Sales, IT, Marketing, etc.)
-- Department is organization-specific, so it belongs in memberships, not profiles

BEGIN;

-- 1. Add department column to memberships table
ALTER TABLE public.memberships
ADD COLUMN department text;

-- 2. Add constraint for valid department values
ALTER TABLE public.memberships
ADD CONSTRAINT valid_department CHECK (
  department IS NULL OR
  department IN (
    'Sales',
    'Marketing',
    'Operations',
    'IT',
    'Finance',
    'HR',
    'Customer Success',
    'Product',
    'Engineering',
    'Executive',
    'Other'
  )
);

-- 3. Auto-assign "Executive" department to existing Owners
UPDATE public.memberships
SET department = 'Executive'
WHERE role = 'Owner' AND department IS NULL;

-- 4. Create trigger function to auto-assign "Executive" to new/updated Owners
CREATE OR REPLACE FUNCTION set_owner_department()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is Owner and department is not set, auto-assign "Executive"
  IF NEW.role = 'Owner' AND NEW.department IS NULL THEN
    NEW.department = 'Executive';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically set Owner department
DROP TRIGGER IF EXISTS trigger_set_owner_department ON public.memberships;
CREATE TRIGGER trigger_set_owner_department
  BEFORE INSERT OR UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_department();

-- 6. Add index for department filtering (performance optimization)
CREATE INDEX idx_memberships_department ON public.memberships(department)
WHERE department IS NOT NULL;

-- 7. Add comment for documentation
COMMENT ON COLUMN public.memberships.department IS 'User department within organization (Sales, IT, Marketing, etc.). Auto-assigned to "Executive" for Owners. Only Owner/Admin can set/update.';

COMMIT;

-- Verification query (commented out - run manually if needed)
-- SELECT role, department, COUNT(*)
-- FROM public.memberships
-- GROUP BY role, department
-- ORDER BY role, department;
