import { useMemo } from 'react';
import { ContactInfo, JobDetails, DeliveryLabor, Pricing } from '../types/wizardTypes';
import { WallDetails, WallSpecification, isOperableWall, isGlassWall } from '@/lib/types';
import { FormValidator } from '@/utils/formValidation';

export const useWizardValidation = (
  contactInfo: ContactInfo,
  jobDetails: JobDetails,
  walls: WallDetails,
  deliveryLabor: DeliveryLabor,
  pricing: Pricing
) => {
  const validateWallDimensions = (wall: WallSpecification, wallName: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Helper to convert to number
    const toNumber = (value: number | string | undefined): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value);
      return NaN;
    };
    
    // Validate Length Feet (0-40)
    if (wall.lengthFeet === undefined || wall.lengthFeet === null || wall.lengthFeet === '') {
      errors.push('Length feet is required');
    } else {
      const lengthFeetNum = toNumber(wall.lengthFeet);
      if (isNaN(lengthFeetNum) || lengthFeetNum < 0 || lengthFeetNum > 40) {
        errors.push('Length feet must be a number between 0-40');
      }
    }
    
    // Validate Height Feet (0-40) 
    if (wall.heightFeet === undefined || wall.heightFeet === null || wall.heightFeet === '') {
      errors.push('Height feet is required');
    } else {
      const heightFeetNum = toNumber(wall.heightFeet);
      if (isNaN(heightFeetNum) || heightFeetNum < 0 || heightFeetNum > 40) {
        errors.push('Height feet must be a number between 0-40');
      }
    }
    
    // Validate Length Inches (0-11, allow fractions)
    if (wall.lengthInches && wall.lengthInches !== '') {
      const inchesStr = String(wall.lengthInches);
      const inchesResult = FormValidator.validateInches(inchesStr);
      if (!inchesResult.isValid) {
        errors.push(`Length inches: ${inchesResult.errorMessage}`);
      } else {
        // Additional range check for inches (0-11)
        const inchesValue = parseFloat(inchesStr.replace(/\/.*/, ''));
        if (!isNaN(inchesValue) && (inchesValue < 0 || inchesValue >= 12)) {
          errors.push('Length inches must be between 0-11');
        }
      }
    }
    
    // Validate Height Inches (0-11, allow fractions)
    if (wall.heightInches && wall.heightInches !== '') {
      const inchesStr = String(wall.heightInches);
      const inchesResult = FormValidator.validateInches(inchesStr);
      if (!inchesResult.isValid) {
        errors.push(`Height inches: ${inchesResult.errorMessage}`);
      } else {
        // Additional range check for inches (0-11)
        const inchesValue = parseFloat(inchesStr.replace(/\/.*/, ''));
        if (!isNaN(inchesValue) && (inchesValue < 0 || inchesValue >= 12)) {
          errors.push('Height inches must be between 0-11');
        }
      }
    }
    
    // Validate Panel Count (1-50, numbers only)
    if (wall.panelCount === undefined || wall.panelCount === null || wall.panelCount === '') {
      errors.push('Panel count is required');
    } else {
      const panelCountNum = toNumber(wall.panelCount);
      if (isNaN(panelCountNum) || panelCountNum < 1 || panelCountNum > 50) {
        errors.push('Panel count must be a number between 1-50');
      }
    }
    
    // Wall System Type
    if (!wall.wallSystemType) {
      errors.push('Wall system type is required');
    }
    
    return { isValid: errors.length === 0, errors };
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
      const dimensionValidation = validateWallDimensions(wall, wallName);
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
    validateWallDimensions
  };
};