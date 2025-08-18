import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import QuoteCreator from "@/components/QuoteCreator";
import Dashboard from "@/components/Dashboard";

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentQuote, setCurrentQuote] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication and set up listener
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
    return null; // Will redirect to auth
  }

  if (!currentQuote) {
    return (
      <Dashboard 
        user={user.email || ""} 
        userId={user.id}
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <QuoteCreator 
      user={user.email || ""} 
      onLogout={handleLogout} 
      quoteName={currentQuote}
      onBackToDashboard={handleBackToDashboard}
      onQuoteNameChange={handleQuoteNameChange}
    />
  );
};

export default DashboardPage;