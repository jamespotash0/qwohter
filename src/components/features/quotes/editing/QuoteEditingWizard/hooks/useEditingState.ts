import { useState, useEffect, useCallback } from 'react';
import { Quote } from '@/stores/quotes/quotesStore';
import { ContactInfo, JobDetails, DeliveryLabor, Pricing } from '@/components/features/quotes/creation/QuoteCreatorWizard/types/wizardTypes';
import { WallDetails, WallSpecification } from '@/lib/types';
import { defaultEnhancedPricing } from '@/lib/types/pricing/enhancedPricing';
import { EditingStateData, ChangeTracker } from '../types/editingTypes';

// Helper function to safely extract nested properties
const getNestedProperty = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

// Convert Quote data to editing state format
const convertQuoteToEditingData = (quote: Quote): EditingStateData => {
  const quoteDetails = quote.quote_details || {};
  const jobDetails = quote.job_details || {};
  const deliveryDetails = quote.delivery_details || {};
  const laborDetails = quote.labor_details || {};
  const priceDetails = quote.price_details || {};

  return {
    contactInfo: {
      contactName: quoteDetails.contactName || "",
      contactEmail: quoteDetails.contactEmail || "",
      address: quoteDetails.address || "",
      phone: quoteDetails.phone || "",
      fax: quoteDetails.fax || "",
      website: quoteDetails.website || "",
      quoteSource: quote.quote_source || ""
    },
    jobDetails: {
      date: jobDetails.date || new Date().toISOString().split('T')[0],
      proposalNumber: quote.proposal_number || "",
      jobLocation: jobDetails.job_location || "",
      billedTo: {
        name: jobDetails.client_name || "",
        company: jobDetails.client_company || "",
        address: jobDetails.client_address || ""
      }
    },
    walls: quote.wall_details || { id: crypto.randomUUID(), walls: {} },
    deliveryLabor: {
      delivery: {
        shopDrawingWeeks: deliveryDetails.shopDrawingWeeks || "",
        trackDeliveryWeeks: deliveryDetails.trackDeliveryWeeks || "",
        panelDeliveryWeeks: deliveryDetails.panelDeliveryWeeks || "",
        trackInstallationDays: deliveryDetails.trackInstallationDays || "",
        panelInstallationDays: deliveryDetails.panelInstallationDays || ""
      },
      labor: {
        laborType: laborDetails.laborType || "",
        wageRate: laborDetails.wageRate || ""
      }
    },
    pricing: {
      // Map all pricing fields with proper fallbacks
      kwik_wall_materials_cost: priceDetails.kwik_wall_materials_cost ?? defaultEnhancedPricing.kwik_wall_materials_cost,
      misc_materials_cost: priceDetails.misc_materials_cost ?? defaultEnhancedPricing.misc_materials_cost,
      delivery_cost_track: priceDetails.delivery_cost_track ?? defaultEnhancedPricing.delivery_cost_track,
      delivery_cost_panel: priceDetails.delivery_cost_panel ?? defaultEnhancedPricing.delivery_cost_panel,
      track_equipment_costs: priceDetails.track_equipment_costs ?? defaultEnhancedPricing.track_equipment_costs,
      track_labor_cost: priceDetails.track_labor_cost ?? defaultEnhancedPricing.track_labor_cost,
      panel_equipment_costs: priceDetails.panel_equipment_costs ?? defaultEnhancedPricing.panel_equipment_costs,
      panel_labor_cost: priceDetails.panel_labor_cost ?? defaultEnhancedPricing.panel_labor_cost,
      track_freight_factory: priceDetails.track_freight_factory ?? defaultEnhancedPricing.track_freight_factory,
      panel_freight_factory: priceDetails.panel_freight_factory ?? defaultEnhancedPricing.panel_freight_factory,
      local_handling_costs: priceDetails.local_handling_costs ?? defaultEnhancedPricing.local_handling_costs,
      materials_markup_percentage: priceDetails.materials_markup_percentage ?? defaultEnhancedPricing.materials_markup_percentage,
      shipping_markup_percentage: priceDetails.shipping_markup_percentage ?? defaultEnhancedPricing.shipping_markup_percentage,
      unseen_costs: priceDetails.unseen_costs ?? defaultEnhancedPricing.unseen_costs,
      unseen_costs_percentage: priceDetails.unseen_costs_percentage ?? defaultEnhancedPricing.unseen_costs_percentage,
      unseen_costs_locked: priceDetails.unseen_costs_locked ?? defaultEnhancedPricing.unseen_costs_locked,
      cost_subtotal: priceDetails.cost_subtotal ?? defaultEnhancedPricing.cost_subtotal,
      base_selling_price: priceDetails.base_selling_price ?? defaultEnhancedPricing.base_selling_price,
      shipping_cost_subtotal: priceDetails.shipping_cost_subtotal ?? defaultEnhancedPricing.shipping_cost_subtotal,
      shipping_selling_price: priceDetails.shipping_selling_price ?? defaultEnhancedPricing.shipping_selling_price,
      final_selling_price: priceDetails.final_selling_price ?? defaultEnhancedPricing.final_selling_price,
      base_selling_gross_profit_percentage: priceDetails.base_selling_gross_profit_percentage ?? defaultEnhancedPricing.base_selling_gross_profit_percentage,
      shipping_selling_gross_profit_percentage: priceDetails.shipping_selling_gross_profit_percentage ?? defaultEnhancedPricing.shipping_selling_gross_profit_percentage,
      final_selling_gross_profit_percentage: priceDetails.final_selling_gross_profit_percentage ?? defaultEnhancedPricing.final_selling_gross_profit_percentage,
      final_selling_price_profit_amount: priceDetails.final_selling_price_profit_amount ?? defaultEnhancedPricing.final_selling_price_profit_amount,
      payment_upon_drawings: priceDetails.payment_upon_drawings ?? defaultEnhancedPricing.payment_upon_drawings,
      payment_upon_track_installation: priceDetails.payment_upon_track_installation ?? defaultEnhancedPricing.payment_upon_track_installation
    },
    quoteStatus: quote.status || "Draft",
    quoteName: quote.project_name || "Untitled Quote"
  };
};

