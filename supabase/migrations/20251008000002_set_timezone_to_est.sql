-- Set database timezone to Eastern Time (EST/EDT)
-- This affects all TIMESTAMP WITH TIME ZONE operations

-- Set the timezone for the database
ALTER DATABASE postgres SET timezone TO 'America/New_York';

-- Set timezone for current session (immediate effect)
SET timezone TO 'America/New_York';

-- Update the default for the update_updated_at_column function to use local time
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for clarity
COMMENT ON FUNCTION update_updated_at_column() IS 'Updates the updated_at column to the current timestamp in America/New_York timezone';

-- Note: Existing timestamps are stored in UTC and will be displayed in EST when queried
-- New timestamps will be created in the current timezone (America/New_York)
