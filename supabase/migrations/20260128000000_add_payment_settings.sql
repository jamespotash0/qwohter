-- Add payment_settings JSONB column to organizations table
-- Stores payment collection configuration for client-facing invoices
-- Structure: { bank_name, routing_number, account_number, payment_url, payment_button_label, invoice_prefix }

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}';
