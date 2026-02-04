/**
 * Create Invoice Dialog
 *
 * Dialog for creating invoices in QuickBooks from quotes
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Proposal } from '@/services/proposalsService';
import type { IntegrationType } from '@/lib/types/integrations';
import { checkQBOnlineConnection, createInvoiceInQBOnline } from '@/services/quickbooksOnlineService';
import { checkQBDesktopConnection, createInvoiceInQBDesktop } from '@/services/quickbooksDesktopService';
import { getIntegrations } from '@/services/integrationsService';

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Proposal | null;
  organizationId: string;
}

export const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({
  isOpen,
  onClose,
  quote,
  organizationId,
}) => {
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationType[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null);
  const [customerMemo, setCustomerMemo] = useState('Thank you for your business!');
  const [privateNotes, setPrivateNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  // Load available integrations when dialog opens
  useEffect(() => {
    if (!isOpen || !organizationId) return;

    const loadIntegrations = async () => {
      try {
        const integrations = await getIntegrations(organizationId);
        const connected = integrations
          .filter((i) => i.is_connected && i.connection_status === 'Connected')
          .map((i) => i.integration_type);

        setAvailableIntegrations(connected);

        // Auto-select if only one integration is connected
        if (connected.length === 1) {
          setSelectedIntegration(connected[0]);
        }
      } catch (err) {
        console.error('Failed to load integrations:', err);
        setError('Failed to load available integrations');
      }
    };

    loadIntegrations();
  }, [isOpen, organizationId]);

  const handleCreateInvoice = async () => {
    if (!quote || !selectedIntegration) {
      setError('Please select an integration');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      let result;

      if (selectedIntegration === 'quickbooks_online') {
        result = await createInvoiceInQBOnline(quote, organizationId, {
          customerMemo,
          notes: privateNotes,
        });
      } else if (selectedIntegration === 'quickbooks_desktop') {
        await createInvoiceInQBDesktop(quote, organizationId);
        result = {
          success: true,
          invoice_number: 'Pending sync',
        };
      }

      if (result?.success) {
        setSuccess(true);
        setInvoiceUrl(result.invoice_url || null);
        toast.success('Invoice created successfully');
      } else {
        throw new Error(result?.error || 'Failed to create invoice');
      }
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      toast.error('Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedIntegration(null);
    setCustomerMemo('Thank you for your business!');
    setPrivateNotes('');
    setError(null);
    setSuccess(false);
    setInvoiceUrl(null);
    onClose();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!quote) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Invoice
          </DialogTitle>
          <DialogDescription>
            Create an invoice in QuickBooks from quote #{quote.proposal_number}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <>
            {/* Success State */}
            <div className="space-y-4 py-6">
              <Alert className="bg-green-50 border-green-200 text-green-900">
                <CheckCircle2 className="h-5 w-5" />
                <AlertDescription className="ml-2">
                  Invoice created successfully in QuickBooks!
                </AlertDescription>
              </Alert>

              {invoiceUrl && (
                <div className="text-center">
                  <Button
                    onClick={() => window.open(invoiceUrl, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Invoice in QuickBooks
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* No Integrations Connected */}
              {availableIntegrations.length === 0 && (
                <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No QuickBooks integrations are connected. Please connect QuickBooks in Settings
                    &gt; Integrations first.
                  </AlertDescription>
                </Alert>
              )}

              {/* Proposal Summary */}
              {availableIntegrations.length > 0 && (
                <>
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardContent className="pt-6">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Proposal Number:</span>
                          <span className="font-mono font-medium">
                            {quote.proposal_number}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                          <span className="font-medium">
                            {quote.client_name || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Project:</span>
                          <span className="font-medium">
                            {quote.project_name || 'Untitled'}
                          </span>
                        </div>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                        <div className="flex justify-between text-base font-semibold">
                          <span className="text-gray-900 dark:text-white">Total Amount:</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {formatCurrency(quote.total_value || 0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Select Integration */}
                  {availableIntegrations.length > 1 && (
                    <div className="space-y-2">
                      <Label>Select QuickBooks Version</Label>
                      <RadioGroup
                        value={selectedIntegration || ''}
                        onValueChange={(value) => setSelectedIntegration(value as IntegrationType)}
                      >
                        {availableIntegrations.includes('quickbooks_online') && (
                          <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <RadioGroupItem value="quickbooks_online" id="qbo" />
                            <Label htmlFor="qbo" className="flex-1 cursor-pointer">
                              <div className="font-medium">QuickBooks Online</div>
                              <div className="text-xs text-gray-500">
                                Cloud-based, instant sync
                              </div>
                            </Label>
                          </div>
                        )}
                        {availableIntegrations.includes('quickbooks_desktop') && (
                          <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <RadioGroupItem value="quickbooks_desktop" id="qbd" />
                            <Label htmlFor="qbd" className="flex-1 cursor-pointer">
                              <div className="font-medium">QuickBooks Desktop</div>
                              <div className="text-xs text-gray-500">
                                Syncs via Web Connector
                              </div>
                            </Label>
                          </div>
                        )}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Customer Memo */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_memo">Message to Customer (optional)</Label>
                    <Textarea
                      id="customer_memo"
                      value={customerMemo}
                      onChange={(e) => setCustomerMemo(e.target.value)}
                      placeholder="Thank you for your business!"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Private Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="private_notes">Private Notes (optional)</Label>
                    <Textarea
                      id="private_notes"
                      value={privateNotes}
                      onChange={(e) => setPrivateNotes(e.target.value)}
                      placeholder="Internal notes (not visible to customer)"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Desktop Sync Notice */}
                  {selectedIntegration === 'quickbooks_desktop' && (
                    <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Invoice will be queued and synced during the next Web Connector update
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={isCreating || !selectedIntegration || availableIntegrations.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
