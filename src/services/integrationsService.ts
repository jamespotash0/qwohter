/**
 * Integrations Service
 *
 * Manages database operations for third-party integrations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Integration, IntegrationType, ConnectionStatus } from '@/lib/types/integrations';

// ============================================================================
// Get Integrations
// ============================================================================

/**
 * Get all integrations for an organization
 */
export async function getIntegrations(organizationId: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch integrations:', error);
    throw new Error(`Failed to fetch integrations: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific integration by type
 */
export async function getIntegrationByType(
  organizationId: string,
  integrationType: IntegrationType
): Promise<Integration | null> {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('integration_type', integrationType)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    console.error('Failed to fetch integration:', error);
    throw new Error(`Failed to fetch integration: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Create/Update Integrations
// ============================================================================

/**
 * Create or update an integration record
 */
export async function upsertIntegration(
  organizationId: string,
  integrationType: IntegrationType,
  integrationName: string,
  isConnected: boolean,
  connectionStatus: ConnectionStatus,
  settings: Record<string, any> = {},
  connectionError: string | null = null
): Promise<Integration> {
  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      organization_id: organizationId,
      integration_type: integrationType,
      integration_name: integrationName,
      is_connected: isConnected,
      connection_status: connectionStatus,
      last_connection_check_at: new Date().toISOString(),
      settings,
      connection_error: connectionError,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('organization_id', organizationId)
    .eq('integration_type', integrationType)
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert integration:', error);
    throw new Error(`Failed to save integration: ${error.message}`);
  }

  return data;
}

/**
 * Update integration status
 */
export async function updateIntegrationStatus(
  organizationId: string,
  integrationType: IntegrationType,
  isConnected: boolean,
  connectionStatus: ConnectionStatus,
  connectionError: string | null = null
): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({
      is_connected: isConnected,
      connection_status: connectionStatus,
      connection_error: connectionError,
      last_connection_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('integration_type', integrationType);

  if (error) {
    console.error('Failed to update integration status:', error);
    throw new Error(`Failed to update integration status: ${error.message}`);
  }
}

/**
 * Update integration settings
 */
export async function updateIntegrationSettings(
  organizationId: string,
  integrationType: IntegrationType,
  settings: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('integration_type', integrationType);

  if (error) {
    console.error('Failed to update integration settings:', error);
    throw new Error(`Failed to update integration settings: ${error.message}`);
  }
}

// ============================================================================
// Delete Integration
// ============================================================================

/**
 * Delete an integration (marks as disconnected)
 */
export async function disconnectIntegration(
  organizationId: string,
  integrationType: IntegrationType
): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .update({
      is_connected: false,
      connection_status: 'Disconnected',
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('integration_type', integrationType);

  if (error) {
    console.error('Failed to disconnect integration:', error);
    throw new Error(`Failed to disconnect integration: ${error.message}`);
  }
}

// ============================================================================
// Integration Availability
// ============================================================================

export interface AvailableIntegration {
  type: IntegrationType;
  name: string;
  description: string;
  logoUrl: string;
  features: string[];
  comingSoon?: boolean;
  category?: string;
  requiredPlan?: string;
  setupDifficulty?: string;
  estimatedSetupTimeMinutes?: number;
  documentationUrl?: string;
  platformRequirement?: string; // e.g., 'Windows Only', 'Mac Only', 'Windows/Mac'
}

interface AvailableIntegrationRow {
  id: string;
  integration_type: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  category: string | null;
  is_enabled: boolean;
  is_beta: boolean;
  coming_soon: boolean;
  required_plan: string | null;
  features: any;
  documentation_url: string | null;
  setup_difficulty: string | null;
  estimated_setup_time_minutes: number | null;
  platform_requirement: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get list of available integrations from database
 *
 * NOTE: Integrations are now managed in the database (available_integrations table)
 * instead of being hardcoded. This allows for easier management, plan-based filtering,
 * and enabling/disabling integrations without code deploys.
 *
 * IMPORTANT: This function should be called via React Query hooks (useAvailableIntegrations)
 * which provides automatic caching, deduplication, and cache invalidation.
 * See src/hooks/useIntegrations.ts
 *
 * To add a new integration:
 * 1. INSERT into available_integrations table
 * 2. Implement the integration code (OAuth, API calls, etc.)
 * 3. Add the integration_type to TypeScript types
 * 4. Call invalidateQueries.availableIntegrations() to refresh the cache
 *
 * See INTEGRATIONS_ARCHITECTURE.md for more details.
 */
export async function getAvailableIntegrations(
  organizationPlan?: string
): Promise<AvailableIntegration[]> {
  // Fetch from database
  const { data, error } = await supabase
    .from('available_integrations')
    .select('*')
    .eq('is_enabled', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch available integrations:', error);
    throw new Error(`Failed to fetch integrations: ${error.message}`);
  }

  const rawData = (data || []) as AvailableIntegrationRow[];

  // Filter by organization plan if provided
  let filteredData = rawData;
  if (organizationPlan) {
    filteredData = rawData.filter(
      (integration) =>
        !integration.required_plan ||
        integration.required_plan === organizationPlan ||
        organizationPlan === 'Enterprise' // Enterprise has access to all
    );
  }

  // Map to expected format
  return filteredData.map((integration) => ({
    type: integration.integration_type as IntegrationType,
    name: integration.name,
    description: integration.description || '',
    logoUrl: integration.logo_url || '',
    features: Array.isArray(integration.features) ? integration.features : [],
    comingSoon: integration.coming_soon || false,
    category: integration.category || undefined,
    requiredPlan: integration.required_plan || undefined,
    setupDifficulty: integration.setup_difficulty || undefined,
    estimatedSetupTimeMinutes: integration.estimated_setup_time_minutes || undefined,
    documentationUrl: integration.documentation_url || undefined,
    platformRequirement: integration.platform_requirement || undefined,
  }));
}



/**
 * Get integration card display data
 */
export async function getIntegrationCardData(
  organizationId: string,
  organizationPlan?: string
): Promise<any[]> {
  const availableIntegrations = await getAvailableIntegrations(organizationPlan);
  const connectedIntegrations = await getIntegrations(organizationId);

  return availableIntegrations.map((available) => {
    const connected = connectedIntegrations.find(
      (i) => i.integration_type === available.type
    );

    return {
      ...available,
      isConnected: connected?.is_connected || false,
      connectionStatus: connected?.connection_status || 'Disconnected',
      lastSync: connected?.last_connection_check_at,
    };
  });
}
