
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

interface Quote {
  id: string;
  name: string;
  createdDate: string;
  totalCost: number;
  status: string;
}

interface DashboardProps {
  user: string;
  onLogout: () => void;
  onEditQuote: (quoteName: string) => void;
}

const Dashboard = ({ user, onLogout, onEditQuote }: DashboardProps) => {
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

  const handleCreateQuote = async (quoteName: string) => {
    try {
      await createQuote({ quoteName });
      onEditQuote(quoteName);
      setShowNewQuoteDialog(false);
    } catch (error) {
      console.error('Error creating quote:', error);
    }
  };

  // Calculate stats from real quotes data
  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((sum, quote) => {
    const total = quote.price_details?.total || 0;
    return sum + (typeof total === 'number' ? total : 0);
  }, 0);
  const runningProjects = quotes.filter(q => q.status === "draft").length;
  const completedProjects = quotes.filter(q => q.status === "completed").length;

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
                      <p className="text-sm font-medium">{user}</p>
                      <p className="text-xs text-slate-500">{currentOrganization?.name || "Personal Workspace"}</p>
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
                      <p className="text-sm opacity-90">Total Projects</p>
                      <p className="text-3xl font-bold">{totalQuotes}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs opacity-75">Increased from last month</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Ended Projects</p>
                      <p className="text-3xl font-bold text-slate-900">{completedProjects}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">Increased from last month</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Running Projects</p>
                      <p className="text-3xl font-bold text-slate-900">{runningProjects}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">Increased from last month</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Pending Project</p>
                      <p className="text-3xl font-bold text-slate-900">2</p>
                      <p className="text-xs text-slate-500 mt-2">On Discuss</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-slate-600" />
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
