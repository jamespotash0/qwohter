import { useMemo } from 'react';
import { ContactInfo, JobDetails, DeliveryLabor, Pricing } from '@/components/features/quotes/creation/QuoteCreatorWizard/types/wizardTypes';
import { WallDetails, WallSpecification, isOperableWall, isGlassWall, isAccordionPartition } from '@/lib/types';
import { AccordionWallSpecification } from '@/lib/types/walls/accordion';
import { validateWallDimensions } from '@/utils/wallValidation';

export const useEditingValidation = (
  contactInfo: ContactInfo,
  jobDetails: JobDetails,
  walls: WallDetails,
  deliveryLabor: DeliveryLabor,
  pricing: Pricing,
  quoteStatus: string,
  organizationInfo?: any
) => {
  // Use centralized validation from wallValidation.ts
  const validateWallDimensionsLocal = (wall: WallSpecification, wallName: string): { isValid: boolean; errors: string[] } => {
    return validateWallDimensions(wall);
  };

  const isContactInfoValid = useMemo(() => {
    // Check if fax is required based on organization info
    const isFaxRequired = organizationInfo?.fax && organizationInfo.fax.trim() !== '';
    
    const basicRequirements = !!(contactInfo.contactName && 
                                contactInfo.contactEmail && 
                                contactInfo.address && 
                                contactInfo.phone && 
                                contactInfo.website);
    
    // If fax is required (exists in org), include it in validation
    if (isFaxRequired) {
      return basicRequirements && !!contactInfo.fax;
    }
    
    // If fax is not required (doesn't exist in org), just check basic requirements
    return basicRequirements;
  }, [contactInfo, organizationInfo]);

  const isJobDetailsValid = useMemo(() => {
    return !!(jobDetails.date && 
             jobDetails.proposalNumber && 
             jobDetails.jobLocation && 
             jobDetails.billedTo.name && 
             jobDetails.billedTo.company && 
             jobDetails.billedTo.address);
  }, [jobDetails]);

  const isWallSpecValid = useMemo(() => {
    const wallEntries = Object.entries(walls.walls);
    
    if (wallEntries.length === 0) {
      return false;
    }
    
    for (const [wallName, wall] of wallEntries) {
      // First validate basic dimensions and fields
      const dimensionValidation = validateWallDimensionsLocal(wall, wallName);
      if (!dimensionValidation.isValid) {
        return false;
      }
      
      // Validate wall-type specific required fields
      if (isOperableWall(wall)) {
        const requiredFields = {
          panelConfiguration: wall.panelConfiguration,
          series: wall.series,
          model: wall.model,
          panelSkin: wall.panelSkin,
          stcRating: wall.stcRating,
          trackType: wall.trackType,
          trackSystem: wall.trackSystem
        };
        
        // Check each required field
        for (const [field, value] of Object.entries(requiredFields)) {
          if (!value || value === '') {
            return false;
          }
        }
        
        // Check for panel finish dependency
        // Only require specific item if the category has specific items available
        const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others", "Full-Height Marker (Tack) Board"];
        if (wall.panelFinishCategory &&
            !categoriesWithoutSpecificItems.includes(wall.panelFinishCategory) &&
            (!wall.panelFinishSpecificItem || wall.panelFinishSpecificItem === '')) {
          return false;
        }
        
        // Check for pass door quantity dependency
        if (wall.passDoorPanels && wall.passDoorPanels !== '' && (!wall.passDoorQuantity || wall.passDoorQuantity === '')) {
          return false;
        }
      }
      
      if (isGlassWall(wall)) {
        const requiredFields = {
          model: wall.model,
          panelConfiguration: wall.panelConfiguration,
          panelOperation: wall.panelOperation,
          glassType: wall.glassType,
          stcRating: wall.stcRating,
          partitionSupport: wall.partitionSupport,
          trackType: wall.trackType
        };
        
        // Check each required field
        for (const [field, value] of Object.entries(requiredFields)) {
          if (!value || value === '') {
            return false;
          }
        }
      }
      
      if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;
        const requiredFields = {
          panelConfiguration: accordionWall.panelConfiguration,
          series: accordionWall.series,
          model: accordionWall.model,
          stcRating: accordionWall.stcRating,
          operation: accordionWall.operation,
          panelFace: accordionWall.panelFace,
          trackMounting: accordionWall.trackMounting,
          trackSystem: accordionWall.trackSystem,
          finalClosureSystem: accordionWall.finalClosureSystem
        };
        
        // Check each required field (all except options and trackSystemOption are required)
        for (const [field, value] of Object.entries(requiredFields)) {
          if (!value || value === '') {
            return false;
          }
        }
      }
    }
    
    return true;
  }, [walls]);

  const isPocketDoorsValid = useMemo(() => {
    // Per-wall validation: all walls (including accordion) can have pocket doors configured
    const wallEntries = Object.entries(walls.walls);
    if (wallEntries.length === 0) return false;
    
    return wallEntries.every(([, wall]) => {
      // Handle accordion walls
      if (isAccordionPartition(wall)) {
        const accordionWall = wall as AccordionWallSpecification;
        const foldType = accordionWall.pocketDoors?.foldType;
        const foldStyle = accordionWall.pocketDoors?.foldStyle;
        
        // If no fold type or "None", it's valid
        if (!foldType || foldType === 'None') {
          return true;
        }
        
        // If fold type is specified, fold style should also be specified
        return !!foldStyle;
      }
      
      // For operable and glass walls, check pocket doors
      const foldType = (wall as any).pocketDoors?.foldType;
      const foldStyle = (wall as any).pocketDoors?.foldStyle;
      
      // If no fold type or "None", it's valid
      if (!foldType || foldType === 'None') {
        return true;
      }
      
      // If fold type is specified, fold style should also be specified
      return !!foldStyle;
    });
  }, [walls]);

  const isSupportStructureValid = useMemo(() => {
    // Per-wall validation: operable, glass walls, and accordion partitions need structure support configured
    const wallEntries = Object.entries(walls.walls);
    if (wallEntries.length === 0) return false;
    
    return wallEntries.every(([, wall]) => {
      // For operable, glass, and accordion walls, check structure support
      return !!((wall as any).structureSupport && (wall as any).structureSupport.trim() !== '');
    });
  }, [walls]);

  const isDeliveryLaborValid = useMemo(() => {
    return !!(deliveryLabor.delivery.shopDrawingWeeks &&
             deliveryLabor.delivery.trackDeliveryWeeks && 
             deliveryLabor.delivery.panelDeliveryWeeks && 
             deliveryLabor.delivery.trackInstallationDays && 
             deliveryLabor.delivery.panelInstallationDays && 
             deliveryLabor.labor.laborType && 
             deliveryLabor.labor.wageRate);
  }, [deliveryLabor]);

  const isPricingValid = useMemo(() => {
    // Helper to check if a numeric field has been meaningfully set
    const isNumericFieldValid = (value: number | null | undefined) => {
      return value !== null && value !== undefined && (!isNaN(value));
    };
    
    // Helper to check if percentage fields are reasonable (between 0-100)
    const isPercentageValid = (value: number | null | undefined) => {
      return isNumericFieldValid(value) && value! >= 0 && value! <= 100;
    };
    
    // Count how many cost fields have been filled with non-zero values
    const costFields = [
      pricing.kwik_wall_materials_cost,
      pricing.misc_materials_cost,
      pricing.delivery_cost_track,
      pricing.delivery_cost_panel,
      pricing.track_equipment_costs,
      pricing.track_labor_cost,
      pricing.panel_equipment_costs,
      pricing.panel_labor_cost,
      pricing.track_freight_factory,
      pricing.panel_freight_factory,
      pricing.local_handling_costs,
      pricing.unseen_costs
    ].filter(value => isNumericFieldValid(value));
    
    // At least some meaningful cost data should be provided (not all zeros)
    const hasMeaningfulCostData = costFields.some(value => value! > 0);
    
    return !!(
      // Required cost fields must have meaningful values (> 0)
      isNumericFieldValid(pricing.kwik_wall_materials_cost) && 
      pricing.kwik_wall_materials_cost! >= 0 && 
      
      isNumericFieldValid(pricing.misc_materials_cost) && 
      pricing.misc_materials_cost! >= 0 && 
      
      isNumericFieldValid(pricing.delivery_cost_track) && 
      pricing.delivery_cost_track! >= 0 &&
      
      isNumericFieldValid(pricing.delivery_cost_panel) && 
      pricing.delivery_cost_panel! >= 0 &&
      
      isNumericFieldValid(pricing.track_equipment_costs) && 
      pricing.track_equipment_costs! >= 0 &&
      
      isNumericFieldValid(pricing.track_labor_cost) && 
      pricing.track_labor_cost! >= 0 &&
      
      isNumericFieldValid(pricing.panel_equipment_costs) && 
      pricing.panel_equipment_costs! >= 0 &&
      
      isNumericFieldValid(pricing.panel_labor_cost) && 
      pricing.panel_labor_cost! >= 0 &&
      
      isNumericFieldValid(pricing.track_freight_factory) && 
      pricing.track_freight_factory! >= 0 &&
      
      isNumericFieldValid(pricing.panel_freight_factory) && 
      pricing.panel_freight_factory! >= 0 &&
      
      isNumericFieldValid(pricing.local_handling_costs) && 
      pricing.local_handling_costs! >= 0 &&
      
      // Markup percentage fields must be meaningful (> 0)
      isNumericFieldValid(pricing.materials_markup_percentage) &&
      pricing.materials_markup_percentage! >= 0 &&
      pricing.materials_markup_percentage! <= 100 &&
      
      isNumericFieldValid(pricing.shipping_markup_percentage) &&
      pricing.shipping_markup_percentage! >= 0 &&
      pricing.shipping_markup_percentage! <= 100 &&
      
      // Unseen costs must be valid (can be any positive number, percentage is auto-calculated)
      isNumericFieldValid(pricing.unseen_costs) && 
      pricing.unseen_costs! >= 0 &&
      
      // String fields must be filled out
      pricing.payment_upon_drawings && 
      pricing.payment_upon_drawings.trim() !== '' &&        
      pricing.payment_upon_track_installation &&
      pricing.payment_upon_track_installation.trim() !== ''
    );
  }, [pricing]);

  const isQuoteStatusValid = useMemo(() => {
    return !!(quoteStatus && quoteStatus.trim() !== '');
  }, [quoteStatus]);

  // Overall validation status
  const isCompletelyValid = useMemo(() => {
    return (
      isContactInfoValid &&
      isJobDetailsValid &&
      isWallSpecValid &&
      isPocketDoorsValid &&
      isSupportStructureValid &&
      isDeliveryLaborValid &&
      isPricingValid &&
      isQuoteStatusValid
    );
  }, [
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid,
    isQuoteStatusValid
  ]);

  return {
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid,
    isQuoteStatusValid,
    isCompletelyValid,
    validateWallDimensions: validateWallDimensionsLocal
  };
};