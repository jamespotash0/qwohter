/**
 * Breakdown Analytics Calculations
 *
 * Functions for grouping proposals by source, user, product, category,
 * project type, location type, and work classification.
 */

import type { Proposal } from '@/services/proposalsService';
import type {
  ProposalSourceMetrics,
  UserProposalMetrics,
  ProductMetrics,
  ProductModelMetrics,
  CategoryOfWorkMetrics,
  ProjectTypeMetrics,
  LocationTypeMetrics,
  WorkClassificationMetrics,
} from './coreCalculations';

// ─── Source Metrics ──────────────────────────────────────────────────

export const calculateSourceMetrics = (proposals: Proposal[]): ProposalSourceMetrics[] => {
  const sourceMap = new Map<string, {
    source: string;
    proposalCount: number;
    totalValue: number;
    wonCount: number;
  }>();

  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const source = proposal.proposal_source || 'Unknown';
    if (!sourceMap.has(source)) {
      sourceMap.set(source, { source, proposalCount: 0, totalValue: 0, wonCount: 0 });
    }
    const metrics = sourceMap.get(source)!;
    metrics.proposalCount++;
    metrics.totalValue += proposal.total_value || 0;
    if (proposal.status === 'Won') metrics.wonCount++;
  });

  return Array.from(sourceMap.values()).map(metrics => ({
    source: metrics.source,
    proposalCount: metrics.proposalCount,
    averageValue: metrics.proposalCount > 0 ? metrics.totalValue / metrics.proposalCount : 0,
    wonCount: metrics.wonCount,
    conversionRate: metrics.proposalCount > 0 ? (metrics.wonCount / metrics.proposalCount) * 100 : 0,
  })).sort((a, b) => b.averageValue - a.averageValue);
};

// ─── User Metrics ────────────────────────────────────────────────────

export const calculateUserMetrics = (proposals: Proposal[]): UserProposalMetrics[] => {
  const userMap = new Map<string, UserProposalMetrics>();

  proposals.forEach((proposal) => {
    const userName = proposal.created_by_name || proposal.creator_name || 'Unknown';
    if (!userMap.has(userName)) {
      userMap.set(userName, { userName, proposalCount: 0, wonCount: 0, revenue: 0 });
    }
    const metrics = userMap.get(userName)!;
    metrics.proposalCount++;
    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
    }
  });

  return Array.from(userMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

// ─── Product Metrics ─────────────────────────────────────────────────

export const calculateProductMetrics = (proposals: Proposal[]): ProductMetrics[] => {
  const productMap = new Map<string, ProductMetrics>();

  proposals.forEach((proposal) => {
    const products = proposal.form_data?.products?.items || [];
    products.forEach((product: any) => {
      const productDomain =
        product.rawData?.productDomain ||
        'Other';

      if (!productMap.has(productDomain)) {
        productMap.set(productDomain, { productDomain, proposalCount: 0, revenue: 0 });
      }
      const metrics = productMap.get(productDomain)!;
      metrics.proposalCount++;
      if (proposal.status === 'Won') metrics.revenue += proposal.total_value || 0;
    });
  });

  return Array.from(productMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

// ─── Product Model Metrics ───────────────────────────────────────────

export const calculateProductModelMetrics = (proposals: Proposal[]): ProductModelMetrics[] => {
  const modelMap = new Map<string, ProductModelMetrics>();

  proposals.forEach((proposal) => {
    const products = proposal.form_data?.products?.items || [];
    products.forEach((product: any) => {
      const productDomain =
        product.rawData?.productDomain ||
        'Other';
      const model = product.rawData?.model || 'Other';
      const key = `${productDomain}|${model}`;

      if (!modelMap.has(key)) {
        modelMap.set(key, { productDomain, model, proposalCount: 0, revenue: 0 });
      }
      const metrics = modelMap.get(key)!;
      metrics.proposalCount++;
      if (proposal.status === 'Won') metrics.revenue += proposal.total_value || 0;
    });
  });

  return Array.from(modelMap.values()).sort((a, b) => {
    if (a.productDomain !== b.productDomain) return a.productDomain.localeCompare(b.productDomain);
    return b.proposalCount - a.proposalCount;
  });
};

// ─── Category of Work Metrics ────────────────────────────────────────

export const calculateCategoryOfWorkMetrics = (proposals: Proposal[]): CategoryOfWorkMetrics[] => {
  const categoryMap = new Map<string, {
    category: string;
    proposalCount: number;
    revenue: number;
    wonCount: number;
    totalDecided: number;
  }>();

  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const category = proposal.form_data?.info?.categoryOfWork || 'Other';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { category, proposalCount: 0, revenue: 0, wonCount: 0, totalDecided: 0 });
    }
    const metrics = categoryMap.get(category)!;
    metrics.proposalCount++;
    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
      metrics.totalDecided++;
    } else if (proposal.status === 'Rejected') {
      metrics.totalDecided++;
    }
  });

  return Array.from(categoryMap.values()).map(m => ({
    category: m.category,
    proposalCount: m.proposalCount,
    revenue: m.revenue,
    wonCount: m.wonCount,
    conversionRate: m.totalDecided > 0 ? (m.wonCount / m.totalDecided) * 100 : 0,
  })).sort((a, b) => b.proposalCount - a.proposalCount);
};

