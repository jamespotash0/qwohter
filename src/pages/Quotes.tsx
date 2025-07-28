import { useState, useEffect } from "react";
import { ArrowLeft, Search, Download, Edit, Eye, Copy, Trash2, MoreHorizontal, DollarSign, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import QuoteCreator from "@/components/QuoteCreator";
import CreateQuoteDialog from "@/components/CreateQuoteDialog";
import jsPDF from 'jspdf';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";

import { useToast } from "@/hooks/use-toast";

const Quotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    quotes,
    loading,
    updateQuote,
    deleteQuote: deleteQuoteFromDB,
    markAsDownloaded,
    createQuote,
    refreshQuotes
  } = useQuotes();

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    won: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [newQuoteName, setNewQuoteName] = useState("");

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const filteredQuotes = quotes.filter(quote => {
    // Debug logging to see the actual data structure
    console.log('Quote data structure:', quote);
    console.log('price_details type:', typeof quote.price_details, quote.price_details);
    
    const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "";
    const projectName = quote.project_name || quote.quote_details?.project_name || "";
    
    const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.proposal_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || quote.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

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
      // Import the quote text generator and smart page break utility
      const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
      const { calculateSmartPageBreak } = await import('@/utils/smartPageBreak');
      
      // Generate the full quote text with HTML and apply smart page breaks
      const rawQuoteText = generateQuoteText(quote);
      const quoteText = calculateSmartPageBreak(rawQuoteText);
      
      // Create a temporary div to render the HTML
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
      const { enhanceWithPageBreaks } = await import('@/utils/pageBreakManager');
      const rawQuoteText = generateQuoteText(quote);
      const quoteText = enhanceWithPageBreaks(rawQuoteText);
        
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

  const handleCreateQuote = (quoteName: string) => {
    setShowNewQuoteDialog(false);
    navigate("/newquote");
  };

  // If editing a quote, show the QuoteCreator
  if (editingQuote) {
    return (
      <QuoteCreator
        user="user@example.com" // This will be updated when we integrate with auth
        onLogout={async () => {
          await supabase.auth.signOut();
          navigate("/auth");
        }}
        quoteName={editingQuote.project_name || editingQuote.proposal_number}
        existingQuote={editingQuote}
        onBackToDashboard={() => {
          setEditingQuote(null);
          refreshQuotes(); // Refresh quotes data from database
        }}
        onQuoteNameChange={(newName) => {
          if (editingQuote) {
            setEditingQuote({...editingQuote, project_name: newName});
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-12 items-center relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="fixed left-4 z-50"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="mx-auto text-lg font-semibold">Quotes</h1>
          <Button 
            onClick={() => setShowNewQuoteDialog(true)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white fixed right-4 z-50"
          >
            + New Quote
          </Button>
        </div>
      </div>

      <div className="pt-4 px-8 pb-8 space-y-4">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Project Quotes</h2>
            <p className="text-sm text-muted-foreground">Manage and track quotes</p>
          </div>
        </div>

        {/* Advanced Quote Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="bg-black/5 border-black/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black/70">Total Quoted Value</p>
                  <p className="text-2xl font-bold text-black">
                    {formatCurrency(quotes.reduce((sum, quote) => {
                      try {
                        const totalAmount = quote.price_details?.total ? parseFloat(quote.price_details.total.replace(/[^0-9.-]+/g,"")) : 0;
                        return sum + totalAmount;
                      } catch (error) {
                        return sum;
                      }
                    }, 0))}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <DollarSign className="w-3 h-3 text-black/60" />
                    <span className="text-xs text-black/60">All quotes combined</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-black/70" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Average Quote Value</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(() => {
                      const totalValue = quotes.reduce((sum, quote) => {
                        try {
                          const totalAmount = quote.price_details?.total ? parseFloat(quote.price_details.total.replace(/[^0-9.-]+/g,"")) : 0;
                          return sum + totalAmount;
                        } catch (error) {
                          return sum;
                        }
                      }, 0);
                      const avgValue = quotes.length > 0 ? totalValue / quotes.length : 0;
                      return formatCurrency(avgValue);
                    })()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">Across all quotes</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-900">
                    {(() => {
                      const finalizedQuotes = quotes.filter(q => ['won', 'rejected'].includes(q.status));
                      const wonQuotes = quotes.filter(q => q.status === "won");
                      const conversionRate = finalizedQuotes.length > 0 ? (wonQuotes.length / finalizedQuotes.length) * 100 : 0;
                      return conversionRate.toFixed(1) + '%';
                    })()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-500">
                      {quotes.filter(q => q.status === "won").length} won / {quotes.filter(q => ['won', 'rejected'].includes(q.status)).length} final
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly and Yearly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Quotes Won This Month</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(() => {
                      const currentDate = new Date();
                      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                      return quotes.filter(q => {
                        // Use job_details.date if available, otherwise fall back to created_at
                        const dateToUse = q.job_details?.date ? new Date(q.job_details.date) : new Date(q.created_at);
                        return q.status === "won" && 
                               dateToUse >= startOfMonth && 
                               dateToUse <= endOfMonth;
                      }).length;
                    })()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-blue-500">This month</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600">Quotes Won This Year</p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const startOfYear = new Date(currentYear, 0, 1);
                      const endOfYear = new Date(currentYear, 11, 31);
                      return quotes.filter(q => {
                        // Use job_details.date if available, otherwise fall back to created_at
                        const dateToUse = q.job_details?.date ? new Date(q.job_details.date) : new Date(q.created_at);
                        return q.status === "won" && 
                               dateToUse >= startOfYear && 
                               dateToUse <= endOfYear;
                      }).length;
                    })()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs text-indigo-500">Jan 1 - Dec 31</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Quotes This Month</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(() => {
                      const currentDate = new Date();
                      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                      return quotes.filter(q => {
                        // Use job_details.date if available, otherwise fall back to created_at
                        const dateToUse = q.job_details?.date ? new Date(q.job_details.date) : new Date(q.created_at);
                        return dateToUse >= startOfMonth && dateToUse <= endOfMonth;
                      }).length;
                    })()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">This month</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Quotes This Year</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const startOfYear = new Date(currentYear, 0, 1);
                      const endOfYear = new Date(currentYear, 11, 31);
                      return quotes.filter(q => {
                        // Use job_details.date if available, otherwise fall back to created_at
                        const dateToUse = q.job_details?.date ? new Date(q.job_details.date) : new Date(q.created_at);
                        return dateToUse >= startOfYear && dateToUse <= endOfYear;
                      }).length;
                    })()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Jan 1 - Dec 31</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Won/Rejected Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Won Quotes</p>
                  <p className="text-2xl font-bold text-green-900">{quotes.filter(q => q.status === "won").length}</p>
                  <p className="text-xs text-green-500 mt-1">
                    Total value: {formatCurrency(quotes.filter(q => q.status === "won").reduce((sum, q) => {
                      try {
                        const totalAmount = q.price_details?.total ? parseFloat(q.price_details.total.replace(/[^0-9.-]+/g,"")) : 0;
                        return sum + totalAmount;
                      } catch (error) {
                        return sum;
                      }
                    }, 0))}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Rejected Quotes</p>
                  <p className="text-2xl font-bold text-red-900">{quotes.filter(q => q.status === "rejected").length}</p>
                  <p className="text-xs text-red-500 mt-1">
                    Total value: {formatCurrency(quotes.filter(q => q.status === "rejected").reduce((sum, q) => {
                      try {
                        const totalAmount = q.price_details?.total ? parseFloat(q.price_details.total.replace(/[^0-9.-]+/g,"")) : 0;
                        return sum + totalAmount;
                      } catch (error) {
                        return sum;
                      }
                    }, 0))}
                  </p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes, clients, or proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quotes Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="py-2 px-3 text-xs font-medium">Proposal #</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-medium">Client</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-medium">Project</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-medium">Amount</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-medium">Status</TableHead>
                  <TableHead className="py-2 px-3 text-xs font-medium">Date</TableHead>
                  <TableHead className="w-[40px] py-2 px-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Loading quotes...</TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">No quotes found</TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => {
                     const totalAmount = (() => {
                       try {
                         return quote.price_details?.total ? parseFloat(quote.price_details.total.replace(/[^0-9.-]+/g,"")) : 0;
                       } catch (error) {
                         console.error('Error processing quote amount:', error, quote.price_details);
                         return 0;
                       }
                     })();
                    
                    return (
                      <TableRow key={quote.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-2 px-3 text-sm">{quote.proposal_number}</TableCell>
                        <TableCell className="py-2 px-3 text-sm">{quote.job_details?.client_company || quote.job_details?.client_name || 'N/A'}</TableCell>
                        <TableCell className="py-2 px-3 text-sm">{quote.project_name || 'N/A'}</TableCell>
                        <TableCell className="py-2 px-3 text-sm font-medium">{formatCurrency(totalAmount)}</TableCell>
                        <TableCell className="py-2 px-3">
                          <Select value={quote.status} onValueChange={(value) => updateQuoteStatus(quote.id, value)}>
                            <SelectTrigger className={`w-[90px] h-6 border-0 text-xs px-2 ${statusColors[quote.status as keyof typeof statusColors]} [&>svg]:hidden`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="won">Won</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm text-muted-foreground">
                          {(() => {
                            // Use job_details.date if available, otherwise fall back to created_at
                            const jobDate = quote.job_details?.date;
                            if (jobDate) {
                              return new Date(jobDate).toLocaleDateString();
                            }
                            return new Date(quote.created_at).toLocaleDateString();
                          })()}
                        </TableCell>
                        <TableCell className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editQuote(quote)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => downloadPDF(quote)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => setDeleteQuoteId(quote.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteQuoteId} onOpenChange={() => setDeleteQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteQuote(deleteQuoteId!)}
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
    </div>
  );
};

export default Quotes;