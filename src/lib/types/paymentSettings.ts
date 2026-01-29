/**
 * Payment settings for client-facing invoices.
 * Stored as JSONB in organizations.payment_settings
 */
export interface PaymentSettings {
  // Bank Transfer (ACH)
  bank_name?: string;
  routing_number?: string;
  account_number?: string;

  // Online Payment
  payment_url?: string;
  payment_button_label?: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  bank_name: '',
  routing_number: '',
  account_number: '',
  payment_url: '',
  payment_button_label: 'Pay Online',
};
