import { useState, useEffect } from "react";
import { ArrowLeft, Search, Download, Edit, Eye, Copy, Trash2, MoreHorizontal } from "lucide-react";
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
    Draft: "bg-gray-100 text-gray-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Completed: "bg-green-100 text-green-800",
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
      const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
      const { generateIntelligentPDF } = await import('@/utils/intelligentPdfGenerator');
      
      const quoteText = generateQuoteText(quote);
      
      // Generate filename
      const currentVersion = quote.version || 1;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA');
      const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
      const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
      
      // Use the intelligent PDF generator with content-aware page breaks
      await generateIntelligentPDF(quoteText, fileName, {
        containerWidth: 800,
        scale: 2,
        fallbackToText: true
      });
      
      toast({
        title: "PDF Downloaded",
        description: `Quote ${quote.proposal_number} has been downloaded with intelligent page breaks.`,
      });
      
      // Mark as downloaded (will increment version for next download)
      await markAsDownloaded(quote.id);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      // Final fallback to simple text PDF
      try {
        const { generateQuoteText } = await import('@/components/QuoteTextGenerator');
        const quoteText = generateQuoteText(quote);
        
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardDescription className="text-xs">Total Quotes</CardDescription>
              <CardTitle className="text-xl">{quotes.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardDescription className="text-xs">Total Value</CardDescription>
              <CardTitle className="text-xl">
                 {formatCurrency(quotes.reduce((sum, quote) => {
                   try {
                     const totalAmount = quote.price_details?.total ? parseFloat(quote.price_details.total.replace(/[^0-9.-]+/g,"")) : 0;
                     return sum + totalAmount;
                   } catch (error) {
                     console.error('Error processing quote total:', error, quote);
                     return sum;
                   }
                 }, 0))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardDescription className="text-xs">Pending</CardDescription>
              <CardTitle className="text-xl">{quotes.filter(q => q.status === 'Pending').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardDescription className="text-xs">Completed</CardDescription>
              <CardTitle className="text-xl">{quotes.filter(q => q.status === 'Completed').length}</CardTitle>
            </CardHeader>
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
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
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
                              <SelectItem value="Draft">Draft</SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm text-muted-foreground">{new Date(quote.created_at).toLocaleDateString()}</TableCell>
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