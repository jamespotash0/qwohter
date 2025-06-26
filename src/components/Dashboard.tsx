
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Edit, Trash2, DollarSign, FileText } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Contemporary Wall Systems
                </h1>
                <p className="text-sm text-gray-600">Quote Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user}</span>
              <Button variant="outline" onClick={onLogout} size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Quote System</h2>
          <p className="text-gray-600">Manage your wall system quotes efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuotes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CreateQuoteDialog onCreateQuote={handleCreateQuote} />
            </CardContent>
          </Card>
        </div>

        {/* Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Quote Name</th>
                    <th className="text-left p-4">Created Date</th>
                    <th className="text-left p-4">Total Cost</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{quote.name}</td>
                      <td className="p-4">{quote.createdDate}</td>
                      <td className="p-4">${quote.totalCost.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          quote.status === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditQuote(quote.name)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
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
