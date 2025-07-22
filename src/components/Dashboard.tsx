
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  FileText, 
  Calendar, 
  User,
  Search,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CreateQuoteDialog from "./CreateQuoteDialog";
import { AppSidebar } from "./AppSidebar";
import QuoteCalendar from "./QuoteCalendar";

interface Quote {
  id: string;
  name: string;
  createdDate: string;
  totalCost: number;
  status: string;
  clientName?: string;
}

interface DashboardProps {
  user: string;
  onLogout: () => void;
  onEditQuote: (quoteName: string) => void;
}

const Dashboard = ({ user, onLogout, onEditQuote }: DashboardProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([
    {
      id: "1",
      name: "Office Renovation Quote",
      createdDate: "2024-01-15",
      totalCost: 15000,
      status: "Sent",
      clientName: "Acme Corporation"
    },
    {
      id: "2", 
      name: "Warehouse Partition System",
      createdDate: "2024-01-10",
      totalCost: 25000,
      status: "Accepted",
      clientName: "Industrial Solutions Inc"
    },
    {
      id: "3",
      name: "Conference Room Walls",
      createdDate: "2024-01-20",
      totalCost: 8500,
      status: "Viewed",
      clientName: "Tech Startup LLC"
    },
    {
      id: "4",
      name: "Retail Space Dividers",
      createdDate: "2024-01-22",
      totalCost: 12000,
      status: "Sent",
      clientName: "Retail Chain Co"
    },
    {
      id: "5",
      name: "Hospital Room Partitions",
      createdDate: "2024-01-25",
      totalCost: 35000,
      status: "Viewed",
      clientName: "Metro Hospital"
    }
  ]);

  const handleCreateQuote = (quoteName: string) => {
    const newQuote: Quote = {
      id: Date.now().toString(),
      name: quoteName,
      createdDate: new Date().toISOString().split('T')[0],
      totalCost: 0,
      status: "Draft"
    };
    setQuotes(prev => [...prev, newQuote]);
    onEditQuote(quoteName);
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(quote => quote.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setQuotes(prev => prev.map(quote => 
      quote.id === id ? { ...quote, status: newStatus } : quote
    ));
  };

  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((sum, quote) => sum + quote.totalCost, 0);
  const upcomingQuotes = quotes.filter(q => {
    const today = new Date();
    const quoteDate = new Date(q.createdDate);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return quoteDate >= today && quoteDate <= nextWeek;
  }).length;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': return <Clock className="w-4 h-4" />;
      case 'viewed': return <Eye className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewed': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} onLogout={onLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-40 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Search quotes..." 
                    className="pl-10 w-80 bg-muted/50 border-border"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <CreateQuoteDialog onCreateQuote={handleCreateQuote} />
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{user}</p>
                    <p className="text-xs text-muted-foreground">{user.toLowerCase()}@company.com</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Dashboard Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Dashboard Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Quote Dashboard</h1>
              <p className="text-muted-foreground">Manage and track your quotes efficiently</p>
            </div>

            {/* Panel 1: Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary/70 mb-1">Total Quotes</p>
                      <p className="text-3xl font-bold text-primary">{totalQuotes}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-primary/60" />
                        <span className="text-xs text-primary/60">All time</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Total Value</p>
                      <p className="text-3xl font-bold text-green-800">${totalValue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">Portfolio value</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-green-200/60 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-accent/70 mb-1">Upcoming Quotes</p>
                      <p className="text-3xl font-bold text-accent">{upcomingQuotes}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="w-3 h-3 text-accent/60" />
                        <span className="text-xs text-accent/60">This week</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel 2: Quote Calendar */}
              <div className="lg:col-span-1">
                <QuoteCalendar quotes={quotes} />
              </div>

              {/* Panel 3: Recent Quotes List */}
              <div className="lg:col-span-2">
                <Card className="h-fit">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-semibold">Recent Quotes</CardTitle>
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {quotes.slice(0, 8).map((quote, index) => (
                        <div key={quote.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                              {getStatusIcon(quote.status)}
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{quote.clientName || 'Unknown Client'}</h4>
                              <p className="text-sm text-muted-foreground">{quote.name}</p>
                              <p className="text-xs text-muted-foreground">{quote.createdDate}</p>
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="font-semibold text-foreground">${quote.totalCost.toLocaleString()}</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getStatusColor(quote.status)} border`}
                              >
                                {quote.status}
                              </Badge>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditQuote(quote.name)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteQuote(quote.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
