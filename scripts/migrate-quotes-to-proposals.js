#!/usr/bin/env node
/**
 * Migration Script: Quotes → Proposals
 *
 * Transforms old quotes table data to the new proposals format.
 * Run with: node scripts/migrate-quotes-to-proposals.js <input.json> [output.json]
 *
 * IMPORTANT: Test on a small batch first, then run full migration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse JSON safely with fallback to empty object
 */
function safeParseJSON(jsonString) {
  if (!jsonString) return {};
  try {
    return JSON.parse(jsonString);
  } catch {
    console.warn('Failed to parse JSON:', jsonString?.substring(0, 100));
    return {};
  }
}

/**
 * Generate a simple unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Build pricing sections from old price_details
 */
function buildPricingSections(priceDetails) {
  const sections = [];

  // Merchandise section (materials)
  const merchandiseItems = [];

  if (priceDetails.kwik_wall_materials_cost) {
    merchandiseItems.push({
      id: generateId(),
      name: 'Kwik-Wall Materials',
      quantity: 1,
      unitCost: parseFloat(priceDetails.kwik_wall_materials_cost) || 0,
      sellPrice: (parseFloat(priceDetails.kwik_wall_materials_cost) || 0) * (1 + (parseFloat(priceDetails.materials_markup_percentage) || 40) / 100),
      markupPercent: parseFloat(priceDetails.materials_markup_percentage) || 40,
      sellRule: 'flat_rate',
      isTaxable: true,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  if (priceDetails.misc_materials_cost) {
    merchandiseItems.push({
      id: generateId(),
      name: 'Miscellaneous Materials',
      quantity: 1,
      unitCost: parseFloat(priceDetails.misc_materials_cost) || 0,
      sellPrice: (parseFloat(priceDetails.misc_materials_cost) || 0) * 1.4,
      markupPercent: 40,
      sellRule: 'flat_rate',
      isTaxable: true,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  sections.push({
    id: 'merchandise',
    name: 'Merchandise',
    type: 'merchandise',
    collapsed: false,
    lineItems: merchandiseItems,
  });

  // Delivery & Installation section
  const deliveryItems = [];

  if (priceDetails.track_labor_cost) {
    deliveryItems.push({
      id: generateId(),
      name: 'Track Installation Labor',
      quantity: 1,
      unitCost: parseFloat(priceDetails.track_labor_cost) || 0,
      sellPrice: parseFloat(priceDetails.track_labor_cost) || 0,
      markupPercent: 0,
      sellRule: 'per_job',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  if (priceDetails.panel_labor_cost) {
    deliveryItems.push({
      id: generateId(),
      name: 'Panel Installation Labor',
      quantity: 1,
      unitCost: parseFloat(priceDetails.panel_labor_cost) || 0,
      sellPrice: parseFloat(priceDetails.panel_labor_cost) || 0,
      markupPercent: 0,
      sellRule: 'per_job',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  if (priceDetails.local_handling_costs) {
    deliveryItems.push({
      id: generateId(),
      name: 'Local Handling',
      quantity: 1,
      unitCost: parseFloat(priceDetails.local_handling_costs) || 0,
      sellPrice: parseFloat(priceDetails.local_handling_costs) || 0,
      markupPercent: 0,
      sellRule: 'per_job',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  sections.push({
    id: 'delivery_install',
    name: 'Delivery & Installation',
    type: 'delivery_install',
    collapsed: false,
    lineItems: deliveryItems,
  });

  // Freight & Shipping section
  const freightItems = [];

  if (priceDetails.panel_freight_factory) {
    freightItems.push({
      id: generateId(),
      name: 'Panel Freight (Factory)',
      quantity: 1,
      unitCost: parseFloat(priceDetails.panel_freight_factory) || 0,
      sellPrice: (parseFloat(priceDetails.panel_freight_factory) || 0) * (1 + (parseFloat(priceDetails.shipping_markup_percentage) || 38) / 100),
      markupPercent: parseFloat(priceDetails.shipping_markup_percentage) || 38,
      sellRule: 'flat_rate',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  if (priceDetails.track_freight_factory) {
    freightItems.push({
      id: generateId(),
      name: 'Track Freight (Factory)',
      quantity: 1,
      unitCost: parseFloat(priceDetails.track_freight_factory) || 0,
      sellPrice: (parseFloat(priceDetails.track_freight_factory) || 0) * (1 + (parseFloat(priceDetails.shipping_markup_percentage) || 38) / 100),
      markupPercent: parseFloat(priceDetails.shipping_markup_percentage) || 38,
      sellRule: 'flat_rate',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  if (priceDetails.delivery_cost_panel && priceDetails.delivery_cost_panel > 0.01) {
    freightItems.push({
      id: generateId(),
      name: 'Panel Delivery',
      quantity: 1,
      unitCost: parseFloat(priceDetails.delivery_cost_panel) || 0,
      sellPrice: parseFloat(priceDetails.delivery_cost_panel) || 0,
      markupPercent: 0,
      sellRule: 'flat_rate',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  if (priceDetails.delivery_cost_track && priceDetails.delivery_cost_track > 0.01) {
    freightItems.push({
      id: generateId(),
      name: 'Track Delivery',
      quantity: 1,
      unitCost: parseFloat(priceDetails.delivery_cost_track) || 0,
      sellPrice: parseFloat(priceDetails.delivery_cost_track) || 0,
      markupPercent: 0,
      sellRule: 'flat_rate',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  sections.push({
    id: 'freight',
    name: 'Freight & Shipping',
    type: 'freight',
    collapsed: false,
    lineItems: freightItems,
  });

  // Tariffs & Fees (empty for old quotes)
  sections.push({
    id: 'tariffs',
    name: 'Tariffs & Fees',
    type: 'tariffs',
    collapsed: false,
    lineItems: [],
  });

  // Other Costs
  const otherItems = [];

  if (priceDetails.unseen_costs && priceDetails.unseen_costs > 0) {
    otherItems.push({
      id: generateId(),
      name: 'Contingency/Unseen Costs',
      quantity: 1,
      unitCost: parseFloat(priceDetails.unseen_costs) || 0,
      sellPrice: parseFloat(priceDetails.unseen_costs) || 0,
      markupPercent: 0,
      sellRule: 'flat_rate',
      isTaxable: false,
      taxAmount: 0,
      markupType: 'percent',
      markupValue: 0,
      discountType: 'percent',
      discountValue: 0,
    });
  }

  sections.push({
    id: 'other',
    name: 'Other Costs',
    type: 'other',
    collapsed: false,
    lineItems: otherItems,
  });

  return sections;
}

/**
 * Build products from wall_details
 */
function buildProductsFromWalls(wallDetails) {
  const products = [];
  const walls = wallDetails.walls || {};

  for (const [wallName, wallData] of Object.entries(walls)) {
    const wall = wallData;

    products.push({
      id: generateId(),
      name: `Kwik-Wall ${wall.series || ''} ${wall.model || ''}`.trim(),
      unit: 'ea',
      alias: wallName,
      quantity: parseInt(wall.quantity) || 1,
      description: '',
      rawData: {
        model: wall.model || '',
        series: wall.series || '',
        source: 'migration',
        productType: 'Wall Systems',
        manufacturer: 'Kwik-Wall',
        productDomain: 'Wall Systems',
        // Preserve original wall details
        heightFeet: wall.heightFeet,
        heightInches: wall.heightInches,
        lengthFeet: wall.lengthFeet,
        lengthInches: wall.lengthInches,
        panelCount: wall.panelCount,
        panelThickness: wall.panelThickness,
        stcRating: wall.stcRating,
        trackType: wall.trackType,
        trackSystem: wall.trackSystem,
        panelConfiguration: wall.panelConfiguration,
        panelFinishCategory: wall.panelFinishCategory,
        panelFinishSpecificItem: wall.panelFinishSpecificItem,
        topSeals: wall.topSeals,
        bottomSeals: wall.bottomSeals,
        verticalSeals: wall.verticalSeals,
        initialClosureSystem: wall.initialClosureSystem,
        finalClosureSystem: wall.finalClosureSystem,
        passDoorPanels: wall.passDoorPanels,
        passDoorQuantity: wall.passDoorQuantity,
        structureSupport: wall.structureSupport,
      },
    });
  }

  return products;
}

/**
 * Build lead times from delivery_details
 */
function buildLeadTimes(deliveryDetails) {
  const phases = [];

  if (deliveryDetails.shopDrawingWeeks) {
    phases.push({
      id: generateId(),
      name: 'Shop Drawings',
      duration: deliveryDetails.shopDrawingWeeks,
      order: 1,
    });
  }

  if (deliveryDetails.trackDeliveryWeeks) {
    phases.push({
      id: generateId(),
      name: 'Track Delivery',
      duration: deliveryDetails.trackDeliveryWeeks,
      order: 2,
    });
  }

  if (deliveryDetails.trackInstallationDays) {
    phases.push({
      id: generateId(),
      name: 'Track Installation',
      duration: deliveryDetails.trackInstallationDays,
      order: 3,
    });
  }

  if (deliveryDetails.panelDeliveryWeeks) {
    phases.push({
      id: generateId(),
      name: 'Panel Delivery',
      duration: deliveryDetails.panelDeliveryWeeks,
      order: 4,
    });
  }

  if (deliveryDetails.panelInstallationDays) {
    phases.push({
      id: generateId(),
      name: 'Panel Installation',
      duration: deliveryDetails.panelInstallationDays,
      order: 5,
    });
  }

  return [{
    id: 'section_1',
    name: 'Project Timeline',
    phases,
    collapsed: false,
  }];
}

/**
 * Transform old quote to new proposal format
 */
function transformQuoteToProposal(quote) {
  // Parse old JSON fields
  const quoteDetails = safeParseJSON(quote.quote_details);
  const jobDetails = safeParseJSON(quote.job_details);
  const priceDetails = safeParseJSON(quote.price_details);
  const deliveryDetails = safeParseJSON(quote.delivery_details);
  const laborDetails = safeParseJSON(quote.labor_details);
  const wallDetails = safeParseJSON(quote.wall_details);

  // Build info section
  const info = {
    projectName: quote.project_name || jobDetails.project_name || '',
    proposalDate: jobDetails.date || new Date().toISOString().split('T')[0],
    proposalSource: quote.quote_source || 'Manual Entry',

    // Client info
    clientName: jobDetails.client_name || '',
    clientCompany: jobDetails.client_company || '',
    clientAddress: jobDetails.client_address || '',
    clientEmail: jobDetails.client_email || '',
    clientPhone: jobDetails.client_phone || '',

    // Job location
    jobLocation: jobDetails.job_location || '',

    // Contact (internal)
    contactName: quoteDetails.contactName || '',
    contactEmail: quoteDetails.contactEmail || '',

    // Labor details
    isUnion: laborDetails.laborType === 'Union',
    isPrevailingWage: laborDetails.wageRate === 'Prevailing',
  };

  // Build pricing sections from old price_details
  const pricingSections = buildPricingSections(priceDetails);

  // Build pricing summary
  const pricingSummary = {
    subtotal: parseFloat(priceDetails.base_selling_price) || 0,
    totalCost: parseFloat(priceDetails.cost_subtotal) || 0,
    totalTax: 0, // Old format didn't track tax separately
    grandTotal: parseFloat(priceDetails.final_selling_price) || parseFloat(quote.total_value) || 0,
    grossProfit: parseFloat(priceDetails.final_selling_price_profit_amount) || 0,
    grossProfitPercent: parseFloat(priceDetails.final_selling_gross_profit_percentage) || 0,
  };

  // Build products from wall_details
  const products = buildProductsFromWalls(wallDetails);

  // Build lead times from delivery_details
  const leadTimes = buildLeadTimes(deliveryDetails);

  return {
    id: quote.id,
    organization_id: quote.organization_id,
    created_by: quote.created_by,
    proposal_number: quote.proposal_number,
    project_name: quote.project_name,
    status: quote.status,
    form_id: '16ecb465-81d1-4d03-b661-5dee789e2881', // Default form ID
    form_data: {
      info,
      pricing: {
        sections: pricingSections,
        summary: pricingSummary,
        taxState: 'NY', // Default, adjust as needed
        salesTaxPercent: 8.875, // Default NYC rate
      },
      products: {
        items: products,
      },
      leadTimes: {
        sections: leadTimes,
      },
    },
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    submitted_at: quote.submitted_at,
    won_at: quote.won_at,
    rejected_at: quote.rejected_at,
    archived: quote.archived,
    total_value: quote.total_value,
    proposal_source: quote.quote_source || 'Manual Entry',
    created_by_name: quote.created_by_name,
    organization_name: quote.organization_name,
    is_main_version: quote.is_main_version,
    is_on_board: quote.is_on_board,
    client_name: jobDetails.client_name || '',
    client_company: jobDetails.client_company || '',
    job_location: jobDetails.job_location || '',
    document_type: 'Proposal',
    is_complete: quote.status === 'Won',
  };
}

/**
 * Main migration function
 */
function migrateQuotesToProposals(quotes) {
  console.log(`Starting migration of ${quotes.length} quotes...`);

  const proposals = [];
  const errors = [];

  for (const quote of quotes) {
    try {
      const proposal = transformQuoteToProposal(quote);
      proposals.push(proposal);
      console.log(`✓ Migrated: ${quote.proposal_number} - ${quote.project_name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ quoteId: quote.id, error: errorMsg });
      console.error(`✗ Failed: ${quote.proposal_number} - ${errorMsg}`);
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  - Successful: ${proposals.length}`);
  console.log(`  - Failed: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.quoteId}: ${e.error}`));
  }

  return proposals;
}

// CLI usage - parse arguments
const args = process.argv.slice(2);
let inputFile = null;
let outputFile = 'migrated-proposals.json';
let limit = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' || args[i] === '-l') {
    limit = parseInt(args[i + 1], 10);
    i++; // skip next arg
  } else if (!inputFile) {
    inputFile = args[i];
  } else {
    outputFile = args[i];
  }
}

if (!inputFile) {
  console.log('Usage: node scripts/migrate-quotes-to-proposals.js <input.json> [output.json] [--limit N]');
  console.log('\nOptions:');
  console.log('  --limit, -l N    Only process first N quotes (for testing)');
  console.log('\nExamples:');
  console.log('  # Test with first 5 quotes');
  console.log('  node scripts/migrate-quotes-to-proposals.js quotes.json test.json --limit 5');
  console.log('');
  console.log('  # Full migration');
  console.log('  node scripts/migrate-quotes-to-proposals.js quotes.json migrated.json');
  process.exit(1);
}

try {
  const inputData = fs.readFileSync(inputFile, 'utf-8');
  let quotes = JSON.parse(inputData);

  // Apply limit if specified
  if (limit && limit > 0) {
    console.log(`Limiting to first ${limit} quotes (out of ${quotes.length} total)\n`);
    quotes = quotes.slice(0, limit);
  }

  const proposals = migrateQuotesToProposals(quotes);

  fs.writeFileSync(outputFile, JSON.stringify(proposals, null, 2));
  console.log(`\nOutput written to: ${outputFile}`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
