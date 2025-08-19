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
import { AppSidebar } from "@/components/common/layout";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import jsPDF from 'jspdf';
// No imports needed for pandoc approach
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import UnifiedQuoteEditor from "@/components/features/quotes/editing/UnifiedQuoteEditor";
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

  const handleUnifiedQuoteDownload = async (html: string, isSmartPDF: boolean = false) => {
    console.log('🚀🚀🚀 handleUnifiedQuoteDownload START 🚀🚀🚀');
    console.log('📋 Parameters:', { 
      htmlLength: html?.length || 0, 
      isSmartPDF: isSmartPDF,
      htmlPreview: html?.substring(0, 100) + '...' || 'NO HTML',
      editingQuote: !!editingQuote
    });
    
    if (!editingQuote) {
      console.error('❌ No editing quote available');
      return;
    }
    
    try {
      const quoteName = editingQuote.project_name || editingQuote.proposal_number || 'quote';
      
      // Create temp div with exactly the same styling as standard PDF download
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.cssText = `
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.15;
        width: 8.5in;
        margin: 0 auto;
        padding: 48px;
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
          width: 8.5in;
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
          line-height: 1.15;
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
      
      // Position tempDiv off-screen to avoid layout shifts in the live preview
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.visibility = 'hidden';
      
      document.head.appendChild(style);
      document.body.appendChild(tempDiv);

      try {
        // Use Smart PDF logic if enabled, otherwise use standard rendering
        const html2canvas = (await import('html2canvas')).default;
        
        console.log('🚀 handleUnifiedQuoteDownload called with isSmartPDF:', isSmartPDF);
        
        if (isSmartPDF) {
          // Smart PDF mode - use the EXACT same processing as the live preview
          console.log('🔥 Smart PDF Download: Recreating preview logic exactly');
          console.log('📄 Input HTML length:', html.length);
          console.log('📄 Input HTML preview:', html.substring(0, 300) + '...');
          
          // Recreate the EXACT same Smart PDF preview logic from LivePreviewPanel
          const previewTempDiv = document.createElement('div');
          previewTempDiv.innerHTML = html; // Use raw preview HTML directly like preview does
          
          const content = previewTempDiv.innerHTML;
          const supportSectionIndex = content.indexOf('SUPPORT STRUCTURE (HEADER)');
          
          let page1HTML = '';
          let page2HTML = '';
          
          if (supportSectionIndex > 0) {
            // Find the COMPLETE Support Structure section including its content (SAME AS PREVIEW)
            const supportSectionStart = content.lastIndexOf('<div', supportSectionIndex);
            
            // Look for the END of the Support Structure section to include it on page 1
            let supportSectionEnd = supportSectionIndex;
            let searchFrom = supportSectionIndex;
            
            // Find the closing div for Support Structure section
            let openDivs = 1;
            let pos = content.indexOf('>', supportSectionStart) + 1;
            
            while (pos < content.length && openDivs > 0) {
              const nextOpenDiv = content.indexOf('<div', pos);
              const nextCloseDiv = content.indexOf('</div>', pos);
              
              if (nextCloseDiv !== -1 && (nextOpenDiv === -1 || nextCloseDiv < nextOpenDiv)) {
                openDivs--;
                pos = nextCloseDiv + 6;
                if (openDivs === 0) {
                  supportSectionEnd = pos;
                  break;
                }
              } else if (nextOpenDiv !== -1) {
                openDivs++;
                pos = nextOpenDiv + 4;
              } else {
                break;
              }
            }
            
            // Now find the next section after Support Structure for clean page 2 start
            const nextSectionStart = content.indexOf('<div class=', supportSectionEnd);
            const splitPoint = nextSectionStart > 0 ? nextSectionStart : supportSectionEnd;
            
            page1HTML = content.substring(0, splitPoint);
            page2HTML = content.substring(splitPoint);
            
            // Debug: Count approximate lines in each page (SAME AS PREVIEW)
            const page1Lines = (page1HTML.match(/<br>|<\/p>|<\/div>|<\/li>/g) || []).length;
            const page2Lines = (page2HTML.match(/<br>|<\/p>|<\/div>|<\/li>/g) || []).length;
            
            console.log('📊 Smart PDF Download Content Analysis:');
            console.log(`📄 Page 1: ~${page1Lines} line breaks, ${page1HTML.length} chars`);
            console.log(`📄 Page 2: ~${page2Lines} line breaks, ${page2HTML.length} chars`);
            console.log(`🎯 Split point: Support Structure INCLUDED on Page 1, next section starts Page 2`);
            
            // Check what sections are on each page
            const sectionsOnPage1 = (page1HTML.match(/class="[^"]*-section"/g) || []).map(s => s.match(/class="([^"]*)"/)?.[1]).filter(Boolean);
            const sectionsOnPage2 = (page2HTML.match(/class="[^"]*-section"/g) || []).map(s => s.match(/class="([^"]*)"/)?.[1]).filter(Boolean);
            
            console.log('📋 Download Page 1 sections:', sectionsOnPage1);
            console.log('📋 Download Page 2 sections:', sectionsOnPage2);
          } else {
            // Fallback: split roughly in half
            const midPoint = Math.floor(content.length / 2);
            page1HTML = content.substring(0, midPoint);
            page2HTML = content.substring(midPoint);
            console.log('📄 Smart PDF Download Fallback split at midpoint');
          }
          
          // Create PDF and render exactly like the preview - US Letter size
          const pdf = new jsPDF('p', 'mm', 'letter');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          // Render both pages using the split content
          const pageContents = [page1HTML, page2HTML];
          
          for (let pageNum = 0; pageNum < 2; pageNum++) {
            const pageHTML = pageContents[pageNum];
            
            console.log(`🔍 Smart PDF Page ${pageNum + 1} content length:`, pageHTML.length);
            console.log(`🔍 Smart PDF Page ${pageNum + 1} preview:`, pageHTML.substring(0, 200) + '...');
            
            if (!pageHTML || pageHTML.trim().length === 0) {
              console.error(`❌ Smart PDF Page ${pageNum + 1} has no content!`);
              continue;
            }
            
            // Create a container with the SAME styling approach as the preview
            const pageContainer = document.createElement('div');
            
            // Create the exact same structure as the live preview
            const documentContent = document.createElement('div');
            documentContent.className = 'quote-document';
            documentContent.innerHTML = pageHTML;
            
            // Apply page container styles to match preview dimensions
            pageContainer.style.cssText = `
              width: 816px;
              height: 1056px;
              margin: 0 auto;
              background: white;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: visible;
            `;
            
            // Apply document content styles to match preview exactly
            documentContent.style.cssText = `
              font-family: "Times New Roman", serif;
              font-size: 12pt;
              line-height: 1.15;
              padding: 48px;
              color: black;
              background: white;
              overflow: visible;
              word-wrap: break-word;
              width: 100%;
              min-height: 100%;
            `;
            
            // Append the document content to the page container
            pageContainer.appendChild(documentContent);
            
            // Add the SAME custom styles that the live preview uses
            const previewStyles = document.createElement('style');
            previewStyles.textContent = `
              /* Apply the EXACT same styles as LivePreviewPanel */
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
              .terms-section p { line-height: 1.15; margin-bottom: 4px; }
              .terms-section div { line-height: 1.15; }
              .terms-section ol li { visibility: visible; overflow: visible; }
              .terms-section ol li div { margin-top: 2px; margin-bottom: 2px; }
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
            `;
            
            // Create a completely isolated iframe to avoid any layout interference
            const renderFrame = document.createElement('iframe');
            renderFrame.style.cssText = `
              position: fixed;
              left: -9999px;
              top: -9999px;
              width: 816px;
              height: 1056px;
              visibility: hidden;
              border: none;
              z-index: -9999;
              pointer-events: none;
              opacity: 0;
            `;
            
            // Additional isolation attributes
            renderFrame.setAttribute('sandbox', 'allow-same-origin');
            renderFrame.setAttribute('scrolling', 'no');
            
            document.body.appendChild(renderFrame);
            
            if (pageNum > 0) {
              pdf.addPage();
            }
            
            try {
              // Wait for iframe to be ready
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const iframeDoc = renderFrame.contentDocument || renderFrame.contentWindow?.document;
              if (!iframeDoc) throw new Error('Could not access iframe document');
              
              // Convert any relative image URLs to absolute URLs BEFORE putting in iframe
              const tempContent = pageContainer.cloneNode(true) as HTMLElement;
              const images = tempContent.querySelectorAll('img');
              images.forEach(img => {
                if (img.src && img.src.startsWith('/')) {
                  img.src = window.location.origin + img.src;
                }
                // Also ensure the image has proper loading attributes
                img.setAttribute('crossorigin', 'anonymous');
                img.setAttribute('loading', 'eager');
              });
              
              // Set up the iframe document with all necessary styles and absolute image URLs
              iframeDoc.open();
              iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    /* Use the EXACT same CSS reset and structure as the live preview */
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { 
                      font-family: "Times New Roman", serif;
                      font-size: 12pt;
                      line-height: 1.15;
                      margin: 0;
                      padding: 0;
                      width: 816px;
                      height: 1056px;
                      background: white;
                      overflow: hidden;
                    }
                    
                    /* Match the exact container structure from live preview */
                    .quote-document {
                      font-family: "Times New Roman", serif;
                      font-size: 12pt;
                      line-height: 1.15;
                      padding: 48px;
                      color: black;
                      background: white;
                      overflow: visible;
                      word-wrap: break-word;
                      width: 100%;
                      min-height: 100%;
                    }
                    
                    /* Prevent any interaction with parent document */
                    img {
                      max-width: 100%;
                      height: auto;
                      display: block;
                    }
                    ${previewStyles.textContent}
                  </style>
                </head>
                <body>
                  ${tempContent.outerHTML}
                </body>
                </html>
              `);
              iframeDoc.close();
              
              // Wait for content to render and images to load in the isolated iframe
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Wait for all images in the iframe to load completely
              const iframeImages = Array.from(iframeDoc.querySelectorAll('img'));
              if (iframeImages.length > 0) {
                await Promise.all(iframeImages.map(img => {
                  return new Promise<void>((resolve) => {
                    if (img.complete && img.naturalWidth > 0) {
                      resolve();
                    } else {
                      const timeout = setTimeout(() => resolve(), 2000); // 2s timeout
                      img.onload = () => {
                        clearTimeout(timeout);
                        resolve();
                      };
                      img.onerror = () => {
                        clearTimeout(timeout);
                        resolve();
                      };
                    }
                  });
                }));
              }
              
              const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 816,
                height: 1056,
                foreignObjectRendering: true,
                imageTimeout: 0, // Don't wait for images in html2canvas since we already waited
                removeContainer: false // Don't remove any containers
              });
              
              const imgData = canvas.toDataURL('image/png');
              const imgWidth = pdfWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              
              pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
            } finally {
              // Clean up iframe
              document.body.removeChild(renderFrame);
            }
          }
          
          // Save Smart PDF with specific naming
          const currentVersion = editingQuote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_smart.pdf`;
          pdf.save(fileName);
          
        } else {
          // Standard PDF mode - check if content has page structure
          const pageElements = tempDiv.querySelectorAll('.page');
          
          if (pageElements.length > 0) {
            // Handle multi-page content
            const pdf = new jsPDF('p', 'mm', 'letter');
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
              const imgWidth = pdfWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;

              if (i > 0) {
                pdf.addPage();
              }
              
              pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
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
            const pdf = new jsPDF('p', 'mm', 'letter');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pdfHeight;
            }

            // Use consistent naming with version tracking
            const currentVersion = editingQuote.version || 1;
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-CA');
            
            const fileName = `${quoteName}_v${currentVersion}_${dateStr}_customized.pdf`;
            pdf.save(fileName);
          }
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
      const { generateQuoteText } = await import('@/components/features/quotes/generation/QuoteTextGenerator');
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
        width: 8.5in;
        margin: 0 auto;
        padding: 48px;
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
          width: 8.5in;
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
          line-height: 1.15;
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
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (i > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
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
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
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
      const { generateQuoteText } = await import('@/components/features/quotes/generation/QuoteTextGenerator');
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