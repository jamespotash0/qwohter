import React, { useState, useEffect } from 'react';
import { Shield, Edit2, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { hasAdminPermissions } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";
import { useUser, useProfile } from "@/auth";
import type { PaymentSettings } from '@/lib/types/paymentSettings';
import { DEFAULT_PAYMENT_SETTINGS } from '@/lib/types/paymentSettings';
import { PasswordConfirmDialog } from './PasswordConfirmDialog';
import { notifyBankDetailsChanged } from '@/services/notificationService';

/**
 * Validate routing number is exactly 9 digits
 */
function isValidRoutingNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 9;
}

/**
 * Validate account number is 6-17 digits (US bank standard)
 */
function isValidAccountNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 17;
}

/**
 * Mask account number for display (show last 4 digits)
 */
function maskAccountNumber(value: string): string {
  if (!value || value.length <= 4) return value;
  return '****' + value.slice(-4);
}

/**
 * Format routing number as XXX-XXX-XXX
 */
function formatRoutingNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{3})(?=\d)/g, '$1-');
}

/**
 * Format account number in groups of 4 for readability
 */
function formatAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

interface PaymentsTabProps {
  organization: any;
  userRole: string;
  onOrganizationUpdate: (userId?: string, forceRefresh?: boolean) => Promise<void>;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  organization,
  userRole,
  onOrganizationUpdate,
}) => {
  const user = useUser();
  const { data: profile } = useProfile(user?.id);
  const hasEditPermission = hasAdminPermissions(userRole);

  // Parse current settings with defaults
  const getCurrentSettings = (): PaymentSettings => ({
    ...DEFAULT_PAYMENT_SETTINGS,
    ...(organization?.payment_settings || {}),
  });

  // --- Bank Details fields ---
  const [isEditingBankName, setIsEditingBankName] = useState(false);
  const [isEditingRoutingNumber, setIsEditingRoutingNumber] = useState(false);
  const [isEditingAccountNumber, setIsEditingAccountNumber] = useState(false);
  const [editedBankName, setEditedBankName] = useState('');
  const [editedRoutingNumber, setEditedRoutingNumber] = useState('');
  const [editedAccountNumber, setEditedAccountNumber] = useState('');

  // --- Visibility toggles ---
  const [showRoutingNumber, setShowRoutingNumber] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // --- Online Payment fields ---
  const [isEditingPaymentUrl, setIsEditingPaymentUrl] = useState(false);
  const [isEditingButtonLabel, setIsEditingButtonLabel] = useState(false);
  const [editedPaymentUrl, setEditedPaymentUrl] = useState('');
  const [editedButtonLabel, setEditedButtonLabel] = useState('');

  // Loading state
  const [isUpdating, setIsUpdating] = useState(false);

  // Password confirmation for sensitive fields
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<{
    fieldKey: keyof PaymentSettings;
    value: string;
    setIsEditing: (val: boolean) => void;
  } | null>(null);

  // Sync field values when organization changes
  useEffect(() => {
    const s = getCurrentSettings();
    setEditedBankName(s.bank_name || '');
    setEditedRoutingNumber(s.routing_number || '');
    setEditedAccountNumber(s.account_number || '');
    setEditedPaymentUrl(s.payment_url || '');
    setEditedButtonLabel(s.payment_button_label || 'Pay Online');
  }, [organization?.payment_settings]);

  // Generic save handler — merges changed field into existing JSONB
  const handleUpdateField = async (
    fieldKey: keyof PaymentSettings,
    value: string,
    setIsEditing: (val: boolean) => void,
  ): Promise<boolean> => {
    if (!hasEditPermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit payment settings.",
        variant: "destructive",
      });
      return false;
    }

    if (!organization?.id) {
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return false;
    }

    setIsUpdating(true);
    try {
      const updatedSettings: PaymentSettings = {
        ...getCurrentSettings(),
        [fieldKey]: value,
      };

      const { error } = await supabase
        .from('organizations')
        .update({ payment_settings: updatedSettings } as never)
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Payment settings updated successfully.",
      });

      setIsEditing(false);
      await onOrganizationUpdate(undefined, true);
      return true;
    } catch (error) {
      console.error('Error updating payment settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment settings",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Handler for password-confirmed bank detail saves
  const handleConfirmedSave = async () => {
    if (!pendingSave) return;

    setShowPasswordConfirm(false);
    const { fieldKey, value, setIsEditing } = pendingSave;

    const success = await handleUpdateField(fieldKey, value, setIsEditing);

    if (success && organization?.id) {
      const changedByName = profile?.full_name || user?.email || 'Unknown user';
      const changedByEmail = user?.email || '';
      notifyBankDetailsChanged({
        organizationId: organization.id,
        changedByName,
        changedByEmail,
        fieldChanged: fieldKey as 'routing_number' | 'account_number',
      }).catch(err => {
        console.error('[PaymentsTab] Failed to send bank details notification:', err);
      });
    }

    setPendingSave(null);
  };

  // Permission guard
  if (!hasEditPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            You need Admin or Owner permissions to view payment settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="space-y-8">
        {/* Section 1: Bank Details */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Bank Details</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

          <div className="space-y-1">
            {/* Bank Name */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Bank Name</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Name of your bank (e.g., TD Bank, Chase)
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingBankName ? (
                  <>
                    <Input
                      value={editedBankName}
                      onChange={(e) => setEditedBankName(e.target.value)}
                      placeholder="Enter bank name"
                      className="flex-1 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('bank_name', editedBankName, setIsEditingBankName)}
                      disabled={isUpdating}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedBankName(getCurrentSettings().bank_name || '');
                        setIsEditingBankName(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {getCurrentSettings().bank_name || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingBankName(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Routing Number */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Routing Number</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  9-digit ABA routing number
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingRoutingNumber ? (
                  <>
                    <div className="flex-1 flex flex-col">
                      <Input
                        value={editedRoutingNumber}
                        onChange={(e) => setEditedRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="Enter 9-digit routing number"
                        className="h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        maxLength={9}
                      />
                      {editedRoutingNumber && !isValidRoutingNumber(editedRoutingNumber) && (
                        <span className="text-xs text-amber-600 mt-1">Routing number must be exactly 9 digits</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPendingSave({ fieldKey: 'routing_number', value: editedRoutingNumber, setIsEditing: setIsEditingRoutingNumber });
                        setShowPasswordConfirm(true);
                      }}
                      disabled={isUpdating || (editedRoutingNumber !== '' && !isValidRoutingNumber(editedRoutingNumber))}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingRoutingNumber(false)}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {getCurrentSettings().routing_number
                        ? (showRoutingNumber ? formatRoutingNumber(getCurrentSettings().routing_number!) : maskAccountNumber(getCurrentSettings().routing_number!))
                        : <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    {getCurrentSettings().routing_number && (
                      showRoutingNumber
                        ? <EyeOff className="w-3.5 h-3.5 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" onClick={() => setShowRoutingNumber(false)} />
                        : <Eye className="w-3.5 h-3.5 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" onClick={() => setShowRoutingNumber(true)} />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditedRoutingNumber(''); setIsEditingRoutingNumber(true); }}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Account Number */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Account Number</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  6 to 17 digit bank account number
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingAccountNumber ? (
                  <>
                    <div className="flex-1 flex flex-col">
                      <Input
                        value={editedAccountNumber}
                        onChange={(e) => setEditedAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                        placeholder="Enter account number"
                        className="h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        maxLength={17}
                      />
                      {editedAccountNumber && !isValidAccountNumber(editedAccountNumber) && (
                        <span className="text-xs text-amber-600 mt-1">Account number must be 6 to 17 digits</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPendingSave({ fieldKey: 'account_number', value: editedAccountNumber, setIsEditing: setIsEditingAccountNumber });
                        setShowPasswordConfirm(true);
                      }}
                      disabled={isUpdating || (editedAccountNumber !== '' && !isValidAccountNumber(editedAccountNumber))}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingAccountNumber(false)}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {getCurrentSettings().account_number
                        ? (showAccountNumber ? formatAccountNumber(getCurrentSettings().account_number!) : maskAccountNumber(getCurrentSettings().account_number!))
                        : <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    {getCurrentSettings().account_number && (
                      showAccountNumber
                        ? <EyeOff className="w-3.5 h-3.5 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" onClick={() => setShowAccountNumber(false)} />
                        : <Eye className="w-3.5 h-3.5 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0" onClick={() => setShowAccountNumber(true)} />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditedAccountNumber(''); setIsEditingAccountNumber(true); }}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Online Payment */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Online Payment</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

          <div className="space-y-1">
            {/* Payment URL */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Payment URL</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Link to your external payment page
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingPaymentUrl ? (
                  <>
                    <Input
                      value={editedPaymentUrl}
                      onChange={(e) => setEditedPaymentUrl(e.target.value)}
                      placeholder="https://pay.stripe.com/..."
                      className="flex-1 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('payment_url', editedPaymentUrl, setIsEditingPaymentUrl)}
                      disabled={isUpdating}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedPaymentUrl(getCurrentSettings().payment_url || '');
                        setIsEditingPaymentUrl(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3 truncate">
                      {getCurrentSettings().payment_url || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPaymentUrl(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Button Label */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Button Label</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Text shown on the payment button in the client portal
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingButtonLabel ? (
                  <>
                    <Input
                      value={editedButtonLabel}
                      onChange={(e) => setEditedButtonLabel(e.target.value)}
                      placeholder="Pay Online"
                      className="flex-1 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('payment_button_label', editedButtonLabel || 'Pay Online', setIsEditingButtonLabel)}
                      disabled={isUpdating}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedButtonLabel(getCurrentSettings().payment_button_label || 'Pay Online');
                        setIsEditingButtonLabel(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {getCurrentSettings().payment_button_label || 'Pay Online'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingButtonLabel(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Confirmation Dialog for Bank Details */}
      <PasswordConfirmDialog
        open={showPasswordConfirm}
        onOpenChange={(open) => {
          setShowPasswordConfirm(open);
          if (!open) setPendingSave(null);
        }}
        onConfirm={handleConfirmedSave}
        title="Confirm Bank Detail Change"
        description="For security, please enter your password to confirm changes to bank details."
      />
    </div>
  );
};
