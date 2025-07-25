import jsPDF from 'jspdf';

interface QuoteData {
  quote_details?: any;
  job_details?: any;
  wall_details?: {
    id?: string;
    walls?: {
      [wallName: string]: any;
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
  version?: number;
}

interface PDFSection {
  title: string;
  content: string[];
  isTable?: boolean;
  tableData?: any[][];
  tableHeaders?: string[];
}

export class IntelligentPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private lineHeight: number = 6;
  private fontSize: number = 10;
  private headerHeight: number = 40;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private addPageHeader(pageNumber: number, totalPages: number, quoteNumber: string) {
    this.doc.setFontSize(8);
    this.doc.setTextColor(100);
    
    // Company logo placeholder
    this.doc.setFillColor(59, 130, 246);
    this.doc.rect(this.margin, 10, 15, 15, 'F');
    this.doc.setTextColor(255);
    this.doc.setFontSize(8);
    this.doc.text('LOGO', this.margin + 7.5, 19, { align: 'center' });
    
    // Quote number and page info
    this.doc.setTextColor(0);
    this.doc.setFontSize(10);
    this.doc.text(`Quote #${quoteNumber}`, this.margin + 20, 15);
    this.doc.text(`Page ${pageNumber} of ${totalPages}`, this.pageWidth - this.margin, 15, { align: 'right' });
    
    // Header line
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, 25, this.pageWidth - this.margin, 25);
    
    this.currentY = 35;
  }

  private checkPageBreak(requiredHeight: number, isNewSection: boolean = false): boolean {
    const footerSpace = 20;
    const availableSpace = this.pageHeight - this.currentY - footerSpace;
    
    if (requiredHeight > availableSpace || (isNewSection && this.currentY > this.pageHeight * 0.7)) {
      this.doc.addPage();
      return true;
    }
    return false;
  }

  private addSection(section: PDFSection, pageNumber: number, totalPages: number, quoteNumber: string) {
    // Check if we need a new page for this section
    const estimatedHeight = section.isTable ? 
      (section.tableData?.length || 0) * this.lineHeight + 20 :
      section.content.length * this.lineHeight + 15;
    
    if (this.checkPageBreak(estimatedHeight, true)) {
      pageNumber++;
      this.addPageHeader(pageNumber, totalPages, quoteNumber);
    }

    // Add section title
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(section.title, this.margin, this.currentY);
    this.currentY += 10;

    if (section.isTable && section.tableData && section.tableHeaders) {
      this.addTable(section.tableHeaders, section.tableData, pageNumber, totalPages, quoteNumber);
    } else {
      this.addTextContent(section.content, pageNumber, totalPages, quoteNumber);
    }

    this.currentY += 10; // Section spacing
    return pageNumber;
  }

  private addTable(headers: string[], data: any[][], pageNumber: number, totalPages: number, quoteNumber: string) {
    const colWidth = (this.pageWidth - 2 * this.margin) / headers.length;
    
    this.doc.setFontSize(this.fontSize);
    this.doc.setFont(undefined, 'bold');
    
    // Table headers
    headers.forEach((header, i) => {
      this.doc.text(header, this.margin + i * colWidth, this.currentY);
    });
    this.currentY += this.lineHeight;
    
    // Header line
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 3;
    
    this.doc.setFont(undefined, 'normal');
    
    // Table rows
    data.forEach((row) => {
      if (this.checkPageBreak(this.lineHeight + 5)) {
        pageNumber++;
        this.addPageHeader(pageNumber, totalPages, quoteNumber);
        
        // Repeat headers on new page
        this.doc.setFont(undefined, 'bold');
        headers.forEach((header, i) => {
          this.doc.text(header, this.margin + i * colWidth, this.currentY);
        });
        this.currentY += this.lineHeight;
        this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 3;
        this.doc.setFont(undefined, 'normal');
      }
      
      row.forEach((cell, i) => {
        const cellText = String(cell || '');
        const wrappedText = this.doc.splitTextToSize(cellText, colWidth - 2);
        this.doc.text(wrappedText, this.margin + i * colWidth, this.currentY);
      });
      this.currentY += this.lineHeight;
    });
  }

