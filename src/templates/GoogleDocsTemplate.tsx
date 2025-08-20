// import { QuoteData } from './BaseQuoteTemplate';

// export const generateGoogleDocsHTML = (data: QuoteData): string => {
//   // Extract data fields with fallbacks
//   const proposalNumber = data.proposal_number || '15564';
//   const projectName = data.project_name || 'Project Name';
//   const clientName = data.job_details?.client_name || 'Client Name';
//   const clientCompany = data.job_details?.client_company || 'Client Company';
//   const clientAddress = data.job_details?.client_address || 'Client Address';
//   const jobLocation = data.job_details?.job_location || 'Job Location';
//   const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
//   // Wall specifications
//   const wallSpecs = data.wall_details.walls || {};
//   const wallName = wallSpecs.wall_name || 'Wall A';
//   const wallDimensions = `${wallSpecs.lengthFeet || "32'-4\""} x ${wallSpecs.height || "8'-6\""} high`;
//   const panelCount = wallSpecs.panelCount || 'THREE (3)';
//   const panelType = wallSpecs.panelConfiguration || 'Hinged Paired Panels';
  
//   // Pricing
//   const systemPrice = data.price_details?.system_cost || 12567.37;
//   const deliveryPrice = data.price_details?.delivery_cost || 3456.05;
//   const totalPrice = systemPrice + deliveryPrice;

//   return `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta content="text/html; charset=UTF-8" http-equiv="content-type">
//   <style type="text/css">
//     /* Clean Google Docs styling */
//     * { margin: 0; padding: 0; box-sizing: border-box; }
    
//     body {
//       background-color: #ffffff;
//       font-size: 12pt;
//       font-family: "Times New Roman", serif;
//       max-width: 474pt;
//       padding: 27pt 67.1pt 56pt 70.9pt;
//       margin: 0 auto;
//       line-height: 1.15;
//       color: #000000;
//     }
    
//     /* Typography */
//     .bold { font-weight: 700; }
//     .normal { font-weight: 400; }
//     .italic { font-style: italic; }
//     .underline { text-decoration: underline; }
//     .link { color: #1155cc; text-decoration: underline; }
//     .highlight { background-color: #00ff00; }
    
//     /* Layout */
//     .header-section { 
//       padding-top: 0pt; 
//       padding-bottom: 0pt; 
//       line-height: 1.0; 
//       text-align: left; 
//     }
    
//     .contact-info {
//       margin-left: 72.4pt;
//       text-indent: 35.6pt;
//     }
    
//     /* Tables */
//     table {
//       border-spacing: 0;
//       border-collapse: collapse;
//       margin-right: auto;
//       margin-bottom: 12pt;
//     }
    
//     .info-table td {
//       border: 1px solid #000000;
//       padding: 5pt;
//       vertical-align: top;
//     }
    
//     .billing-table {
//       margin-left: 1.3pt;
//       border-spacing: 0;
//       border-collapse: collapse;
//       margin-right: auto;
//     }
    
//     .billing-table td {
//       padding: 5pt;
//       vertical-align: top;
//       border-left: 0pt;
//       border-right: 0pt;
//       border-top: 0pt;
//       border-bottom: 1pt solid #000000;
//     }
    
//     .pricing-table td {
//       border: 1px solid #000000;
//       padding: 5pt;
//       vertical-align: top;
//     }
    
//     .signature-table td {
//       padding: 5pt;
//       vertical-align: top;
//       border-bottom: 1pt solid #000000;
//     }
    
//     /* Spacing */
//     .section-spacing { 
//       padding-top: 12pt; 
//       padding-bottom: 0pt; 
//       line-height: 1.15; 
//       text-align: left; 
//     }
    
//     .small-spacing { 
//       padding-top: 6pt; 
//       padding-bottom: 0pt; 
//       line-height: 1.15; 
//       text-align: left; 
//     }
    
//     /* Lists */
//     ol { 
//       margin: 0; 
//       padding: 0; 
//       margin-left: 36pt; 
//       padding-left: 0pt; 
//     }
    
//     ol li {
//       padding-top: 12pt;
//       padding-bottom: 12pt;
//       line-height: 1.15;
//       text-align: left;
//     }
    
//     /* Terms section */
//     .terms-text {
//       font-size: 9pt;
//       font-style: italic;
//       line-height: 1.15;
//       text-align: left;
//     }
//   </style>
// </head>
// <body>
//   <!-- Header with Logo placeholder -->
//   <p class="header-section">
//     <span style="margin-left: 120pt;">[LOGO PLACEHOLDER - 397px x 95px]</span>
//   </p>
  