export const useEditingState = (existingQuote: Quote) => {
  // Initialize state from existing quote immediately
  const [editingData, setEditingData] = useState<EditingStateData>(() => 
    convertQuoteToEditingData(existingQuote)
  );
  
  // Keep track of original data for comparison
  const [originalData, setOriginalData] = useState<EditingStateData>(() => 
    convertQuoteToEditingData(existingQuote)
  );
  
  // Track which sections have unsaved changes with smart comparison
  const [changeTracker, setChangeTracker] = useState<ChangeTracker>({
    contactInfo: false,
    jobDetails: false,
    walls: false,
    deliveryLabor: false,
    pricing: false,
    quoteStatus: false,
    quoteName: false
  });

  // Helper function to deep compare objects for change detection
  const hasDataChanged = useCallback((current: any, original: any): boolean => {
    if (current === original) return false;
    if (!current || !original) return current !== original;
    
    if (typeof current !== 'object' || typeof original !== 'object') {
      return current !== original;
    }
    
    const currentKeys = Object.keys(current);
    const originalKeys = Object.keys(original);
    
    if (currentKeys.length !== originalKeys.length) return true;
    
    for (const key of currentKeys) {
      if (!originalKeys.includes(key)) return true;
      if (hasDataChanged(current[key], original[key])) return true;
    }
    
    return false;
  }, []);

  // Update change tracker based on actual data comparison
  useEffect(() => {
    setChangeTracker({
      contactInfo: hasDataChanged(editingData.contactInfo, originalData.contactInfo),
      jobDetails: hasDataChanged(editingData.jobDetails, originalData.jobDetails),
      walls: hasDataChanged(editingData.walls, originalData.walls),
      deliveryLabor: hasDataChanged(editingData.deliveryLabor, originalData.deliveryLabor),
      pricing: hasDataChanged(editingData.pricing, originalData.pricing),
      quoteStatus: hasDataChanged(editingData.quoteStatus, originalData.quoteStatus),
      quoteName: hasDataChanged(editingData.quoteName, originalData.quoteName)
    });
  }, [editingData, originalData, hasDataChanged]);

  // Sync with quote changes (if quote is updated externally)
  useEffect(() => {
    const newData = convertQuoteToEditingData(existingQuote);
    setEditingData(newData);
    setOriginalData(newData); // Update original data reference
    
    // Change tracking will be automatically updated by the comparison useEffect
  }, [existingQuote.id, existingQuote.updated_at]); // Only sync on actual quote changes

  // Section updaters (change tracking is automatic via comparison)
  const setContactInfo = useCallback((data: ContactInfo) => {
    setEditingData(prev => ({ ...prev, contactInfo: data }));
  }, []);

  const setJobDetails = useCallback((data: JobDetails) => {
    setEditingData(prev => ({ ...prev, jobDetails: data }));
  }, []);

  const setWalls = useCallback((data: WallDetails) => {
    setEditingData(prev => ({ ...prev, walls: data }));
  }, []);

  const setDeliveryLabor = useCallback((data: DeliveryLabor) => {
    setEditingData(prev => ({ ...prev, deliveryLabor: data }));
  }, []);

  const setPricing = useCallback((data: Pricing) => {
    setEditingData(prev => ({ ...prev, pricing: data }));
  }, []);

  const setQuoteStatus = useCallback((status: string) => {
    setEditingData(prev => ({ ...prev, quoteStatus: status }));
  }, []);

  const setQuoteName = useCallback((name: string) => {
    setEditingData(prev => ({ ...prev, quoteName: name }));
  }, []);

  // Per-wall update handlers
  const handleWallPocketDoorsUpdate = useCallback((wallName: string, pocketDoorsConfig: { foldType: string; foldStyle: string }) => {
    setWalls({
      ...editingData.walls,
      walls: {
        ...editingData.walls.walls,
        [wallName]: {
          ...editingData.walls.walls[wallName],
          pocketDoors: pocketDoorsConfig
        } as WallSpecification
      }
    });
  }, [editingData.walls]);

  const handleWallStructureSupportUpdate = useCallback((wallName: string, structureSupport: string) => {
    setWalls({
      ...editingData.walls,
      walls: {
        ...editingData.walls.walls,
        [wallName]: {
          ...editingData.walls.walls[wallName],
          structureSupport
        } as WallSpecification
      }
    });
  }, [editingData.walls]);

  // Check if there are any unsaved changes
  const hasUnsavedChanges = Object.values(changeTracker).some(changed => changed);

  // Reset change tracking (after save) by updating original data reference
  const resetChangeTracking = useCallback(() => {
    setOriginalData({ ...editingData });
    // Change tracking will be automatically updated by the comparison useEffect
  }, [editingData]);

  return {
    // State values
    ...editingData,
    
    // Change tracking
    changeTracker,
    hasUnsavedChanges,
    resetChangeTracking,
    
    // State setters
    setContactInfo,
    setJobDetails,
    setWalls,
    setDeliveryLabor,
    setPricing,
    setQuoteStatus,
    setQuoteName,
    
    // Per-wall handlers
    handleWallPocketDoorsUpdate,
    handleWallStructureSupportUpdate
  };
};