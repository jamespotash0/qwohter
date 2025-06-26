
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Edit, Trash2, DollarSign, FileText, TrendingUp, Calendar, User } from "lucide-react";
import CreateQuoteDialog from "./CreateQuoteDialog";

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
  const [quotes, setQuotes] = useState<Quote[]>([
    {
      id: "1",
      name: "Office Building Project",
      createdDate: "2024-01-15",
      totalCost: 15000,
      status: "Draft"
    },
    {
      id: "2", 
      name: "Warehouse Renovation",
      createdDate: "2024-01-10",
      totalCost: 25000,
      status: "Completed"
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

  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((sum, quote) => sum + quote.totalCost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Contemporary Wall Systems
                </h1>
                <p className="text-sm font-medium text-slate-500">Quote Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-slate-50/80 rounded-xl px-4 py-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Welcome, {user}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={onLogout} 
                className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 rounded-xl"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Welcome Section */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Welcome to Quote System
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Manage your wall system quotes efficiently with our comprehensive platform
          </p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-blue-700">Total Quotes</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{totalQuotes}</div>
              <p className="text-xs text-blue-600 mt-1">Active projects</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-emerald-700">Total Value</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-xl">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-emerald-600 mt-1">Portfolio value</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-purple-700">Quick Actions</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl">
                <Plus className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <CreateQuoteDialog onCreateQuote={handleCreateQuote} />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Quotes Table */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border border-white/60 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100 p-8">
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Your Quotes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="text-left p-6 text-sm font-semibold text-slate-700">Quote Name</th>
                    <th className="text-left p-6 text-sm font-semibold text-slate-700">Created Date</th>
                    <th className="text-left p-6 text-sm font-semibold text-slate-700">Total Cost</th>
                    <th className="text-left p-6 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left p-6 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote, index) => (
                    <tr key={quote.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/20'}`}>
                      <td className="p-6 font-semibold text-slate-900">{quote.name}</td>
                      <td className="p-6 text-slate-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {quote.createdDate}
                      </td>
                      <td className="p-6 font-bold text-emerald-700">${quote.totalCost.toLocaleString()}</td>
                      <td className="p-6">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          quote.status === 'Completed' 
                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' 
                            : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditQuote(quote.name)}
                            className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all duration-200 rounded-lg"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-all duration-200 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