  private addTextContent(content: string[], pageNumber: number, totalPages: number, quoteNumber: string) {
    this.doc.setFontSize(this.fontSize);
    this.doc.setFont(undefined, 'normal');
    
    content.forEach((line) => {
      if (this.checkPageBreak(this.lineHeight + 2)) {
        pageNumber++;
        this.addPageHeader(pageNumber, totalPages, quoteNumber);
      }
      
      const wrappedLines = this.doc.splitTextToSize(line, this.pageWidth - 2 * this.margin);
      wrappedLines.forEach((wrappedLine: string) => {
        if (this.checkPageBreak(this.lineHeight)) {
          pageNumber++;
          this.addPageHeader(pageNumber, totalPages, quoteNumber);
        }
        this.doc.text(wrappedLine, this.margin, this.currentY);
        this.currentY += this.lineHeight;
      });
    });
  }

  private formatCurrency(amount?: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }

  private formatDate(dateString?: string): string {
    if (!dateString) return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  private buildSections(data: QuoteData): PDFSection[] {
    const sections: PDFSection[] = [];

    // Company Header Section
    sections.push({
      title: 'Elite Rolling Steel LLC',
      content: [
        'Phone: (555) 123-4567',
        'Email: info@eliterollingsteel.com',
        'Website: www.eliterollingsteel.com',
        'Address: 123 Industrial Way, Steel City, ST 12345',
        '',
        `Proposal Number: ${data.proposal_number || 'N/A'}`,
        `Date: ${this.formatDate(data.created_at)}`,
      ]
    });

    // Billing and Job Information
    const billingContent = [];
    if (data.quote_details) {
      billingContent.push('BILLED TO:');
      billingContent.push(data.quote_details.companyName || '');
      billingContent.push(data.quote_details.contactName || '');
      billingContent.push(data.quote_details.address || '');
      billingContent.push(`${data.quote_details.city || ''}, ${data.quote_details.state || ''} ${data.quote_details.zipCode || ''}`);
      billingContent.push(`Phone: ${data.quote_details.phone || ''}`);
      billingContent.push(`Email: ${data.quote_details.email || ''}`);
    }

    if (data.job_details) {
      billingContent.push('');
      billingContent.push('JOB INFORMATION:');
      billingContent.push(`Project: ${data.job_details.projectName || ''}`);
      billingContent.push(`Location: ${data.job_details.jobLocation || ''}`);
      billingContent.push(`Delivery Date: ${this.formatDate(data.job_details.deliveryDate)}`);
      billingContent.push(`Installation Date: ${this.formatDate(data.job_details.installationDate)}`);
    }

    sections.push({
      title: 'Project Information',
      content: billingContent
    });

    // Wall Specifications
    if (data.wall_details?.walls) {
      Object.entries(data.wall_details.walls).forEach(([wallName, wall]) => {
        if (!wall || (wall.widthFeet === '' && wall.widthInches === '')) return;
        
        const wallContent = [
          `System Type: ${wall.wallSystemType || 'N/A'}`,
          `Dimensions: ${wall.widthFeet || '0'}' ${wall.widthInches || '0'}" W x ${wall.heightFeet || '0'}' ${wall.heightInches || '0'}" H`,
          `Quantity: ${wall.quantity || '1'}`,
          `Panel Configuration: ${wall.panelConfiguration || 'N/A'}`,
          `Panel Count: ${wall.panelCount || 'N/A'}`,
          `Series: ${wall.series || 'N/A'}`,
          `Model: ${wall.model || 'N/A'}`,
          `Panel Thickness: ${wall.panelThickness || 'N/A'}`,
          `Panel Design: ${wall.panelDesign || 'N/A'}`,
          `Panel Skin: ${wall.panelSkin || 'N/A'}`,
          `STC Rating: ${wall.stcRating || 'N/A'}`,
          `Track Type: ${wall.trackType || 'N/A'}`,
          `Track System: ${wall.trackSystem || 'N/A'}`,
        ];

        if (wall.panelFinishCategory && wall.panelFinishCategory !== 'None') {
          wallContent.push(`Panel Finish: ${wall.panelFinishCategory}`);
          if (wall.panelFinishSpecificItem && wall.panelFinishSpecificItem !== 'None') {
            wallContent.push(`Specific Item: ${wall.panelFinishSpecificItem}`);
          }
        }

        // Add seals and other optional items only if they're not "None" or empty
        ['verticalSeals', 'bottomSeals', 'topSeals', 'finalSeal'].forEach(seal => {
          if (wall[seal] && wall[seal] !== 'None' && wall[seal] !== '') {
            const sealName = seal.replace(/([A-Z])/g, ' $1').toLowerCase();
            wallContent.push(`${sealName.charAt(0).toUpperCase() + sealName.slice(1)}: ${wall[seal]}`);
          }
        });

        if (wall.passDoorPanels && wall.passDoorPanels !== 'None') {
          wallContent.push(`Pass Door Panels: ${wall.passDoorPanels}`);
        }

        if (wall.endPanelType && wall.endPanelType !== 'None') {
          wallContent.push(`End Panel Type: ${wall.endPanelType}`);
        }

        sections.push({
          title: `Wall Specification - ${wallName}`,
          content: wallContent
        });
      });
    }

    // Pocket Doors
    if (data.pocket_doors?.foldType && data.pocket_doors.foldType !== 'None') {
      sections.push({
        title: 'Pocket Doors',
        content: [
          `Fold Type: ${data.pocket_doors.foldType}`,
          `Fold Style: ${data.pocket_doors.foldStyle || 'N/A'}`
        ]
      });
    }

    // Support Structure
    if (data.support_structure?.mountingTrack) {
      sections.push({
        title: 'Support Structure',
        content: [
          `Mounting Track: ${data.support_structure.mountingTrack}`,
          `General Notes: ${data.support_structure.generalNotes || 'None'}`
        ]
      });
    }

    // Delivery Information
    if (data.delivery_details) {
      sections.push({
        title: 'Delivery Information',
        content: [
          `Delivery Method: ${data.delivery_details.deliveryMethod || 'N/A'}`,
          `Special Instructions: ${data.delivery_details.specialInstructions || 'None'}`
        ]
      });
    }

    // Labor Information
    if (data.labor_details) {
      sections.push({
        title: 'Labor Information',
        content: [
          `Installation Required: ${data.labor_details.installationRequired ? 'Yes' : 'No'}`,
          `Demolition Required: ${data.labor_details.demolitionRequired ? 'Yes' : 'No'}`,
          `Special Requirements: ${data.labor_details.specialRequirements || 'None'}`
        ]
      });
    }

    // Pricing
    if (data.price_details) {
      const pricingTable = [
        ['Base Price', this.formatCurrency(data.price_details.basePrice)],
        ['Freight', this.formatCurrency(data.price_details.freight)],
        ['Total', this.formatCurrency(data.price_details.total)]
      ];

      sections.push({
        title: 'Pricing Breakdown',
        content: [],
        isTable: true,
        tableHeaders: ['Item', 'Amount'],
        tableData: pricingTable
      });

      sections.push({
        title: 'Payment Terms',
        content: [
          `Payment Upon Drawings: ${this.formatCurrency(data.price_details.paymentUponDrawings)}`,
          `Payment Upon Track Installation: ${this.formatCurrency(data.price_details.paymentUponTrackInstallation)}`,
          '',
          'Terms and Conditions:',
          '• All prices are valid for 30 days',
          '• Payment terms: Net 30 days',
          '• Installation not included unless specified',
          '• Delivery charges apply as shown above'
        ]
      });
    }

    return sections;
  }

  public generatePDF(data: QuoteData): jsPDF {
    const sections = this.buildSections(data);
    const quoteNumber = data.proposal_number || 'N/A';
    
    // Calculate total pages (rough estimate)
    let totalPages = Math.ceil(sections.length / 2) + 1;
    let currentPage = 1;

    // Add first page header
    this.addPageHeader(currentPage, totalPages, quoteNumber);

    // Add all sections
    sections.forEach((section) => {
      currentPage = this.addSection(section, currentPage, totalPages, quoteNumber);
    });

    // Add footer with signature section
    if (this.checkPageBreak(40, true)) {
      this.doc.addPage();
      currentPage++;
      this.addPageHeader(currentPage, totalPages, quoteNumber);
    }

    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.text('Acceptance and Signature', this.margin, this.currentY);
    this.currentY += 15;

    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'normal');
    this.doc.text('Customer Signature: _______________________________ Date: ___________', this.margin, this.currentY);
    this.currentY += 10;
    this.doc.text('Print Name: _______________________________', this.margin, this.currentY);

    return this.doc;
  }
}