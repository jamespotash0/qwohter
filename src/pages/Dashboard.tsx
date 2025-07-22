import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QuoteCreator from "@/components/QuoteCreator";
import Dashboard from "@/components/Dashboard";

const DashboardPage = () => {
  const [user, setUser] = useState<string>("");
  const [currentQuote, setCurrentQuote] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in (you can implement proper auth checking here)
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (!loggedInUser) {
      navigate("/");
      return;
    }
    setUser(loggedInUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/");
  };

  const handleEditQuote = (quoteName: string) => {
    setCurrentQuote(quoteName);
  };

  const handleQuoteNameChange = (newName: string) => {
    setCurrentQuote(newName);
  };

  const handleBackToDashboard = () => {
    setCurrentQuote("");
  };

  if (!user) {
    return null; // Will redirect to login
  }

  if (!currentQuote) {
    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        onEditQuote={handleEditQuote}
      />
    );
  }

  return (
    <QuoteCreator 
      user={user} 
      onLogout={handleLogout} 
      quoteName={currentQuote}
      onBackToDashboard={handleBackToDashboard}
      onQuoteNameChange={handleQuoteNameChange}
    />
  );
};

export default DashboardPage;