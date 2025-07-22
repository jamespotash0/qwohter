
-- First, add a temporary column to hold the updated structure
ALTER TABLE public.quotes 
ADD COLUMN wall_details_updated JSONB NOT NULL DEFAULT '{}';

-- Create a function to transform the existing wall_details to include a top-level ID
CREATE OR REPLACE FUNCTION transform_wall_details_with_id()
RETURNS TRIGGER AS $$
DECLARE
  config_id TEXT;
BEGIN
  -- Generate a unique ID for this wall configuration if one doesn't exist
  config_id := COALESCE(NEW.wall_details->>'id', 'wall-config-' || gen_random_uuid());
  
  -- Create the new structure with the id at the top level and walls as a nested object
  NEW.wall_details_updated := jsonb_build_object(
    'id', config_id,
    'walls', NEW.wall_details
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically transform wall_details to the new structure
CREATE TRIGGER transform_wall_details_with_id_trigger
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION transform_wall_details_with_id();

-- Update existing records to populate wall_details_updated
UPDATE public.quotes SET wall_details = wall_details;

-- After all existing data has been migrated, replace the old column with the new one
ALTER TABLE public.quotes DROP COLUMN wall_details;
ALTER TABLE public.quotes RENAME COLUMN wall_details_updated TO wall_details;

-- Drop the temporary function and trigger since they're no longer needed
DROP TRIGGER transform_wall_details_with_id_trigger ON public.quotes;
DROP FUNCTION transform_wall_details_with_id();
