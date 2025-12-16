
INSERT INTO forms (
  id,
  organization_id,
  name,
  description,
  form_type,
  tags,
  tabs,
  created_by,
  created_at,
  updated_at,
  is_active,
  is_default,
  starting_proposal_number,
  allow_save_incomplete
) VALUES (
  gen_random_uuid(),
  'aac649c9-96b7-47e6-93f4-0c702c1aee2e', -- Replace with your organization ID
  'Kwik Wall Quote Form',
  'Comprehensive quote creation form matching the Quote Creator Wizard',
  'Quote',
  ARRAY['sales'],
  '[
    {
      "id": "contact-info",
      "name": "Contact Info",
      "order": 0,
      "description": "Company contact details",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "contact_name",
          "label": "Contact Name",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "Select or enter contact name",
          "required": true,
          "order": 0,
          "description": "Primary contact person for this quote",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 24,
            "h": 3
          },
          "dataSource": {
            "type": "organization_members",
            "field": "full_name",
            "allowOverride": true
          }
        },
        {
          "id": "contact_email",
          "label": "Contact Email",
          "field_type": "input",
          "input_type": "email",
          "placeholder": "Select or enter contact email",
          "required": true,
          "order": 1,
          "description": "Email address of the primary contact",
          "layout": {
            "x": 24,
            "y": 0,
            "w": 24,
            "h": 3
          },
          "dataSource": {
            "type": "organization_members",
            "field": "email",
            "allowOverride": true
          }
        },
        {
          "id": "phone",
          "label": "Phone",
          "field_type": "input",
          "input_type": "tel",
          "placeholder": "From organization settings",
          "required": true,
          "order": 2,
          "description": "Company phone number (locked from organization settings)",
          "layout": {
            "x": 0,
            "y": 3,
            "w": 24,
            "h": 3
          },
          "dataSource": {
            "type": "organization",
            "field": "phone_number",
            "allowOverride": false
          }
        },
        {
          "id": "fax",
          "label": "Fax",
          "field_type": "input",
          "input_type": "tel",
          "placeholder": "From organization settings (optional)",
          "required": false,
          "order": 3,
          "description": "Fax number (optional, from organization settings)",
          "layout": {
            "x": 24,
            "y": 3,
            "w": 24,
            "h": 3
          },
          "dataSource": {
            "type": "organization",
            "field": "fax_number",
            "allowOverride": false
          }
        },
        {
          "id": "address",
          "label": "Address",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "From organization settings",
          "required": true,
          "order": 4,
          "description": "Company address (locked from organization settings)",
          "layout": {
            "x": 0,
            "y": 6,
            "w": 24,
            "h": 3
          },
          "dataSource": {
            "type": "organization",
            "field": "company_address",
            "allowOverride": false
          }
        },
        {
          "id": "website",
          "label": "Website",
          "field_type": "input",
          "input_type": "url",
          "placeholder": "From organization settings",
          "required": true,
          "order": 5,
          "description": "Company website (locked from organization settings)",
          "layout": {
            "x": 24,
            "y": 6,
            "w": 24,
            "h": 3
          },
          "dataSource": {
            "type": "organization",
            "field": "website",
            "allowOverride": false
          }
        },
        {
          "id": "quote_source",
          "label": "Quote Source",
          "field_type": "select",
          "placeholder": "Select quote source",
          "required": true,
          "order": 6,
          "description": "How did this quote opportunity come to you?",
          "layout": {
            "x": 0,
            "y": 9,
            "w": 48,
            "h": 3
          },
          "options": [
            "Manual Entry",
            "Website Lead",
            "Contractor Referral",
            "Manufacturer Referral",
            "Architect Referral",
            "Phone Inquiry",
            "Email Inquiry",
            "Trade Show",
            "Repeat Customer"
          ]
        }
      ]
    },

    {
      "id": "project-details",
      "name": "Project Details",
      "order": 1,
      "description": "Job location and client info",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "date",
          "label": "Date",
          "field_type": "date",
          "required": true,
          "order": 0,
          "description": "Quote date",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 12,
            "h": 3
          },
          "default_value": "{{today}}",
          "supportsTemplateVariables": true
        },
        {
          "id": "proposal_number",
          "label": "Proposal Number",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "Auto-generated",
          "required": true,
          "order": 1,
          "description": "Unique proposal identifier",
          "layout": {
            "x": 12,
            "y": 0,
            "w": 12,
            "h": 3
          },
          "default_value": "{{proposal_number}}",
          "supportsTemplateVariables": true
        },
        {
          "id": "job_location",
          "label": "Job Location",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "Enter job site address",
          "required": true,
          "order": 2,
          "description": "Physical location of the project",
          "layout": {
            "x": 24,
            "y": 0,
            "w": 24,
            "h": 3
          }
        },
        {
          "id": "section_billed_to",
          "label": "Billed To",
          "field_type": "section",
          "required": false,
          "order": 3,
          "description": "Client billing information",
          "layout": {
            "x": 0,
            "y": 3,
            "w": 48,
            "h": 2
          },
          "styling": {
            "titleSize": "lg",
            "fontWeight": "semibold"
          }
        },
        {
          "id": "billed_to_name",
          "label": "Name",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "Client contact name",
          "required": true,
          "order": 4,
          "description": "Name of person to bill",
          "layout": {
            "x": 0,
            "y": 5,
            "w": 12,
            "h": 3
          }
        },
        {
          "id": "billed_to_company",
          "label": "Company",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "Client company name",
          "required": true,
          "order": 5,
          "description": "Company being billed",
          "layout": {
            "x": 12,
            "y": 5,
            "w": 12,
            "h": 3
          }
        },
        {
          "id": "client_address",
          "label": "Client Address",
          "field_type": "input",
          "input_type": "text",
          "placeholder": "Client billing address",
          "required": true,
          "order": 6,
          "description": "Billing address for the client",
          "layout": {
            "x": 24,
            "y": 5,
            "w": 24,
            "h": 3
          }
        }
      ]
    },

    {
      "id": "wall-systems",
      "name": "Wall Systems",
      "order": 2,
      "description": "Wall specs and dimensions",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "wall_systems_note",
          "label": "Product Configurator Required",
          "field_type": "text",
          "required": false,
          "order": 0,
          "description": "This section requires the Product Configurator custom component to manage wall specifications, dimensions, manufacturers, and products.",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 48,
            "h": 4
          },
          "styling": {
            "backgroundColor": "#fef3c7",
            "padding": 16,
            "borderRadius": 8,
            "fontWeight": "medium"
          }
        },
        {
          "id": "wall_configurator",
          "label": "Wall Configuration",
          "field_type": "custom",
          "required": true,
          "order": 1,
          "description": "Configure wall systems with products and specifications",
          "layout": {
            "x": 0,
            "y": 4,
            "w": 48,
            "h": 20
          },
          "customComponent": {
            "name": "ProductConfigurator",
            "props": {
              "type": "wall_system",
              "allowMultiple": true,
              "fields": ["name", "width", "height", "manufacturer", "product", "quantity"]
            }
          }
        }
      ]
    },

    {
      "id": "pocket-doors",
      "name": "Pocket Doors",
      "order": 3,
      "description": "Door configuration options",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "pocket_doors_note",
          "label": "Per-Wall Configuration",
          "field_type": "text",
          "required": false,
          "order": 0,
          "description": "Configure pocket door specifications for each wall. This requires the Product Configurator component with door-specific options.",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 48,
            "h": 4
          },
          "styling": {
            "backgroundColor": "#dbeafe",
            "padding": 16,
            "borderRadius": 8,
            "fontWeight": "medium"
          }
        },
        {
          "id": "pocket_door_configurator",
          "label": "Pocket Door Configuration",
          "field_type": "custom",
          "required": false,
          "order": 1,
          "description": "Configure pocket doors per wall",
          "layout": {
            "x": 0,
            "y": 4,
            "w": 48,
            "h": 15
          },
          "customComponent": {
            "name": "ProductConfigurator",
            "props": {
              "type": "pocket_door",
              "referenceField": "wall_configurator",
              "fields": ["fold_type", "fold_style"]
            }
          }
        }
      ]
    },

    {
      "id": "support-structure",
      "name": "Support Structure",
      "order": 4,
      "description": "Mounting & Support",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "support_structure_note",
          "label": "Per-Wall Configuration",
          "field_type": "text",
          "required": false,
          "order": 0,
          "description": "Configure support structure for each wall. This requires the Product Configurator component.",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 48,
            "h": 4
          },
          "styling": {
            "backgroundColor": "#e0e7ff",
            "padding": 16,
            "borderRadius": 8,
            "fontWeight": "medium"
          }
        },
        {
          "id": "support_structure_configurator",
          "label": "Support Structure",
          "field_type": "custom",
          "required": false,
          "order": 1,
          "description": "Configure support structure per wall",
          "layout": {
            "x": 0,
            "y": 4,
            "w": 48,
            "h": 12
          },
          "customComponent": {
            "name": "ProductConfigurator",
            "props": {
              "type": "support_structure",
              "referenceField": "wall_configurator",
              "fields": ["structure_type"]
            }
          }
        }
      ]
    },

    {
      "id": "delivery-labor",
      "name": "Delivery & Labor",
      "order": 5,
      "description": "Timeline & Labor requirements",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "section_delivery",
          "label": "Delivery Timeline",
          "field_type": "section",
          "required": false,
          "order": 0,
          "description": "Delivery schedule for materials",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 48,
            "h": 2
          },
          "styling": {
            "titleSize": "lg",
            "fontWeight": "semibold"
          }
        },
        {
          "id": "shop_drawing_delivery",
          "label": "Shop Drawing Delivery (Weeks)",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 2",
          "required": true,
          "order": 1,
          "description": "Weeks until shop drawings are delivered",
          "layout": {
            "x": 0,
            "y": 2,
            "w": 16,
            "h": 3
          },
          "number_format": "integer"
        },
        {
          "id": "track_delivery",
          "label": "Track Delivery (Weeks)",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 4",
          "required": true,
          "order": 2,
          "description": "Weeks until track delivery",
          "layout": {
            "x": 16,
            "y": 2,
            "w": 16,
            "h": 3
          },
          "number_format": "integer"
        },
        {
          "id": "panel_delivery",
          "label": "Panel Delivery (Weeks)",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 6",
          "required": true,
          "order": 3,
          "description": "Weeks until panel delivery",
          "layout": {
            "x": 32,
            "y": 2,
            "w": 16,
            "h": 3
          },
          "number_format": "integer"
        },
        {
          "id": "section_installation",
          "label": "Installation Timeline",
          "field_type": "section",
          "required": false,
          "order": 4,
          "description": "Installation schedule",
          "layout": {
            "x": 0,
            "y": 5,
            "w": 48,
            "h": 2
          },
          "styling": {
            "titleSize": "lg",
            "fontWeight": "semibold"
          }
        },
        {
          "id": "track_installation",
          "label": "Track Installation (Days)",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 3",
          "required": true,
          "order": 5,
          "description": "Days to install track",
          "layout": {
            "x": 0,
            "y": 7,
            "w": 24,
            "h": 3
          },
          "number_format": "integer"
        },
        {
          "id": "panel_installation",
          "label": "Panel Installation (Days)",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 5",
          "required": true,
          "order": 6,
          "description": "Days to install panels",
          "layout": {
            "x": 24,
            "y": 7,
            "w": 24,
            "h": 3
          },
          "number_format": "integer"
        },
        {
          "id": "section_labor",
          "label": "Labor Information",
          "field_type": "section",
          "required": false,
          "order": 7,
          "description": "Labor specifications",
          "layout": {
            "x": 0,
            "y": 10,
            "w": 48,
            "h": 2
          },
          "styling": {
            "titleSize": "lg",
            "fontWeight": "semibold"
          }
        },
        {
          "id": "labor_type",
          "label": "Labor Type",
          "field_type": "select",
          "placeholder": "Select labor type",
          "required": true,
          "order": 8,
          "description": "Type of labor required",
          "layout": {
            "x": 0,
            "y": 12,
            "w": 24,
            "h": 3
          },
          "options": [
            "Union",
            "Non-Union",
            "Prevailing Wage"
          ]
        },
        {
          "id": "wage_rate",
          "label": "Wage Rate",
          "field_type": "select",
          "placeholder": "Select wage rate",
          "required": true,
          "order": 9,
          "description": "Applicable wage rate",
          "layout": {
            "x": 24,
            "y": 12,
            "w": 24,
            "h": 3
          },
          "options": [
            "Standard",
            "Premium",
            "Overtime",
            "Double Time"
          ]
        }
      ]
    },

    {
      "id": "pricing",
      "name": "Pricing",
      "order": 6,
      "description": "Pricing and payment terms",
      "layoutMode": "grid",
      "fields": [
        {
          "id": "pricing_note",
          "label": "Enhanced Pricing",
          "field_type": "text",
          "required": false,
          "order": 0,
          "description": "Use the EnhancedPricingForm component for comprehensive pricing calculations including materials, labor, delivery, markup, taxes, and payment terms.",
          "layout": {
            "x": 0,
            "y": 0,
            "w": 48,
            "h": 4
          },
          "styling": {
            "backgroundColor": "#dcfce7",
            "padding": 16,
            "borderRadius": 8,
            "fontWeight": "medium"
          }
        },
        {
          "id": "kwik_wall_materials_cost",
          "label": "Kwik Wall Materials Cost",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 1,
          "description": "Cost of Kwik Wall materials",
          "layout": {
            "x": 0,
            "y": 4,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "misc_materials_cost",
          "label": "Miscellaneous Materials Cost",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 2,
          "description": "Cost of miscellaneous materials",
          "layout": {
            "x": 24,
            "y": 4,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "delivery_cost_track",
          "label": "Track Delivery Cost",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 3,
          "description": "Delivery cost for track",
          "layout": {
            "x": 0,
            "y": 7,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "delivery_cost_panel",
          "label": "Panel Delivery Cost",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 4,
          "description": "Delivery cost for panels",
          "layout": {
            "x": 24,
            "y": 7,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "track_equipment_costs",
          "label": "Track Equipment Costs",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 5,
          "description": "Equipment costs for track installation",
          "layout": {
            "x": 0,
            "y": 10,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "track_labor_cost",
          "label": "Track Labor Cost",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 6,
          "description": "Labor cost for track installation",
          "layout": {
            "x": 24,
            "y": 10,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "panel_equipment_costs",
          "label": "Panel Equipment Costs",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 7,
          "description": "Equipment costs for panel installation",
          "layout": {
            "x": 0,
            "y": 13,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "panel_labor_cost",
          "label": "Panel Labor Cost",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "0.00",
          "required": true,
          "order": 8,
          "description": "Labor cost for panel installation",
          "layout": {
            "x": 24,
            "y": 13,
            "w": 24,
            "h": 3
          },
          "number_format": "currency"
        },
        {
          "id": "markup_percentage",
          "label": "Markup Percentage",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 20",
          "required": true,
          "order": 9,
          "description": "Markup percentage on costs",
          "layout": {
            "x": 0,
            "y": 16,
            "w": 16,
            "h": 3
          },
          "number_format": "percent"
        },
        {
          "id": "tax_percentage",
          "label": "Tax Percentage",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 8.5",
          "required": false,
          "order": 10,
          "description": "Sales tax percentage (optional)",
          "layout": {
            "x": 16,
            "y": 16,
            "w": 16,
            "h": 3
          },
          "number_format": "percent"
        },
        {
          "id": "discount_percentage",
          "label": "Discount Percentage",
          "field_type": "input",
          "input_type": "number",
          "placeholder": "e.g., 5",
          "required": false,
          "order": 11,
          "description": "Discount percentage (optional)",
          "layout": {
            "x": 32,
            "y": 16,
            "w": 16,
            "h": 3
          },
          "number_format": "percent"
        },
        {
          "id": "payment_terms",
          "label": "Payment Terms",
          "field_type": "textarea",
          "placeholder": "Enter payment terms...",
          "required": false,
          "order": 12,
          "description": "Payment terms and conditions",
          "layout": {
            "x": 0,
            "y": 19,
            "w": 48,
            "h": 4
          }
        }
      ]
    }
  ]'::jsonb,
  'eee4c126-5f93-4c80-b57a-c6cc487fca1c', -- Replace with your user ID
  NOW(),
  NOW(),
  true,
  true, -- Set as default form
  'Q15010', -- Starting proposal number
  true -- Allow save incomplete
);