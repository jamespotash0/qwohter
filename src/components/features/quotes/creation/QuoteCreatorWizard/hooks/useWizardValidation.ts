import { useMemo } from 'react';
import { ContactInfo, JobDetails, DeliveryLabor, Pricing } from '../types/wizardTypes';
import { WallDetails, WallSpecification, isOperableWall, isGlassWall } from '@/lib/types';
import { validateWallDimensions } from '@/utils/wallValidation';

export const useWizardValidation = (
  contactInfo: ContactInfo,
  jobDetails: JobDetails,
  walls: WallDetails,
  deliveryLabor: DeliveryLabor,
  pricing: Pricing
) => {
  // Use centralized validation from wallValidation.ts
  const validateWallDimensionsLocal = (wall: WallSpecification, wallName: string): { isValid: boolean; errors: string[] } => {
    return validateWallDimensions(wall);
  };

  const isContactInfoValid = useMemo(() => {
    return !!(contactInfo.contactName && 
             contactInfo.contactEmail && 
             contactInfo.address && 
             contactInfo.phone && 
             contactInfo.fax && 
             contactInfo.website);
  }, [contactInfo]);

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
        if (wall.panelFinishCategory && (!wall.panelFinishSpecificItem || wall.panelFinishSpecificItem === '')) {
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
    }
    
    return true;
  }, [walls]);

  const isPocketDoorsValid = useMemo(() => {
    // Per-wall validation: all walls should have pocket doors configured
    const wallEntries = Object.entries(walls.walls);
    if (wallEntries.length === 0) return false;
    
    return wallEntries.every(([, wall]) => {
      const foldType = wall.pocketDoors?.foldType;
      const foldStyle = wall.pocketDoors?.foldStyle;
      
      // If no fold type or "None", it's valid
      if (!foldType || foldType === 'None') {
        return true;
      }
      
      // If fold type is specified, fold style should also be specified
      return !!foldStyle;
    });
  }, [walls]);

  const isSupportStructureValid = useMemo(() => {
    // Per-wall validation: all walls should have structure support configured
    const wallEntries = Object.entries(walls.walls);
    if (wallEntries.length === 0) return false;
    
    return wallEntries.every(([, wall]) => {
      return !!(wall.structureSupport && wall.structureSupport.trim() !== '');
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
    return !!(pricing.basePrice > 0 && 
             pricing.freight > 0 && 
             pricing.paymentUponDrawings && 
             pricing.paymentUponTrackInstallation);
  }, [pricing]);

  return {
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid,
    validateWallDimensions: validateWallDimensionsLocal
  };
};