//   <!-- Company Contact Info -->
//   <p class="header-section">
//     <span class="bold">Address: </span>
//     <span>567 Commerce St, Franklin Lakes, NJ, 07417</span>
//   </p>
//   <p class="header-section contact-info">
//     <span class="bold">Phone:</span> (973) 884-0474
//   </p>
//   <p class="header-section contact-info">
//     <span class="bold">Fax:</span> (973) 884-1606
//   </p>
//   <p class="header-section contact-info">
//     <span class="bold">Website: </span>
//     <span class="link">contemporarywalls.com</span>
//   </p>
  
//   <div style="height: 12pt;"></div>
  
//   <!-- Project Info Table -->
//   <table class="info-table">
//     <tr>
//       <td style="width: 86.2pt;">
//         <p><span class="bold">Date:</span></p>
//       </td>
//       <td style="width: 108pt;">
//         <p>${date}</p>
//       </td>
//     </tr>
//     <tr>
//       <td>
//         <p><span class="bold">Proposal #:</span></p>
//       </td>
//       <td>
//         <p>${proposalNumber}</p>
//       </td>
//     </tr>
//     <tr>
//       <td>
//         <p><span class="bold">Job Location:</span></p>
//       </td>
//       <td>
//         <p>${jobLocation}</p>
//       </td>
//     </tr>
//   </table>
  
//   <!-- Billing Info -->
//   <p><span class="bold">BILLED TO:</span></p>
//   <table class="billing-table">
//     <tr>
//       <td style="width: 144pt;">
//         <p>${clientName}</p>
//       </td>
//     </tr>
//     <tr>
//       <td>
//         <p>${clientCompany}</p>
//       </td>
//     </tr>
//     <tr>
//       <td>
//         <p>${clientAddress}</p>
//       </td>
//     </tr>
//   </table>
  
//   <div style="height: 12pt;"></div>
  
//   <!-- Project Description -->
//   <p class="section-spacing">
//     Thank you for considering Contemporary Wall Systems for this project. As discussed, we are offering a proposal to furnish, deliver, and install, as noted, <span class="link">ONE (1)</span> <span class="bold">Operable Wall</span> as specified below, at the above named project.
//   </p>
  
//   <div style="height: 12pt;"></div>
  
//   <p><span class="bold">Specifications as follows:</span></p>
  
//   <div style="height: 8pt;"></div>
  
 
  
//   <div style="height: 12pt;"></div>
  
//   <!-- Technical Specifications -->
//   <p><span class="bold">PANELS:</span></p>
//   <p class="section-spacing">
//     This wall system utilizes the Kwik-Wall <span class="link">2000 Series Model 2010</span> configured with <span class="link">Hinged Paired Panels</span> designed for use with a <span class="link">Curve & Diverter Track Layout</span>, and includes <span class="link">non GL insulated</span> for enhanced acoustic performance.
//   </p>
  
//   <p class="section-spacing">
//     The wall consists of <span class="link">Multiple Hinged Paired Panels</span>, finished in an <span class="link">Upgraded Fabric</span> finish (as selected from the manufacturer's standard offerings). The wall stands <span class="link">8'-8"</span> in height, with panel widths varying as needed. Each panel is nominally <span class="link">3" Thick</span>, constructed with a <span class="link">Steel Faced 1/2"</span> gypsum board laminated to an acoustic material.
//   </p>
  
//   <div style="height: 12pt;"></div>
  
//   <p><span class="bold">TRACK:</span></p>
//   <p class="section-spacing">
//     We will be using a <span class="link">Steel Track System</span> to suspend the doors from above. This track allows for <span class="link">Flat Stack</span> of the panels when not in use.
//   </p>
  
//   <div style="height: 12pt;"></div>
  
//   <p><span class="bold">SUPPORT STRUCTURE (HEADER):</span></p>
//   <p class="section-spacing">
//     Doors will be hung from a <span class="link">Pre-Drilled Steel Beam</span> above, to manufacturer's specs, as supplied by others. Soffits, if required, as supplied by others.
//   </p>
  
//   <div style="height: 12pt;"></div>
  
//   <p><span class="bold">GENERAL:</span></p>
//   <p class="section-spacing">
//     Each door will carry a <span class="underline">minimum STC of <span class="link">56 (Highest Available)</span></span>. Estimated delivery would be <span class="link">1-2</span> weeks after approval of shop drawings for tracks, & 7-8 weeks for panels. Installation of tracks would take approximately <span class="link">1-2</span> working days, panels installation would take <span class="link">1</span> additional days.
//   </p>
  
