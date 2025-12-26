/**
 * Google Docs Service
 *
 * Service for generating Google Docs from templates using the edge function.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormBuilderData } from '@/features/proposals/context/FormBuilderContext';

export interface GenerateDocRequest {
  templateDocId: string;
  proposalId?: string;
  organizationId: string;
  variables: Record<string, string>;
  outputTitle?: string;
}

export interface GenerateDocResponse {
  success: boolean;
  docId: string;
  docUrl: string;
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
        clientName?: string;
        clientCompany?: string;
        clientEmail?: string;
        clientPhone?: string;
        clientAddress?: string;
        jobLocation?: string;
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
  const pricing = formData?.pricing || {};
  const summary = pricing.summary || {};

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

    // Client info
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

    // Pricing summary
    'pricing.subtotal': formatCurrency(summary.subtotal),
    'pricing.totalCost': formatCurrency(summary.totalCost),
    'pricing.grossProfit': formatCurrency(summary.grossProfit),
    'pricing.grossProfitPercent': summary.grossProfitPercent
      ? `${summary.grossProfitPercent.toFixed(1)}%`
      : '',
    'pricing.tax': formatCurrency(summary.totalTax),
    'pricing.taxPercent': pricing.salesTaxPercent
      ? `${pricing.salesTaxPercent}%`
      : '',
    'pricing.grandTotal': formatCurrency(summary.grandTotal),
    'pricing.total': formatCurrency(summary.subtotal), // Alias for subtotal
  };

  // Add pricing section totals
  if (pricing.sections) {
    pricing.sections.forEach((section) => {
      const sectionKey = section.name.toLowerCase().replace(/\s+/g, '_');
      let sectionTotal = 0;
      section.lineItems.forEach((item) => {
        sectionTotal += item.sellPrice || 0;
      });
      variables[`pricing.${sectionKey}.total`] = formatCurrency(sectionTotal);
      variables[`pricing.${sectionKey}.items`] = section.lineItems
        .map((item) => item.name)
        .filter(Boolean)
        .join(', ');
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

/**
 * Generate a Google Doc from proposal data
 */
export async function generateProposalDoc(
  templateDocId: string,
  proposalId: string,
  organizationId: string,
  proposalData: Parameters<typeof buildProposalVariables>[0],
  formData: FormBuilderData,
  outputTitle?: string
): Promise<GenerateDocResponse> {
  const variables = buildProposalVariables(proposalData, formData);

  return generateGoogleDoc({
    templateDocId,
    proposalId,
    organizationId,
    variables,
    outputTitle,
  });
}
