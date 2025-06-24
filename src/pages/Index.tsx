
import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import QuoteCreator from "@/components/QuoteCreator";
import CreateQuoteDialog from "@/components/CreateQuoteDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<string>("");
  const [currentQuote, setCurrentQuote] = useState<string>("");

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setUser(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser("");
    setCurrentQuote("");
  };

  const handleCreateQuote = (quoteName: string) => {
    setCurrentQuote(quoteName);
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (!currentQuote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Building2 className="w-12 h-12 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Contemporary Wall Systems</CardTitle>
              <p className="text-gray-600">Welcome, {user}</p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <CreateQuoteDialog onCreateQuote={handleCreateQuote} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <QuoteCreator user={user} onLogout={handleLogout} quoteName={currentQuote} />;
};

export default Index;
