# New Feature Development Guide

Step-by-step checklist for adding new features to Qwohter.

## Before Starting

- [ ] Create feature branch: `feature/{name}` off `feature/form-builder-system`
- [ ] Understand existing patterns in similar features
- [ ] Plan database schema changes (if any)
- [ ] Review [SECURITY.md](../architecture/SECURITY.md) for RLS requirements

## 1. Database Changes

### Create Migration

```bash
# Create timestamped migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_feature_name.sql
```

### Table Template

```sql
-- Create table
CREATE TABLE public.new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- ... other columns
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use helper functions!)
CREATE POLICY "Users can view their org data"
ON public.new_table FOR SELECT
TO authenticated
USING (is_active_member(auth.uid(), organization_id));

CREATE POLICY "Users can create in their org"
ON public.new_table FOR INSERT
TO authenticated
WITH CHECK (is_active_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their org data"
ON public.new_table FOR UPDATE
TO authenticated
USING (is_active_member(auth.uid(), organization_id))
WITH CHECK (is_active_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete"
ON public.new_table FOR DELETE
TO authenticated
USING (has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner']));

-- Indexes
CREATE INDEX idx_new_table_org ON public.new_table(organization_id);
CREATE INDEX idx_new_table_created ON public.new_table(created_at);

-- Updated_at trigger
CREATE TRIGGER update_new_table_updated_at
  BEFORE UPDATE ON public.new_table
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
```

### Checklist

- [ ] RLS enabled on table
- [ ] SELECT policy with `is_active_member()`
- [ ] INSERT policy with `is_active_member()`
- [ ] UPDATE policy with `is_active_member()`
- [ ] DELETE policy (usually admin-only with `has_org_role()`)
- [ ] Indexes on `organization_id` and `created_at`
- [ ] Foreign keys with appropriate `ON DELETE` behavior
- [ ] `updated_at` trigger

## 2. TypeScript Types

### Add Types

**Location:** `src/lib/types/{feature}.ts`

```typescript
export interface NewFeature {
  id: string;
  organization_id: string;
  // ... fields matching database
  created_at: string;
  updated_at: string;
}

export interface CreateNewFeatureData {
  // Fields for creation (omit id, timestamps)
}

export interface UpdateNewFeatureData {
  // Partial fields for updates
}
```

### Update Supabase Types

If schema changed, regenerate types:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## 3. Service Layer

**Location:** `src/services/{feature}Service.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { NewFeature, CreateNewFeatureData, UpdateNewFeatureData } from '@/lib/types/feature';

export const featureService = {
  async getAll(organizationId: string): Promise<NewFeature[]> {
    const { data, error } = await supabase
      .from('new_table')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch: ${error.message}`);
    return data;
  },

  async getById(id: string): Promise<NewFeature> {
    const { data, error } = await supabase
      .from('new_table')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch: ${error.message}`);
    return data;
  },

  async create(data: CreateNewFeatureData): Promise<NewFeature> {
    const { data: created, error } = await supabase
      .from('new_table')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Failed to create: ${error.message}`);
    return created;
  },

  async update(id: string, data: UpdateNewFeatureData): Promise<NewFeature> {
    const { data: updated, error } = await supabase
      .from('new_table')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update: ${error.message}`);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('new_table')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete: ${error.message}`);
  },
};
```

## 4. React Query Hooks

**Location:** `src/hooks/queries/use{Feature}.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureService } from '@/services/featureService';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';

export const useFeatures = (organizationId: string) => {
  const queryKey = ['features', organizationId];

  // Enable realtime updates
  useRealtimeSubscription('new_table', queryKey, {
    filter: `organization_id=eq.${organizationId}`,
  });

  return useQuery({
    queryKey,
    queryFn: () => featureService.getAll(organizationId),
    enabled: !!organizationId,
  });
};

export const useFeature = (id: string) => {
  return useQuery({
    queryKey: ['feature', id],
    queryFn: () => featureService.getById(id),
    enabled: !!id,
  });
};

export const useCreateFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: featureService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['features', data.organization_id],
      });
    },
  });
};

export const useUpdateFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNewFeatureData }) =>
      featureService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature', data.id] });
      queryClient.invalidateQueries({
        queryKey: ['features', data.organization_id],
      });
    },
  });
};

export const useDeleteFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: featureService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
};
```

## 5. UI Components

**Location:** `src/components/features/{feature}/`

### Component Structure

```
src/components/features/{feature}/
├── FeatureList.tsx       # Main list/table view
├── FeatureCard.tsx       # Individual item display
├── FeatureForm.tsx       # Create/edit form
├── FeatureDetails.tsx    # Detail view
└── index.ts              # Exports
```

### Component Template

```typescript
import { useFeatures, useCreateFeature } from '@/hooks/queries/useFeature';
import { useToast } from '@/hooks/use-toast';

export const FeatureList = ({ organizationId }: { organizationId: string }) => {
  const { data: features, isLoading, error } = useFeatures(organizationId);
  const createFeature = useCreateFeature();
  const { toast } = useToast();

  const handleCreate = async (data: CreateNewFeatureData) => {
    try {
      await createFeature.mutateAsync(data);
      toast({ title: 'Success', description: 'Feature created' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!features?.length) return <EmptyState />;

  return (
    <div>
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  );
};
```

## 6. Edge Functions (if needed)

**Location:** `supabase/functions/{function-name}/`

See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) for templates.

### config.toml

```toml
[functions.my-function]
verify_jwt = true  # or false for webhooks
```

## 7. Testing

- [ ] Test with multiple organizations (RLS isolation)
- [ ] Test with different roles (Owner, Admin, Member)
- [ ] Test error scenarios (network failure, permission denied)
- [ ] Test real-time updates
- [ ] Add unit tests if complex logic

See [TESTING.md](./TESTING.md) for testing patterns.

## 8. Documentation

- [ ] Update relevant docs in `docs/features/`
- [ ] Add to CLAUDE.md if significant feature

## PR Checklist

- [ ] Feature branch off `feature/form-builder-system`
- [ ] All RLS policies in place
- [ ] TypeScript types defined
- [ ] Service layer with error handling
- [ ] React Query hooks with realtime
- [ ] UI components with loading/error/empty states
- [ ] Tests passing
- [ ] No console errors or warnings
