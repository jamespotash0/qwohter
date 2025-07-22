import { WallSpecification } from '@/types/quote';

interface QuoteData {
  quote_details?: any;
  job_details?: any;
  wall_details?: {
    id?: string;
    walls?: {
      [wallName: string]: WallSpecification;
    };
  };
  support_structure?: any;
  delivery_details?: any;
  labor_details?: any;
  price_details?: any;
  proposal_number?: string;
  created_at?: string;
}

export const generateQuoteText = (data: QuoteData): string => {
  // Helper functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount?: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatDimensions = (widthFeet?: string, widthInches?: string, heightFeet?: string, heightInches?: string) => {
    const wf = parseInt(widthFeet || '0');
    const wi = parseInt(widthInches || '0');
    const hf = parseInt(heightFeet || '0');
    const hi = parseInt(heightInches || '0');
    
    return `${wf}'-${wi}" W x ${hf}'-${hi}" H`;
  };

  const getWallCount = () => {
    const walls = data.wall_details?.walls || {};
    return Object.keys(walls).length;
  };

  const getWallSystemType = () => {
    const walls = data.wall_details?.walls || {};
    const firstWall = Object.values(walls)[0] as WallSpecification;
    return firstWall?.wallSystemType || 'Operable Wall';
  };

  const isGLModel = (model?: string) => {
    return model?.includes('GL') || false;
  };

  const getPanelTypeText = (panelCount?: string) => {
    const count = parseInt(panelCount || '1');
    return count > 1 ? 'Multiple' : 'Single';
  };

  // Contact Info
  const contactName = data.quote_details?.contactName || 'Ed Michinski';
  const address = data.quote_details?.address || '567 Commerce St, Franklin Lakes, NJ, 07417';
  const phone = data.quote_details?.phone || '(973) 884-0474';
  const fax = data.quote_details?.fax || '(973) 884-1606';
  const website = data.quote_details?.website || 'contemporarywalls.com';

  // Job Details
  const date = formatDate(data.job_details?.date || data.created_at);
  const proposalNumber = data.proposal_number || 'N/A';
  const jobLocation = data.job_details?.jobLocation || '';
  const billedToName = data.job_details?.billedTo?.name || '';
  const billedToCompany = data.job_details?.billedTo?.company || '';
  const billedToAddress = data.job_details?.billedTo?.address || '';

  // Wall Details
  const walls = data.wall_details?.walls || {};
  const wallEntries = Object.entries(walls);
  const wallCount = getWallCount();
  const wallSystemType = getWallSystemType();

  // Support Structure
  const mountingTrack = data.support_structure?.mountingTrack || 'Pre-Drilled Steel Beam';

  // Delivery & Labor
  const trackDelivery = data.delivery_details?.track_delivery || '1-2';
  const panelDelivery = data.delivery_details?.panel_delivery || '3-4';
  const trackInstallation = data.delivery_details?.track_installation || '3-4';
  const panelInstallation = data.delivery_details?.panel_installation || '1';
  const laborType = data.labor_details?.laborType || 'Non-Union';
  const wageRate = data.labor_details?.wageRate || 'Standard';

  // Pricing
  const basePrice = formatCurrency(data.price_details?.basePrice || data.price_details?.base_price);
  const freight = formatCurrency(data.price_details?.freight);
  const total = formatCurrency(data.price_details?.total);
  const paymentUponDrawings = data.price_details?.paymentUponDrawings || data.price_details?.payment_upon_drawings || '33';
  const paymentUponTrackInstallation = data.price_details?.paymentUponTrackInstallation || data.price_details?.payment_upon_track_installation || '33';

  return `Contact: ${contactName}
Address: ${address}
Phone: ${phone}
Fax: ${fax}
Website: ${website}

Date: ${date}
Proposal #: ${proposalNumber}
Job Location: ${jobLocation}

BILLED TO:
${billedToName}
${billedToCompany}
${billedToAddress}

Thank you for considering Contemporary Wall Systems for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, ${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : `${wallCount}`} ${wallSystemType} as specified below, at the above named project.

Specifications as follows:${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
  const dimensions = formatDimensions(wall.widthFeet, wall.widthInches, wall.heightFeet, wall.heightInches);
  const panelCount = wall.panelCount || '1';
  const panelType = wall.panelType || '';
  const quantity = wall.quantity || '1';
  
  return `
