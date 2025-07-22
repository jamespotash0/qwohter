import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, MoreHorizontal, Eye, Download, Copy, Edit, Trash2, Check, ArrowLeft, Home } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import QuoteCreator from "@/components/QuoteCreator";

const initialQuotes = [
  {
    id: "P39853",
    client: "Acme Construction",
    project: "Office Building Renovation",
    amount: '45,538.15',
    status: "Draft",
    date: "2024-01-15"
  },
  {
    id: "P78563", 
    client: "Builder Solutions",
    project: "Residential Complex",
    amount: '78,500.17',
    status: "In Revision",
    date: "2024-01-12"
  },
  {
    id: "P56784",
    client: "Metro Developers",
    project: "Commercial Center",
    amount: '125,000.54',
    status: "Completed",
    date: "2024-01-10"
  },

];

const statusColors = {
  "Completed": "bg-green-100 text-green-800 border-green-200",
  "Draft": "bg-gray-100 text-gray-800 border-gray-200",
  "In Revision": "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function Quotes() {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [editingQuote, setEditingQuote] = useState<string | null>(null);
  const [newQuoteName, setNewQuoteName] = useState("");
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [user, setUser] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (!loggedInUser) {
      navigate("/");
      return;
    }
    setUser(loggedInUser);
  }, [navigate]);

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "All" || quote.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Currency formatting function
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Capitalize status for display
  const capitalizeStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const updateQuoteStatus = (quoteId: string, newStatus: string) => {
    setQuotes(quotes.map(quote => 
      quote.id === quoteId ? { ...quote, status: newStatus } : quote
    ));
    toast({
      title: "Status Updated",
      description: `Quote ${quoteId} status changed to ${newStatus}`,
    });
  };

  const deleteQuote = (quoteId: string) => {
    setQuotes(quotes.filter(quote => quote.id !== quoteId));
    toast({
      title: "Quote Deleted",
      description: `Quote ${quoteId} has been deleted successfully.`,
      variant: "destructive",
    });
  };

  const editQuote = (quoteId: string) => {
    setEditingQuote(quoteId);
  };

  const downloadPDF = (quote: any) => {
    const doc = new jsPDF();
    
    // Company Logo Area (placeholder)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CWS CONTEMPORARY", 20, 25);
    doc.text("WALL SYSTEMS", 20, 35);
    
    // Contact Information (right side)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Contact:", 120, 25);
    doc.text("Address:", 120, 35);
    doc.text("Phone:", 120, 55);
    doc.text("Fax:", 120, 65);
    doc.text("Website:", 120, 75);
    
    doc.setFont("helvetica", "normal");
    doc.text("Ed Michinski", 145, 25);
    doc.text("567 Commerce St.", 145, 35);
    doc.text("Franklin Lakes, NJ, 07417", 145, 45);
    doc.text("(973) 884-0474", 145, 55);
    doc.text("(973) 884-1606", 145, 65);
    doc.text("contemporarywalls.com", 145, 75);
    
    // Date and Proposal Number (right side)
    doc.setFont("helvetica", "bold");
    doc.text("Date:", 120, 95);
    doc.text("Proposal #:", 120, 105);
    doc.text("Job Location:", 120, 115);
    
    doc.setFont("helvetica", "normal");
    doc.text(quote.date, 145, 95);
    doc.text(quote.id, 145, 105);
    doc.text("1411 Broadway, New York, NY, 10028", 145, 115); // Default location
    
    // Billed To Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BILLED TO:", 20, 90);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(quote.client, 20, 105); // Company name
    doc.text("Contact Person", 20, 115); // Placeholder for contact person
    doc.text("Company Address", 20, 125); // Placeholder for address
    
    // Proposal Description
    doc.setFontSize(10);
    doc.text("Thank you for considering Contemporary Wall Systems for this project. As discussed, we are", 20, 150);
    doc.text("offering a proposal to furnish, deliver, and install, as noted,  ONE (1) - Operable Wall as", 20, 160);
    doc.text("specified below, at the above named project.", 20, 170);
    
    // Specifications Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Specifications as follows:", 20, 190);
    
    // Table Header
    doc.setFontSize(10);
    doc.text("Wall A", 20, 210);
    doc.text("48'-2\"", 50, 210);
    doc.text("W x", 75, 210);
    doc.text("10'-0\"", 95, 210);
    doc.text("H", 120, 210);
    doc.text("TWELV...", 135, 210);
    doc.text("Continuously Hinged Panels", 165, 210);
    
    // Wall System Details
    doc.setFont("helvetica", "bold");
    doc.text("PANELS:", 20, 230);
    doc.setFont("helvetica", "normal");
    doc.text("This wall system utilizes the Kwik-Wall 3000 Series - Model 3020 configured with", 20, 245);
    doc.text("Hinged Paired Panels designed for use with a Multi-Directional Track Layout, and", 20, 255);
    doc.text("includes GL insulated for enhanced acoustic performance.", 20, 265);
    
    // Save the PDF
    doc.save(`Quote-${quote.id}.pdf`);
    
    toast({
      title: "PDF Downloaded",
      description: `Quote ${quote.id} has been downloaded as PDF.`,
    });
  };

  const handleBackToQuotes = () => {
    setEditingQuote(null);
  };

  const handleNewQuote = () => {
    setShowNewQuoteDialog(true);
  };

  const handleCreateNewQuote = () => {
    if (newQuoteName.trim()) {
      setEditingQuote("new");
      setShowNewQuoteDialog(false);
      setNewQuoteName("");
    }
  };

  const totalValue = filteredQuotes.reduce((sum, quote) => sum + parseFloat(quote.amount.replace(/,/g, '')), 0);

  // If editing a quote, show the QuoteCreator
  if (editingQuote) {
    const selectedQuote = quotes.find(q => q.id === editingQuote);
    const quoteName = editingQuote === "new" ? newQuoteName : (selectedQuote?.project || "Edit Quote");
    
    return (
      <QuoteCreator
        user={user}
        onLogout={() => {
          localStorage.removeItem("loggedInUser");
          navigate("/");
        }}
        quoteName={quoteName}
        onBackToDashboard={handleBackToQuotes}
        onQuoteNameChange={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium">Quotes</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <p className="text-muted-foreground">Manage and track your project quotes</p>
        </div>
        <Button 
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleNewQuote}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredQuotes.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredQuotes.length === quotes.length ? 'All quotes' : `Filtered from ${quotes.length}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Combined quote value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredQuotes.filter(q => q.status === "Draft" || q.status === "In Revision").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredQuotes.filter(q => q.status === "Completed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed quotes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes, clients, or projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {selectedStatus}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedStatus("All")}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("completed")}>
                    Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("draft")}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("in revision")}>
                    In Revision
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={`quote-${quote.id}`} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{quote.id}</TableCell>
                  <TableCell>{quote.client}</TableCell>
                  <TableCell>{quote.project}</TableCell>
                  <TableCell className="font-semibold">
                    ${quote.amount}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-80 ${statusColors[quote.status as keyof typeof statusColors]}`}
                        >
                          {capitalizeStatus(quote.status)}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="bg-background border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => updateQuoteStatus(quote.id, "Completed")}>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateQuoteStatus(quote.id, "Draft")}>
                          <div className="w-4 h-4 mr-2 rounded-full bg-gray-400"></div>
                          Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateQuoteStatus(quote.id, "In Revision")}>
                          <div className="w-4 h-4 mr-2 rounded-full bg-yellow-400"></div>
                          In Revision
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>{quote.date}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border shadow-md">
                        <DropdownMenuItem onClick={() => editQuote(quote.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadPDF(quote)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate Quote
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Quote
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete quote {quote.id}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteQuote(quote.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredQuotes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quotes found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Quote Dialog */}
      <AlertDialog open={showNewQuoteDialog} onOpenChange={setShowNewQuoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for your new quote to get started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter quote name..."
              value={newQuoteName}
              onChange={(e) => setNewQuoteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateNewQuote();
                }
              }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateNewQuote}
              disabled={!newQuoteName.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Create Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}