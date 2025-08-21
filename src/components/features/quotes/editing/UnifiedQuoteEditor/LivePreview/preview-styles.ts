/**
 * Custom styles for the live preview panel
 * Includes page layout, section interactions, and document styling
 */
export const getPreviewStyles = (): string => {
  return `
    <style>
      /* Page layout styles for live preview */
      .page {
        width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        background: transparent;
        box-shadow: none;
        page-break-after: auto;
      }
      
      .page-break {
        margin: 20px 0;
        border-top: 2px dashed #e2e8f0;
        position: relative;
      }
      
      .page-break::after {
        content: "Page Break";
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8fafc;
        padding: 2px 8px;
        font-size: 10px;
        color: #64748b;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
      }
      
      .keep-together {
        outline: 1px dashed rgba(34, 197, 94, 0.3);
        outline-offset: 2px;
      }
      
      /* Section hover and click styles */
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table) {
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 4px;
        position: relative;
      }
      
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):hover {
        background-color: rgba(59, 130, 246, 0.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):hover::after {
        content: "✏️ Click to edit";
        position: absolute;
        top: -25px;
        right: 0;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
      }
      
      /* Make proposal intro, pocket doors, and pass doors sections hoverable */
      .quote-document .proposal-intro,
      .quote-document .pocket-doors-section,
      .quote-document .pass-doors-section {
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 4px;
        position: relative;
      }
      
      .quote-document .proposal-intro:hover,
      .quote-document .pocket-doors-section:hover,
      .quote-document .pass-doors-section:hover {
        background-color: rgba(59, 130, 246, 0.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quote-document .proposal-intro:hover::after,
      .quote-document .pocket-doors-section:hover::after,
      .quote-document .pass-doors-section:hover::after {
        content: "✏️ Click to edit";
        position: absolute;
        top: -25px;
        right: 0;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
      }
      
      .quote-document .wall-specifications-list,
      .quote-document .pricing-section {
        cursor: not-allowed;
        opacity: 0.8;
      }
      
      .quote-document .wall-specifications-list:hover,
      .quote-document .pricing-section:hover {
        background-color: rgba(156, 163, 175, 0.1);
      }
      
      /* Google Docs-like styling */
      .quote-document {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.15;
        color: #000;
        background: transparent;
      }
      
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        padding-bottom: 20px;
      }
      
      .company-info { flex: 1; max-width: 40%; }
      .company-logo { display: flex; align-items: center; gap: 15px; }
      .logo-placeholder {
        width: 60px; height: 60px;
        background: linear-gradient(135deg, #3B82F6, #F59E0B);
        color: white; display: flex;
        align-items: center; justify-content: center;
        font-weight: bold; font-size: 16pt; border-radius: 8px;
      }
      
      .company-name { font-size: 14pt; font-weight: bold; color: #333; line-height: 1.2; }
      .contact-details { flex: 1; max-width: 55%; text-align: right; }
      .contact-row { margin-bottom: 2px; display: flex; justify-content: flex-end; align-items: center; line-height: 1.15; }
      .contact-row .label { font-weight: bold; margin-right: 8px; min-width: 80px; text-align: right; }
      .contact-row .value { text-align: left; flex: 1; }
      .website-link { color: #3B82F6; text-decoration: underline; }
      .billing-and-job-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; gap: 40px; }
      .billing-section { flex: 1; max-width: 45%; }
      .billed-to-details { margin-top: 10px; }
      .billed-line { margin-bottom: 2px; min-height: 20px; padding-bottom: 4px; }
      .underline { height: 1px; background-color: black; margin-bottom: 8px; width: 100%; }
      .job-info-section { flex: 1; max-width: 50%; }
      .job-row { display: flex; align-items: center; margin-bottom: 15px; position: relative; }
      .job-label { font-weight: bold; margin-right: 20px; min-width: 120px; }
      .job-value { flex: 1; padding-bottom: 2px; }
      .job-underline { position: absolute; bottom: 0; right: 0; left: 140px; height: 1px; background-color: black; }
      h2.section-header { font-weight: bold; font-size: 12pt; margin-top: 1.5em; margin-bottom: 0.5em; }
      .wall-specifications { line-height: 1.15; }
      .acceptance-section p { font-style: italic; font-size: 9pt; line-height: 1.2; }
      .pricing-section { margin-top: 20px; }
      .pricing-section table { width: 100%; border-collapse: collapse; }
      .pricing-section td { border: 1px solid #000; padding: 8px; }
      .terms-section { margin-top: 20px; }
      .terms-section ol { padding-left: 20px; list-style-type: none; }
      .terms-section li { margin-bottom: 4px; line-height: 1.15; display: list-item; }
      /* Ensure proper spacing in panels section */
      .panels-section p { 
        line-height: 1.15; 
        word-spacing: normal; 
        letter-spacing: normal; 
        white-space: normal;
      }
      .signature-section { margin-top: 30px; }
      .general-notes-section { margin-top: 20px; line-height: 1.15; }
      .general-notes-section p { margin: 0; line-height: 1.15; }
      .general-notes-section div { line-height: 1.15; }
      .general-notes-section br { line-height: 1.15; }
      /* Single spacing for general notes and terms content */
      .terms-section p { line-height: 1.15; margin-bottom: 4px; }
      .terms-section div { line-height: 1.15; }
      /* Ensure all list items are visible and properly spaced */
      .terms-section ol li { visibility: visible; overflow: visible; }
      .terms-section ol li div { margin-top: 2px; margin-bottom: 2px; }
      /* Fix Payment Terms nested divs display */
      .terms-section ol li div[style*="padding-left"] { 
        display: block !important; 
        visibility: visible !important; 
      }
      .terms-section ol li div[style*="padding-left"] div { 
        display: block !important; 
        visibility: visible !important; 
        margin-bottom: 2px !important;
        line-height: 1.15 !important;
      }
    </style>
  `;
};