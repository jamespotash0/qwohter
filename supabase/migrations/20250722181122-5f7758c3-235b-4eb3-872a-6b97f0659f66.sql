
-- This migration will update the wall_details column to properly handle the new structure
-- First, add a temporary column to store the transformed data
ALTER TABLE public.quotes 
ADD COLUMN wall_details_new JSONB NOT NULL DEFAULT '{}';

-- Create a function to transform the existing array-based wall_details to the new object format
CREATE OR REPLACE FUNCTION transform_wall_details()
RETURNS TRIGGER AS $$
DECLARE
  wall_record JSONB;
  result JSONB := '{}';
  wall_name TEXT;
BEGIN
  -- If wall_details is null or empty array, return empty object
  IF NEW.wall_details IS NULL OR NEW.wall_details = '[]' THEN
    NEW.wall_details_new := '{}';
    RETURN NEW;
  END IF;

  -- Iterate through each wall in the array
  FOR wall_record IN SELECT jsonb_array_elements(NEW.wall_details)
  LOOP
    -- Extract the wall name to use as key
    wall_name := wall_record->>'name';
    
    -- If no name is found, generate a default one
    IF wall_name IS NULL OR wall_name = '' THEN
      wall_name := 'Wall ' || (jsonb_array_length(NEW.wall_details)::text);
    END IF;
    
    -- Remove the id and name from the wall record (they're now implicit)
    wall_record := wall_record - 'id' - 'name';
    
    -- Add the wall to the result object
    result := result || jsonb_build_object(wall_name, wall_record);
  END LOOP;

  NEW.wall_details_new := result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically transform wall_details to wall_details_new
CREATE TRIGGER transform_wall_details_trigger
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION transform_wall_details();

-- Update existing records to populate wall_details_new
UPDATE public.quotes SET wall_details = wall_details;

-- After all existing data has been migrated, replace the old column with the new one
ALTER TABLE public.quotes DROP COLUMN wall_details;
ALTER TABLE public.quotes RENAME COLUMN wall_details_new TO wall_details;

-- Drop the temporary function and trigger since they're no longer needed
DROP TRIGGER transform_wall_details_trigger ON public.quotes;
DROP FUNCTION transform_wall_details();
