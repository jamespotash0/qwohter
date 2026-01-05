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
    // Direct organization fields (stored on proposal)
    organization_name?: string;
    form_data?: {
      info?: {
        projectName?: string;
        proposalDate?: string;
        estimatedDueDate?: string;
        proposalSource?: string;
        jobNotes?: string;
        // Contact (internal contact person)
        contactName?: string;
        contactEmail?: string;
        // Client (external customer)
        clientName?: string;
        clientCompany?: string;
        clientEmail?: string;
        clientPhone?: string;
        clientAddress?: string;
        // Job location
        jobLocation?: string;
        jobLocationName?: string;
        jobFloor?: string;
        locationType?: string;
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
  // Info data comes from proposal form_data (not FormBuilderData which has different structure)
  const info = proposalData?.form_data?.info || {};
  const org = proposalData?.organization || {};
  const pricing = formData?.pricing;
  const summary = pricing?.summary;

  // Organization name: check direct field first, then nested organization
  const orgName = proposalData?.organization_name || org.name || '';


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
    'project.date': formatDate(info.proposalDate) || formatDate(new Date().toISOString()), // Alias for proposal.date
    'project.dueDate': formatDate(info.estimatedDueDate) || '',
    'project.source': info.proposalSource || '',
    'project.notes': info.jobNotes || '',
    'project.location': info.jobLocation || '',
    'project.locationName': info.jobLocationName || '',
    'project.floor': info.jobFloor || '',
    'project.locationType': info.locationType || '',
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

    // Organization info (check direct proposal fields first, then nested org object)
    'org.name': orgName,
    'org.phone': org.phone_number || '',
    'org.fax': org.fax_number || '',
    'org.address': org.company_address || '',
    'org.website': org.website || '',

    // ============ PRICING TOTALS ============
    // Total Selling Price (sum of all sections, excluding tax)
    'pricing.totalSellingPrice': formatCurrency(summary?.subtotal),

    // Tax
    'pricing.tax': formatCurrency(summary?.totalTax),
    'pricing.taxRate': pricing?.salesTaxPercent
      ? `${pricing.salesTaxPercent}%`
      : '',

    // Grand Total (sum of all sections including tax)
    'pricing.grandTotal': formatCurrency(summary?.grandTotal),
  };

  // ============ PRICING SECTION TOTALS ============
  // Each section (e.g., "Materials", "Labor", "Equipment") gets its own totals
  if (pricing?.sections) {
    pricing.sections.forEach((section, index) => {
      const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');

      // Calculate section totals
      let sectionSellTotal = 0; // Total Selling Price (what customer pays)

      section.lineItems.forEach((item) => {
        sectionSellTotal += item.sellPrice || 0;
      });

      // Section totals by name (e.g., pricing.materials.sellingPrice)
      variables[`pricing.${sectionKey}.sellingPrice`] = formatCurrency(sectionSellTotal);

      // Also add by index for predictable ordering (e.g., pricing.section1.sellingPrice)
      variables[`pricing.section${index + 1}.name`] = section.name;
      variables[`pricing.section${index + 1}.sellingPrice`] = formatCurrency(sectionSellTotal);

      // ============ LINE ITEM VARIABLES ============
      // Each line item gets its own variables using the item name as key
      // e.g., pricing.materials.track_installation.quantity
      section.lineItems.forEach((item) => {
        if (!item.name) return; // Skip items without names

        const itemKey = item.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const prefix = `pricing.${sectionKey}.${itemKey}`;

        variables[`${prefix}.name`] = item.name;
        variables[`${prefix}.quantity`] = item.quantity?.toString() || '0';
        variables[`${prefix}.unitCost`] = formatCurrency(item.unitCost);
        variables[`${prefix}.sellPrice`] = formatCurrency(item.sellPrice);
      });
    });
  }

  // Add lead times - use phase name as key (camelCase)
  // Format: {{leadtimes.panelDelivery.duration}} instead of {{leadtimes.project_timeline_panelDelivery.duration}}
  if (formData?.leadTimes?.sections) {
    formData.leadTimes.sections.forEach((section) => {
      section.phases.forEach((phase, index) => {
        // Convert phase name to camelCase key (e.g., "Track Installation" -> "trackInstallation")
        const phaseKey = phase.phaseName
          ? phase.phaseName
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
              .join('')
          : `phase${index + 1}`;

        variables[`leadtimes.${phaseKey}.name`] = phase.phaseName || '';
        variables[`leadtimes.${phaseKey}.duration`] = phase.duration || '';
        variables[`leadtimes.${phaseKey}.completion`] = phase.estCompletionDate || '';
      });
    });
  }

  // Add products with rawData fields
  if (formData?.products?.items) {
    formData.products.items.forEach((product, index) => {
      const prefix = `product.${index + 1}`;
      variables[`${prefix}.name`] = product.name || '';
      variables[`${prefix}.quantity`] = product.quantity?.toString() || '';
      variables[`${prefix}.unit`] = product.unit || '';
      variables[`${prefix}.description`] = product.description || '';

      // Add rawData fields with Upper Case naming
      const rawData = product.rawData || {};

      // Basic product info
      variables[`${prefix}.Manufacturer`] = rawData.manufacturer || '';
      variables[`${prefix}.Product_Type`] = rawData.productType || '';
      variables[`${prefix}.Product_Category`] = rawData.productCategory || '';
      variables[`${prefix}.Series`] = rawData.series || '';
      variables[`${prefix}.Model`] = rawData.model || '';

      // Dimensions
      const dims = rawData.dimensions || {};
      variables[`${prefix}.Height`] = dims.height || '';
      variables[`${prefix}.Width`] = dims.width || '';
      variables[`${prefix}.Length`] = dims.length || '';
      variables[`${prefix}.Thickness`] = dims.thickness || '';

      // Performance ratings
      const perf = rawData.performanceRatings || {};
      variables[`${prefix}.STC`] = perf.stc?.toString() || '';
      variables[`${prefix}.Fire_Rating`] = perf.fireRating || '';
      variables[`${prefix}.Acoustic_Rating`] = perf.acousticRating || '';

      // Appearance - with Finish_Color falling back to Finish
      const appearance = rawData.appearance || {};
      const finishColor = appearance.color || '';
      const finishStyle = appearance.finish || '';
      // Finish_Color uses color if available, otherwise falls back to finish
      variables[`${prefix}.Finish_Color`] = finishColor || finishStyle;
      variables[`${prefix}.Finish_Style`] = finishStyle;
      variables[`${prefix}.Color`] = finishColor;
      variables[`${prefix}.Finish`] = finishStyle;
      variables[`${prefix}.Trim`] = appearance.trim || '';

      // Materials
      const mats = rawData.materials || {};
      variables[`${prefix}.Core`] = mats.core || '';
      variables[`${prefix}.Face`] = mats.face || '';
      variables[`${prefix}.Frame`] = mats.frame || '';

      // Certifications as comma-separated list
      variables[`${prefix}.Certifications`] = (rawData.certifications || []).join(', ');

      // Also add by alias if provided
      if (product.alias) {
        const aliasPrefix = `product.${product.alias}`;
        variables[`${aliasPrefix}.name`] = product.name || '';
        variables[`${aliasPrefix}.quantity`] = product.quantity?.toString() || '';
        variables[`${aliasPrefix}.Finish_Color`] = finishColor || finishStyle;
        variables[`${aliasPrefix}.Finish_Style`] = finishStyle;
        variables[`${aliasPrefix}.Color`] = finishColor;
        variables[`${aliasPrefix}.Finish`] = finishStyle;
        variables[`${aliasPrefix}.Manufacturer`] = rawData.manufacturer || '';
        variables[`${aliasPrefix}.Model`] = rawData.model || '';
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
    // Comma-separated list of product names
    variables['products.list'] = formData.products.items
      .map((p) => p.name)
      .filter(Boolean)
      .join(', ');
  } else {
    variables['products.table'] = '';
    variables['products.count'] = '0';
    variables['products.list'] = '';
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

  // Products table with rawData fields
  if (formData?.products?.items && formData.products.items.length > 0) {
    tables.push({
      tableId: 'products',
      rows: formData.products.items.map((product, idx) => {
        const rawData = product.rawData || {};
        const dims = rawData.dimensions || {};
        const perf = rawData.performanceRatings || {};
        const appearance = rawData.appearance || {};
        const mats = rawData.materials || {};

        const finishColor = appearance.color || '';
        const finishStyle = appearance.finish || '';

        return {
          index: idx + 1,
          name: product.name || '',
          quantity: product.quantity || 0,
          unit: product.unit || 'ea',
          description: product.description || '',
          alias: product.alias || '',
          // Product info - Upper Case
          Manufacturer: rawData.manufacturer || '',
          Product_Type: rawData.productType || '',
          Product_Category: rawData.productCategory || '',
          Series: rawData.series || '',
          Model: rawData.model || '',
          // Dimensions
          Height: dims.height || '',
          Width: dims.width || '',
          Length: dims.length || '',
          Thickness: dims.thickness || '',
          // Performance
          STC: perf.stc?.toString() || '',
          Fire_Rating: perf.fireRating || '',
          Acoustic_Rating: perf.acousticRating || '',
          // Appearance - Finish_Color falls back to Finish
          Finish_Color: finishColor || finishStyle,
          Finish_Style: finishStyle,
          Color: finishColor,
          Finish: finishStyle,
          Trim: appearance.trim || '',
          // Materials
          Core: mats.core || '',
          Face: mats.face || '',
          Frame: mats.frame || '',
          Certifications: (rawData.certifications || []).join(', '),
        };
      }),
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
