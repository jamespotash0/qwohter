/**
 * Integrations Tab Component
 *
 * Displays and manages third-party integrations
 */

import React, { useState, useEffect } from 'react';
import { Shield, Plug, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationCard } from '@/components/features/integrations/IntegrationCard';
import { QBOnlineConnectDialog } from '@/components/features/integrations/QBOnlineConnectDialog';
import { QBDesktopConnectDialog } from '@/components/features/integrations/QBDesktopConnectDialog';
import { getIntegrations, getAvailableIntegrations } from '@/services/integrationsService';
import { checkQBOnlineConnection, disconnectQBOnline } from '@/services/quickbooksOnlineService';
import { checkQBDesktopConnection, disconnectQBDesktop } from '@/services/quickbooksDesktopService';
import { hasAdminPermissions } from '@/utils/permissions';
import type { Integration, IntegrationType } from '@/lib/types/integrations';

interface IntegrationsTabProps {
  organization: any;
  userRole: string;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  organization,
  userRole,
}) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState<IntegrationType | null>(null);
  const [showQBOnlineDialog, setShowQBOnlineDialog] = useState(false);
  const [showQBDesktopDialog, setShowQBDesktopDialog] = useState(false);

  const hasEditPermission = hasAdminPermissions(userRole);

  // Load integrations
  useEffect(() => {
    if (!organization?.id) return;

    const loadIntegrations = async () => {
      try {
        setLoading(true);
        const data = await getIntegrations(organization.id);
        setIntegrations(data);
      } catch (error) {
        console.error('Failed to load integrations:', error);
        toast.error('Failed to load integrations');
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, [organization?.id]);

  // Handle connect
  const handleConnect = async (type: IntegrationType) => {
    if (!hasEditPermission) {
      toast.error('You need Admin or Owner permissions to manage integrations');
      return;
    }

    setConnectingType(type);

    try {
      if (type === 'quickbooks_online') {
        setShowQBOnlineDialog(true);
      } else if (type === 'quickbooks_desktop') {
        setShowQBDesktopDialog(true);
      }
    } finally {
      setConnectingType(null);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (type: IntegrationType) => {
    if (!hasEditPermission) {
      toast.error('You need Admin or Owner permissions to manage integrations');
      return;
    }

    if (!organization?.id) return;

    try {
      if (type === 'quickbooks_online') {
        await disconnectQBOnline(organization.id);
        toast.success('QuickBooks Online disconnected');
      } else if (type === 'quickbooks_desktop') {
        await disconnectQBDesktop(organization.id);
        toast.success('QuickBooks Desktop disconnected');
      }

      // Reload integrations
      const data = await getIntegrations(organization.id);
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  // Handle successful connection
  const handleConnectionSuccess = async () => {
    setShowQBOnlineDialog(false);
    setShowQBDesktopDialog(false);

    if (!organization?.id) return;

    // Reload integrations
    try {
      const data = await getIntegrations(organization.id);
      setIntegrations(data);
      toast.success('Integration connected successfully');
    } catch (error) {
      console.error('Failed to reload integrations:', error);
    }
  };

  if (!hasEditPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You need Admin or Owner permissions to manage integrations.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const availableIntegrations = getAvailableIntegrations();

  return (
    <div className="max-w-5xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Integrations
          </h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mt-4"></div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableIntegrations.map((available) => {
            const connected = integrations.find(
              (i) => i.integration_type === available.type
            );

            return (
              <IntegrationCard
                key={available.type}
                name={available.name}
                description={available.description}
                logoUrl={available.logoUrl}
                isConnected={connected?.is_connected || false}
                onConnect={() => handleConnect(available.type)}
                onDisconnect={() => handleDisconnect(available.type)}
                isConnecting={connectingType === available.type}
                comingSoon={available.comingSoon}
              />
            );
          })}
        </div>

        {/* Empty state if no integrations available */}
        {availableIntegrations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Plug className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Integrations Available
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              Check back later for new integrations
            </p>
          </div>
        )}
      </div>

      {/* Connection Dialogs */}
      <QBOnlineConnectDialog
        isOpen={showQBOnlineDialog}
        onClose={() => setShowQBOnlineDialog(false)}
        onSuccess={handleConnectionSuccess}
        organizationId={organization?.id || ''}
      />

      <QBDesktopConnectDialog
        isOpen={showQBDesktopDialog}
        onClose={() => setShowQBDesktopDialog(false)}
        onSuccess={handleConnectionSuccess}
        organizationId={organization?.id || ''}
      />
    </div>
  );
};