// ─── Project Type Metrics ────────────────────────────────────────────

export const calculateProjectTypeMetrics = (proposals: Proposal[]): ProjectTypeMetrics[] => {
  const typeMap = new Map<string, {
    projectType: string;
    proposalCount: number;
    revenue: number;
    wonCount: number;
    totalDecided: number;
  }>();

  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const projectType = proposal.form_data?.info?.projectType || 'Other';
    if (!typeMap.has(projectType)) {
      typeMap.set(projectType, { projectType, proposalCount: 0, revenue: 0, wonCount: 0, totalDecided: 0 });
    }
    const metrics = typeMap.get(projectType)!;
    metrics.proposalCount++;
    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
      metrics.totalDecided++;
    } else if (proposal.status === 'Rejected') {
      metrics.totalDecided++;
    }
  });

  return Array.from(typeMap.values()).map(m => ({
    projectType: m.projectType,
    proposalCount: m.proposalCount,
    revenue: m.revenue,
    wonCount: m.wonCount,
    conversionRate: m.totalDecided > 0 ? (m.wonCount / m.totalDecided) * 100 : 0,
  })).sort((a, b) => b.proposalCount - a.proposalCount);
};

// ─── Location Type Metrics ───────────────────────────────────────────

export const calculateLocationTypeMetrics = (proposals: Proposal[]): LocationTypeMetrics[] => {
  const locationMap = new Map<string, LocationTypeMetrics>();

  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const locationType = proposal.form_data?.info?.locationType || 'Other';
    if (!locationMap.has(locationType)) {
      locationMap.set(locationType, { locationType, proposalCount: 0, revenue: 0, wonCount: 0 });
    }
    const metrics = locationMap.get(locationType)!;
    metrics.proposalCount++;
    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
    }
  });

  return Array.from(locationMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};

// ─── Work Classification Metrics ─────────────────────────────────────

export const calculateWorkClassificationMetrics = (proposals: Proposal[]): WorkClassificationMetrics[] => {
  const classificationMap = new Map<string, WorkClassificationMetrics>();

  const relevantProposals = proposals.filter((p) =>
    (p.status === 'Submitted' || p.status === 'Won' || p.status === 'Rejected') &&
    (p.is_main_version === true || p.is_main_version === undefined)
  );

  relevantProposals.forEach((proposal) => {
    const isUnion = proposal.form_data?.info?.isUnion === true;
    const isPrevailingWage = proposal.form_data?.info?.isPrevailingWage === true;
    const key = `${isUnion}-${isPrevailingWage}`;

    if (!classificationMap.has(key)) {
      classificationMap.set(key, { isUnion, isPrevailingWage, proposalCount: 0, revenue: 0, wonCount: 0 });
    }
    const metrics = classificationMap.get(key)!;
    metrics.proposalCount++;
    if (proposal.status === 'Won') {
      metrics.wonCount++;
      metrics.revenue += proposal.total_value || 0;
    }
  });

  return Array.from(classificationMap.values()).sort((a, b) => b.proposalCount - a.proposalCount);
};
