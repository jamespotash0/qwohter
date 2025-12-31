/**
 * Google Docs Service
 *
 * Service for generating Google Docs from templates using the edge function.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormBuilderData } from '@/features/proposals/context/FormBuilderContext';

/** Data for dynamic table row duplication */
export interface TableRowData {
  /** Unique identifier for the table (e.g., 'pricing', 'products') */
  tableId: string;
  /** Array of row data - each object's keys become {{row.key}} variables */
  rows: Array<Record<string, string | number>>;
}

export interface GenerateDocRequest {
  templateDocId: string;
  proposalId?: string;
  organizationId: string;
  variables: Record<string, string>;
  /** Optional table data for row duplication */
  tableData?: TableRowData[];
  outputTitle?: string;
  mode?: 'create' | 'overwrite';
  existingDocId?: string;
  version?: number;
}

export interface GenerateDocResponse {
  success: boolean;
  docId: string;
  docUrl: string;
  version?: number;
  title?: string;
}

export interface GeneratedDocVersion {
  docId: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Build variables object from proposal and form data
 */
export function buildProposalVariables(
  proposalData: {
    proposal_number?: string;
    project_name?: string;
    form_data?: {
      info?: {
        projectName?: string;
        proposalDate?: string;
        // Contact (internal contact person)
        contactName?: string;
        contactEmail?: string;
        // Client (external customer)
        clientName?: string;
        clientCompany?: string;
        clientEmail?: string;
        clientPhone?: string;
        clientAddress?: string;
        jobLocation?: string;
        // Work details
        isUnion?: boolean;
        isPrevailingWage?: boolean;
        projectType?: string;
        categoryOfWork?: string;
      };
    };
    organization?: {
      name?: string;
      phone_number?: string;
      fax_number?: string;
      company_address?: string;
      website?: string;
    } | null;
  },
  formData: FormBuilderData
): Record<string, string> {
  const info = proposalData?.form_data?.info || {};
  const org = proposalData?.organization || {};
  const pricing = formData?.pricing;
  const summary = pricing?.summary;

  // Format currency helper
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const variables: Record<string, string> = {
    // Proposal info
    'proposal.number': proposalData?.proposal_number || '',
    'proposal.date': formatDate(info.proposalDate) || formatDate(new Date().toISOString()),

    // Project info
    'project.name': info.projectName || proposalData?.project_name || '',
    'project.location': info.jobLocation || '',
    'project.type': info.projectType || '',
    'project.workType': info.categoryOfWork || '',

    // Labor & Wage info
    'project.laborType': info.isUnion ? 'Union' : 'Non-Union',
    'project.wageType': info.isPrevailingWage ? 'Prevailing Wage' : 'Standard Wage',

    // Contact (internal contact person)
    'contact.name': info.contactName || '',
    'contact.email': info.contactEmail || '',

    // Client info (external customer)
    'client.name': info.clientName || '',
    'client.company': info.clientCompany || '',
    'client.email': info.clientEmail || '',
    'client.phone': info.clientPhone || '',
    'client.address': info.clientAddress || '',

    // Organization info
    'org.name': org.name || '',
    'org.phone': org.phone_number || '',
    'org.fax': org.fax_number || '',
    'org.address': org.company_address || '',
    'org.website': org.website || '',

    // ============ PRICING TOTALS ============
    // Total Without Tax (before tax, includes markup & discounts)
    'pricing.totalWithoutTax': formatCurrency(summary?.subtotal),

    // Tax
    'pricing.tax': formatCurrency(summary?.totalTax),
    'pricing.taxRate': pricing?.salesTaxPercent
      ? `${pricing.salesTaxPercent}%`
      : '',

    // Grand Total (with tax) - the final total
    'pricing.grandTotal': formatCurrency(summary?.grandTotal),
  };

  // ============ PRICING SECTION TOTALS ============
  // Each section (e.g., "Materials", "Labor", "Equipment") gets its own total
  if (pricing?.sections) {
    pricing.sections.forEach((section, index) => {
      const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');

      // Calculate section sell total (what customer sees)
      let sectionTotal = 0;
      section.lineItems.forEach((item) => {
        sectionTotal += item.sellPrice || 0;
      });

      // Section totals by name (e.g., pricing.materials.total)
      variables[`pricing.${sectionKey}.total`] = formatCurrency(sectionTotal);
      variables[`pricing.${sectionKey}.items`] = section.lineItems
        .map((item) => item.name)
        .filter(Boolean)
        .join(', ');
      variables[`pricing.${sectionKey}.quantity`] = section.lineItems.length.toString();

      // Also add by index for predictable ordering (e.g., pricing.section1.total)
      variables[`pricing.section${index + 1}.name`] = section.name;
      variables[`pricing.section${index + 1}.total`] = formatCurrency(sectionTotal);
    });
  }

  // Add lead times
  if (formData?.leadTimes?.sections) {
    formData.leadTimes.sections.forEach((section) => {
      const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');
      section.phases.forEach((phase, index) => {
        variables[`leadtimes.${sectionKey}.phase${index + 1}.name`] = phase.phaseName || '';
        variables[`leadtimes.${sectionKey}.phase${index + 1}.duration`] = phase.duration || '';
        variables[`leadtimes.${sectionKey}.phase${index + 1}.completion`] = phase.estCompletionDate || '';
      });
    });
  }

  // Add products
  if (formData?.products?.items) {
    formData.products.items.forEach((product, index) => {
      const prefix = `product.${index + 1}`;
      variables[`${prefix}.name`] = product.name || '';
      variables[`${prefix}.quantity`] = product.quantity?.toString() || '';
      variables[`${prefix}.unit`] = product.unit || '';
      variables[`${prefix}.description`] = product.description || '';
      if (product.alias) {
        variables[`product.${product.alias}.name`] = product.name || '';
        variables[`product.${product.alias}.quantity`] = product.quantity?.toString() || '';
      }
    });
  }

  // Add miscellaneous fields
  if (formData?.miscellaneous?.fields) {
    formData.miscellaneous.fields.forEach((field) => {
      const fieldKey = field.label.toLowerCase().replace(/\s+/g, '_');
      variables[`misc.${fieldKey}`] = field.value || '';
    });
  }
  if (formData?.miscellaneous?.notes) {
    variables['misc.notes'] = formData.miscellaneous.notes;
  }

  // ============ DYNAMIC TABLE VARIABLES ============
  // These generate formatted text blocks for tables

  // Products table - all products in a formatted list
  if (formData?.products?.items && formData.products.items.length > 0) {
    const productRows = formData.products.items.map((product, idx) => {
      const name = product.name || `Product ${idx + 1}`;
      const qty = product.quantity || 0;
      const unit = product.unit || 'ea';
      const desc = product.description ? ` - ${product.description}` : '';
      return `${name}\t${qty} ${unit}${desc}`;
    });
    variables['products.table'] = productRows.join('\n');
    variables['products.count'] = formData.products.items.length.toString();
  } else {
    variables['products.table'] = '';
    variables['products.count'] = '0';
  }

  // Pricing items table - all line items across all sections
  if (pricing?.sections && pricing.sections.length > 0) {
    const allLineItems: Array<{
      section: string;
      name: string;
      quantity: number;
      sellPrice: number;
    }> = [];

    pricing.sections.forEach((section) => {
      section.lineItems.forEach((item) => {
        allLineItems.push({
          section: section.name,
          name: item.name,
          quantity: item.quantity,
          sellPrice: item.sellPrice || 0,
        });
      });
    });

    if (allLineItems.length > 0) {
      const pricingRows = allLineItems.map((item) => {
        return `${item.name}\t${item.quantity}\t${formatCurrency(item.sellPrice)}`;
      });
      variables['pricing.itemsTable'] = pricingRows.join('\n');
      variables['pricing.itemsCount'] = allLineItems.length.toString();
    } else {
      variables['pricing.itemsTable'] = '';
      variables['pricing.itemsCount'] = '0';
    }
  } else {
    variables['pricing.itemsTable'] = '';
    variables['pricing.itemsCount'] = '0';
  }

  return variables;
}

/**
 * Generate a Google Doc from a template
 */
export async function generateGoogleDoc(
  request: GenerateDocRequest
): Promise<GenerateDocResponse> {
  const { data, error } = await supabase.functions.invoke('generate-google-doc', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate document');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to generate document');
  }

