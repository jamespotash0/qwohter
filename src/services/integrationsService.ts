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
}

/**
 * Get list of available integrations (static data)
 */
export function getAvailableIntegrations(): AvailableIntegration[] {
  return [
    {
      type: 'quickbooks_online',
      name: 'QuickBooks Online',
      description: 'Sync your quotes and create invoices with QuickBooks Online integration.',
      logoUrl: '/images/integrations/quickbooks-online.png',
      features: [],
    },
    {
      type: 'quickbooks_desktop',
      name: 'QuickBooks Desktop',
      description: 'Integrate with QuickBooks Desktop to manage invoices and quotes.',
      logoUrl: '/images/integrations/quickbooks-desktop.png',
      features: [],
    },
  ];
}

/**
 * Get integration card display data
 */
export async function getIntegrationCardData(
  organizationId: string
): Promise<AvailableIntegration[]> {
  const availableIntegrations = getAvailableIntegrations();
  const connectedIntegrations = await getIntegrations(organizationId);

  return availableIntegrations.map(available => {
    const connected = connectedIntegrations.find(
      i => i.integration_type === available.type
    );

    return {
      ...available,
      isConnected: connected?.is_connected || false,
      connectionStatus: connected?.connection_status || 'Disconnected',
      lastSync: connected?.last_connection_check_at,
    };
  });
}
