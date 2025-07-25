
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Calendar, 
  User,
  Search,
  Mail,
  Bell,
  ArrowUpRight,
  Users,
  Timer,
  Play,
  Square,
  Settings
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CreateQuoteDialog from "./CreateQuoteDialog";
import { AppSidebar } from "./AppSidebar";

import { MemberManagement } from "./MemberManagement";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotes } from "@/hooks/useQuotes";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  id: string;
  name: string;
  createdDate: string;
  totalCost: number;
  status: string;
}

interface DashboardProps {
  user: string;
  userId: string;
  onLogout: () => void;
  onEditQuote: (quoteName: string) => void;
}

const Dashboard = ({ user, userId, onLogout, onEditQuote }: DashboardProps) => {
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  
  const { quotes, createQuote } = useQuotes();
  const {
    currentOrganization,
    members,
    currentUserRole,
    loading: orgLoading,
    createOrganization,
    inviteMember,
    removeMember,
    updateMemberRole
  } = useOrganizations();
  const { profile } = useUserProfile(userId);

  const handleCreateQuote = async (quoteName: string) => {
    try {
      await createQuote({ quoteName });
      onEditQuote(quoteName);
      setShowNewQuoteDialog(false);
    } catch (error) {
      console.error('Error creating quote:', error);
    }
  };

  // Calculate advanced quote analytics
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const wonQuotes = quotes.filter(q => q.status === "won");
  const rejectedQuotes = quotes.filter(q => q.status === "rejected");
  
  // This month quotes
  const quotesThisMonth = quotes.filter(q => {
    const quoteDate = new Date(q.created_at);
    return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
  });
  
  // This year quotes
  const quotesThisYear = quotes.filter(q => {
    const quoteDate = new Date(q.created_at);
    return quoteDate.getFullYear() === currentYear;
  });
  
  const quotesWonThisMonth = quotesThisMonth.filter(q => q.status === "won").length;
  const quotesWonThisYear = quotesThisYear.filter(q => q.status === "won").length;
  
  // Total quoted value (all quotes regardless of status)
  const totalQuotedValue = quotes.reduce((sum, quote) => {
    const total = quote.price_details?.total || 0;
    return sum + (typeof total === 'number' ? total : 0);
  }, 0);
  
  // Average quote value
  const avgQuoteValue = quotes.length > 0 ? totalQuotedValue / quotes.length : 0;
  
  // Conversion rate (won quotes / total quotes that have a final status)
  const finalizedQuotes = quotes.filter(q => ['won', 'rejected'].includes(q.status));
  const conversionRate = finalizedQuotes.length > 0 ? (wonQuotes.length / finalizedQuotes.length) * 100 : 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AppSidebar user={user} onLogout={onLogout} />
        
        <main className="flex-1 flex flex-col">
          {/* Floating Header */}
          <div className="p-6 pb-0">
            <header className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-lg rounded-[22px] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium text-lg">{currentOrganization?.name || 'Loading...'}</span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <Button variant="ghost" size="sm">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{profile?.full_name || user}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1 p-6 pt-3 space-y-6">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">Plan, prioritize, and accomplish your tasks with ease.</p>
              </div>
              <div className="flex gap-3">
              <CreateQuoteDialog 
                open={showNewQuoteDialog}
                onOpenChange={setShowNewQuoteDialog}
                onCreateQuote={handleCreateQuote} 
              />
                {/* <Button variant="outline" className="bg-white">
                  Import Data
                </Button> */}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Total Quoted Value</p>
                      <p className="text-3xl font-bold">${totalQuotedValue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <DollarSign className="w-3 h-3" />
                        <span className="text-xs opacity-75">All quotes combined</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Quotes Won This Month</p>
                      <p className="text-3xl font-bold text-blue-900">{quotesWonThisMonth}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-500">Won this year: {quotesWonThisYear}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Quotes This Month</p>
                      <p className="text-3xl font-bold text-slate-900">{quotesThisMonth.length}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">This year: {quotesThisYear.length}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Avg Quote Value</p>
                      <p className="text-3xl font-bold text-slate-900">${avgQuoteValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-slate-500 mt-2">Conversion: {conversionRate.toFixed(1)}%</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Won Quotes</p>
                      <p className="text-3xl font-bold text-green-900">{wonQuotes.length}</p>
                      <p className="text-xs text-green-500 mt-2">Total value: ${wonQuotes.reduce((sum, q) => sum + (q.price_details?.total || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Rejected Quotes</p>
                      <p className="text-3xl font-bold text-red-900">{rejectedQuotes.length}</p>
                      <p className="text-xs text-red-500 mt-2">Total value: ${rejectedQuotes.reduce((sum, q) => sum + (q.price_details?.total || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Member Management - Only for admins and owners */}
            {currentOrganization && currentUserRole && ['admin', 'owner'].includes(currentUserRole) && (
              <MemberManagement
                organization={currentOrganization}
                members={members}
                onInviteMember={(email, role) => inviteMember(currentOrganization.id, email, role)}
                onRemoveMember={removeMember}
                onUpdateRole={updateMemberRole}
              />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Analytics & Team */}
              <div className="lg:col-span-2 space-y-6">
                {/* Project Analytics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between px-4">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <div key={day} className="flex flex-col items-center gap-2">
                          <div 
                            className={`w-12 rounded-t-lg ${index === 3 ? 'bg-primary h-32' : index === 2 || index === 1 ? 'bg-primary/70 h-24' : 'bg-slate-200 h-16'}`}
                          />
                          <span className="text-xs text-slate-500">{day}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Team Collaboration */}
                {/* <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Team Collaboration</CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Member
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Alexandra Deff", task: "Github Project Repository", status: "Completed" },
                        { name: "Edwin Adenike", task: "Integrate User Authentication System", status: "In Progress" },
                        { name: "Isaac Oluwatemilorun", task: "Develop Search and Filter Functionality", status: "Pending" },
                        { name: "David Oshodi", task: "Responsive Layout for Homepage", status: "In Progress" }
                      ].map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-300 rounded-full" />
                            <div>
                              <p className="font-medium text-sm">{member.name}</p>
                              <p className="text-xs text-slate-500">Working on {member.task}</p>
                            </div>
                          </div>
                          <Badge variant={member.status === "Completed" ? "default" : member.status === "In Progress" ? "secondary" : "outline"}>
                            {member.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card> */}
              </div>

              {/* Right Column - Reminders, Projects, Progress, Timer */}
              <div className="space-y-6">
                {/* Reminders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Reminders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-medium">Meeting with Arc Company</h4>
                        <p className="text-sm text-slate-500 mt-1">Time : 02:00 pm - 04:00 pm</p>
                        <Button className="w-full mt-3 bg-primary text-primary-foreground">
                          Start Meeting
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project List */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Project</CardTitle>
                    <Button variant="outline" size="sm">
                      + New
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {quotes.slice(0, 5).map((quote, index) => (
                        <div key={quote.id} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${index % 2 === 0 ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{quote.project_name || quote.proposal_number}</p>
                            <p className="text-xs text-slate-500">Created: {new Date(quote.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                      {quotes.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No quotes yet</p>
                      )}
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
