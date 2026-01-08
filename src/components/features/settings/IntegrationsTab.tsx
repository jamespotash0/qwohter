/**
 * Integrations Tab Component
 *
 * Displays and manages third-party integrations
 */

import React, { useState } from 'react';
import { Shield, Plug, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationCard } from '@/components/features/integrations/IntegrationCard';
import { QBOnlineConnectDialog } from '@/components/features/integrations/QBOnlineConnectDialog';
import { QBDesktopConnectDialog } from '@/components/features/integrations/QBDesktopConnectDialog';
import { GoogleDocsConnectDialog } from '@/components/features/integrations/GoogleDocsConnectDialog';
import { GoogleDocsSettingsDialog } from '@/components/features/integrations/GoogleDocsSettingsDialog';
import { useIntegrationsData } from '@/hooks/useIntegrations';
import { disconnectQBOnline } from '@/services/quickbooksOnlineService';
import { disconnectQBDesktop } from '@/services/quickbooksDesktopService';
import { disconnectGoogle } from '@/services/googleDocsIntegrationService';
import { hasAdminPermissions } from '@/utils/permissions';
import { invalidateQueries } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { IntegrationType } from '@/lib/types/integrations';

interface IntegrationsTabProps {
  organization: any;
  userRole: string;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  organization,
  userRole,
}) => {
  const [connectingType, setConnectingType] = useState<IntegrationType | null>(null);
  const [disconnectingType, setDisconnectingType] = useState<IntegrationType | null>(null);
  const [showQBOnlineDialog, setShowQBOnlineDialog] = useState(false);
  const [showQBDesktopDialog, setShowQBDesktopDialog] = useState(false);
  const [showGoogleDocsDialog, setShowGoogleDocsDialog] = useState(false);
  const [showGoogleDocsSettings, setShowGoogleDocsSettings] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<IntegrationType | null>(null);

  const hasEditPermission = hasAdminPermissions(userRole);

  // Use React Query hook for integrations data (automatic caching)
  const { integrations, isLoading, error, connectedIntegrations } = useIntegrationsData(
    organization?.id || '',
    // organization?.plan // Uncomment when plan filtering is needed
  );

  // Get Google Docs settings for the settings dialog
  const googleDocsIntegration = connectedIntegrations.find(i => i.integration_type === 'google_docs');
  const googleDocsSettings = googleDocsIntegration?.settings as { drive_folder_id?: string; connected_email?: string } | undefined;

  // Show error toast if loading failed
  React.useEffect(() => {
    if (error) {
      console.error('Failed to load integrations:', error);
      toast.error('Failed to load integrations');
    }
  }, [error]);

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
      } else if (type === 'google_docs') {
        setShowGoogleDocsDialog(true);
      }
    } finally {
      setConnectingType(null);
    }
  };

  // Handle disconnect - show confirmation first
  const handleDisconnect = (type: IntegrationType) => {
    if (!hasEditPermission) {
      toast.error('You need Admin or Owner permissions to manage integrations');
      return;
    }

    setPendingDisconnect(type);
    setShowDisconnectConfirm(true);
  };

  // Handle configure - open settings dialog
  const handleConfigure = (type: IntegrationType) => {
    if (!hasEditPermission) {
      toast.error('You need Admin or Owner permissions to manage integrations');
      return;
    }

    if (type === 'google_docs') {
      setShowGoogleDocsSettings(true);
    }
  };

  // Actually perform the disconnect after confirmation
  const confirmDisconnect = async () => {
    if (!organization?.id || !pendingDisconnect) return;

    setDisconnectingType(pendingDisconnect);
    setShowDisconnectConfirm(false);

    try {
      if (pendingDisconnect === 'quickbooks_online') {
        await disconnectQBOnline(organization.id);
        toast.success('QuickBooks Online disconnected');
      } else if (pendingDisconnect === 'quickbooks_desktop') {
        await disconnectQBDesktop(organization.id);
        toast.success('QuickBooks Desktop disconnected');
      } else if (pendingDisconnect === 'google_docs') {
        await disconnectGoogle(organization.id);
        toast.success('Google Docs disconnected');
      }

      // Invalidate cache to trigger refetch
      await invalidateQueries.connectedIntegrations(organization.id);

      // Also invalidate Google connection cache if it was Google Docs
      if (pendingDisconnect === 'google_docs') {
        await invalidateQueries.googleConnection(organization.id);
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      toast.error('Failed to disconnect integration');
    } finally {
      setDisconnectingType(null);
      setPendingDisconnect(null);
    }
  };

  // Get integration name for confirmation dialog
  const getIntegrationName = (type: IntegrationType | null): string => {
    if (!type) return 'this integration';
    const names: Record<IntegrationType, string> = {
      quickbooks_online: 'QuickBooks Online',
      quickbooks_desktop: 'QuickBooks Desktop',
      google_docs: 'Google Docs',
      dropbox: 'Dropbox',
    };
    return names[type] || 'this integration';
  };

  // Handle successful connection
  const handleConnectionSuccess = async () => {
    const wasGoogleDocs = showGoogleDocsDialog;

    setShowQBOnlineDialog(false);
    setShowQBDesktopDialog(false);
    setShowGoogleDocsDialog(false);

    if (!organization?.id) return;

    // Invalidate cache to trigger refetch
    await invalidateQueries.connectedIntegrations(organization.id);

    // Also invalidate Google connection cache if it was Google Docs
    if (wasGoogleDocs) {
      await invalidateQueries.googleConnection(organization.id);
    }

    toast.success('Integration connected successfully');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.type}
              name={integration.name}
              description={integration.description}
              logoUrl={integration.logoUrl}
              isConnected={integration.isConnected}
              onConnect={() => handleConnect(integration.type)}
              onDisconnect={() => handleDisconnect(integration.type)}
              onConfigure={integration.type === 'google_docs' ? () => handleConfigure(integration.type) : undefined}
              isConnecting={connectingType === integration.type}
              isDisconnecting={disconnectingType === integration.type}
              comingSoon={integration.comingSoon}
              platformRequirement={integration.platformRequirement}
            />
          ))}
        </div>

        {/* Empty state if no integrations available */}
        {integrations.length === 0 && !isLoading && (
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

      <GoogleDocsConnectDialog
        isOpen={showGoogleDocsDialog}
        onClose={() => setShowGoogleDocsDialog(false)}
        onSuccess={handleConnectionSuccess}
        organizationId={organization?.id || ''}
      />

      <GoogleDocsSettingsDialog
        isOpen={showGoogleDocsSettings}
        onClose={() => setShowGoogleDocsSettings(false)}
        organizationId={organization?.id || ''}
        currentFolderId={googleDocsSettings?.drive_folder_id}
        connectedEmail={googleDocsSettings?.connected_email}
      />

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Disconnect {getIntegrationName(pendingDisconnect)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {getIntegrationName(pendingDisconnect)}?
              You will need to reconnect and re-authorize to use this integration again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDisconnect(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
