import { useState, useEffect } from 'react';
import { ContactInfo, JobDetails, SupportStructure, DeliveryLabor, Pricing, PocketDoors } from '../types/wizardTypes';
import { WallDetails, WallSpecification } from '@/lib/types';
import { ProposalNumberGenerator } from '@/utils/proposalNumberGenerator';
import { defaultEnhancedPricing } from '@/lib/types/pricing/enhancedPricing';

// Helper function to create empty wall details structure
const createEmptyWallDetails = (): WallDetails => ({
  id: crypto.randomUUID(),
  walls: {}
});

// Helper function to safely get nested properties
const getNestedProperty = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

export const useWizardState = (existingQuote?: Record<string, unknown>) => {
  const existingQuoteData = existingQuote as Record<string, unknown> | undefined;
  const quoteDetails = getNestedProperty(existingQuoteData, 'quote_details') as Record<string, unknown> | undefined;
  const jobDetailsData = getNestedProperty(existingQuoteData, 'job_details') as Record<string, unknown> | undefined;
  const pocketDoorsData = getNestedProperty(existingQuoteData, 'pocket_doors') as Record<string, unknown> | undefined;
  const supportStructureData = getNestedProperty(existingQuoteData, 'support_structure') as Record<string, unknown> | undefined;
  const deliveryDetailsData = getNestedProperty(existingQuoteData, 'delivery_details') as Record<string, unknown> | undefined;
  const laborDetailsData = getNestedProperty(existingQuoteData, 'labor_details') as Record<string, unknown> | undefined;
  const priceDetailsData = getNestedProperty(existingQuoteData, 'price_details') as Record<string, unknown> | undefined;

  const [quoteStatus, setQuoteStatus] = useState((existingQuoteData?.status as string) || "Draft");

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    contactName: (quoteDetails?.contactName as string) || "",
    contactEmail: (quoteDetails?.contactEmail as string) || "",
    address: (quoteDetails?.address as string) || "",
    phone: (quoteDetails?.phone as string) || "",
    fax: (quoteDetails?.fax as string) || "",
    website: (quoteDetails?.website as string) || "",
    quoteSource: (existingQuoteData?.quote_source as string) || ""
  });

  const [jobDetails, setJobDetails] = useState<JobDetails>({
    date: String(jobDetailsData?.date || new Date().toISOString().split('T')[0]),
    proposalNumber: (existingQuoteData?.proposal_number as string) || "",
    jobLocation: (jobDetailsData?.job_location as string) || "",
    billedTo: {
      name: (jobDetailsData?.client_name as string) || "",
      company: (jobDetailsData?.client_company as string) || "",
      address: (jobDetailsData?.client_address as string) || ""
    }
  });

  const [walls, setWalls] = useState<WallDetails>(
    (existingQuoteData?.wall_details as WallDetails) || createEmptyWallDetails()
  );
  
  // Legacy global state - kept for backward compatibility in quote saving
  const [pocketDoors] = useState<PocketDoors>({
    foldType: (pocketDoorsData?.foldType as string) || "",
    foldStyle: (pocketDoorsData?.foldStyle as string) || ""
  });
  
  const [supportStructure] = useState<SupportStructure>({
    mountingTrack: (supportStructureData?.mountingTrack as string) || ""
  });
  
  const [deliveryLabor, setDeliveryLabor] = useState<DeliveryLabor>({
    delivery: {
      shopDrawingWeeks: (deliveryDetailsData?.shopDrawingWeeks as string) || "",
      trackDeliveryWeeks: (deliveryDetailsData?.trackDeliveryWeeks as string) || "",
      panelDeliveryWeeks: (deliveryDetailsData?.panelDeliveryWeeks as string) || "",
      trackInstallationDays: (deliveryDetailsData?.trackInstallationDays as string) || "",
      panelInstallationDays: (deliveryDetailsData?.panelInstallationDays as string) || ""
    },
    labor: {
      laborType: (laborDetailsData?.laborType as string) || "",
      wageRate: (laborDetailsData?.wageRate as string) || ""
    }
  });

  const [pricing, setPricing] = useState<Pricing>({
    // Use existing data if available, otherwise use defaults
    kwik_wall_materials_cost: (priceDetailsData?.kwik_wall_materials_cost as number) ?? defaultEnhancedPricing.kwik_wall_materials_cost,
    misc_materials_cost: (priceDetailsData?.misc_materials_cost as number) ?? defaultEnhancedPricing.misc_materials_cost,
    delivery_cost_track: (priceDetailsData?.delivery_cost_track as number) ?? defaultEnhancedPricing.delivery_cost_track,
    delivery_cost_panel: (priceDetailsData?.delivery_cost_panel as number) ?? defaultEnhancedPricing.delivery_cost_panel,
    track_equipment_costs: (priceDetailsData?.track_equipment_costs as number) ?? defaultEnhancedPricing.track_equipment_costs,
    track_labor_cost: (priceDetailsData?.track_labor_cost as number) ?? defaultEnhancedPricing.track_labor_cost,
    panel_equipment_costs: (priceDetailsData?.panel_equipment_costs as number) ?? defaultEnhancedPricing.panel_equipment_costs,
    panel_labor_cost: (priceDetailsData?.panel_labor_cost as number) ?? defaultEnhancedPricing.panel_labor_cost,
    track_freight_factory: (priceDetailsData?.track_freight_factory as number) ?? defaultEnhancedPricing.track_freight_factory,
    panel_freight_factory: (priceDetailsData?.panel_freight_factory as number) ?? defaultEnhancedPricing.panel_freight_factory,
    local_handling_costs: (priceDetailsData?.local_handling_costs as number) ?? defaultEnhancedPricing.local_handling_costs,
    materials_markup_percentage: (priceDetailsData?.materials_markup_percentage as number) ?? defaultEnhancedPricing.materials_markup_percentage,
    shipping_markup_percentage: (priceDetailsData?.shipping_markup_percentage as number) ?? defaultEnhancedPricing.shipping_markup_percentage,
    unseen_costs: (priceDetailsData?.unseen_costs as number) ?? defaultEnhancedPricing.unseen_costs,
    unseen_costs_percentage: (priceDetailsData?.unseen_costs_percentage as number) ?? defaultEnhancedPricing.unseen_costs_percentage,
    unseen_costs_locked: (priceDetailsData?.unseen_costs_locked as boolean) ?? defaultEnhancedPricing.unseen_costs_locked,
    cost_subtotal: (priceDetailsData?.cost_subtotal as number) ?? defaultEnhancedPricing.cost_subtotal,
    base_selling_price: (priceDetailsData?.base_selling_price as number) ?? defaultEnhancedPricing.base_selling_price,
    shipping_cost_subtotal: (priceDetailsData?.shipping_cost_subtotal as number) ?? defaultEnhancedPricing.shipping_cost_subtotal,
    shipping_selling_price: (priceDetailsData?.shipping_selling_price as number) ?? defaultEnhancedPricing.shipping_selling_price,
    final_selling_price: (priceDetailsData?.final_selling_price as number) ?? defaultEnhancedPricing.final_selling_price,
    base_selling_gross_profit_percentage: (priceDetailsData?.base_selling_gross_profit_percentage as number) ?? defaultEnhancedPricing.base_selling_gross_profit_percentage,
    shipping_selling_gross_profit_percentage: (priceDetailsData?.shipping_selling_gross_profit_percentage as number) ?? defaultEnhancedPricing.shipping_selling_gross_profit_percentage,
    final_selling_gross_profit_percentage: (priceDetailsData?.final_selling_gross_profit_percentage as number) ?? defaultEnhancedPricing.final_selling_gross_profit_percentage,
    final_selling_price_profit_amount: (priceDetailsData?.final_selling_price_profit_amount as number) ?? defaultEnhancedPricing.final_selling_price_profit_amount,
    payment_upon_drawings: (priceDetailsData?.payment_upon_drawings as string) ?? defaultEnhancedPricing.payment_upon_drawings,
    payment_upon_track_installation: (priceDetailsData?.payment_upon_track_installation as string) ?? defaultEnhancedPricing.payment_upon_track_installation
  });

  // Generate proposal number on component mount if creating new quote
  useEffect(() => {
    const generateProposalNumber = async () => {
      if (!existingQuote && !jobDetails.proposalNumber) {
        try {
          const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber();
          setJobDetails(prev => ({
            ...prev,
            proposalNumber: proposalInfo.fullNumber
          }));
        } catch (error) {
          console.error('Error generating proposal number:', error);
        }
      }
    };

    generateProposalNumber();
  }, [existingQuote, jobDetails.proposalNumber]);

  // Per-wall update handlers
  const handleWallPocketDoorsUpdate = (wallName: string, pocketDoorsConfig: { foldType: string; foldStyle: string }) => {
    setWalls(prev => ({
      ...prev,
      walls: {
        ...prev.walls,
        [wallName]: {
          ...prev.walls[wallName],
          pocketDoors: pocketDoorsConfig
        } as WallSpecification
      }
    }));
  };

  const handleWallStructureSupportUpdate = (wallName: string, structureSupport: string) => {
    setWalls(prev => ({
      ...prev,
      walls: {
        ...prev.walls,
        [wallName]: {
          ...prev.walls[wallName],
          structureSupport
        } as WallSpecification
      }
    }));
  };

  return {
    // State values
    quoteStatus,
    contactInfo,
    jobDetails,
    walls,
    pocketDoors,
    supportStructure,
    deliveryLabor,
    pricing,
    existingQuoteData,
    
    // State setters
    setQuoteStatus,
    setContactInfo,
    setJobDetails,
    setWalls,
    setDeliveryLabor,
    setPricing,
    
    // Update handlers
    handleWallPocketDoorsUpdate,
    handleWallStructureSupportUpdate
  };
};