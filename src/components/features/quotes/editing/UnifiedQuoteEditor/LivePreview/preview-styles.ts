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
      
      /* Page fragment styles for sectioned content */
      .page-fragment {
        /* Removed break-inside: avoid to allow ContentSplitter paragraph-level splitting */
        page-break-before: auto;
      }
      
      .page-fragment + .page-fragment {
        margin-top: 0;
        page-break-before: auto;
      }
      
      /* Individual wall panel descriptions - allow splitting at paragraph level */
      .panel-wall-item {
        /* Allow ContentSplitter to handle paragraph-level breaking */
        margin-bottom: 8px;
      }
      
      /* Individual term items - small items can still avoid breaking */
      .term-item {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      /* Payment terms with bullets - keep together */
      .payment-terms-item {
        break-inside: avoid;
        page-break-inside: avoid;
        keep-together: always;
      }
      
      /* Keep section titles with their following content */
      .quote-section-title {
        break-after: avoid;
        page-break-after: avoid;
      }
      
      
      /* Allow paragraphs in splittable sections to break naturally */
      .panels-section p,
      .pass-doors-section p,
      .pocket-doors-section p,
      .track-section p,
      .support-section p,
      .general-section p,
      .terms-section p {
        break-inside: auto;
        page-break-inside: auto;
      }
      
      /* Prevent wall names from breaking across lines */
      .wall-specifications-list strong:first-child,
      .panel-wall-item strong:first-child,
      .track-section strong,
      .support-section strong,
      .pocket-doors-section strong,
      .pass-doors-section strong {
        white-space: nowrap;
      }
      
      /* Section hover and click styles - exclude non-editable sections */
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):not(.header-section) {
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 4px;
        position: relative;
      }
      
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):not(.header-section):hover {
        background-color: rgba(59, 130, 246, 0.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):not(.header-section):hover::after {
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
      
      /* Make signature-acceptance section editable */
      .quote-document .signature-acceptance-section {
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 4px;
        position: relative;
      }
      
      .quote-document .signature-acceptance-section:hover {
        background-color: rgba(59, 130, 246, 0.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quote-document .signature-acceptance-section:hover::after {
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
      
      /* REMOVED: Non-interactive styles - now using consistent not-allowed cursor treatment */
      
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
      .quote-document .pricing-section,
      .quote-document .header-section,
      .quote-document .job-info-section,
      .quote-document .billing-job-container {
        cursor: not-allowed;
        opacity: 0.8;
      }
      
      .quote-document .wall-specifications-list:hover,
      .quote-document .pricing-section:hover,
      .quote-document .header-section:hover,
      .quote-document .job-info-section:hover,
      .quote-document .billing-job-container:hover {
        background-color: rgba(156, 163, 175, 0.1);
      }
      
      /* Google Docs-like styling using CSS variables */
      .quote-document {
        font-family: var(--page-font-family, 'Times New Roman', Times, serif);
        font-size: var(--page-font-size, 12pt);
        line-height: var(--page-line-height, 1.15);
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
      .billing-job-container { 
        display: flex !important; 
        justify-content: flex-start !important; 
        align-items: flex-start !important; 
        margin-bottom: 30px; 
        gap: 120px !important; 
        width: 100% !important;
        margin-top: -40px !important;
      }
      .billing-table { 
        width: 200px !important; 
        flex-shrink: 0 !important;
      }
      .job-info-section { 
        flex-shrink: 0 !important;
        width: 350px !important;
        margin-left: auto !important;
      }
      .job-row { display: flex; align-items: center; margin-bottom: 15px; position: relative; }
      .job-label { font-weight: bold; margin-right: 20px; min-width: 120px; }
      .job-value { flex: 1; padding-bottom: 2px; }
      .job-underline { position: absolute; bottom: 0; right: 0; left: 140px; height: 1px; background-color: black; }
      
      /* Ensure billing container tables display properly */
      .billing-job-container table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      
      .billing-table table {
        table-layout: fixed !important;
      }
      
      .job-info-section table {
        width: 100% !important;
        margin-left: 0 !important;
      }
      h2.section-header, 
      h2.editable-header { 
        font-weight: bold; 
        font-size: 12pt; 
        margin: 1.5em 0 0.5em 0; /* Reset all margins explicitly */
        padding: 0; /* Reset all padding */
        text-indent: 0; /* Ensure no text indent */
        box-sizing: border-box;
      }
      
      /* Override for editable headers to maintain edit styling */
      .editable-header {
        position: relative;
        margin: 1.5em 0 0.5em 0 !important; /* Same margins as regular headers */
        padding: 2px 0px !important; /* Only vertical padding for edit styling */
        border: 2px solid transparent;
        border-radius: 4px;
        transition: all 0.2s ease;
        text-indent: 0 !important; /* Ensure no text indent */
        margin-left: 0 !important; /* Align with paragraph text */
        padding-left: 0 !important; /* Remove any left padding */
      }
      
      .editable-header:hover {
        border-color: rgba(59, 130, 246, 0.3);
        background-color: rgba(59, 130, 246, 0.05);
      }
      
      .editable-header[contenteditable="true"] {
        border-color: #3B82F6;
        background-color: rgba(59, 130, 246, 0.1);
        outline: none;
      }
      
      .editable-header[contenteditable="true"]:focus {
        border-color: #1D4ED8;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
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
      
      /* Ensure continued sections maintain proper spacing */
      .panels-section p.wall-paragraph {
        margin-bottom: 8px !important;
        line-height: 1.15 !important;
      }
      
      /* Style section headers that are embedded as content items */
      .section-header-item {
        font-weight: bold !important;
        font-size: 12pt !important;
        margin: 1.5em 0 0.5em 0 !important;
        line-height: 1.15 !important;
        color: #000 !important;
      }
      
      /* Ensure embedded headers in terms section have proper spacing */
      .terms-section .section-header-item {
        margin-top: 1.5em !important;
        margin-bottom: 0.5em !important;
      }
      
      .terms-section .term-item {
        margin-bottom: 4px !important;
        line-height: 1.15 !important;
        display: block !important;
        visibility: visible !important;
      }
      
      
      /* Prevent spacing compression in split sections */
      .panels-section,
      .terms-section {
        line-height: 1.15 !important;
      }
      
      .panels-section > *,
      .terms-section > * {
        line-height: 1.15 !important;
      }
      
      /* Ensure specific section headers align perfectly with their content */
      .pass-doors-section h2.section-header,
      .pass-doors-section h2.editable-header,
      .track-section h2.section-header,
      .track-section h2.editable-header,
      .support-section h2.section-header,
      .support-section h2.editable-header,
      .general-section h2.section-header,
      .general-section h2.editable-header {
        margin-left: 0 !important;
        padding-left: 0 !important;
        text-indent: 0 !important;
        position: relative !important;
        left: 0 !important;
      }
      
      /* Ensure section content paragraphs are consistently aligned */
      .pass-doors-section p,
      .track-section p,
      .support-section p,
      .general-section p {
        margin-left: 0 !important;
        padding-left: 0 !important;
        text-indent: 0 !important;
      }
      
      /* Fix contentEditable styling inconsistencies - allow inline styles to override */
      [contenteditable="true"] {
        line-height: 1.15;
        font-family: var(--page-font-family, 'Times New Roman', Times, serif);
        font-size: var(--page-font-size, 12pt);
      }
      
      /* Ensure elements without inline styles use defaults, but allow inline styles to override */
      [contenteditable="true"] *:not([style*="font-size"]):not([style*="line-height"]),
      [contenteditable="true"] div:not([style*="font-size"]):not([style*="line-height"]),
      [contenteditable="true"] p:not([style*="font-size"]):not([style*="line-height"]),
      [contenteditable="true"] span:not([style*="font-size"]):not([style*="line-height"]) {
        line-height: 1.15;
        font-family: var(--page-font-family, 'Times New Roman', Times, serif);
        font-size: var(--page-font-size, 12pt);
      }
      
      /* Only enforce margin/padding with !important */
      [contenteditable="true"] *,
      [contenteditable="true"] div,
      [contenteditable="true"] p,
      [contenteditable="true"] span,
      [contenteditable="true"] br {
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Override browser default paragraph spacing in contentEditable */
      [contenteditable="true"] p {
        margin-bottom: 0 !important;
        margin-top: 0 !important;
        line-height: 1.15 !important;
      }
      
      /* Ensure wall paragraphs maintain proper spacing even when edited */
      [contenteditable="true"] .wall-paragraph,
      .wall-paragraph[contenteditable="true"] {
        margin: 0 0 8px 0 !important;
        line-height: 1.15 !important;
        page-break-inside: avoid !important;
        orphans: 2 !important;
        widows: 2 !important;
      }
    </style>
  `;
};