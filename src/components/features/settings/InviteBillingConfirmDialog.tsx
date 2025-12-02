import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface InviteDetails {
  email: string;
  role: 'Admin' | 'Member';
  department?: string;
}

interface InviteBillingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInvites: InviteDetails[];
  onConfirm: (invites: InviteDetails[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  pricePerUser?: number;
}

/**
 * Confirmation dialog showing billing summary before sending invites
 */
export function InviteBillingConfirmDialog({
  open,
  onOpenChange,
  initialInvites,
  onConfirm,
  onCancel,
  isLoading = false,
  pricePerUser = 20
}: InviteBillingConfirmDialogProps) {
  const totalIncrease = initialInvites.length * pricePerUser;

  const handleConfirm = () => {
    if (initialInvites.length === 0) return;
    onConfirm(initialInvites);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Invite Team Member{initialInvites.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="text-base pt-1">
            Your team is expanding! By confirming, you will be inviting{' '}
            <span className="font-semibold text-foreground">{initialInvites.length}</span> new Team Member{initialInvites.length > 1 ? 's' : ''}.
            Your bill will increase by <span className="font-semibold text-foreground">${totalIncrease}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Invitees list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {initialInvites.map((invite, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {invite.email}
                  </span>
                  {invite.department && (
                    <span className="text-xs text-muted-foreground">
                      {invite.department}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">
                  {invite.role}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Team invites expire after <span className="font-medium">24 hours</span>.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || initialInvites.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Sending...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
