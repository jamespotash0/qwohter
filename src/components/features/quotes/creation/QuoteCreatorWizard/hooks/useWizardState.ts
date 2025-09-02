import { useState, useEffect } from 'react';
import { ContactInfo, JobDetails, PocketDoors, SupportStructure, DeliveryLabor, Pricing } from '../types/wizardTypes';
import { WallDetails, WallSpecification } from '@/lib/types';
import { ProposalNumberGenerator } from '@/utils/proposalNumberGenerator';

// Helper function to migrate wall_details to the new format
const migrateWallDetails = (wallDetails: unknown): WallDetails => {
  // Check if already in correct format
  if (wallDetails && typeof wallDetails === 'object' && wallDetails !== null) {
    const wd = wallDetails as Record<string, unknown>;
    if (wd.id && wd.walls) {
      return wallDetails as WallDetails;
    }
    
    // If it's an object but without id (previous migration), wrap it
    if (!Array.isArray(wallDetails) && !wd.id) {
      return {
        id: crypto.randomUUID(),
        walls: wallDetails as { [key: string]: WallSpecification }
      };
    }
  }
  
  // Default empty structure
  return {
    id: crypto.randomUUID(),
    walls: {}
  };
};

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
    website: (quoteDetails?.website as string) || ""
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

  const [walls, setWalls] = useState<WallDetails>(migrateWallDetails(existingQuoteData?.wall_details));
  
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
    basePrice: (priceDetailsData?.base_price as number) || 0,
    freight: (priceDetailsData?.freight as number) || 0,
    total: (priceDetailsData?.total as string) || "",
    paymentUponDrawings: (priceDetailsData?.payment_upon_drawings as string) || "",
    paymentUponTrackInstallation: (priceDetailsData?.payment_upon_track_installation as string) || ""
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