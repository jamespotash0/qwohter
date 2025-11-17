# Proposals System Implementation Plan
## Progressive Multi-Type Proposal System

**Philosophy:** Start simple (quotes only), grow organically as users need more features.

---

## Table of Contents
1. [Phase 1: MVP - Quotes Only](#phase-1-mvp---quotes-only)
2. [Phase 2: Multi-Type Foundation](#phase-2-multi-type-foundation)
3. [Phase 3: Custom Forms & Types](#phase-3-custom-forms--types)
4. [Phase 4: Advanced Analytics](#phase-4-advanced-analytics)
5. [Database Schema Evolution](#database-schema-evolution)
6. [Migration Scripts](#migration-scripts)

---

## Phase 1: MVP - Quotes Only
**Timeline:** Week 1-2
**Goal:** Launch with single type (quotes), clean foundation for future growth

### 1.1 Database Setup

#### Task 1.1.1: Update quotes table to support future expansion
**File:** `supabase/migrations/XXX_prepare_quotes_for_proposals.sql`

```sql
-- Add columns for future multi-type support (but don't use them yet)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS proposal_data JSONB;

-- Update proposal_data from existing columns (backward compatibility)
UPDATE quotes
SET proposal_data = jsonb_build_object(
  'quote_details', quote_details,
  'wall_details', wall_details,
  'job_details', job_details,
  'price_details', price_details,
  'delivery_details', delivery_details,
  'organization_info', organization_info
)
WHERE proposal_data IS NULL;

-- Keep existing columns for now (we'll deprecate later)
-- This ensures zero breaking changes to existing code

-- Add index for future type-based queries
CREATE INDEX IF NOT EXISTS idx_quotes_type_status
  ON quotes(proposal_type, status);

-- Add index for status-based analytics
CREATE INDEX IF NOT EXISTS idx_quotes_status_created
  ON quotes(status, created_at DESC);

COMMENT ON COLUMN quotes.proposal_type IS 'Type of proposal: quote (default), service_request, consultation, change_order';
COMMENT ON COLUMN quotes.proposal_data IS 'Flexible JSONB storage for type-specific data';
```

**Action Items:**
- [ ] Create migration file
- [ ] Test migration on staging
- [ ] Run migration on production
- [ ] Verify no breaking changes

#### Task 1.1.2: Add numbering config to organizations table
**File:** `supabase/migrations/XXX_add_numbering_config.sql`

```sql
-- Add numbering configuration to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS numbering_config JSONB DEFAULT jsonb_build_object(
    'prefixes', jsonb_build_object(
      'quote', jsonb_build_object(
        'prefix', 'Q',
        'current_sequence', 0,
        'format', '{PREFIX}-{YEAR}-{SEQUENCE}'
      )
    ),
    'reset_yearly', true
  );

-- Backfill existing organizations with default config
UPDATE organizations
SET numbering_config = jsonb_build_object(
  'prefixes', jsonb_build_object(
    'quote', jsonb_build_object(
      'prefix', 'Q',
      'current_sequence', COALESCE(
        (SELECT COUNT(*) FROM quotes WHERE quotes.organization_id = organizations.id),
        0
      ),
      'format', '{PREFIX}-{YEAR}-{SEQUENCE}'
    )
  ),
  'reset_yearly', true
)
WHERE numbering_config IS NULL;

COMMENT ON COLUMN organizations.numbering_config IS 'Proposal numbering configuration (grows as new types are used)';
```

**Action Items:**
- [ ] Create migration file
- [ ] Test on staging with existing orgs
- [ ] Verify current sequences match actual quote counts
- [ ] Run on production

### 1.2 Backend Services

#### Task 1.2.1: Create proposal numbering service
**File:** `src/services/proposalNumberingService.ts`

```typescript
/**
 * Proposal Numbering Service
 *
 * Generates unique proposal numbers based on org configuration
 * Format: {PREFIX}-{YEAR}-{SEQUENCE}
 * Example: Q-2025-001
 */

import { supabase } from '@/integrations/supabase/client';

export type ProposalType = 'quote' | 'service_request' | 'consultation' | 'change_order';

interface NumberingConfig {
  prefixes: Record<ProposalType, {
    prefix: string;
    current_sequence: number;
    format: string;
  }>;
  reset_yearly: boolean;
}

/**
 * Generate next proposal number for given type
 */
export async function generateProposalNumber(
  organizationId: string,
  proposalType: ProposalType = 'quote'
): Promise<{ success: boolean; proposalNumber?: string; error?: string }> {
  try {
    // Get current numbering config
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('numbering_config')
      .eq('id', organizationId)
      .single();

    if (fetchError) throw fetchError;

    const config = org.numbering_config as NumberingConfig;
    const typeConfig = config.prefixes[proposalType];

    // If type doesn't exist in config, initialize it
    if (!typeConfig) {
      const newPrefix = getDefaultPrefix(proposalType);
      config.prefixes[proposalType] = {
        prefix: newPrefix,
        current_sequence: 0,
        format: '{PREFIX}-{YEAR}-{SEQUENCE}'
      };
    }

    // Get current year
    const year = new Date().getFullYear();

    // Check if we need to reset sequence (yearly reset)
    const lastProposal = await getLastProposalNumber(organizationId, proposalType);
    const shouldReset = config.reset_yearly && lastProposal && !lastProposal.includes(year.toString());

    // Increment sequence
    const nextSequence = shouldReset ? 1 : (typeConfig.current_sequence + 1);

    // Format proposal number
    const proposalNumber = formatProposalNumber(
      typeConfig.prefix,
      year,
      nextSequence,
      typeConfig.format
    );

    // Update config with new sequence
    config.prefixes[proposalType].current_sequence = nextSequence;

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ numbering_config: config })
      .eq('id', organizationId);

    if (updateError) throw updateError;

    return { success: true, proposalNumber };
  } catch (error) {
    console.error('Error generating proposal number:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate proposal number'
    };
  }
}

/**
 * Get default prefix for proposal type
 */
function getDefaultPrefix(proposalType: ProposalType): string {
  const prefixes: Record<ProposalType, string> = {
    quote: 'Q',
    service_request: 'SR',
    consultation: 'C',
    change_order: 'CO'
  };
  return prefixes[proposalType];
}

/**
 * Format proposal number from components
 */
function formatProposalNumber(
  prefix: string,
  year: number,
  sequence: number,
  format: string
): string {
  return format
    .replace('{PREFIX}', prefix)
    .replace('{YEAR}', year.toString())
    .replace('{SEQUENCE}', sequence.toString().padStart(3, '0'));
}

/**
 * Get last proposal number for type (to check year)
 */
async function getLastProposalNumber(
  organizationId: string,
  proposalType: ProposalType
): Promise<string | null> {
  const { data } = await supabase
    .from('quotes')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .eq('proposal_type', proposalType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.proposal_number || null;
}

/**
 * Validate proposal number format
 */
export function validateProposalNumber(proposalNumber: string): boolean {
  // Format: PREFIX-YEAR-SEQUENCE
  const regex = /^[A-Z]+-\d{4}-\d{3,}$/;
  return regex.test(proposalNumber);
}

/**
 * Parse proposal number into components
 */
export function parseProposalNumber(proposalNumber: string): {
  prefix: string;
  year: string;
  sequence: string;
} | null {
  const match = proposalNumber.match(/^([A-Z]+)-(\d{4})-(\d{3,})$/);
  if (!match) return null;

  return {
    prefix: match[1],
    year: match[2],
    sequence: match[3]
  };
}
```

**Action Items:**
- [ ] Create service file
- [ ] Write unit tests for numbering logic
- [ ] Test yearly reset logic
- [ ] Test concurrent number generation (race conditions)
- [ ] Add error handling for database conflicts

#### Task 1.2.2: Update quotesService to use new numbering
**File:** `src/services/quotesService.ts` (update)

```typescript
import { generateProposalNumber } from './proposalNumberingService';

// In createQuote function, replace manual proposal_number with:
export async function createQuote(quoteData: CreateQuoteData): Promise<Quote> {
  // Generate proposal number
  const { success, proposalNumber, error } = await generateProposalNumber(
    quoteData.organization_id,
    'quote'
  );

  if (!success || !proposalNumber) {
    throw new Error(`Failed to generate proposal number: ${error}`);
  }

  // Create quote with generated number
  const { data, error: insertError } = await supabase
    .from('quotes')
    .insert({
      ...quoteData,
      proposal_number: proposalNumber,
      proposal_type: 'quote' // Always 'quote' in MVP
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return data;
}
```

**Action Items:**
- [ ] Update createQuote function
- [ ] Remove old manual numbering logic
- [ ] Test quote creation with new numbering
- [ ] Verify unique constraint works

### 1.3 Frontend Updates

#### Task 1.3.1: Update quotes list UI (no visible changes)
**File:** `src/pages/Quotes.tsx` (verify works with new schema)

**Action Items:**
- [ ] Test quotes list renders correctly
- [ ] Verify proposal_number displays
- [ ] Test filtering and sorting
- [ ] Confirm no breaking changes

#### Task 1.3.2: Update analytics to use status categories
**File:** `src/pages/Analytics.tsx`

```typescript
import { getStatusCategory, CATEGORY_CONFIG } from '@/lib/constants/statusCategories';

// Update win rate calculation to use status categories
const calculateWinRate = (quotes: Quote[]) => {
  const closedQuotes = quotes.filter(q =>
    ['closed_won', 'closed_lost'].includes(getStatusCategory(q.status))
  );

  const won = closedQuotes.filter(q =>
    getStatusCategory(q.status) === 'closed_won'
  ).length;

  return closedQuotes.length > 0 ? (won / closedQuotes.length) * 100 : 0;
};

// Group quotes by status category for dashboard
const quotesByCategory = quotes.reduce((acc, quote) => {
  const category = getStatusCategory(quote.status);
  acc[category] = (acc[category] || 0) + 1;
  return acc;
}, {} as Record<StatusCategory, number>);
```

**Action Items:**
- [ ] Update analytics queries to use status categories
- [ ] Test win rate calculation
- [ ] Verify revenue metrics
- [ ] Test charts render correctly

### 1.4 Testing & Validation

#### Task 1.4.1: End-to-end testing
**Test Cases:**
1. Create new quote → verify Q-2025-XXX format
2. Create 10 quotes → verify sequence increments correctly
3. Check analytics → verify status grouping works
4. Create quote in new year → verify yearly reset (if enabled)
5. Test with existing quotes → verify backward compatibility

**Action Items:**
- [ ] Write E2E tests
- [ ] Manual testing on staging
- [ ] Load testing for numbering service
- [ ] Verify no data loss during migration

---

## Phase 2: Multi-Type Foundation
**Timeline:** Week 3-4
**Goal:** Enable multiple proposal types (but don't expose in UI yet)

### 2.1 Database Updates

#### Task 2.1.1: Expand status values
**File:** `supabase/migrations/XXX_expand_status_values.sql`

```sql
-- Remove old status constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

-- Add new comprehensive status constraint
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
CHECK (status IN (
  'draft', 'sent', 'approved', 'rejected',       -- Pre-approval
  'scheduled', 'in_progress', 'completed',        -- Execution
  'invoiced', 'paid',                             -- Payment
  'on_hold', 'cancelled'                          -- Other
));

-- Update existing status values for consistency
UPDATE quotes
SET status = CASE
  WHEN status = 'accepted' THEN 'approved'
  WHEN status = 'won' THEN 'paid'
  ELSE status
END
WHERE status IN ('accepted', 'won');

-- Add comment explaining status lifecycle
COMMENT ON COLUMN quotes.status IS 'Proposal status: draft→sent→approved→[scheduled→in_progress→completed]→invoiced→paid';
```

**Action Items:**
- [ ] Create migration
- [ ] Test on staging with all existing statuses
- [ ] Update documentation
- [ ] Run on production

### 2.2 Backend Services

#### Task 2.2.1: Create proposal type configuration service
**File:** `src/services/proposalTypeService.ts`

```typescript
/**
 * Proposal Type Configuration Service
 *
 * Manages proposal type metadata and workflows
 */

import { ProposalType } from './proposalNumberingService';
import { RequestStatus } from '@/lib/constants/statusCategories';

export interface ProposalTypeConfig {
  id: ProposalType;
  label: string;
  description: string;
  icon: string;
  defaultPrefix: string;
  allowedStatuses: RequestStatus[];
  workflow: string;
  requiresScheduling: boolean;
  requiresExecution: boolean;
}

export const PROPOSAL_TYPE_CONFIGS: Record<ProposalType, ProposalTypeConfig> = {
  quote: {
    id: 'quote',
    label: 'Quote',
    description: 'Standard project quote or estimate',
    icon: 'FileText',
    defaultPrefix: 'Q',
    allowedStatuses: ['draft', 'sent', 'approved', 'rejected', 'invoiced', 'paid', 'on_hold', 'cancelled'],
    workflow: 'draft → sent → approved → invoiced → paid',
    requiresScheduling: false,
    requiresExecution: false
  },
  service_request: {
    id: 'service_request',
    label: 'Service Request',
    description: 'Repair, maintenance, or service quote',
    icon: 'Wrench',
    defaultPrefix: 'SR',
    allowedStatuses: ['draft', 'sent', 'approved', 'rejected', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'on_hold', 'cancelled'],
    workflow: 'draft → sent → approved → scheduled → in_progress → completed → invoiced → paid',
    requiresScheduling: true,
    requiresExecution: true
  },
  consultation: {
    id: 'consultation',
    label: 'Consultation',
    description: 'Site visit or assessment quote',
    icon: 'Clipboard',
    defaultPrefix: 'C',
    allowedStatuses: ['draft', 'sent', 'approved', 'rejected', 'scheduled', 'completed', 'invoiced', 'paid', 'on_hold', 'cancelled'],
    workflow: 'draft → sent → approved → scheduled → completed → invoiced → paid',
    requiresScheduling: true,
    requiresExecution: true
  },
  change_order: {
    id: 'change_order',
    label: 'Change Order',
    description: 'Modification to existing project',
    icon: 'GitBranch',
    defaultPrefix: 'CO',
    allowedStatuses: ['draft', 'sent', 'approved', 'rejected', 'invoiced', 'paid', 'on_hold', 'cancelled'],
    workflow: 'draft → sent → approved → invoiced → paid',
    requiresScheduling: false,
    requiresExecution: false
  }
};

/**
 * Get proposal type configuration
 */
export function getProposalTypeConfig(type: ProposalType): ProposalTypeConfig {
  return PROPOSAL_TYPE_CONFIGS[type];
}

/**
 * Get all available proposal types
 */
export function getAllProposalTypes(): ProposalTypeConfig[] {
  return Object.values(PROPOSAL_TYPE_CONFIGS);
}

/**
 * Check if status is valid for proposal type
 */
export function isValidStatusForType(
  status: RequestStatus,
  proposalType: ProposalType
): boolean {
  const config = PROPOSAL_TYPE_CONFIGS[proposalType];
  return config.allowedStatuses.includes(status);
}

/**
 * Get active proposal types for organization
 * (types they've actually used)
 */
export async function getActiveProposalTypes(
  organizationId: string
): Promise<ProposalType[]> {
  const { data } = await supabase
    .from('quotes')
    .select('proposal_type')
    .eq('organization_id', organizationId)
    .distinct();

  return (data?.map(d => d.proposal_type) || ['quote']) as ProposalType[];
}
```

**Action Items:**
- [ ] Create service file
- [ ] Add icons to project
- [ ] Write unit tests
- [ ] Document type workflows

### 2.3 Analytics Updates

#### Task 2.3.1: Create multi-type analytics queries
**File:** `src/hooks/queries/useProposalAnalytics.ts`

```typescript
/**
 * Proposal Analytics Hooks
 *
 * Automatically adapts to proposal types organization uses
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStatusCategory } from '@/lib/constants/statusCategories';
import type { ProposalType } from '@/services/proposalNumberingService';

/**
 * Get proposal counts by type and status category
 */
export function useProposalsByTypeAndCategory(organizationId: string) {
  return useQuery({
    queryKey: ['proposals-by-type-category', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('proposal_type, status, total_amount')
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Group by type and category
      const grouped = data.reduce((acc, proposal) => {
        const type = proposal.proposal_type as ProposalType;
        const category = getStatusCategory(proposal.status);

        if (!acc[type]) {
          acc[type] = {};
        }
        if (!acc[type][category]) {
          acc[type][category] = { count: 0, value: 0 };
        }

        acc[type][category].count++;
        acc[type][category].value += proposal.total_amount || 0;

        return acc;
      }, {} as Record<ProposalType, Record<string, { count: number; value: number }>>);

      return grouped;
    },
    enabled: !!organizationId
  });
}

/**
 * Get win rate by proposal type
 */
export function useWinRateByType(organizationId: string) {
  return useQuery({
    queryKey: ['win-rate-by-type', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('proposal_type, status')
        .eq('organization_id', organizationId)
        .in('status', ['paid', 'rejected', 'cancelled']);

      if (error) throw error;

      // Calculate win rate per type
      const winRates = data.reduce((acc, proposal) => {
        const type = proposal.proposal_type as ProposalType;
        const category = getStatusCategory(proposal.status);

        if (!acc[type]) {
          acc[type] = { won: 0, lost: 0, total: 0 };
        }

        acc[type].total++;
        if (category === 'closed_won') {
          acc[type].won++;
        } else if (category === 'closed_lost') {
          acc[type].lost++;
        }

        return acc;
      }, {} as Record<ProposalType, { won: number; lost: number; total: number }>);

      // Calculate percentages
      return Object.entries(winRates).map(([type, stats]) => ({
        type: type as ProposalType,
        winRate: stats.total > 0 ? (stats.won / stats.total) * 100 : 0,
        won: stats.won,
        lost: stats.lost,
        total: stats.total
      }));
    },
    enabled: !!organizationId
  });
}

/**
 * Get revenue by status category (universal)
 */
export function useRevenueByCategory(organizationId: string) {
  return useQuery({
    queryKey: ['revenue-by-category', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('status, total_amount')
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Group by status category
      const grouped = data.reduce((acc, proposal) => {
        const category = getStatusCategory(proposal.status);
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += proposal.total_amount || 0;
        return acc;
      }, {} as Record<string, number>);

      return grouped;
    },
    enabled: !!organizationId
  });
}
```

**Action Items:**
- [ ] Create analytics hooks
- [ ] Write unit tests
- [ ] Test with single type (quotes only)
- [ ] Test with multiple types
- [ ] Verify performance with large datasets

---

## Phase 3: Custom Forms & Types
**Timeline:** Week 5-8
**Goal:** Allow users to create custom forms that generate new proposal types

### 3.1 Custom Forms System

#### Task 3.1.1: Create custom_forms table
**File:** `supabase/migrations/XXX_create_custom_forms.sql`

```sql
CREATE TABLE custom_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Form identity
  name TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT NOT NULL, -- 'quote' | 'service_request' | 'consultation' | 'change_order'

  -- Numbering
  custom_prefix TEXT, -- Override default prefix (e.g., 'ER' for Emergency Repairs)

  -- Form schema (JSON schema definition)
  form_schema JSONB NOT NULL,

  -- Display settings
  icon TEXT DEFAULT 'FileText',
  color TEXT DEFAULT '#3B82F6',

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Is this the default form for this type?

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_custom_forms_org ON custom_forms(organization_id);
CREATE INDEX idx_custom_forms_type ON custom_forms(proposal_type);

-- RLS policies
ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forms in their organization"
  ON custom_forms FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Admins can manage forms"
  ON custom_forms FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND status = 'Active'
        AND role IN ('Owner', 'Admin')
    )
  );

COMMENT ON TABLE custom_forms IS 'Custom form definitions for different proposal types';
```

**Action Items:**
- [ ] Create migration
- [ ] Test RLS policies
- [ ] Run on staging
- [ ] Run on production

#### Task 3.1.2: Create form builder UI
**File:** `src/pages/FormBuilder.tsx`

```typescript
/**
 * Form Builder Page
 *
 * Allows users to create custom forms for different proposal types
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROPOSAL_TYPE_CONFIGS, type ProposalType } from '@/services/proposalTypeService';

export default function FormBuilder() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    proposalType: 'quote' as ProposalType,
    customPrefix: ''
  });

  // Auto-suggest prefix from form name
  const suggestPrefix = (name: string): string => {
    // Take first letters of each word, max 4 characters
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .slice(0, 4);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      customPrefix: suggestPrefix(name)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Custom Form</h1>

      <div className="space-y-6">
        {/* Form Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Form Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Emergency Repair Requests"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Form for urgent repair and maintenance requests"
          />
        </div>

        {/* Proposal Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            What type of document is this?
          </label>
          <Select
            value={formData.proposalType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, proposalType: value as ProposalType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PROPOSAL_TYPE_CONFIGS).map(config => (
                <SelectItem key={config.id} value={config.id}>
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Prefix */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Proposal Number Prefix
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={formData.customPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, customPrefix: e.target.value.toUpperCase() }))}
              placeholder="ER"
              className="w-24 text-center uppercase"
              maxLength={4}
            />
            <span className="text-muted-foreground">-2025-###</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Example: {formData.customPrefix || 'ER'}-2025-001, {formData.customPrefix || 'ER'}-2025-002, etc.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={() => navigate('/settings')}>
            Cancel
          </Button>
          <Button variant="default">
            Create Form
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Action Items:**
- [ ] Create form builder page
- [ ] Add route to router
- [ ] Implement form field editor
- [ ] Test prefix auto-suggestion
- [ ] Add validation

### 3.2 First-Time Type Setup Modal

#### Task 3.2.1: Create first-time setup modal component
**File:** `src/components/proposals/FirstTimeTypeSetupModal.tsx`

```typescript
/**
 * First Time Type Setup Modal
 *
 * Shows when user creates first proposal of new type
 * Lets them confirm/customize numbering format
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PartyPopper } from 'lucide-react';
import type { ProposalType } from '@/services/proposalNumberingService';
import { getProposalTypeConfig } from '@/services/proposalTypeService';

interface FirstTimeTypeSetupModalProps {
  proposalType: ProposalType;
  isOpen: boolean;
  onConfirm: (prefix: string, startingNumber: number) => void;
  onCancel: () => void;
}

export function FirstTimeTypeSetupModal({
  proposalType,
  isOpen,
  onConfirm,
  onCancel
}: FirstTimeTypeSetupModalProps) {
  const typeConfig = getProposalTypeConfig(proposalType);
  const [prefix, setPrefix] = useState(typeConfig.defaultPrefix);
  const [startingNumber, setStartingNumber] = useState(1);

  const year = new Date().getFullYear();
  const exampleNumber = `${prefix}-${year}-${startingNumber.toString().padStart(3, '0')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <PartyPopper className="w-6 h-6 text-blue-500" />
            <DialogTitle>First {typeConfig.label}!</DialogTitle>
          </div>
          <DialogDescription>
            This is your first "{typeConfig.label}" proposal. Let's set up numbering for this type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Numbering Format
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="w-20 text-center uppercase"
                maxLength={4}
              />
              <span className="text-muted-foreground">-{year}-</span>
              <Input
                type="number"
                value={startingNumber}
                onChange={(e) => setStartingNumber(parseInt(e.target.value) || 1)}
                className="w-20 text-center"
                min={1}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Example: {exampleNumber}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              You can change this later in Settings → Proposal Numbering
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(prefix, startingNumber)}>
            Save & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Action Items:**
- [ ] Create modal component
- [ ] Add to quote creation flow
- [ ] Test modal behavior
- [ ] Store "seen" state to prevent showing twice

---

## Phase 4: Advanced Analytics
**Timeline:** Week 9-10
**Goal:** Rich analytics that adapt to proposal types organization uses

### 4.1 Analytics Dashboard

#### Task 4.1.1: Create adaptive analytics dashboard
**File:** `src/pages/Analytics.tsx` (major update)

```typescript
/**
 * Analytics Dashboard
 *
 * Automatically adapts to proposal types organization uses
 */

import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';
import { useProposalsByTypeAndCategory, useWinRateByType, useRevenueByCategory } from '@/hooks/queries/useProposalAnalytics';
import { getActiveProposalTypes } from '@/services/proposalTypeService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export default function Analytics() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');

  const { data: activeTypes } = useQuery({
    queryKey: ['active-types', organization?.id],
    queryFn: () => getActiveProposalTypes(organization!.id),
    enabled: !!organization?.id
  });

  const { data: proposalsByTypeCategory } = useProposalsByTypeAndCategory(organization?.id || '');
  const { data: winRates } = useWinRateByType(organization?.id || '');
  const { data: revenueByCategory } = useRevenueByCategory(organization?.id || '');

  // Only show type tabs if multiple types exist
  const showTypeTabs = (activeTypes?.length || 0) > 1;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      {/* Universal Metrics (work across all types) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">
            {formatCurrency(Object.values(revenueByCategory || {}).reduce((a, b) => a + b, 0))}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Overall Win Rate</h3>
          <p className="text-3xl font-bold mt-2">
            {calculateOverallWinRate(winRates || [])}%
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Proposals</h3>
          <p className="text-3xl font-bold mt-2">
            {calculateTotalProposals(proposalsByTypeCategory || {})}
          </p>
        </Card>
      </div>

      {/* Type-Specific Analytics (only if multiple types) */}
      {showTypeTabs ? (
        <Tabs defaultValue={activeTypes?.[0] || 'quote'}>
          <TabsList>
            {activeTypes?.map(type => (
              <TabsTrigger key={type} value={type}>
                {getProposalTypeConfig(type).label}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeTypes?.map(type => (
            <TabsContent key={type} value={type}>
              {/* Type-specific charts and metrics */}
              <TypeSpecificAnalytics type={type} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        // Single type (quotes only) - show without tabs
        <TypeSpecificAnalytics type="quote" />
      )}
    </div>
  );
}
```

**Action Items:**
- [ ] Update Analytics page
- [ ] Create type-specific components
- [ ] Add charts library integration
- [ ] Test with single type
- [ ] Test with multiple types
- [ ] Performance optimization

---

## Migration Scripts

### Script 1: Prep Quotes Table (Phase 1)
```sql
-- File: supabase/migrations/001_prep_quotes_for_proposals.sql
-- Run: Week 1, Day 1

BEGIN;

-- Add new columns (safe, backward compatible)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS proposal_data JSONB;

-- Backfill proposal_data from existing columns
UPDATE quotes
SET proposal_data = jsonb_build_object(
  'quote_details', quote_details,
  'wall_details', wall_details,
  'job_details', job_details,
  'price_details', price_details,
  'delivery_details', delivery_details,
  'organization_info', organization_info
)
WHERE proposal_data IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quotes_type_status
  ON quotes(proposal_type, status);
CREATE INDEX IF NOT EXISTS idx_quotes_status_created
  ON quotes(status, created_at DESC);

-- Add comments
COMMENT ON COLUMN quotes.proposal_type IS 'Type of proposal: quote (default), service_request, consultation, change_order';
COMMENT ON COLUMN quotes.proposal_data IS 'Flexible JSONB storage for type-specific data';

COMMIT;
```

### Script 2: Add Numbering Config (Phase 1)
```sql
-- File: supabase/migrations/002_add_numbering_config.sql
-- Run: Week 1, Day 2

BEGIN;

-- Add numbering configuration to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS numbering_config JSONB DEFAULT jsonb_build_object(
    'prefixes', jsonb_build_object(
      'quote', jsonb_build_object(
        'prefix', 'Q',
        'current_sequence', 0,
        'format', '{PREFIX}-{YEAR}-{SEQUENCE}'
      )
    ),
    'reset_yearly', true
  );

-- Backfill with correct sequence numbers
UPDATE organizations org
SET numbering_config = jsonb_build_object(
  'prefixes', jsonb_build_object(
    'quote', jsonb_build_object(
      'prefix', 'Q',
      'current_sequence', (
        SELECT COUNT(*)
        FROM quotes
        WHERE quotes.organization_id = org.id
      ),
      'format', '{PREFIX}-{YEAR}-{SEQUENCE}'
    )
  ),
  'reset_yearly', true
)
WHERE numbering_config IS NULL;

COMMIT;
```

### Script 3: Expand Status Values (Phase 2)
```sql
-- File: supabase/migrations/003_expand_status_values.sql
-- Run: Week 3, Day 1

BEGIN;

-- Remove old constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

-- Add comprehensive constraint
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
CHECK (status IN (
  'draft', 'sent', 'approved', 'rejected',
  'scheduled', 'in_progress', 'completed',
  'invoiced', 'paid',
  'on_hold', 'cancelled'
));

-- Migrate old status values
UPDATE quotes
SET status = CASE
  WHEN status = 'accepted' THEN 'approved'
  WHEN status = 'won' THEN 'paid'
  ELSE status
END
WHERE status IN ('accepted', 'won');

COMMENT ON COLUMN quotes.status IS 'Proposal status lifecycle: draft→sent→approved→[scheduled→in_progress→completed]→invoiced→paid';

COMMIT;
```

### Script 4: Create Custom Forms Table (Phase 3)
```sql
-- File: supabase/migrations/004_create_custom_forms.sql
-- Run: Week 5, Day 1

BEGIN;

CREATE TABLE custom_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT NOT NULL,
  custom_prefix TEXT,

  form_schema JSONB NOT NULL,

  icon TEXT DEFAULT 'FileText',
  color TEXT DEFAULT '#3B82F6',

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_custom_forms_org ON custom_forms(organization_id);
CREATE INDEX idx_custom_forms_type ON custom_forms(proposal_type);

-- RLS
ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forms in their organization"
  ON custom_forms FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Admins can manage forms"
  ON custom_forms FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND status = 'Active'
        AND role IN ('Owner', 'Admin')
    )
  );

COMMIT;
```

---

## Testing Checklist

### Phase 1 Testing (MVP)
- [ ] Create new organization → verify default numbering config
- [ ] Create quote → verify Q-2025-001 format
- [ ] Create 100 quotes → verify sequence increments
- [ ] Check analytics → verify status categories work
- [ ] Test with existing data → verify backward compatibility
- [ ] Load test numbering service → verify no race conditions

### Phase 2 Testing (Multi-Type Foundation)
- [ ] Update quote status to new values → verify constraint works
- [ ] Test status transitions → verify validation works
- [ ] Analytics with new statuses → verify grouping correct
- [ ] Migrate existing "accepted" → "approved" → verify data integrity

### Phase 3 Testing (Custom Forms)
- [ ] Create custom form → verify modal shows
- [ ] Set custom prefix → verify numbering uses it
- [ ] Create proposal with custom form → verify correct type assigned
- [ ] Analytics with multiple types → verify breakdown works

---

## Rollout Plan

### Week 1-2: MVP (Quotes Only)
**Deploy to:** Staging → Beta Users → Production

**Success Criteria:**
- All existing quotes work unchanged
- New quotes use Q-2025-XXX format
- Analytics show correct data
- No performance degradation

### Week 3-4: Multi-Type Foundation
**Deploy to:** Staging only (internal testing)

**Success Criteria:**
- All status values work
- Analytics adapt to status categories
- Backend ready for multiple types

### Week 5-8: Custom Forms
**Deploy to:** Staging → Beta Users (invite-only)

**Success Criteria:**
- Users can create custom forms
- First-time type setup works
- Numbering sequences independent per type
- Analytics show per-type breakdowns

### Week 9-10: Full Release
**Deploy to:** All users

**Success Criteria:**
- Feature announcement
- Documentation updated
- Support ready for questions
- Analytics performing well

---

## Documentation Updates

### User Documentation
- [ ] "Creating Your First Quote" guide
- [ ] "Understanding Proposal Statuses" article
- [ ] "Creating Custom Forms" tutorial (Phase 3)
- [ ] "Analytics Overview" guide
- [ ] "Proposal Numbering" reference

### Developer Documentation
- [ ] API documentation for proposal types
- [ ] Database schema documentation
- [ ] Migration guide for custom fields
- [ ] Analytics queries reference
- [ ] Troubleshooting guide

---

## Success Metrics

### Technical Metrics
- Migration success rate: 100% (zero data loss)
- API response time: < 200ms (numbering service)
- Query performance: < 500ms (analytics)
- Error rate: < 0.1%

### User Metrics
- Quote creation time: No increase vs. current
- Custom form adoption: 20% of orgs by Month 3
- Analytics usage: 50% of users weekly
- Support tickets: < 5% related to new system

---

## Risk Mitigation

### Risk 1: Race Conditions in Numbering
**Mitigation:** Database-level locking, transaction isolation, retry logic

### Risk 2: Performance Degradation with JSONB
**Mitigation:** Proper indexing, query optimization, caching

### Risk 3: Data Loss During Migration
**Mitigation:** Full backups, staged rollout, rollback plan

### Risk 4: User Confusion with New Statuses
**Mitigation:** In-app tooltips, documentation, support readiness

### Risk 5: Analytics Queries Slow with Multiple Types
**Mitigation:** Database indexes, materialized views if needed, pagination

---

## Next Steps

1. **Week 1:** Review and approve this plan
2. **Week 1:** Create migrations, test on staging
3. **Week 2:** Deploy Phase 1 to production
4. **Week 3:** Begin Phase 2 development
5. **Week 5:** Beta test Custom Forms feature

---

## Questions for Discussion

1. Should we allow users to rename proposal types? (e.g., "Quotes" → "Estimates")
2. Should numbering sequences be global or per-type?
3. Should we support custom status workflows per form?
4. What's the migration path for existing quotes with old status values?
5. Do we need audit logging for proposal number generation?
