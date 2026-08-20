/**
 * Send Purchase Order Dialog
 *
 * Review the PDF, then send it to the manufacturer.
 *
 * Downloading first is offered deliberately: a purchase order is a commitment to
 * spend money, and a dealer should be able to read exactly what a factory will
 * receive before it goes. The same renderer produces both, so the preview is the
 * document.
 */

import { useEffect, useState } from 'react';
import { PaperPlaneTilt, DownloadSimple, Warning } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  sendPurchaseOrder,
  downloadPurchaseOrderPdf,
} from '@/services/purchaseOrderDocumentService';
import { salesOrderKeys } from '@/hooks/queries/useSalesOrders';
import { varianceQueryKeys } from '@/hooks/queries/useVarianceQueue';

interface SendPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorPOId: string | null;
  organizationId: string;
  dealerName: string;
  poNumber?: string | null;
  vendorName?: string | null;
  /** From the vendor record; empty means there is nowhere to send it. */
  defaultEmail?: string | null;
  alreadySent?: boolean;
}

export function SendPurchaseOrderDialog({
  open,
  onOpenChange,
  vendorPOId,
  organizationId,
  dealerName,
  poNumber,
  vendorName,
  defaultEmail,
  alreadySent,
}: SendPurchaseOrderDialogProps) {
  const queryClient = useQueryClient();
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(defaultEmail ?? '');
    setMessage('');
  }, [open, defaultEmail]);

  const handleDownload = async () => {
    if (!vendorPOId) return;
    setDownloading(true);
    try {
      await downloadPurchaseOrderPdf(vendorPOId, dealerName);
    } catch (error) {
      toast.error('Could not build the PDF', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!vendorPOId) return;
    setSending(true);
    try {
      const result = await sendPurchaseOrder({
        vendorPOId,
        organizationId,
        dealerName,
        to: to.trim() || undefined,
        message: message.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: varianceQueryKeys.all });

      if (result.warning) {
        toast.warning('Sent, but the record did not update', {
          description: result.warning,
        });
      } else {
        toast.success(`Purchase order sent to ${result.sentTo}`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Could not send the purchase order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSending(false);
    }
  };

  const noDestination = !defaultEmail && !to.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Send {poNumber ?? 'purchase order'}
            {vendorName ? ` to ${vendorName}` : ''}
          </DialogTitle>
          <DialogDescription>
            The PDF is attached to the email and filed against this purchase
            order, so there is a record of exactly what was sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {alreadySent && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
              <Warning className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-amber-800 dark:text-amber-300">
                This purchase order has already been sent. Sending again will
                deliver a second copy — factories often treat that as a duplicate
                order.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="po-to">Send to</Label>
            <Input
              id="po-to"
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="orders@vendor.com"
            />
            {noDestination && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No order email is on file for this vendor. Enter one here, or add
                it under Settings › Vendors so it is remembered.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-message">Message</Label>
            <Textarea
              id="po-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Leave blank to ask for an acknowledgment with confirmed pricing and ship dates."
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            <DownloadSimple className="w-4 h-4 mr-1.5" />
            {downloading ? 'Building…' : 'Preview PDF'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || (!to.trim() && !defaultEmail)}>
              <PaperPlaneTilt className="w-4 h-4 mr-1.5" />
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendPurchaseOrderDialog;
