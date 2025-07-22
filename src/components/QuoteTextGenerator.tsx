import { WallSpecification } from '@/types/quote';
// import { toWords } from 'number-to-words';

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

  const toWords = (num: number | string): string => {
    const n = parseInt(num.toString());
    const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];
    return words[n] || n.toString();
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
  const address = data.quote_details?.address || '567 Commerce St,<br>Franklin Lakes, NJ, 07417';
  const phone = data.quote_details?.phone || '(973) 884-0474';
  const fax = data.quote_details?.fax || '(973) 884-1606';
  const website = data.quote_details?.website || 'contemporarywalls.com';

  // Job Details
  const date = formatDate(data.job_details?.date || '');
  const proposalNumber = data.proposal_number || 'N/A';
  const jobLocation = data.job_details?.job_location || '';
  const billedToName = data.job_details?.client_name || '';
  const billedToCompany = data.job_details?.client_company || '';
  const billedToAddress = data.job_details?.client_address || '';

  // Wall Details
  const walls = data.wall_details?.walls || {};
  const wallEntries = Object.entries(walls);
  const wallCount = getWallCount();
  const wallSystemType = getWallSystemType();

  // Support Structure
  const mountingTrack = data.support_structure?.mountingTrack || '';

  // Delivery & Labor
  const trackDelivery = data.delivery_details?.trackDeliveryWeeks || '';
  const panelDelivery = data.delivery_details?.panelDeliveryWeeks || '';
  const trackInstallation = data.delivery_details?.trackInstallationDays || '';
  const panelInstallation = data.delivery_details?.panelInstallationDays || '';
  const laborType = data.labor_details?.laborType || '';
  const wageRate = data.labor_details?.wageRate || '';

  // Pricing
  const basePrice = formatCurrency(data.price_details?.basePrice || data.price_details?.base_price);
  const freight = formatCurrency(data.price_details?.freight);
  const total = formatCurrency(data.price_details?.total);
  const paymentUponDrawings = data.price_details?.payment_upon_drawings || '33';
  const paymentUponTrackInstallation = data.price_details?.payment_upon_track_installation || '33';

  return `<div class="quote-container">
<div class="header-section">
  <div class="company-info">
    <div class="company-logo">
      <img src="/lovable-uploads/f007c713-9d1a-427a-9453-d0b8ffb42da6.png" alt="Contemporary Wall Systems Logo" style="height: 80px; width: auto; max-width: 200px; object-fit: contain;" />
    </div>
  </div>
  
  <div class="contact-details">
    <div class="contact-row">
      <span class="label">Contact:</span>
      <span class="value">${contactName}</span>
    </div>
    <div class="contact-row">
      <span class="label">Address:</span>
      <span class="value">${address}</span>
    </div>
    <div class="contact-row">
      <span class="label">Phone:</span>
      <span class="value">${phone}</span>
    </div>
    <div class="contact-row">
      <span class="label">Fax:</span>
      <span class="value">${fax}</span>
    </div>
    <div class="contact-row">
      <span class="label">Website:</span>
      <span class="value website-link">${website}</span>
    </div>
  </div>
</div>

<div class="billing-and-job-info">
  <div class="billing-section">
    <h2 class="section-header">BILLED TO:</h2>
    <div class="billed-to-details">
      <div class="billed-line">${billedToName}</div>
      <div class="underline"></div>
      <div class="billed-line">${billedToCompany}</div>
      <div class="underline"></div>
      <div class="billed-line">${billedToAddress}</div>
      <div class="underline"></div>
    </div>
  </div>
  
  <div class="job-info-section">
    <div class="job-row">
      <span class="job-label">Date:</span>
      <span class="job-value">${date}</span>
      <div class="job-underline"></div>
    </div>
    <div class="job-row">
      <span class="job-label">Proposal #:</span>
      <span class="job-value">${proposalNumber}</span>
      <div class="job-underline"></div>
    </div>
    <div class="job-row">
      <span class="job-label">Job Location:</span>
      <span class="job-value">${jobLocation}</span>
      <div class="job-underline"></div>
    </div>
  </div>
</div>

<div class="proposal-intro">
Thank you for considering Contemporary Wall Systems for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} ${wallSystemType}</strong> as specified below, at the above named project.
</div>

<div class="wall-specifications">
<h2 class="section-header">Specifications as follows:</h2>
${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
  const dimensions = formatDimensions(wall.widthFeet, wall.widthInches, wall.heightFeet, wall.heightInches);
  const panelCount = wall.panelCount || '';
  const panelType = wall.panelType || '';
  const quantity = wall.quantity || '1';
  
  return `<br><strong>${wallName}</strong>&nbsp;&nbsp;${dimensions}&nbsp;&nbsp;<strong>${toWords(panelCount)} (${panelCount})</strong>&nbsp;&nbsp;${panelType}&nbsp;&nbsp;${quantity} Each`;}).join('')}
</div>

<div class="panels-section">
<h2 class="section-header">PANELS:</h2>
This wall system utilizes the <strong>Kwik-Wall ${wallEntries[0]?.[1]?.series || ''} Series Model ${wallEntries[0]?.[1]?.model || ''}</strong> configured with ${wallEntries[0]?.[1]?.panelType || ''} designed for use with a <strong>${wallEntries[0]?.[1]?.trackType || ''} Layout</strong>, and includes ${isGLModel(wallEntries[0]?.[1]?.model) ? 'GL insulated' : 'non-GL insulated'} for enhanced acoustic performance.

<br><br>The wall consists of <strong>${getPanelTypeText(wallEntries[0]?.[1]?.panelCount)} ${wallEntries[0]?.[1]?.panelType || ''}</strong>, finished in an <strong>Unfinished Rift Cut White Oak Veneer finish</strong> (as selected from the manufacturer's standard offerings). The wall stands <strong>${formatDimensions('0', '0', wallEntries[0]?.[1]?.heightFeet, wallEntries[0]?.[1]?.heightInches).split(' x ')[1]}</strong> in height, with panel widths varying as needed. Each panel is nominally <strong>${wallEntries[0]?.[1]?.panelThickness || ''}"</strong> thick, constructed with a <strong>Steel Faced 1/2" gypsum board</strong> laminated to an acoustic material. Each panel features a <strong>Trimless Design</strong> and are suspended from an <strong>${wallEntries[0]?.[1]?.trackSystem || ''}</strong> overhead track system, allowing for smooth and efficient movement. Acoustic performance is enhanced through <strong>${wallEntries[0]?.[1]?.verticalSealants || ''}</strong> vertical seals that create a continuous interlock, and <strong>${wallEntries[0]?.[1]?.bottomSeals || ''}</strong> used with limited pressure mechanism operable bottom seals, set at the time of panel's placement and retract into the panels when in use for virtually effortless movement. End panels will incorporate a <strong>${wallEntries[0]?.[1]?.endPanelType || ''}</strong>, which uses a Bulb as a final seal.
</div>

<div class="track-section">
<h2 class="section-header">TRACK:</h2>
We will be using an <strong>${wallEntries[0]?.[1]?.trackSystem || ''} Track System</strong> to suspend the doors from above. This track allows for <strong>Bi-Fold</strong> of the panels when not in use.
</div>

<div class="support-section">
<h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
Doors will be hung from a <strong>${mountingTrack}</strong> above, to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.
</div>

<div class="general-section">
<h2 class="section-header">GENERAL:</h2>
Each door will carry a minimum <strong>STC of ${wallEntries[0]?.[1]?.stcRating || ''}</strong>${wallEntries[0]?.[1]?.stcRating === '56' ? ' <strong>(Highest Available)</strong>' : ''}. Estimated delivery would be <strong>${trackDelivery} weeks</strong> after approval of shop drawings for tracks, & <strong>${panelDelivery} weeks</strong> for panels. Installation of tracks would take approximately <strong>${trackInstallation} working days</strong>, panels installation would take <strong>${panelInstallation} additional days</strong>.
</div>

<div class="pricing-section">
<table style="width: 100%; margin-top: 20px;">
<tr><td>As described, furnished and installed</td><td style="text-align: right;"><strong>${basePrice}</strong></td></tr>
<tr style="border-bottom: 1px solid black;"><td>Estimated Inbound Freight + Local Delivery</td><td style="text-align: right; padding-bottom: 8px;"><strong>${freight}</strong></td></tr>
<tr><td><strong>Total</strong></td><td style="text-align: right;"><strong>${total}</strong></td></tr>
</table>

<br><strong>Above Proposal is a Good Faith Estimate, Based on the Information Provided & Subject to Revision Upon Site Visit & Inspection. Pricing is Firm for 60 Days From Date Above</strong>
</div>

<div class="terms-section">
<h2 class="section-header">General Notes and Terms:</h2>
<ol>
<li>All materials are <strong>FOB factory</strong>, prepaid, and added to the final invoice.</li>
<li><strong>Electrical, HVAC, and sprinkler system modifications</strong>, if required, are the responsibility of others.</li>
<li>All labor is <strong>${laborType}</strong>, performed at <strong>${wageRate} Wage Rates</strong> during regular hours (Monday–Friday, 7:00 AM–3:30 PM).</li>
<li>Delivery includes drop-off to the <strong>Roof</strong> of the site, if applicable.</li>
<li>Pricing is <strong>exclusive of any applicable taxes</strong>, which will be added as required.</li>
<li>The <strong>customer is responsible for obtaining any necessary permits or associated fees</strong>.</li>
<li>Final pricing is <strong>subject to site inspection and verification</strong> of all dimensions and conditions by our installation team.</li>
<li>Any additional requirements or unforeseen conditions may be subject to <strong>revised pricing or additional charges</strong>.</li>
<li>Panel colors and finishes are available as <strong>per the manufacturer's current standard offerings</strong>.</li>
<li>A <strong>10-year factory warranty</strong> is provided on all operable wall systems.</li>
</ol>
</div>

<br><div class="payment-section">
<strong>11. Payment Terms:</strong>
<div style="margin-left: 40px; margin-top: 8px;">
<div>- <strong>${paymentUponDrawings}%</strong> due upon approval of shop drawings</div>
<div>- <strong>${paymentUponTrackInstallation}%</strong> due upon track installation</div>
<div>- Remaining balance due upon final completion</div>
</div>
</div>

<div class="signature-section">
<br><strong>Signed By:</strong> __________________________&nbsp;&nbsp;&nbsp;<strong>Date:</strong> ${date}
</div>

<div class="acceptance-section">
<h2 class="section-header">ACCEPTANCE OF PROPOSAL:</h2>
The above prices, specifications, and conditions are satisfactory and are hereby accepted. Any alteration or deviation from above specifications will be executed upon written approval and may/will be subject to additional costs over and above the estimate. All removal of packing material is the customer's responsibility. Electrical and H.V.A.C. installation(s) are not included. Visa, Mastercard and American Express (AMEX) are accepted. Payments by credit card will be charged a processing fee. Pricing subject to applicable sales tax unless otherwise noted. Late payments will be subject to a 1.5% finance charge per month. Cancellations will be subject to a restocking fee.
</div>`;
};

export default generateQuoteText;