  return data as GenerateDocResponse;
}

export interface GenerateProposalDocOptions {
  templateDocId: string;
  proposalId: string;
  organizationId: string;
  proposalData: Parameters<typeof buildProposalVariables>[0];
  formData: FormBuilderData;
  outputTitle?: string;
  mode?: 'create' | 'overwrite';
  existingDocId?: string;
  version?: number;
}

/**
 * Build table data for dynamic row duplication in Google Docs
 */
export function buildTableData(formData: FormBuilderData): TableRowData[] {
  const tables: TableRowData[] = [];
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Products table
  if (formData?.products?.items && formData.products.items.length > 0) {
    tables.push({
      tableId: 'products',
      rows: formData.products.items.map((product, idx) => ({
        index: idx + 1,
        name: product.name || '',
        quantity: product.quantity || 0,
        unit: product.unit || 'ea',
        description: product.description || '',
        alias: product.alias || '',
      })),
    });
  }

  // Pricing items table - all line items across all sections
  if (formData?.pricing?.sections && formData.pricing.sections.length > 0) {
    const allItems: Array<Record<string, string | number>> = [];
    let itemIndex = 1;

    formData.pricing.sections.forEach((section) => {
      section.lineItems.forEach((item) => {
        allItems.push({
          index: itemIndex++,
          section: section.name,
          name: item.name || '',
          quantity: item.quantity || 0,
          unitCost: formatCurrency(item.unitCost),
          sellPrice: formatCurrency(item.sellPrice),
          // Raw numeric values for calculations
          unitCostRaw: item.unitCost || 0,
          sellPriceRaw: item.sellPrice || 0,
        });
      });
    });

    if (allItems.length > 0) {
      tables.push({
        tableId: 'pricing',
        rows: allItems,
      });
    }
  }

  return tables;
}

/**
 * Generate a Google Doc from proposal data
 */
export async function generateProposalDoc(
  templateDocId: string,
  proposalId: string,
  organizationId: string,
  proposalData: Parameters<typeof buildProposalVariables>[0],
  formData: FormBuilderData,
  outputTitle?: string,
  options?: { mode?: 'create' | 'overwrite'; existingDocId?: string; version?: number }
): Promise<GenerateDocResponse> {
  const variables = buildProposalVariables(proposalData, formData);
  const tableData = buildTableData(formData);

  return generateGoogleDoc({
    templateDocId,
    proposalId,
    organizationId,
    variables,
    tableData,
    outputTitle,
    mode: options?.mode,
    existingDocId: options?.existingDocId,
    version: options?.version,
  });
}
