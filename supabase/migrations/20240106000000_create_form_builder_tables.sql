-- Form Builder Tables
-- This migration creates tables for the custom form builder feature
-- Note: Separate from any existing form_data/form_profile_id columns on quotes table

-- Custom form definitions (reusable form templates)
CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],
  tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_definitions_created_by ON form_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_form_definitions_is_active ON form_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_form_definitions_category ON form_definitions(category);

-- Enable RLS
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own forms"
  ON form_definitions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own forms"
  ON form_definitions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own forms"
  ON form_definitions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own forms"
  ON form_definitions FOR DELETE
  USING (auth.uid() = created_by);

-- Form submissions table (for storing filled form data)
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES form_definitions(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by ON form_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);

-- Enable RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form submissions
CREATE POLICY "Users can view their own submissions"
  ON form_submissions FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Users can create their own submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update their own submissions"
  ON form_submissions FOR UPDATE
  USING (auth.uid() = submitted_by);

CREATE POLICY "Users can delete their own submissions"
  ON form_submissions FOR DELETE
  USING (auth.uid() = submitted_by);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_form_definitions_updated_at
  BEFORE UPDATE ON form_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
