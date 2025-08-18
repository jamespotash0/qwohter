import { useState, useEffect, useMemo } from "react";
import { Search, Download, Edit3, Trash2, MoreHorizontal, DollarSign, TrendingUp, FileText, Building2, User, BarChart3, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import {
//   ColumnDef,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   PaginationState,
//   SortingState,
//   useReactTable,
// } from '@tanstack/react-table';
// import { DataGrid, DataGridContainer } from '@/components/ui/data-grid-table';
// import { DataGridPagination } from '@/components/ui/data-grid-table';
// import { DataGridTable } from '@/components/ui/data-grid-table';
// import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import CreateQuoteDialog from "@/components/CreateQuoteDialog";
import jsPDF from 'jspdf';
// No imports needed for pandoc approach
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import UnifiedQuoteEditor from "@/components/UnifiedQuoteEditor";
import { SmartQuoteData } from "@/templates/SmartQuoteTemplate";

const Quotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const {
    quotes,
    loading,
    updateQuote,
    deleteQuote: deleteQuoteFromDB,
    markAsDownloaded,
    createQuote,
    saveQuoteCustomization,
    refreshQuotes
  } = useQuotes();

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Submitted: "bg-green-100 text-green-800",
    Won: "bg-blue-100 text-blue-800",
    Rejected: "bg-red-100 text-red-800",
  };

  const { currentOrganization } = useOrganizations();
  const { profile } = useUserProfile(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredQuotes = quotes.filter(quote => {
    const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "";
    const projectName = quote.project_name || quote.quote_details?.project_name || "";
    
    const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.proposal_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || quote.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredQuotes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const updateQuoteStatus = async (id: string, newStatus: string) => {
    await updateQuote(id, { status: newStatus });
  };

  const handleDeleteQuote = async (id: string) => {
    await deleteQuoteFromDB(id);
    setDeleteQuoteId(null);
  };

  const editQuote = (quote: Quote) => {
    setEditingQuote(quote);
  };

  const handleUnifiedQuoteSave = async (customizedQuote: SmartQuoteData) => {
    try {
      if (editingQuote) {
        // First, save the form data changes to the main quote data
        const { customSections, customHTML, isCustomized, ...formDataUpdates } = customizedQuote;
        
        // Ensure wall_details has required id field if it exists
        const updates: Partial<Quote> = {
          ...formDataUpdates,
          ...(formDataUpdates.wall_details && {
            wall_details: {
              id: formDataUpdates.wall_details.id || editingQuote.wall_details?.id || '',
              walls: formDataUpdates.wall_details.walls || {}
            }
          })
        };
        
        // Update the main quote data with form changes
        await updateQuote(editingQuote.id, updates);
        
        // Then, save customizations if they exist
        if (customSections) {
          await saveQuoteCustomization(editingQuote.id, {
            customSections: customSections,
            customHTML: customHTML,
            isCustomized: isCustomized || true,
            lastModified: new Date(),
            version: 1
          });
        }
        
        setEditingQuote(null);
        refreshQuotes();
      }
    } catch (error) {
      // Error handling is done in updateQuote and saveQuoteCustomization
    }
  };

  const handleUnifiedQuoteDownload = async (html: string) => {
    if (!editingQuote) return;
    
    try {
      const quoteName = editingQuote.project_name || editingQuote.proposal_number || 'quote';
      
      // Create temp div with exactly the same styling as standard PDF download
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.cssText = `
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.15;
        width: 7in;
        margin: 0 auto;
        padding: 20px;
        color: black;
        background: white;
      `;

      // Add the same enhanced styles as standard download (identical to main downloadPDF function)
      const style = document.createElement('style');
      style.textContent = `
        .quote-container {
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.15;
          width: 7in;
          margin: 0 auto;
          color: black;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
        }
        .company-info {
          flex: 1;
          max-width: 40%;
        }
        .company-logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logo-placeholder {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3B82F6, #F59E0B);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16pt;
          border-radius: 8px;
        }
        .company-name {
          font-size: 14pt;
          font-weight: bold;
          color: #333;
          line-height: 1.2;
        }
        .contact-details {
          flex: 1;
          max-width: 55%;
          text-align: right;
        }
        .contact-row {
          margin-bottom: 2px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          line-height: 1.1;
        }
        .contact-row .label {
          font-weight: bold;
          margin-right: 8px;
          min-width: 80px;
          text-align: right;
        }
        .contact-row .value {
          text-align: left;
          flex: 1;
        }
        .website-link {
          color: #3B82F6;
          text-decoration: underline;
        }
        .billing-and-job-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          gap: 40px;
        }
        .billing-section {
          flex: 1;
          max-width: 45%;
        }
        .billed-to-details {
          margin-top: 10px;
        }
        .billed-line {
          margin-bottom: 2px;
          min-height: 20px;
          padding-bottom: 4px;
        }
        .underline {
          height: 1px;
          background-color: black;
          margin-bottom: 8px;
          width: 100%;
        }
        .job-info-section {
          flex: 1;
          max-width: 50%;
        }
        .job-row {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          position: relative;
        }
        .job-label {
          font-weight: bold;
          margin-right: 20px;
          min-width: 120px;
        }
        .job-value {
          flex: 1;
          padding-bottom: 2px;
        }
        .job-underline {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 140px;
          height: 1px;
          background-color: black;
        }
        h2.section-header {
          font-weight: bold;
          font-size: 12pt;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .wall-specifications {
          line-height: 1.15;
          max-width: 7.25in;
        }
        .acceptance-section {
          font-size: 9pt;
          font-style: italic;
          margin-top: 2em;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        td {
          padding: 4px 8px;
        }
        strong {
          font-weight: bold;
        }
        ol, ul {
          margin: 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 4px;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(tempDiv);

      try {
        // Use the exact same rendering logic as standard downloadPDF
        const html2canvas = (await import('html2canvas')).default;
        
        // Check if content has page structure
        const pageElements = tempDiv.querySelectorAll('.page');
        
        if (pageElements.length > 0) {
          // Handle multi-page content
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          for (let i = 0; i < pageElements.length; i++) {
            const pageElement = pageElements[i] as HTMLElement;
            
            const canvas = await html2canvas(pageElement, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              width: 816, // 8.5 inches at 96 DPI
              height: 1056 // 11 inches at 96 DPI
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdfWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (i > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
          }
          
          // Use consistent naming with version tracking
          const currentVersion = editingQuote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_customized.pdf`;
          pdf.save(fileName);
        } else {
          // Single page fallback (same as standard)
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: tempDiv.scrollWidth,
            height: tempDiv.scrollHeight
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth - 20;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 10;

          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight - 20;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight - 20;
          }

          // Use consistent naming with version tracking
          const currentVersion = editingQuote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_customized.pdf`;
          pdf.save(fileName);
        }
      } catch (canvasError) {
        console.error('Canvas rendering failed, falling back to text PDF:', canvasError);
        
        // Same fallback logic as standard downloadPDF
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const plainText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        const splitText = doc.splitTextToSize(plainText, 180);
        doc.setFontSize(10);
        let y = 20;
        const lineHeight = 5;
        
        splitText.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 15, y);
          y += lineHeight;
        });
        
        const currentVersion = editingQuote.version || 1;
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-CA');
        
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Version: ${currentVersion} (Customized)`, 15, 290);
        
        const fileName = `${quoteName}_v${currentVersion}_${dateStr}_customized.pdf`;
        doc.save(fileName);
      }
      
      // Clean up DOM elements
      document.body.removeChild(tempDiv);
      document.head.removeChild(style);
      
      // Mark as downloaded (consistent with standard download)
      await markAsDownloaded(editingQuote.id);
      
      toast({
        title: "PDF Downloaded",
        description: `Customized quote ${editingQuote.proposal_number} has been downloaded successfully.`,
      });
      
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Smart PDF generation that avoids page boundary content duplication
  const downloadSmartPDF = async (quote: Quote) => {
    if (!quote.quote_details?.quoteName && !quote.project_name) {
      toast({
        title: "PDF Download Failed",
        description: "Quote name is required for PDF generation",
        variant: "destructive"
      });
      return;
    }

    try {
      const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
      
      const rawQuoteText = generateQuoteText(quote);
      
      // Use existing PAGE BREAK MANAGER but render in two smart chunks
      const { PageBreakManager } = await import('@/utils/pageBreakManager');
      const manager = new PageBreakManager();
      let quoteText = manager.processHTMLContent(rawQuoteText);
      
      if (!quoteText.includes('class="page"')) {
        quoteText = rawQuoteText; // Use original if no page processing
      }

      // Create the styled container exactly like your working PDF
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = quoteText;
      tempDiv.style.cssText = `
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.15;
        width: 7in;
        margin: 0 auto;
        padding: 20px;
        color: black;
        background: white;
      `;

      // Use the EXACT same styles as your working PDF
      const style = document.createElement('style');
      style.textContent = `
        .quote-container {
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.15;
          width: 7in;
          margin: 0 auto;
          color: black;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
        }
        .company-info {
          flex: 1;
          max-width: 40%;
        }
        .company-logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .contact-details {
          flex: 1;
          max-width: 55%;
          text-align: right;
        }
        .contact-row {
          margin-bottom: 2px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          line-height: 1.1;
        }
        .contact-row .label {
          font-weight: bold;
          margin-right: 8px;
          min-width: 80px;
          text-align: right;
        }
        .contact-row .value {
          text-align: left;
          flex: 1;
        }
        .billing-job-container {
          display: flex;
          gap: 40px;
          align-items: flex-start;
          margin-top: -40px;
          margin-bottom: 30px;
        }
        .billing-table {
          width: 30%;
        }
        .job-info-section {
          flex-grow: 1;
          margin-left: 175px;
        }
        h2.section-header {
          font-weight: bold;
          font-size: 12pt;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        table td, table th {
          border: 0.5px solid black;
          padding: 8px;
          text-align: left;
        }
        .pricing-section {
          margin-top: 10px;
        }
        .pricing-section table {
          width: 90%;
        }
        .terms-section {
          margin-top: 2em;
        }
        .terms-section ol {
          margin: 0;
          padding-left: 20px;
        }
        .terms-section li {
          margin-bottom: 4px;
        }
        .proposal-intro {
          line-height: 1.2;
          margin-top: 12px;
          margin-bottom: 1em;
        }
        .wall-specifications-list {
          line-height: 1.15;
          margin-top: 10px;
          margin-bottom: 1em;
        }
        .panels-section, .track-section, .support-section, .general-section {
          line-height: 1.15;
          margin-bottom: 1em;
        }
        .acceptance-section {
          font-size: 9pt;
          font-style: italic;
          margin-top: 2em;
          line-height: 1.2;
        }
        .signature-section {
          margin-top: 1em;
        }
        strong {
          font-weight: bold;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(tempDiv);

      const html2canvas = (await import('html2canvas')).default;
      
      // Measure total content height to decide where to break
      const totalHeight = tempDiv.scrollHeight;
      const pageHeight = 1056; // 11 inches at 96 DPI
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (totalHeight <= pageHeight) {
        // Fits on one page
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: tempDiv.scrollWidth,
          height: tempDiv.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
      } else {
        // Smart two-page split with content preservation
        let content = tempDiv.innerHTML;
        
        // Debug: Log the content to ensure all sections are present
        console.log('🔍 Smart PDF Raw Content Preview:', content.substring(0, 500) + '...');
        
        // Check for critical sections
        const hasProposalIntro = content.includes('proposal-intro') || content.includes('Thank you for considering');
        const hasWallTable = content.includes('wall-specifications') || content.includes('Specifications as follows');
        const hasAcceptanceSection = content.includes('acceptance-section') || content.includes('ACCEPTANCE OF PROPOSAL');
        
        console.log('🔍 Content check:', { hasProposalIntro, hasWallTable, hasAcceptanceSection });
        
        // If content is missing critical sections, regenerate
        if (!hasProposalIntro || !hasWallTable || !hasAcceptanceSection) {
          console.warn('⚠️ Missing critical sections, regenerating quote content...');
          const { generateQuoteText: freshGenerateQuoteText } = await import('@/components/QuoteTextGenerator');
          const freshQuoteText = freshGenerateQuoteText(quote);
          tempDiv.innerHTML = freshQuoteText;
          content = tempDiv.innerHTML;
        }
        
        // Find logical break points for 2-page split
        const sections = [
          'header-section',
          'billing-job-container', 
          'proposal-intro',
          'wall-specifications',
          'panels-section',
          'track-section',
          'support-section',
          'general-section',
          'pricing-section',
          'terms-section',
          'acceptance-section'
        ];
        
        // Split content intelligently around pricing section (good break point)
        const pricingSectionIndex = content.indexOf('pricing-section');
        let page1Content = document.createElement('div');
        let page2Content = document.createElement('div');
        
        // Copy styles to new containers
        page1Content.style.cssText = tempDiv.style.cssText;
        page2Content.style.cssText = tempDiv.style.cssText;
        
        if (pricingSectionIndex > 0) {
          // Split at pricing section - everything before goes to page 1, pricing and after goes to page 2
          const beforePricing = content.substring(0, pricingSectionIndex);
          const fromPricing = content.substring(pricingSectionIndex);
          
          // Find the start of the pricing div
          const pricingDivStart = fromPricing.indexOf('<div class="pricing-section"');
          if (pricingDivStart >= 0) {
            const page1HTML = beforePricing + fromPricing.substring(0, pricingDivStart);
            const page2HTML = fromPricing.substring(pricingDivStart);
            
            page1Content.innerHTML = page1HTML;
            page2Content.innerHTML = page2HTML;
            
            console.log('📄 Page 1 content length:', page1HTML.length);
            console.log('📄 Page 2 content length:', page2HTML.length);
            console.log('📄 Page 1 has acceptance:', page1HTML.includes('ACCEPTANCE OF PROPOSAL'));
            console.log('📄 Page 2 has acceptance:', page2HTML.includes('ACCEPTANCE OF PROPOSAL'));
          } else {
            // Fallback: split roughly in half
            const midPoint = Math.floor(content.length / 2);
            page1Content.innerHTML = content.substring(0, midPoint);
            page2Content.innerHTML = content.substring(midPoint);
          }
        } else {
          // Fallback: split roughly in half if no pricing section found
          const midPoint = Math.floor(content.length / 2);
          page1Content.innerHTML = content.substring(0, midPoint);
          page2Content.innerHTML = content.substring(midPoint);
        }

        // Render page 1
        document.body.appendChild(page1Content);
        const canvas1 = await html2canvas(page1Content, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: page1Content.scrollWidth,
          height: Math.min(page1Content.scrollHeight, pageHeight)
        });
        const imgData1 = canvas1.toDataURL('image/png');
        const imgWidth = pdfWidth - 20;
        const imgHeight1 = (canvas1.height * imgWidth) / canvas1.width;
        pdf.addImage(imgData1, 'PNG', 10, 10, imgWidth, Math.min(imgHeight1, pdfHeight - 20));
        document.body.removeChild(page1Content);

        // Render page 2
        pdf.addPage();
        document.body.appendChild(page2Content);
        const canvas2 = await html2canvas(page2Content, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: page2Content.scrollWidth,
          height: Math.min(page2Content.scrollHeight, pageHeight)
        });
        const imgData2 = canvas2.toDataURL('image/png');
        const imgHeight2 = (canvas2.height * imgWidth) / canvas2.width;
        pdf.addImage(imgData2, 'PNG', 10, 10, imgWidth, Math.min(imgHeight2, pdfHeight - 20));
        document.body.removeChild(page2Content);
      }
      
      // Clean up
      document.body.removeChild(tempDiv);
      document.head.removeChild(style);

      // Save PDF
      const currentVersion = quote.version || 1;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA');
      const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
      
      const fileName = `${quoteName}_v${currentVersion}_${dateStr}_smart.pdf`;
      pdf.save(fileName);
      
      await markAsDownloaded(quote.id);
      
      toast({
        title: "Smart PDF Downloaded",
        description: `Quote ${quote.proposal_number} generated with intelligent page breaks.`,
      });

    } catch (error) {
      console.error('Smart PDF generation failed:', error);
      toast({
        title: "PDF Download Failed",
        description: "Unable to generate smart PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadPDF = async (quote: Quote) => {
    if (!quote.quote_details?.quoteName && !quote.project_name) {
      toast({
        title: "PDF Download Failed",
        description: "Quote name is required for PDF generation",
        variant: "destructive"
      });
      return;
    }

    try {
      const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
      const { PageBreakManager } = await import('@/utils/pageBreakManager');
     
      const rawQuoteText = generateQuoteText(quote);
      const manager = new PageBreakManager();
      let quoteText = manager.processHTMLContent(rawQuoteText);
      
      // If no page structure was created, force create a single page wrapper
      if (!quoteText.includes('class="page"')) {
        quoteText = `<div class="page" data-page="1"><div class="page-content">${rawQuoteText}</div></div>`;
      }
      

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = quoteText;
      tempDiv.style.cssText = `
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.15;
        width: 7in;
        margin: 0 auto;
        padding: 20px;
        color: black;
        background: white;
      `;

      // Add enhanced styles for the header layout
      const style = document.createElement('style');
      style.textContent = `
        .quote-container {
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.15;
          width: 7in;
          margin: 0 auto;
          color: black;
        }
        
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
        }
        
        .company-info {
          flex: 1;
          max-width: 40%;
        }
        
        .company-logo {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo-placeholder {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3B82F6, #F59E0B);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16pt;
          border-radius: 8px;
        }
        
        .company-name {
          font-size: 14pt;
          font-weight: bold;
          color: #333;
          line-height: 1.2;
        }
        
        .contact-details {
          flex: 1;
          max-width: 55%;
          text-align: right;
        }
        
        .contact-row {
          margin-bottom: 2px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          line-height: 1.1;
        }
        
        .contact-row .label {
          font-weight: bold;
          margin-right: 8px;
          min-width: 80px;
          text-align: right;
        }
        
        .contact-row .value {
          text-align: left;
          flex: 1;
        }
        
        .website-link {
          color: #3B82F6;
          text-decoration: underline;
        }
        
        .billing-and-job-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          gap: 40px;
        }
        
        .billing-section {
          flex: 1;
          max-width: 45%;
        }
        
        .billed-to-details {
          margin-top: 10px;
        }
        
        .billed-line {
          margin-bottom: 2px;
          min-height: 20px;
          padding-bottom: 4px;
        }
        
        .underline {
          height: 1px;
          background-color: black;
          margin-bottom: 8px;
          width: 100%;
        }
        
        .job-info-section {
          flex: 1;
          max-width: 50%;
        }
        
        .job-row {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          position: relative;
        }
        
        .job-label {
          font-weight: bold;
          margin-right: 20px;
          min-width: 120px;
        }
        
        .job-value {
          flex: 1;
          padding-bottom: 2px;
        }
        
        .job-underline {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 140px;
          height: 1px;
          background-color: black;
        }
        
        h2.section-header {
          font-weight: bold;
          font-size: 12pt;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .wall-specifications {
          line-height: 1.15;
          max-width: 7.25in;
        }
        
        .acceptance-section {
          font-size: 9pt;
          font-style: italic;
          margin-top: 2em;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
        }
        
        td {
          padding: 4px 8px;
        }
        
        strong {
          font-weight: bold;
        }
        
        ol, ul {
          margin: 0;
          padding-left: 20px;
        }
        
        li {
          margin-bottom: 4px;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(tempDiv);

      try {
        // Try HTML-to-canvas rendering first with enhanced page support
        const html2canvas = (await import('html2canvas')).default;
        
        // Check if content has page structure
        const pageElements = tempDiv.querySelectorAll('.page');
        
        if (pageElements.length > 0) {
          // Handle multi-page content
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          for (let i = 0; i < pageElements.length; i++) {
            const pageElement = pageElements[i] as HTMLElement;
            
            const canvas = await html2canvas(pageElement, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              width: 816, // 8.5 inches at 96 DPI
              height: 1056 // 11 inches at 96 DPI
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdfWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (i > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
          }
          
          // Save the PDF
          const currentVersion = quote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
          
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
          pdf.save(fileName);
          
          toast({
            title: "PDF Downloaded",
            description: `Quote ${quote.proposal_number} has been downloaded successfully.`,
          });
        } else {
          // Single page fallback
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: tempDiv.scrollWidth,
            height: tempDiv.scrollHeight
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth - 20;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 10;

          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight - 20;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight - 20;
          }

          // Use current version (starts at 1) and increment after download
          const currentVersion = quote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
          
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
          pdf.save(fileName);
          
          toast({
            title: "PDF Downloaded",
            description: `Quote ${quote.proposal_number} has been downloaded successfully.`,
          });
        }
      } catch (canvasError) {
        console.error('Canvas rendering failed, falling back to text PDF:', canvasError);
        
        // Fallback to text-based PDF if HTML rendering fails
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const plainText = rawQuoteText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        const splitText = doc.splitTextToSize(plainText, 180);
        doc.setFontSize(10);
        let y = 20;
        const lineHeight = 5;
        
        splitText.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 15, y);
          y += lineHeight;
        });
        
        const currentVersion = quote.version || 1;
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-CA');
        const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
        
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Version: ${currentVersion}`, 15, 290);
        
        const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
        doc.save(fileName);
        
        toast({
          title: "PDF Downloaded",
          description: `Quote ${quote.proposal_number} has been downloaded (fallback mode).`,
        });
      }
      
      // Clean up DOM elements
      document.body.removeChild(tempDiv);
      document.head.removeChild(style);
      
      // Mark as downloaded (will increment version for next download)
      await markAsDownloaded(quote.id);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      // Final fallback to simple text PDF
    try {
      const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
      const { PageBreakManager } = await import('@/utils/pageBreakManager');
      const rawQuoteText = generateQuoteText(quote);
      const manager = new PageBreakManager();
      let quoteText = manager.processHTMLContent(rawQuoteText);
      
      // If no page structure was created, use original content for text fallback
      if (!quoteText.includes('class="page"')) {
        quoteText = rawQuoteText;
      }
        
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const plainText = quoteText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        const splitText = doc.splitTextToSize(plainText, 180);
        doc.setFontSize(10);
        let y = 20;
        const lineHeight = 5;
        
        splitText.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 15, y);
          y += lineHeight;
        });
        
        const currentVersion = quote.version || 1;
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-CA');
        const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
        
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Version: ${currentVersion}`, 15, 290);
        
        const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
        doc.save(fileName);
        
        // Mark as downloaded (will increment version for next download)
        await markAsDownloaded(quote.id);
        
        toast({
          title: "PDF Downloaded",
          description: `Quote ${quote.proposal_number} has been downloaded (fallback mode).`,
        });
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        toast({
          title: "PDF Download Failed",
          description: "Unable to generate PDF. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Helper function to analyze HTML layout structure
  const analyzeHTMLLayout = (element: HTMLElement) => {
    const analysis = {
      header: null as any,
      billing: null as any,
      sections: [] as any[],
      tables: [] as any[],
      pricing: null as any,
      terms: null as any
    };

    // Analyze header section
    const headerSection = element.querySelector('.header-section');
    if (headerSection) {
      const companyInfo = headerSection.querySelector('.company-info');
      const contactDetails = headerSection.querySelector('.contact-details');
      analysis.header = {
        company: companyInfo?.textContent?.trim() || '',
        contact: Array.from(contactDetails?.querySelectorAll('.contact-row') || []).map(row => ({
          label: row.querySelector('.label')?.textContent?.trim() || '',
          value: row.querySelector('.value')?.textContent?.trim() || ''
        }))
      };
    }

    // Analyze billing/job info
    const billingContainer = element.querySelector('.billing-job-container');
    if (billingContainer) {
      const billingTable = billingContainer.querySelector('.billing-table');
      const jobInfo = billingContainer.querySelector('.job-info-section');
      analysis.billing = {
        billedTo: Array.from(billingTable?.querySelectorAll('td') || []).map(td => td.textContent?.trim() || ''),
        jobInfo: Array.from(jobInfo?.querySelectorAll('tr') || []).map(tr => ({
          label: tr.querySelector('td:first-child')?.textContent?.trim() || '',
          value: tr.querySelector('td:last-child')?.textContent?.trim() || ''
        }))
      };
    }

    // Analyze section headers and content
    const sectionHeaders = element.querySelectorAll('h2.section-header, .section-header');
    sectionHeaders.forEach(header => {
      let content = '';
      let nextElement = header.nextElementSibling;
      while (nextElement && !nextElement.matches('h2.section-header, .section-header')) {
        content += nextElement.textContent || '';
        nextElement = nextElement.nextElementSibling;
      }
      analysis.sections.push({
        title: header.textContent?.trim() || '',
        content: content.trim()
      });
    });

    // Analyze tables
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
        Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '')
      );
      analysis.tables.push({ rows });
    });

    // Analyze pricing section
    const pricingSection = element.querySelector('.pricing-section');
    if (pricingSection) {
      const pricingTable = pricingSection.querySelector('table');
      if (pricingTable) {
        analysis.pricing = {
          rows: Array.from(pricingTable.querySelectorAll('tr')).map(tr => 
            Array.from(tr.querySelectorAll('td')).map(cell => cell.textContent?.trim() || '')
          )
        };
      }
    }

    // Analyze terms section
    const termsSection = element.querySelector('.terms-section');
    if (termsSection) {
      const listItems = Array.from(termsSection.querySelectorAll('li')).map(li => li.textContent?.trim() || '');
      analysis.terms = { items: listItems };
    }

    return analysis;
  };

  // Helper function to create DOCX elements from layout analysis
  const createDOCXFromLayout = async (layout: any, docx: any, rawHTML: string) => {
    const elements = [];

    // Create header section with proper layout
    if (layout.header) {
      // Company info (left side)
      elements.push(new docx.Paragraph({
        children: [new docx.TextRun({
          text: "Contemporary Wall Systems",
          font: "Times New Roman",
          size: 28,
          bold: true
        })]
      }));

      // Contact details (right-aligned)
      layout.header.contact.forEach((contact: any) => {
        elements.push(new docx.Paragraph({
          alignment: docx.AlignmentType.RIGHT,
          children: [
            new docx.TextRun({
              text: `${contact.label} `,
              font: "Times New Roman",
              size: 24,
              bold: true
            }),
            new docx.TextRun({
              text: contact.value,
              font: "Times New Roman",
              size: 24
            })
          ]
        }));
      });

      elements.push(new docx.Paragraph({ children: [new docx.TextRun("")] })); // Spacing
    }

    // Create billing/job info section
    if (layout.billing) {
      // Billed To section
      elements.push(new docx.Paragraph({
        children: [new docx.TextRun({
          text: "BILLED TO:",
          font: "Times New Roman",
          size: 24,
          bold: true
        })]
      }));

      layout.billing.billedTo.forEach((line: string) => {
        if (line.trim()) {
          elements.push(new docx.Paragraph({
            children: [new docx.TextRun({
              text: line,
              font: "Times New Roman",
              size: 24
            })],
            border: {
              bottom: {
                color: "000000",
                size: 1,
                style: docx.BorderStyle.SINGLE
              }
            }
          }));
        }
      });

      // Job info section (right side)
      layout.billing.jobInfo.forEach((info: any) => {
        if (info.label && info.value) {
          elements.push(new docx.Paragraph({
            alignment: docx.AlignmentType.RIGHT,
            children: [
              new docx.TextRun({
                text: `${info.label} `,
                font: "Times New Roman",
                size: 24,
                bold: true
              }),
              new docx.TextRun({
                text: info.value,
                font: "Times New Roman",
                size: 24
              })
            ],
            border: {
              bottom: {
                color: "000000",
                size: 1,
                style: docx.BorderStyle.SINGLE
              }
            }
          }));
        }
      });

      elements.push(new docx.Paragraph({ children: [new docx.TextRun("")] })); // Spacing
    }

    // Create section headers and content
    layout.sections.forEach((section: any) => {
      elements.push(new docx.Paragraph({
        children: [new docx.TextRun({
          text: section.title,
          font: "Times New Roman",
          size: 24,
          bold: true
        })],
        spacing: { before: 360, after: 180 }
      }));

      if (section.content) {
        elements.push(new docx.Paragraph({
          children: [new docx.TextRun({
            text: section.content,
            font: "Times New Roman",
            size: 24
          })],
          spacing: { before: 120, after: 120 }
        }));
      }
    });

    // Create tables with proper borders
    layout.tables.forEach((tableData: any) => {
      if (tableData.rows.length > 0) {
        const table = new docx.Table({
          rows: tableData.rows.map((rowData: string[]) => new docx.TableRow({
            children: rowData.map(cellData => new docx.TableCell({
              children: [new docx.Paragraph({
                children: [new docx.TextRun({
                  text: cellData,
                  font: "Times New Roman",
                  size: 24
                })]
              })],
              borders: {
                top: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                left: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" }
              }
            }))
          }))
        });
        elements.push(table);
        elements.push(new docx.Paragraph({ children: [new docx.TextRun("")] })); // Spacing
      }
    });

    // Create pricing section as table
    if (layout.pricing) {
      const pricingTable = new docx.Table({
        width: { size: 90, type: docx.WidthType.PERCENTAGE },
        rows: layout.pricing.rows.map((rowData: string[]) => new docx.TableRow({
          children: rowData.map((cellData, index) => new docx.TableCell({
            children: [new docx.Paragraph({
              children: [new docx.TextRun({
                text: cellData,
                font: "Times New Roman",
                size: 24,
                bold: true
              })],
              alignment: index === rowData.length - 1 ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT
            })],
            borders: {
              top: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" }
            }
          }))
        }))
      });
      elements.push(pricingTable);
      elements.push(new docx.Paragraph({ children: [new docx.TextRun("")] })); // Spacing
    }

    // Create terms section as numbered list
    if (layout.terms) {
      elements.push(new docx.Paragraph({
        children: [new docx.TextRun({
          text: "General Notes and Terms:",
          font: "Times New Roman",
          size: 24,
          bold: true
        })],
        spacing: { before: 360, after: 180 }
      }));

      layout.terms.items.forEach((item: string, index: number) => {
        elements.push(new docx.Paragraph({
          children: [new docx.TextRun({
            text: `${index + 1}. ${item}`,
            font: "Times New Roman",
            size: 24
          })],
          indent: { left: 720 },
          spacing: { after: 120 }
        }));
      });
    }

    return elements;
  };

  const downloadDOCX = async (quote: Quote) => {
    if (!quote.quote_details?.quoteName && !quote.project_name) {
      toast({
        title: "DOCX Download Failed",
        description: "Quote name is required for DOCX generation",
        variant: "destructive"
      });
      return;
    }

    try {
      const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
      
      const rawQuoteText = generateQuoteText(quote);
      
      // Create enhanced HTML structure that matches PDF styling exactly
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Quote ${quote.proposal_number}</title>
          <style>
            @page {
              size: A4;
              margin: 1in 0.75in;
            }
            body {
              font-family: "Times New Roman", serif;
              font-size: 12pt;
              line-height: 1.15;
              color: black;
              width: 7in;
              margin: 0 auto;
              padding: 0;
            }
            .header-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 20px;
              page-break-inside: avoid;
            }
            .company-info {
              flex: 1;
              max-width: 40%;
            }
            .company-logo img {
              height: 80px;
              width: auto;
              max-width: 200px;
              object-fit: contain;
            }
            .contact-details {
              flex: 1;
              max-width: 55%;
              text-align: right;
              margin-left: 150px;
            }
            .contact-row {
              margin-bottom: 2px;
              display: flex;
              justify-content: flex-end;
              align-items: center;
              line-height: 1.1;
            }
            .contact-row .label {
              font-weight: bold;
              margin-right: 8px;
              min-width: 80px;
              text-align: right;
              display: inline-block;
            }
            .contact-row .value {
              text-align: left;
              flex: 1;
            }
            .billing-job-container {
              display: flex;
              gap: 40px;
              align-items: flex-start;
              margin-top: -40px;
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .billing-table {
              width: 30%;
            }
            .job-info-section {
              flex-grow: 1;
              margin-left: 175px;
            }
            h2.section-header {
              font-weight: bold;
              font-size: 12pt;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              page-break-after: avoid;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 1em;
              page-break-inside: avoid;
            }
            table td, table th {
              border: 0.5px solid black;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            .pricing-section {
              margin-top: 10px;
              page-break-inside: avoid;
            }
            .pricing-section table {
              width: 90%;
            }
            .terms-section {
              page-break-inside: avoid;
            }
            .terms-section ol {
              margin: 0;
              padding-left: 20px;
            }
            .terms-section li {
              margin-bottom: 4px;
              page-break-inside: avoid;
            }
            .acceptance-section {
              font-size: 9pt;
              font-style: italic;
              margin-top: 2em;
              line-height: 1.2;
              page-break-inside: avoid;
            }
            .signature-section {
              margin-top: 1em;
              page-break-inside: avoid;
            }
            strong {
              font-weight: bold;
            }
            .wall-specifications {
              line-height: 1.15;
              max-width: 7.25in;
            }
            .page-break-avoid {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${rawQuoteText}
        </body>
        </html>
      `;

      // Create filename first
      const currentVersion = quote.version || 1;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA');
      const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
      const fileName = `${quoteName}_v${currentVersion}_${dateStr}.docx`;

      // TRUE HYBRID APPROACH: Generate PDF → Analyze Layout → Recreate in DOCX
      try {
        const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
        const { PageBreakManager } = await import('@/utils/pageBreakManager');
        
        const rawQuoteText = generateQuoteText(quote);
        const manager = new PageBreakManager();
        let quoteText = manager.processHTMLContent(rawQuoteText);
        
        if (!quoteText.includes('class="page"')) {
          quoteText = `<div class="page" data-page="1"><div class="page-content">${rawQuoteText}</div></div>`;
        }

        // Step 1: Generate PDF using your proven method
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = quoteText;
        tempDiv.style.cssText = `
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.15;
          width: 7in;
          margin: 0 auto;
          padding: 20px;
          color: black;
          background: white;
        `;

        const style = document.createElement('style');
        style.textContent = `
          .quote-container { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.15; width: 7in; margin: 0 auto; color: black; }
          .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; }
          .contact-details { flex: 1; max-width: 55%; text-align: right; }
          h2.section-header { font-weight: bold; font-size: 12pt; margin-top: 1.5em; margin-bottom: 0.5em; }
          table { border-collapse: collapse; width: 100%; }
          td { padding: 4px 8px; border: 0.5px solid black; }
          strong { font-weight: bold; }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(tempDiv);

        const html2canvas = (await import('html2canvas')).default;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: tempDiv.scrollWidth,
          height: tempDiv.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
        const pdfBlob = pdf.output('blob');
        
        // Step 2: Analyze HTML structure for layout preservation
        const layoutAnalysis = analyzeHTMLLayout(tempDiv);
        
        // Clean up DOM
        document.body.removeChild(tempDiv);
        document.head.removeChild(style);

        // Step 3: Create DOCX with preserved layout structure
        const docx = await import('docx');
        const docElements = await createDOCXFromLayout(layoutAnalysis, docx, rawQuoteText);
        
        const doc = new docx.Document({
          sections: [{
            properties: {
              page: {
                margin: {
                  top: 720,  // 0.5 inch
                  right: 720,
                  bottom: 720,
                  left: 720,
                },
                size: {
                  orientation: docx.PageOrientation.PORTRAIT,
                  width: 12240, // 8.5 inches
                  height: 15840, // 11 inches
                },
              },
            },
            children: docElements
          }]
        });

        const docxBlob = await docx.Packer.toBlob(doc);
        
        // Download DOCX
        const url = URL.createObjectURL(docxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

      } catch (conversionError) {
        console.error('Hybrid PDF-to-DOCX conversion failed:', conversionError);
        throw conversionError;
      }

      // Mark as downloaded (will increment version for next download)
      await markAsDownloaded(quote.id);

      toast({
        title: "DOCX Downloaded",
        description: `Quote ${quote.proposal_number} has been converted from PDF to DOCX successfully.`,
      });

    } catch (error) {
      console.error('Error downloading DOCX:', error);
      toast({
        title: "DOCX Download Failed",
        description: "Unable to generate DOCX. Please try again.",
        variant: "destructive"
      });
    }
  };
  //     const tempDiv = document.createElement('div');
  //     tempDiv.innerHTML = quoteText;
  //     tempDiv.style.cssText = `
  //       font-family: "Times New Roman", serif;
  //       font-size: 12pt;
  //       line-height: 1.15;
  //       width: 7in;
  //       margin: 0 auto;
  //       padding: 20px;
  //       color: black;
  //       background: white;
  //     `;

  //     // document.body.appendChild(tempDiv);

  //     try {
  //       const html2canvas = (await import('html2canvas')).default;
  //       const pageElements = tempDiv.querySelectorAll('.page');
        
  //       if (pageElements.length > 0) {
  //         const pdf = new jsPDF('p', 'mm', 'a4');
  //         const pdfWidth = pdf.internal.pageSize.getWidth();
  //         const pdfHeight = pdf.internal.pageSize.getHeight();
          
  //         for (let i = 0; i < pageElements.length; i++) {
  //           const pageElement = pageElements[i] as HTMLElement;
            
  //           const canvas = await html2canvas(pageElement, {
  //             scale: 2,
  //             useCORS: true,
  //             backgroundColor: '#ffffff',
  //             width: 816,
  //             height: 1056
  //           });

  //           const imgData = canvas.toDataURL('image/png');
  //           const imgWidth = pdfWidth - 20;
  //           const imgHeight = (canvas.height * imgWidth) / canvas.width;

  //           if (i > 0) {
  //             pdf.addPage();
  //           }
            
  //           pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
  //         }
          
  //         const currentVersion = quote.version || 1;
  //         const today = new Date();
  //         const dateStr = today.toLocaleDateString('en-CA');
  //         const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
          
  //         const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
  //         pdf.save(fileName);
          
  //         toast({
  //           title: "PDF Downloaded",
  //           description: `Quote ${quote.proposal_number} has been downloaded successfully.`,
  //         });
  //       }
  //     } catch (canvasError) {
  //       console.error('Canvas rendering failed:', canvasError);
  //       toast({
  //         title: "PDF Download Failed",
  //         description: "Unable to generate PDF. Please try again.",
  //         variant: "destructive"
  //       });
  //     }
      
  //     document.body.removeChild(tempDiv);
  //     await markAsDownloaded(quote.id);
      
  //   } catch (error) {
  //     console.error('Error downloading PDF:', error);
  //     toast({
  //       title: "PDF Download Failed",
  //       description: "Unable to generate PDF. Please try again.",
  //       variant: "destructive"
  //     });
  //   }
  // };

  // Generate beautiful monthly revenue data for line chart
  const generateMonthlyQuoteValueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthQuotes = quotes.filter(quote => {
        const quoteDate = new Date(quote.created_at);
        return quoteDate.getFullYear() === currentYear && quoteDate.getMonth() === index;
      });

      const parseCurrency = (formatted: string): number => {
        return Number(formatted.replace(/[^0-9.-]+/g, ''));
      };

      const monthlyValue = monthQuotes.reduce((sum, quote) => {
        const total = quote.price_details?.total;
        if (typeof total === 'string') {
          return sum + parseCurrency(total);
        } else if (typeof total === 'number') {
          return sum + total;
        } else {
          return sum;
        }
      }, 0);
      
      return {
        month,
        revenue: monthlyValue
      };
    });
  };

  const monthlyQuoteValueData = generateMonthlyQuoteValueData();
  const handleCreateQuote = (quoteName: string) => {
    setShowNewQuoteDialog(false);
    navigate("/newquote");
  };

  if (editingQuote) {
    return (
      <UnifiedQuoteEditor
        quote={editingQuote}
        onSave={handleUnifiedQuoteSave}
        onDownload={handleUnifiedQuoteDownload}
        onBack={() => {
          setEditingQuote(null);
          refreshQuotes();
        }}
      />
    );
  }


  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main data-testid="quotes-page" className="flex-1 flex flex-col overflow-hidden">
          {/* Floating Header */}
          <div className="p-6 pb-0">
            <header className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-lg rounded-[22px] px-6 py-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium text-lg">{currentOrganization?.name || 'Loading...'}</span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <div className="flex-1 p-6 pt-3 space-y-4 overflow-auto">

            {/* Compact Revenue Chart */}
            {/* <Card className="animate-fade-in hover:shadow-lg transition-all duration-300"> */}
              {/* <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Quoted Amount (2025)
                </CardTitle>
                <CardDescription className="text-sm">
                  Monthly Total (Potential) Revenue from quotes throughout the year
                </CardDescription>
              </CardHeader> */}
              {/* <CardContent>
                <div className="h-48">{/* Reduced from h-80 to h-48 */}
                  {/* <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyQuoteValueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`} */}
                      {/* <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, fill: '#1e40af', stroke: '#ffffff', strokeWidth: 3 }}
                        className="drop-shadow-sm"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card> */}

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search quotes by client, project, or proposal number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm h-12"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[140px] bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm h-12">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setShowNewQuoteDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale h-12"
              >
                New Quote
              </Button>
            </div>

            {/* Quotes Table with Pagination */}
            <Card className="animate-fade-in hover:shadow-lg transition-all duration-300 flex-1 flex flex-col min-h-0">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <div className={`flex-1 ${paginatedQuotes.length > 7 ? 'overflow-auto max-h-96' : ''}`}>
                  <Table>
                    <colgroup>
                      <col className="w-24" /> {/* Proposal # - Fixed */}
                      <col /> {/* Project Name - Flexible */}
                      <col /> {/* Client Name - Flexible */}
                      <col className="w-20" /> {/* Created - Fixed */}
                      <col className="w-24" /> {/* Total - Fixed */}
                      <col className="w-24" /> {/* Status - Fixed */}
                      <col className="w-16" /> {/* Actions - Fixed */}
                    </colgroup>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow className="bg-slate-50/50 h-10">
                        <TableHead className="font-semibold py-2 text-xs">Proposal #</TableHead>
                        <TableHead className="font-semibold py-2 text-xs">Project Name</TableHead>
                        <TableHead className="font-semibold py-2 text-xs">Client Name</TableHead>
                        <TableHead className="font-semibold py-2 text-xs">Created</TableHead>
                        <TableHead className="font-semibold py-2 text-xs">Total</TableHead>
                        <TableHead className="font-semibold py-2 text-xs">Status</TableHead>
                        <TableHead className="font-semibold py-2 text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuotes.map((quote) => {
                        const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client Name";
                        const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
                        const total = quote.price_details?.total || 0;
                        const projectLocation = quote.job_details?.job_location || "";

                        return (
                          <TableRow key={quote.id} className="hover:bg-slate-50/50 transition-colors h-14">
                            <TableCell className="font-medium py-2 text-sm">{quote.proposal_number}</TableCell>
                            <TableCell className="py-2">
                              <div>
                                <div className="font-medium text-sm truncate">{projectName}</div>
                                <div className="text-xs text-slate-500 truncate">{projectLocation}</div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="font-medium text-sm truncate">{clientName}</div>
                            </TableCell>
                            <TableCell className="text-slate-600 py-2 text-sm">
                              {new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </TableCell>
                            <TableCell className="font-semibold py-2 text-sm">{formatCurrency(total)}</TableCell>
                            <TableCell className="py-2">
                              <Select value={quote.status || "draft"} onValueChange={(value) => updateQuoteStatus(quote.id, value)}>
                                <SelectTrigger className={`w-22 h-7 border-0 text-xs px-2 ${statusColors[quote.status as keyof typeof statusColors]} [&>svg]:hidden`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background border shadow-lg z-50">
                                  <SelectItem value="Draft">Draft</SelectItem>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Submitted">Submitted</SelectItem>
                                  <SelectItem value="Won">Won</SelectItem>
                                  <SelectItem value="Rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => editQuote(quote)}>
                                    <Edit3 className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadSmartPDF(quote)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Smart PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadDOCX(quote)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download DOCX
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteQuoteId(quote.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedQuotes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-slate-500 text-sm">
                            {quotes.length === 0 ? "No quotes yet. Create your first quote!" : "No quotes match your search criteria."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {filteredQuotes.length > 0 && (
                  <div className="border-t bg-white p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredQuotes.length)} of {filteredQuotes.length} quotes
                      </div>
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                        <SelectTrigger className="w-[70px] bg-white border-slate-200 shadow-sm h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-7 px-3 text-xs"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-7 px-3 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteQuoteId} onOpenChange={() => setDeleteQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQuoteId && handleDeleteQuote(deleteQuoteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Quote Dialog */}
      <CreateQuoteDialog 
        open={showNewQuoteDialog}
        onOpenChange={setShowNewQuoteDialog}
        onCreateQuote={handleCreateQuote}
      />
    </SidebarProvider>
  );
};

export default Quotes;