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
  pocket_doors?: {
    foldType?: string;
    foldStyle?: string;
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
      month: 'long', 
      day: 'numeric' 
    });
    const parts = dateString.split('-');
    if (parts.length === 3) {
      // Note: month is 0-based in JS Date constructor
      const localDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    // fallback
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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

  const formatDimensions = (
    widthFeet?: string,
    widthInches?: string,
    heightFeet?: string,
    heightInches?: string,
    includeLabels = true
  ) => {
    const wf = parseInt(widthFeet || '0');
    const wi = parseInt(widthInches || '0');
    const hf = parseInt(heightFeet || '0');
    const hi = parseInt(heightInches || '0');

    const width = `${wf}'-${wi}"${includeLabels ? ' W' : ''}`;
    const height = `${hf}'-${hi}"${includeLabels ? ' H' : ''}`;
    return `${width} x ${height}`;
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

  const getPanelConfigurationText = (panelCount?: string) => {
    const count = parseInt(panelCount || '1');
    return count > 1 ? 'Multiple' : 'Single';
  };

  const getMovementOnTrackText = (panelConfiguration?: string) => {
    if (panelConfiguration == 'Individual') {
      return "Independent Sliding";
    }
    return "Folding";
  };

  // Contact Info
  const contactName = data.quote_details?.contactName || 'Ed Michinski';
  const address = data.quote_details?.address || '567 Commerce St,<br> Franklin&nbsp;Lakes, NJ, 07417';
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

  // Pocket Doors
  const pocketFoldType = data.pocket_doors?.foldType || '';
  const pocketFoldStyle = data.pocket_doors?.foldStyle || '';

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
        <img src="/lovable-uploads/f007c713-9d1a-427a-9453-d0b8ffb42da6.png" alt="Contemporary Wall Systems Logo" style="height: 80px; width: auto; max-width: 200px; object-fit: contain;"/>
      </div>
    </div>
    
    <div class="contact-details" style="width: 50%; margin-left: 150px;">
      <div class="contact-row">
        <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Contact:</span>
        <span class="value">${contactName}</span>
      </div>
      <div class="contact-row" style="display: flex; align-items: flex-start;">
        <span class="label" style="font-weight: bold; width: 80px; flex-shrink: 0; text-align: right; padding-right: 0px;">
          Address:
        </span>
        <span class="value" style="flex: 1; white-space: normal;">
          ${address}
        </span>
      </div>
      <div class="contact-row">
        <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Phone:</span>
        <span class="value">${phone}</span>
      </div>
      <div class="contact-row">
        <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Fax:</span>
        <span class="value">${fax}</span>
      </div>
      <div class="contact-row">
        <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Website:</span>
        <span class="value website-link" style="text-decoration: underline; text-underline-offset: 3px;">${website}</span>
      </div>
    </div>
  </div>

  <div class="billing-job-container" style="display: flex; gap: 40px; align-items: flex-start; margin-top: 10px;">
    <div class="billing-table" style="width: 30%;">
      <div style="font-weight: bold; margin-bottom: 4px;">BILLED TO:</div>
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <tr>
          <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 16px 4px;">
            ${billedToName}
          </td>
        </tr>
        <tr>
          <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 16px 4px;">
            ${billedToCompany}
          </td>
        </tr>
        <tr>
          <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 16px 4px;">
            ${billedToAddress}
          </td>
        </tr>
      </table>
    </div>
    <div class="job-info-section" style="flex-grow: 1;">
      <table style="width: 80%; border-collapse: collapse; margin-left: 175px">
        <colgroup>
          <col style="width: 30%;">
          <col style="width: 50%;">
        </colgroup>
        <tr>
          <td style="font-weight: bold; padding: 4px; width: 80px; border: none; text-align: right;">
            Date:
          </td>
          <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">
            ${date}
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 4px; border: none; text-align: right;">
            Proposal #:
          </td>
          <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">
            ${proposalNumber}
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 4px; width: 25px; border: none; text-align: right; white-space: nowrap;">
            Job Location:
          </td>
          <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; white-space: normal; word-break: break-word; max-width: 300px;">
            ${jobLocation}
          </td>
        </tr>
      </table>
    </div>
  </div>

  <div class="proposal-intro" style="line-height: 1.2; margin-top: 12px;">
    Thank you for considering Contemporary Wall Systems for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <strong>${wallCount === 1 ? 'ONE (1)' : wallCount === 2 ? 'TWO (2)' : wallCount === 3 ? 'THREE (3)' : wallCount === 4 ? 'FOUR (4)' : `${wallCount}`} ${wallSystemType}</strong> as specified below, at the above named project.
  </div>

  <div class="wall-specifications" style="line-height: 1.15; margin-top: 15px; padding-bottom: 10px;">
    <strong>Specifications as follows:</strong>
  </div>

  <div class="wall-specifications-list" style="line-height: 1.15; margin-top: 10px;">
    <table style="border-collapse: collapse; width: 100%;">
      <tbody>
        ${wallEntries.map(([wallName, wall]: [string, WallSpecification]) => {
          const dimensions = formatDimensions(wall.widthFeet, wall.widthInches, wall.heightFeet, wall.heightInches, true);
          const panelCount = wall.panelCount || '';
          const panelConfiguration = wall.panelConfiguration || '';
          const quantity = wall.quantity || '1';

          return `
            <tr>
              <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${wallName}</td>
              <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${dimensions}</td>
              <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${toWords(panelCount)} (${panelCount})</td>
              <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; border-right: 0.5px solid black;">${panelConfiguration}</td>
              <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">${quantity} Each</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="panels-section" style="line-height: 1.15;">
    <h2 class="section-header">PANELS:</h2>
    This wall system utilizes the Kwik-Wall <strong>${wallEntries[0]?.[1]?.series || ''} Series Model ${wallEntries[0]?.[1]?.model || ''}</strong> configured with <strong>${wallEntries[0]?.[1]?.panelConfiguration || ''}</strong> designed for use with a <strong>${wallEntries[0]?.[1]?.trackType || ''} Layout</strong>, and includes ${isGLModel(wallEntries[0]?.[1]?.model) ? 'GL insulated' : 'non-GL insulated'} for enhanced acoustic performance.
    <br><br>The wall consists of <strong>${getPanelConfigurationText(wallEntries[0]?.[1]?.panelCount)} ${wallEntries[0]?.[1]?.panelConfiguration || ''}</strong>, finished in an <strong>${wallEntries[0]?.[1]?.panelFinishCategory || ''} ${wallEntries[0]?.[1]?.panelFinishSpecificItem || ''}</strong> (as selected from the manufacturer's standard offerings). The wall stands <strong>${formatDimensions('0', '0', wallEntries[0]?.[1]?.heightFeet, wallEntries[0]?.[1]?.heightInches, false).split(' x ')[1]}</strong> in height, with panel widths varying as needed. Each panel features a <strong>${wallEntries[0]?.[1]?.panelDesign || ''} </strong> design and is nominally <strong>${wallEntries[0]?.[1]?.panelThickness || ''}"</strong> thick, constructed with a <strong>Steel Faced 1/2" gypsum board</strong> laminated to an acoustic material. Each panel features a <strong>${wallEntries[0]?.[1].panelDesign || ''}</strong> Design and are suspended from a <strong>${wallEntries[0]?.[1]?.trackSystem || ''}</strong> overhead track system, allowing for smooth and efficient movement. Acoustic performance is enhanced through <strong>${wallEntries[0]?.[1]?.verticalSeals || ''}</strong> vertical seals that create a continuous interlock, and <strong>${wallEntries[0]?.[1]?.bottomSeals || ''}</strong> operable bottom seals, set at the time of panel's placement and retract into the panels when in use for virtually effortless movement. End panels will incorporate a <strong>${wallEntries[0]?.[1]?.endPanelType || ''}</strong>, which uses a <strong>${wallEntries[0]?.[1]?.finalSeal || ''}</strong> as a final seal.
  </div>

  <div class="track-section" style="line-height: 1.15;">
    <h2 class="section-header">TRACK:</h2>
    We will be using an <strong>${wallEntries[0]?.[1]?.trackSystem || ''} Track System</strong> to suspend the doors from above. This track allows for <strong>${getMovementOnTrackText(wallEntries[0]?.[1]?.panelConfiguration)}</strong> of the panels, along the overhead track, enabling flexible operation and easy stacking when the partition is not in use.
  </div>
      
  <!-- 
  <div style="height: 120px;"></div>
  -->


  ${data.pocket_doors?.foldType && data.pocket_doors?.foldStyle ? `
  <div class="pocket-doors-section" style="line-height: 1.15;">
    <h2 class="section-header">POCKET DOORS:</h2>
    <strong>${pocketFoldType}</strong> doors with an <strong>${pocketFoldStyle}</strong> style will be used to house the panels in the stack, offering a space-efficient and acoustically enhanced storage solution.
  </div>
  ` : ''}

  <div class="support-section" style="line-height: 1.15;">
    <h2 class="section-header">SUPPORT STRUCTURE (HEADER):</h2>
    Doors will be hung from a <strong>${mountingTrack}</strong> above, to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.
  </div>

  <div class="general-section" style="line-height: 1.15; margin-bottom: 20px;">
    <h2 class="section-header">GENERAL:</h2>
    Each door will carry a minimum <strong>STC of ${wallEntries[0]?.[1]?.stcRating || ''}</strong>${wallEntries[0]?.[1]?.stcRating === '56' ? ' <strong>(Highest Available)</strong>' : ''}. Estimated delivery would be <strong>${trackDelivery} weeks</strong> after approval of shop drawings for tracks, & <strong>${panelDelivery} weeks</strong> for panels. Installation of tracks would take approximately <strong>${trackInstallation} working days</strong>, panels installation would take <strong>${panelInstallation} additional days</strong>.
  </div>

  <div class="pricing-section" style="margin-top: 10px;">
    <table style="width: 90%; border-collapse: collapse; table-layout: fixed;">
      <colgroup>
        <col style="width: 80%;">
        <col style="width: 20%;">
      </colgroup>
      <tr>
        <td style="border: 0.5px solid black; padding: 8px 8px 12px 8px;"><strong> As described, furnished and installed</strong></td>
        <td style="border: 0.5px solid black; text-align: right; padding: 8px 8px 12px 8px;"><strong>${basePrice}</strong></td>
      </tr>
      <tr>
        <td style="border: 0.5px solid black; padding: 8px;"><strong>Estimated Inbound Freight + Local Delivery</strong></td>
        <td style="border: 0.5px solid black; text-align: right; padding: 8px 8px 12px 8px;"><strong>${freight}</strong></td>
      </tr>
      <tr>
        <td style="border: 0.5px solid black; padding: 8px 8px 12px 8px;"><strong>Total</strong></td>
        <td style="border: 0.5px solid black; text-align: right; padding: 8px 8px 12px 8px;"><strong>${total}</strong></td>
      </tr>
    </table>
  </div>

  <div class="statement-section" style="line-height: 1.15;">
    <br>Above Proposal is a Good Faith Estimate, Based on the Information Provided & Subject to Revision Upon Site Visit & Inspection. Pricing is Firm for 60 Days From Date Above
  </div>

  <div class="terms-section">
    <h2 class="section-header">General Notes and Terms:</h2>
    <ol>
      <li>1.  All materials are <strong>FOB factory</strong>, prepaid, and added to the final invoice.</li>
      <li>2.  <strong>Electrical, HVAC, and sprinkler system modifications</strong>, if required, are the responsibility of others.</li>
      <li>3.  All labor is <strong>${laborType}</strong>, performed at <strong>${wageRate} Wage Rates</strong> during regular hours (Monday–Friday, 7:00 AM–3:30 PM).</li>
      <li>4.  <strong>Delivery includes drop-off to the Roof</strong> of the site, if applicable.</li>
      <li>5.  Pricing is <strong>exclusive of any applicable taxes</strong>, which will be added as required.</li>
      <li>6.  The <strong>customer is responsible for obtaining any necessary permits or associated fees</strong>.</li>
      <li>7.  Final pricing is <strong>subject to site inspection and verification</strong> of all dimensions and conditions by our installation team.</li>
      <li>8.  Any additional requirements or unforeseen conditions may be subject to <strong>revised pricing or additional charges</strong>.</li>
      <li>9.  Panel colors and finishes are available<strong> as per the manufacturer's current standard offerings</strong>.</li>
      <li>10. A <strong>10-year factory warranty</strong> is provided on all operable wall systems.</li>
      <li>11.
        <strong> Payment Terms:</strong>
        <div style="padding-left: 2rem;">
          <div>– <strong>${paymentUponDrawings}%</strong> due upon approval of shop drawings</div>
          <div>– <strong>${paymentUponTrackInstallation}%</strong> due upon track installation</div>
          <div>– Remaining balance due upon final completion</div>
        </div>
      </li>
    </ol>
  </div>

  <div class="signature-section">
    <br><strong>Signed By:</strong> _________________________________________________________&nbsp;&nbsp;&nbsp;<strong>Date:</strong> ${date}
  </div>

  <div class="acceptance-section">
    <h2 class="section-header">ACCEPTANCE OF PROPOSAL:</h2>
    The above prices, specifications, and conditions are satisfactory and are hereby accepted. Any alteration or deviation from above specifications will be executed upon written approval and may/will be subject to additional costs over and above the estimate. All removal of packing material is the customer's responsibility. Electrical and H.V.A.C. installation(s) are not included. Visa, Mastercard and American Express (AMEX) are accepted. Payments by credit card will be charged a processing fee. Pricing subject to applicable sales tax unless otherwise noted. Late payments will be subject to a 1.5% finance charge per month. Cancellations will be subject to a restocking fee.
  </div>`;
  };

  export default generateQuoteText;