${wallName}
${dimensions}
${panelCount.toUpperCase()} (${panelCount})
${panelType}
${quantity} each`;
}).join('')}

PANELS:
This wall system utilizes the ${wallEntries[0]?.[1]?.series || 'Kwik-Wall 3000'} Series 
Model ${wallEntries[0]?.[1]?.model || '3020'}
configured with ${wallEntries[0]?.[1]?.panelType || 'Hinged Paired Panels'}
designed for use with a ${wallEntries[0]?.[1]?.trackType || 'Multi-Directional Track'} Layout, and includes ${isGLModel(wallEntries[0]?.[1]?.model) ? 'GL insulated' : 'non-GL insulated'} for enhanced acoustic performance.

The wall consists of ${getPanelTypeText(wallEntries[0]?.[1]?.panelCount)} ${wallEntries[0]?.[1]?.panelType || 'Hinged Paired Panels'}, finished in an Unfinished Rift Cut White Oak Veneer finish (as selected from the manufacturer's standard offerings). The wall stands ${formatDimensions('0', '0', wallEntries[0]?.[1]?.heightFeet, wallEntries[0]?.[1]?.heightInches).split(' x ')[1]} in height, with panel widths varying as needed. Each panel is nominally ${wallEntries[0]?.[1]?.panelThickness || '4'}" thick, constructed with a Steel Faced 1/2" gypsum board laminated to an acoustic material. Each panel features a Trimless Design and are suspended from an ${wallEntries[0]?.[1]?.trackSystem || 'Anodized Aluminum'} overhead track system, allowing for smooth and efficient movement. Acoustic performance is enhanced through ${wallEntries[0]?.[1]?.verticalSealants || 'Tongue-and-Groove'} vertical seals that create a continuous interlock, and ${wallEntries[0]?.[1]?.bottomSeals || 'Retractable Seals used with limited pressure mechanism operable'} bottom seals, set at the time of panel's placement and retract into the panels when in use for virtually effortless movement. End panels will incorporate a ${wallEntries[0]?.[1]?.endPanelType || 'Fixed Wall Jamb'}, which uses a Bulb as a final seal.

TRACK:
We will be using an ${wallEntries[0]?.[1]?.trackSystem || 'Aluminum'} Track System to suspend the doors from above. This track allows for Bi-Fold of the panels when not in use.

SUPPORT STRUCTURE (HEADER):
Doors will be hung from a ${mountingTrack} above, to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.

GENERAL:
Each door will carry a minimum STC of ${wallEntries[0]?.[1]?.stcRating || '56'}${wallEntries[0]?.[1]?.stcRating === '56' ? ' (Highest Available)' : ''}. Estimated delivery would be ${trackDelivery} weeks after approval of shop drawings for tracks, & ${panelDelivery} weeks for panels. Installation of tracks would take approximately ${trackInstallation} working days, panels installation would take ${panelInstallation} additional days.

As described, furnished and installed
${basePrice}
Estimated Inbound Freight + Local Delivery
${freight}
Total
${total}

Above Proposal is a Good Faith Estimate, Based on the Information Provided & Subject to Revision Upon Site Visit & Inspection. Pricing is Firm for 60 Days From Date Above

General Notes and Terms:
All materials are FOB factory, prepaid, and added to the final invoice.
Electrical, HVAC, and sprinkler system modifications, if required, are the responsibility of others.
All labor is ${laborType}, performed at ${wageRate} Wage Rates during regular hours (Monday–Friday, 7:00 AM–3:30 PM).
Delivery includes drop-off to the Roof of the site, if applicable.
Pricing is exclusive of any applicable taxes, which will be added as required.
The customer is responsible for obtaining any necessary permits or associated fees.
Final pricing is subject to site inspection and verification of all dimensions and conditions by our installation team.
Any additional requirements or unforeseen conditions may be subject to revised pricing or additional charges.
Panel colors and finishes are available as per the manufacturer's current standard offerings.
A 10-year factory warranty is provided on all operable wall systems.

Payment Terms:
   -${paymentUponDrawings}% due upon approval of shop drawings
   -${paymentUponTrackInstallation}% due upon track installation
   - Remaining balance due upon final completion

Signed By:

Date: ${date}

ACCEPTANCE OF PROPOSAL:
The above prices, specifications, and conditions are satisfactory and are hereby accepted. Any alteration or deviation from above specifications will be executed upon written approval and may/will be subject to additional costs over and above the estimate. All removal of packing material is the customer's responsibility. Electrical and H.V.A.C. installation(s) are not included. Visa, Mastercard and American Express (AMEX) are accepted. Payments by credit card will be charged a processing fee. Pricing subject to applicable sales tax unless otherwise noted. Late payments will be subject to a 1.5% finance charge per month. Cancellations will be subject to a restocking fee.`;
};

export default generateQuoteText;