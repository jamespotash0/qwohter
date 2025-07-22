
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import QuoteCreator from "@/components/QuoteCreator";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<string>("");
  const [currentQuote, setCurrentQuote] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setUser(username);
    if (location.pathname === "/") {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    // Redirect to dashboard if user is logged in and on root path
    if (isLoggedIn && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [isLoggedIn, location.pathname, navigate]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser("");
    setCurrentQuote("");
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

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
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

export default Index;