//   <div style="height: 20pt;"></div>
  
//   <!-- Pricing Table -->
//   <table class="pricing-table">
//     <tr>
//       <td style="width: 361.5pt;">
//         <p><span class="link">ONE (1)</span><span class="bold"> as described, furnished and installed</span></p>
//       </td>
//       <td style="width: 99pt;">
//         <p>$${systemPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
//       </td>
//     </tr>
//     <tr>
//       <td>
//         <p><span class="bold">Estimated Inbound Freight + Local Delivery</span></p>
//       </td>
//       <td>
//         <p>$${deliveryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
//       </td>
//     </tr>
//     <tr>
//       <td>
//         <p><span class="bold">Total</span></p>
//       </td>
//       <td>
//         <p>$${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
//       </td>
//     </tr>
//   </table>
  
//   <div style="height: 12pt;"></div>
  
//   <p><span class="bold">Above Proposal is a Good Faith Estimate, Based on the Information Provided & Subject to Revision Upon Site Visit & Inspection. Pricing is Firm for 60 Days From Date Above</span></p>
  
//   <div style="height: 12pt;"></div>
  
//   <!-- Terms and Conditions -->
//   <p><span class="bold">General Notes and Terms:</span></p>
//   <ol>
//     <li>All materials are <span class="bold">FOB factory</span>, prepaid, and added to the final invoice.</li>
//     <li><span class="bold">Electrical, HVAC, and sprinkler system modifications</span>, if required, are the responsibility of others.</li>
//     <li>All labor is <span class="link">Non-Union</span>, performed at <span class="link">Standard Wage Rates</span> during regular hours (Monday–Friday, 7:00 AM–3:30 PM).</li>
//     <li><span class="bold">Delivery includes drop-off to the <span class="link">First Floor</span></span> of the site, if applicable.</li>
//     <li>Pricing is <span class="bold">exclusive of any applicable taxes</span>, which will be added as required.</li>
//     <li>The <span class="bold">customer is responsible for obtaining any necessary permits or associated fees</span>.</li>
//     <li>Final pricing is <span class="bold">subject to site inspection and verification</span> of all dimensions and conditions by our installation team.</li>
//     <li>Any additional requirements or unforeseen conditions may be subject to <span class="bold">revised pricing or additional charges</span>.</li>
//     <li>Panel colors and finishes are available <span class="bold">as per the manufacturer's current standard offerings</span>.</li>
//     <li>A <span class="bold">10-year factory warranty</span> is provided on all operable wall systems.</li>
//     <li><span class="bold">Payment Terms</span>:<br>
//       &nbsp;&nbsp;- <span class="link">33%</span> due upon approval of shop drawings<br>
//       &nbsp;&nbsp;- <span class="link">33%</span> due upon track installation<br>
//       &nbsp;&nbsp;- Remaining balance due upon final completion
//     </li>
//   </ol>
  
//   <div style="height: 20pt;"></div>
  
//   <!-- Signature Section -->
//   <table class="signature-table">
//     <tr>
//       <td style="width: 78.8pt;">
//         <p><span class="bold">Signed By:</span></p>
//       </td>
//       <td style="width: 253.5pt;">
//         <p style="height: 12pt;"></p>
//       </td>
//       <td style="width: 42.8pt;">
//         <p><span class="bold">Date:</span></p>
//       </td>
//       <td style="width: 96pt;">
//         <p>${date}</p>
//       </td>
//     </tr>
//   </table>
  
//   <div style="height: 12pt;"></div>
  
//   <!-- Acceptance Section -->
//   <p><span class="bold" style="font-size: 9pt;">ACCEPTANCE OF PROPOSAL:</span></p>
//   <p class="terms-text">
//     The above prices, specifications, and conditions are satisfactory and are hereby accepted. Any alteration or deviation from above specifications will be executed upon written approval and may/will be subject to additional costs over and above the estimate. All removal of packing material is the customer's responsibility. Electrical and H.V.A.C. installation(s) are not included. Visa, Mastercard and American Express (AMEX) are accepted. Payments by credit card will be charged a processing fee. Pricing subject to applicable sales tax unless otherwise noted. Late payments will be subject to a 1.5% finance charge per month. Cancellations will be subject to a restocking fee.
//   </p>
  
// </body>
// </html>`;
// };