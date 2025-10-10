-- ============================================================================
-- Product Hierarchy Seed Data - Test Environment
-- ============================================================================
-- This script populates the test tables with realistic product data
-- Run this AFTER the migration to set up sample products
-- ============================================================================

-- Note: Replace 'YOUR_ORG_ID_HERE' with actual organization ID when running
-- For testing, you can get it from: SELECT id FROM organizations LIMIT 1;

DO $$
DECLARE
  v_org_id UUID;
  v_type_hvac UUID;
  v_type_electrical UUID;
  v_type_plumbing UUID;

  v_mfr_carrier UUID;
  v_mfr_trane UUID;
  v_mfr_schneider UUID;
  v_mfr_kohler UUID;

  v_cat_ac UUID;
  v_cat_furnace UUID;
  v_cat_panels UUID;
  v_cat_faucets UUID;

  v_series_infinity UUID;
  v_series_performance UUID;
  v_series_powerLogic UUID;
  v_series_artifacts UUID;
BEGIN
  -- Get first organization (for testing)
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please create an organization first.';
  END IF;

  -- ========================================================================
  -- PRODUCT TYPES
  -- ========================================================================

  INSERT INTO product_types_test (id, organization_id, name, description, icon, display_order)
  VALUES
    (gen_random_uuid(), v_org_id, 'HVAC Equipment', 'Heating, Ventilation, and Air Conditioning systems and components', 'Wind', 1),
    (gen_random_uuid(), v_org_id, 'Electrical', 'Electrical panels, breakers, and components', 'Zap', 2),
    (gen_random_uuid(), v_org_id, 'Plumbing', 'Plumbing fixtures, pipes, and fittings', 'Droplet', 3),
    (gen_random_uuid(), v_org_id, 'Building Materials', 'Construction and building materials', 'Cube', 4)
  RETURNING id INTO v_type_hvac WHERE name = 'HVAC Equipment';

  SELECT id INTO v_type_hvac FROM product_types_test WHERE name = 'HVAC Equipment' AND organization_id = v_org_id;
  SELECT id INTO v_type_electrical FROM product_types_test WHERE name = 'Electrical' AND organization_id = v_org_id;
  SELECT id INTO v_type_plumbing FROM product_types_test WHERE name = 'Plumbing' AND organization_id = v_org_id;

  -- ========================================================================
  -- MANUFACTURERS
  -- ========================================================================

  -- HVAC Manufacturers
  INSERT INTO product_manufacturers_test (id, product_type_id, name, description, website, display_order)
  VALUES
    (gen_random_uuid(), v_type_hvac, 'Carrier', 'Leading manufacturer of HVAC systems', 'https://www.carrier.com', 1),
    (gen_random_uuid(), v_type_hvac, 'Trane', 'Premium HVAC equipment and services', 'https://www.trane.com', 2),
    (gen_random_uuid(), v_type_hvac, 'Lennox', 'Innovative climate control solutions', 'https://www.lennox.com', 3);

  SELECT id INTO v_mfr_carrier FROM product_manufacturers_test WHERE name = 'Carrier' AND product_type_id = v_type_hvac;
  SELECT id INTO v_mfr_trane FROM product_manufacturers_test WHERE name = 'Trane' AND product_type_id = v_type_hvac;

  -- Electrical Manufacturers
  INSERT INTO product_manufacturers_test (id, product_type_id, name, description, website, display_order)
  VALUES
    (gen_random_uuid(), v_type_electrical, 'Schneider Electric', 'Global leader in electrical distribution', 'https://www.se.com', 1),
    (gen_random_uuid(), v_type_electrical, 'Square D', 'Electrical equipment and safety solutions', 'https://www.squaredaudio.com', 2);

  SELECT id INTO v_mfr_schneider FROM product_manufacturers_test WHERE name = 'Schneider Electric' AND product_type_id = v_type_electrical;

  -- Plumbing Manufacturers
  INSERT INTO product_manufacturers_test (id, product_type_id, name, description, website, display_order)
  VALUES
    (gen_random_uuid(), v_type_plumbing, 'Kohler', 'Premium plumbing fixtures and fittings', 'https://www.kohler.com', 1),
    (gen_random_uuid(), v_type_plumbing, 'Moen', 'Innovative faucets and fixtures', 'https://www.moen.com', 2);

  SELECT id INTO v_mfr_kohler FROM product_manufacturers_test WHERE name = 'Kohler' AND product_type_id = v_type_plumbing;

  -- ========================================================================
  -- CATEGORIES
  -- ========================================================================

  -- Carrier Categories
  INSERT INTO product_categories_test (id, manufacturer_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_mfr_carrier, 'Air Conditioners', 'Central and ductless air conditioning units', 1),
    (gen_random_uuid(), v_mfr_carrier, 'Furnaces', 'Gas and electric furnaces', 2),
    (gen_random_uuid(), v_mfr_carrier, 'Heat Pumps', 'Air source and geothermal heat pumps', 3);

  SELECT id INTO v_cat_ac FROM product_categories_test WHERE name = 'Air Conditioners' AND manufacturer_id = v_mfr_carrier;
  SELECT id INTO v_cat_furnace FROM product_categories_test WHERE name = 'Furnaces' AND manufacturer_id = v_mfr_carrier;

  -- Trane Categories
  INSERT INTO product_categories_test (id, manufacturer_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_mfr_trane, 'Air Conditioners', 'High-efficiency cooling systems', 1),
    (gen_random_uuid(), v_mfr_trane, 'Air Handlers', 'Indoor air handling units', 2);

  -- Schneider Categories
  INSERT INTO product_categories_test (id, manufacturer_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_mfr_schneider, 'Electrical Panels', 'Main and sub electrical panels', 1),
    (gen_random_uuid(), v_mfr_schneider, 'Circuit Breakers', 'Single and multi-pole breakers', 2);

  SELECT id INTO v_cat_panels FROM product_categories_test WHERE name = 'Electrical Panels' AND manufacturer_id = v_mfr_schneider;

  -- Kohler Categories
  INSERT INTO product_categories_test (id, manufacturer_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_mfr_kohler, 'Faucets', 'Kitchen and bathroom faucets', 1),
    (gen_random_uuid(), v_mfr_kohler, 'Sinks', 'Kitchen and bathroom sinks', 2);

  SELECT id INTO v_cat_faucets FROM product_categories_test WHERE name = 'Faucets' AND manufacturer_id = v_mfr_kohler;

  -- ========================================================================
  -- SERIES
  -- ========================================================================

  -- Carrier Air Conditioner Series
  INSERT INTO product_series_test (id, category_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_cat_ac, 'Infinity Series', 'Premium high-efficiency systems', 1),
    (gen_random_uuid(), v_cat_ac, 'Performance Series', 'Reliable mid-range systems', 2),
    (gen_random_uuid(), v_cat_ac, 'Comfort Series', 'Affordable comfort solutions', 3);

  SELECT id INTO v_series_infinity FROM product_series_test WHERE name = 'Infinity Series' AND category_id = v_cat_ac;
  SELECT id INTO v_series_performance FROM product_series_test WHERE name = 'Performance Series' AND category_id = v_cat_ac;

  -- Carrier Furnace Series
  INSERT INTO product_series_test (id, category_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_cat_furnace, 'Infinity Gas Furnaces', 'Ultra-efficient gas furnaces', 1),
    (gen_random_uuid(), v_cat_furnace, 'Performance Gas Furnaces', 'Dependable heating performance', 2);

  -- Schneider Panel Series
  INSERT INTO product_series_test (id, category_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_cat_panels, 'PowerLogic Series', 'Smart electrical distribution', 1),
    (gen_random_uuid(), v_cat_panels, 'Homeline Series', 'Residential electrical panels', 2);

  SELECT id INTO v_series_powerLogic FROM product_series_test WHERE name = 'PowerLogic Series' AND category_id = v_cat_panels;

  -- Kohler Faucet Series
  INSERT INTO product_series_test (id, category_id, name, description, display_order)
  VALUES
    (gen_random_uuid(), v_cat_faucets, 'Artifacts', 'Designer-inspired kitchen faucets', 1),
    (gen_random_uuid(), v_cat_faucets, 'Simplice', 'Professional-style kitchen faucets', 2);

  SELECT id INTO v_series_artifacts FROM product_series_test WHERE name = 'Artifacts' AND category_id = v_cat_faucets;

  -- ========================================================================
  -- MODELS (with specifications and field definitions)
  -- ========================================================================

  -- Carrier Infinity Series AC Models
  INSERT INTO product_models_test (
    series_id, model_number, model_name, description,
    specifications, base_price, currency,
    field_definitions, tags, display_order
  )
  VALUES
    (
      v_series_infinity,
      '24ACC6',
      'Infinity 16 Air Conditioner with Greenspeed Intelligence',
      '16 SEER air conditioner with variable-speed operation',
      '{
        "seer": "16",
        "cooling_capacity": "2-5 tons",
        "refrigerant": "R-410A",
        "compressor_type": "Variable speed scroll",
        "sound_rating": "59 dB",
        "warranty": "10 years parts"
      }'::jsonb,
      4500.00,
      'USD',
      '[
        {
          "id": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true,
          "min": 1,
          "max": 100,
          "default": 1,
          "placeholder": "Enter quantity"
        },
        {
          "id": "tonnage",
          "label": "Tonnage",
          "type": "select",
          "required": true,
          "options": ["2 Ton", "2.5 Ton", "3 Ton", "3.5 Ton", "4 Ton", "5 Ton"],
          "placeholder": "Select tonnage"
        },
        {
          "id": "installation_location",
          "label": "Installation Location",
          "type": "text",
          "required": true,
          "placeholder": "e.g., Roof, Ground Level"
        },
        {
          "id": "electrical_requirements",
          "label": "Electrical Requirements",
          "type": "select",
          "required": true,
          "options": ["208/230V 1-Phase", "208/230V 3-Phase"],
          "default": "208/230V 1-Phase"
        },
        {
          "id": "notes",
          "label": "Additional Notes",
          "type": "textarea",
          "required": false,
          "placeholder": "Any special installation requirements..."
        }
      ]'::jsonb,
      ARRAY['HVAC', 'Air Conditioner', 'Carrier', 'Infinity', 'Variable Speed'],
      1
    ),
    (
      v_series_infinity,
      '24ANB6',
      'Infinity 19 Air Conditioner',
      '19 SEER ultra-efficient air conditioner',
      '{
        "seer": "19",
        "cooling_capacity": "2-5 tons",
        "refrigerant": "R-410A",
        "compressor_type": "Two-stage scroll",
        "sound_rating": "56 dB",
        "warranty": "10 years parts"
      }'::jsonb,
      5200.00,
      'USD',
      '[
        {
          "id": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true,
          "min": 1,
          "default": 1
        },
        {
          "id": "tonnage",
          "label": "Tonnage",
          "type": "select",
          "required": true,
          "options": ["2 Ton", "2.5 Ton", "3 Ton", "4 Ton", "5 Ton"]
        },
        {
          "id": "installation_type",
          "label": "Installation Type",
          "type": "select",
          "required": true,
          "options": ["New Installation", "Replacement"]
        }
      ]'::jsonb,
      ARRAY['HVAC', 'Air Conditioner', 'Carrier', 'Infinity', 'High SEER'],
      2
    );

  -- Carrier Performance Series AC Models
  INSERT INTO product_models_test (
    series_id, model_number, model_name, description,
    specifications, base_price, currency,
    field_definitions, tags, display_order
  )
  VALUES
    (
      v_series_performance,
      '24ACC4',
      'Performance 14 Air Conditioner',
      '14 SEER reliable cooling performance',
      '{
        "seer": "14",
        "cooling_capacity": "1.5-5 tons",
        "refrigerant": "R-410A",
        "compressor_type": "Single-stage scroll",
        "sound_rating": "72 dB",
        "warranty": "10 years parts"
      }'::jsonb,
      3200.00,
      'USD',
      '[
        {
          "id": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true,
          "min": 1,
          "default": 1
        },
        {
          "id": "tonnage",
          "label": "Tonnage",
          "type": "select",
          "required": true,
          "options": ["1.5 Ton", "2 Ton", "2.5 Ton", "3 Ton", "4 Ton", "5 Ton"]
        },
        {
          "id": "pad_included",
          "label": "Include Concrete Pad",
          "type": "checkbox",
          "required": false,
          "default": false
        }
      ]'::jsonb,
      ARRAY['HVAC', 'Air Conditioner', 'Carrier', 'Performance', 'Standard SEER'],
      1
    );

  -- Schneider PowerLogic Panels
  INSERT INTO product_models_test (
    series_id, model_number, model_name, description,
    specifications, base_price, currency,
    field_definitions, tags, display_order
  )
  VALUES
    (
      v_series_powerLogic,
      'PM8000',
      'PowerLogic PM8000 Smart Panel',
      'Advanced power monitoring and control',
      '{
        "amperage": "400-4000A",
        "voltage": "Up to 690V",
        "phases": "3-phase",
        "communication": "Ethernet, Modbus",
        "display": "Color touchscreen",
        "warranty": "5 years"
      }'::jsonb,
      2800.00,
      'USD',
      '[
        {
          "id": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true,
          "min": 1,
          "default": 1
        },
        {
          "id": "amperage_rating",
          "label": "Amperage Rating",
          "type": "select",
          "required": true,
          "options": ["400A", "800A", "1200A", "1600A", "2000A", "3000A", "4000A"]
        },
        {
          "id": "mounting",
          "label": "Mounting Type",
          "type": "select",
          "required": true,
          "options": ["Wall Mount", "Floor Mount", "Freestanding"]
        },
        {
          "id": "metering_required",
          "label": "Advanced Metering",
          "type": "checkbox",
          "required": false,
          "default": true
        }
      ]'::jsonb,
      ARRAY['Electrical', 'Panel', 'Schneider', 'Smart', 'PowerLogic'],
      1
    );

  -- Kohler Artifacts Faucets
  INSERT INTO product_models_test (
    series_id, model_number, model_name, description,
    specifications, base_price, currency,
    field_definitions, tags, display_order
  )
  VALUES
    (
      v_series_artifacts,
      'K-99259',
      'Artifacts Pull-Down Kitchen Faucet',
      'Professional-grade kitchen faucet with vintage design',
      '{
        "finish": "Vibrant Stainless, Polished Chrome, Oil-Rubbed Bronze",
        "spout_height": "15.5 inches",
        "spout_reach": "9.13 inches",
        "flow_rate": "1.8 GPM",
        "installation": "1 or 3-hole",
        "warranty": "Limited lifetime"
      }'::jsonb,
      580.00,
      'USD',
      '[
        {
          "id": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true,
          "min": 1,
          "default": 1
        },
        {
          "id": "finish",
          "label": "Finish",
          "type": "select",
          "required": true,
          "options": ["Vibrant Stainless", "Polished Chrome", "Oil-Rubbed Bronze", "Matte Black"]
        },
        {
          "id": "installation_holes",
          "label": "Installation Holes",
          "type": "select",
          "required": true,
          "options": ["1-Hole", "3-Hole"],
          "default": "1-Hole"
        },
        {
          "id": "soap_dispenser",
          "label": "Include Soap Dispenser",
          "type": "checkbox",
          "required": false,
          "default": false
        }
      ]'::jsonb,
      ARRAY['Plumbing', 'Faucet', 'Kohler', 'Artifacts', 'Kitchen'],
      1
    );

  RAISE NOTICE 'Seed data inserted successfully for organization: %', v_org_id;

END $$;
