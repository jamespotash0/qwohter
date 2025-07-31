import { useState, useEffect } from "react";
import { Search, Download, Edit, Trash2, MoreHorizontal, DollarSign, TrendingUp, FileText, Building2, User, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import QuoteCreator from "@/components/QuoteCreator";
import CreateQuoteDialog from "@/components/CreateQuoteDialog";
import jsPDF from 'jspdf';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";

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
    refreshQuotes
  } = useQuotes();
  const { currentOrganization } = useOrganizations();
  const { profile } = useUserProfile(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);

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
      const { enhanceWithPageBreaks } = await import('@/utils/pageBreakManager');
      const rawQuoteText = generateQuoteText(quote);
      const quoteText = enhanceWithPageBreaks(rawQuoteText);
      
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

      document.body.appendChild(tempDiv);

      try {
        const html2canvas = (await import('html2canvas')).default;
        const pageElements = tempDiv.querySelectorAll('.page');
        
        if (pageElements.length > 0) {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          for (let i = 0; i < pageElements.length; i++) {
            const pageElement = pageElements[i] as HTMLElement;
            
            const canvas = await html2canvas(pageElement, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              width: 816,
              height: 1056
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdfWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (i > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
          }
          
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
        console.error('Canvas rendering failed:', canvasError);
        toast({
          title: "PDF Download Failed",
          description: "Unable to generate PDF. Please try again.",
          variant: "destructive"
        });
      }
      
      document.body.removeChild(tempDiv);
      await markAsDownloaded(quote.id);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "PDF Download Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Generate beautiful monthly revenue data for line chart
  const generateMonthlyRevenueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthQuotes = quotes.filter(quote => {
        const quoteDate = new Date(quote.created_at);
        return quoteDate.getFullYear() === currentYear && quoteDate.getMonth() === index;
      });
      
      const monthlyValue = monthQuotes.reduce((sum, quote) => {
        const total = quote.price_details?.total_cost || 0;
        return sum + (typeof total === 'number' ? total : 0);
      }, 0);
      
      return {
        month,
        revenue: monthlyValue
      };
    });
  };

  const monthlyRevenueData = generateMonthlyRevenueData();

  if (editingQuote) {
    return (
      <QuoteCreator 
        user={user?.email || ""} 
        onLogout={handleLogout} 
        quoteName={editingQuote.project_name || editingQuote.proposal_number}
        onBackToDashboard={() => setEditingQuote(null)}
        onQuoteNameChange={() => {}}
        existingQuote={editingQuote}
      />
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main className="flex-1 flex flex-col">
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

          <div className="flex-1 p-6 pt-3 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between animate-fade-in">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Quotes
                </h1>
                <p className="text-slate-600 mt-2 text-lg">Manage and track your project quotes</p>
              </div>
              <Button 
                onClick={() => setShowNewQuoteDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale"
              >
                <FileText className="w-4 h-4 mr-2" />
                New Quote
              </Button>
            </div>

            {/* Beautiful Revenue Chart */}
            <Card className="animate-fade-in hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Quote Revenue Trend (2024)
                </CardTitle>
                <CardDescription>
                  Monthly revenue from quotes throughout the year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyRevenueData}>
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
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Line 
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
            </Card>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search quotes by client, project, or proposal number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quotes Table */}
            <Card className="animate-fade-in hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold">Proposal #</TableHead>
                      <TableHead className="font-semibold">Client/Project</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Total</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => {
                      const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "N/A";
                      const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
                      const total = quote.price_details?.total_cost || 0;
                      const formattedTotal = typeof total === 'number' ? formatCurrency(total) : 'N/A';

                      return (
                        <TableRow key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-medium">{quote.proposal_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{clientName}</div>
                              <div className="text-sm text-slate-500">{projectName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold">{formattedTotal}</TableCell>
                          <TableCell>
                            <Select value={quote.status || "draft"} onValueChange={(value) => updateQuoteStatus(quote.id, value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="won">Won</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => editQuote(quote)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => downloadPDF(quote)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
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
                    {filteredQuotes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          {quotes.length === 0 ? "No quotes yet. Create your first quote!" : "No quotes match your search criteria."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
        onCreateQuote={async (quoteName) => {
          await createQuote({ quoteName });
          await refreshQuotes();
          const newQuote = quotes.find(q => q.quote_details?.quoteName === quoteName || q.project_name === quoteName);
          if (newQuote) {
            setEditingQuote(newQuote);
          }
          setShowNewQuoteDialog(false);
        }} 
      />
    </SidebarProvider>
  );
};

export default Quotes;