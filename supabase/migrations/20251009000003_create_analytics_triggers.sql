-- Trigger 1: Track status transitions and update timestamp fields
CREATE OR REPLACE FUNCTION track_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Insert transition record
    INSERT INTO quote_status_transitions (
      quote_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      auth.uid()
    );

    -- Update denormalized timestamp fields on quotes table
    IF NEW.status = 'Submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF NEW.status = 'Won' THEN
      NEW.won_at = NOW();
      NEW.closed_at = NOW();
    ELSIF NEW.status = 'Rejected' THEN
      NEW.rejected_at = NOW();
      NEW.closed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_quote_status_change
  BEFORE UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION track_quote_status_change();

COMMENT ON FUNCTION track_quote_status_change IS 'Automatically logs status changes to quote_status_transitions table and updates timestamp fields';


-- Trigger 2: Extract and denormalize fields from JSONB
CREATE OR REPLACE FUNCTION update_quote_analytics_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract total value from price_details JSONB
  IF NEW.price_details IS NOT NULL THEN
    NEW.total_value = (NEW.price_details->>'final_selling_price')::DECIMAL;

    -- Calculate margin if we have both selling price and cost
    IF NEW.price_details->>'total_cost' IS NOT NULL AND
       NEW.price_details->>'final_selling_price' IS NOT NULL THEN
      NEW.margin_percentage = (
        ((NEW.price_details->>'final_selling_price')::DECIMAL -
         (NEW.price_details->>'total_cost')::DECIMAL) /
        NULLIF((NEW.price_details->>'final_selling_price')::DECIMAL, 0) * 100
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_fields
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_analytics_fields();

COMMENT ON FUNCTION update_quote_analytics_fields IS 'Extracts analytics fields from JSONB columns for fast querying';
