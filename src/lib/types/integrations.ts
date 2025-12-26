/**
 * Integration Types and Interfaces
 *
 * Defines all integration-related types for third-party services
 */

// ============================================================================
// Integration Types
// ============================================================================

export type IntegrationType = 'quickbooks_online' | 'quickbooks_desktop' | 'google_docs';

export type ConnectionStatus = 'Connected' | 'Disconnected' | 'Error' | 'Connecting';

export type InvoiceSyncStatus = 'Pending' | 'Synced' | 'Error';

// ============================================================================
// General Integration Interface
// ============================================================================

export interface Integration {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  integration_name: string;
  is_connected: boolean;
  connection_status: ConnectionStatus;
  last_connection_check_at: string | null;
  settings: Record<string, any>;
  connection_error: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// QuickBooks Online Types
// ============================================================================

export interface QBOnlineConnection {
  id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  realm_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  company_name: string | null;
  company_country: string | null;
  company_currency: string;
  created_at: string;
  updated_at: string;
}

export interface QBOnlineInvoiceSync {
  id: string;
  quote_id: string;
  organization_id: string;
  qb_invoice_id: string;
  qb_invoice_number: string | null;
  qb_sync_token: string | null;
  sync_status: InvoiceSyncStatus;
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

// QuickBooks Online API Types
export interface QBOnlineTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export interface QBOnlineInvoice {
  Line: QBOnlineInvoiceLine[];
  CustomerRef: {
    value: string;
    name?: string;
  };
  BillAddr?: {
    Line1?: string;
    City?: string;
    Country?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  DueDate?: string;
  TxnDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  CustomerMemo?: {
    value: string;
  };
}

export interface QBOnlineInvoiceLine {
  Amount: number;
  DetailType: 'SalesItemLineDetail';
  SalesItemLineDetail: {
    ItemRef: {
      value: string;
      name?: string;
    };
    Qty?: number;
    UnitPrice?: number;
  };
  Description?: string;
}

export interface QBOnlineCustomer {
  DisplayName: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  BillAddr?: {
    Line1?: string;
    City?: string;
    Country?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
}

export interface QBOnlineItem {
  Name: string;
  Type: 'Service' | 'NonInventory';
  IncomeAccountRef: {
    value: string;
    name?: string;
  };
  Description?: string;
  UnitPrice?: number;
}

// ============================================================================
// Integration Card Display Types
// ============================================================================

export interface IntegrationCardData {
  type: IntegrationType;
  name: string;
  description: string;
  logoUrl: string;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastSync?: string | null;
  features: string[];
}

// ============================================================================
// Invoice Creation Types
// ============================================================================

export interface InvoiceCreationRequest {
  quote_id: string;
  integration_type: IntegrationType;
  customer_id?: string;              // QuickBooks Customer ID (if known)
  send_to_customer?: boolean;        // Whether to email invoice to customer
  payment_terms?: string;            // Net 30, Due on Receipt, etc.
  notes?: string;                    // Private notes
  customer_memo?: string;            // Message to customer
}

export interface InvoiceCreationResult {
  success: boolean;
  invoice_id?: string;
  invoice_number?: string;
  invoice_url?: string;
  error?: string;
}

// ============================================================================
// OAuth Flow Types
// ============================================================================

export interface OAuthCallbackParams {
  code: string;
  realmId: string;
  state: string;
}

export interface OAuthState {
  organization_id: string;
  return_url: string;
  nonce: string;
}

// ============================================================================
// Google Docs Integration Types
// Now org-level: one token per organization, connected by an admin
// ============================================================================

export interface GoogleOAuthToken {
  id: string;
  organization_id: string;
  connected_by_user_id: string | null;  // Admin who connected
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
  google_email: string | null;
  google_name: string | null;
  drive_folder_id: string | null;       // Shared folder for documents
  is_valid: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleOAuthCallbackParams {
  code: string;
  state: string;
}

export interface GoogleOAuthState {
  organization_id: string;
  user_id: string;
  return_url: string;
  nonce: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}
