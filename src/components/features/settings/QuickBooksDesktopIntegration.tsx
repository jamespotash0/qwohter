/**
 * QuickBooks Desktop Integration Component
 *
 * Manages QB Desktop Web Connector setup and sync
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  checkQBDesktopConnection,
  createQBDesktopConnection,
  generateQWCFile,
  disconnectQBDesktop,
  getQBSyncLogs,
  type QBDesktopConnection,
} from '@/services/quickbooksDesktopService';
import { Download, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface QuickBooksDesktopIntegrationProps {
  organization: any;
  userRole: string;
}

export const QuickBooksDesktopIntegration: React.FC<QuickBooksDesktopIntegrationProps> = ({
  organization,
  userRole,
}) => {
  const [connection, setConnection] = useState<QBDesktopConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Only Owner and Admin can manage QB integration
  const canManageIntegration = userRole === 'Owner' || userRole === 'Admin';

  // Setup form state
  const [setupData, setSetupData] = useState({
    companyFileName: '',
    username: '',
    password: '',
    syncFrequency: 15,
  });

  useEffect(() => {
    if (organization?.id) {
      loadConnection();
    }
  }, [organization?.id]);

  const loadConnection = async () => {
    if (!organization?.id) return;

    try {
      const conn = await checkQBDesktopConnection(organization.id);
      setConnection(conn);
    } catch (error) {
      console.error('Failed to load QB connection:', error);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) return;

    setLoading(true);

    try {
      await createQBDesktopConnection({
        organization_id: organization.id,
        company_file_name: setupData.companyFileName,
        username: setupData.username,
        password: setupData.password,
        sync_frequency_minutes: setupData.syncFrequency,
      });

      toast.success('QuickBooks Desktop connected successfully!');
      setShowSetup(false);
      loadConnection();
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error('Failed to setup QuickBooks Desktop connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQWC = async () => {
    if (!organization?.id) return;

    try {
      const qwcBlob = await generateQWCFile(organization.id);
      const url = URL.createObjectURL(qwcBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Qwohter-QuickBooks.qwc';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('QWC file downloaded! Open it with QuickBooks Web Connector.');
    } catch (error) {
      console.error('Failed to generate QWC:', error);
      toast.error('Failed to generate QWC file');
    }
  };

  const handleDisconnect = async () => {
    if (!organization?.id) return;

    if (!confirm('Are you sure you want to disconnect QuickBooks Desktop?')) {
      return;
    }

    try {
      await disconnectQBDesktop(organization.id);
      setConnection(null);
      toast.success('QuickBooks Desktop disconnected');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect QuickBooks Desktop');
    }
  };

  if (!connection && !showSetup) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>QuickBooks Desktop</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                Via Web Connector
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Connect QuickBooks Desktop to sync invoices automatically using QB Web Connector.
            </p>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2">Requirements:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• QuickBooks Desktop (Pro, Premier, or Enterprise)</li>
                <li>• QuickBooks Web Connector installed</li>
                <li>• QuickBooks Desktop running during sync</li>
              </ul>
            </div>

            {!canManageIntegration && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  Only organization Owners and Admins can set up integrations.
                </p>
              </div>
            )}
          </div>

          {canManageIntegration && (
            <Button onClick={() => setShowSetup(true)} className="ml-4">
              Connect QuickBooks Desktop
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (showSetup) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Setup QuickBooks Desktop</h3>

        <form onSubmit={handleSetupSubmit} className="space-y-4">
          <div>
            <Label htmlFor="companyFileName">Company File Name</Label>
            <Input
              id="companyFileName"
              value={setupData.companyFileName}
              onChange={(e) =>
                setSetupData({ ...setupData, companyFileName: e.target.value })
              }
              placeholder="My Company"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              The name of your QuickBooks company file
            </p>
          </div>

          <div>
            <Label htmlFor="username">Web Connector Username</Label>
            <Input
              id="username"
              value={setupData.username}
              onChange={(e) =>
                setSetupData({ ...setupData, username: e.target.value })
              }
              placeholder="qwohter_user"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Username for Web Connector authentication
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={setupData.password}
              onChange={(e) =>
                setSetupData({ ...setupData, password: e.target.value })
              }
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Secure password for Web Connector (stored encrypted)
            </p>
          </div>

          <div>
            <Label htmlFor="syncFrequency">Sync Frequency (minutes)</Label>
            <Input
              id="syncFrequency"
              type="number"
              min="5"
              max="1440"
              value={setupData.syncFrequency}
              onChange={(e) =>
                setSetupData({ ...setupData, syncFrequency: parseInt(e.target.value) })
              }
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              How often Web Connector should sync (minimum 5 minutes)
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSetup(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            QuickBooks Desktop Connected
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {connection?.company_file_name}
          </p>
        </div>

        {canManageIntegration && (
          <Button variant="destructive" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Sync Frequency</p>
          <p className="text-lg font-semibold">
            Every {connection?.sync_frequency_minutes} min
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Last Sync</p>
          <p className="text-lg font-semibold">
            {connection?.last_sync_at
              ? new Date(connection.last_sync_at).toLocaleString()
              : 'Never'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {canManageIntegration && (
          <>
            <Button
              onClick={handleDownloadQWC}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Web Connector File (.QWC)
            </Button>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Setup Instructions
              </h4>
              <ol className="text-sm space-y-1 text-muted-foreground ml-6 list-decimal">
                <li>Download the .QWC file above</li>
                <li>Open QuickBooks Desktop and your company file</li>
                <li>Double-click the downloaded .QWC file</li>
                <li>Follow the QuickBooks Web Connector setup wizard</li>
                <li>Keep QB Desktop running for automatic syncs</li>
              </ol>
            </div>
          </>
        )}

        {connection?.qb_version && (
          <div className="text-sm text-muted-foreground">
            <p>QuickBooks Version: {connection.qb_version}</p>
            <p>Edition: {connection.qb_edition}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
