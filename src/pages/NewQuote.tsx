import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuoteCreatorWizard from "@/components/features/quotes/creation/QuoteCreatorWizard";
import { supabase } from "@/integrations/supabase/client";

const NewQuote = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  
  // Get quote name from URL params, fallback to "New Quote"
  const initialQuoteName = searchParams.get('name') || "New Quote";
  const [quoteName, setQuoteName] = useState(initialQuoteName);

  useEffect(() => {
    // Check authentication
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

  // Update quote name if URL params change
  useEffect(() => {
    const nameFromParams = searchParams.get('name');
    if (nameFromParams && nameFromParams !== quoteName) {
      setQuoteName(nameFromParams);
    }
  }, [searchParams, quoteName]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBackToDashboard = () => {
    navigate("/quotes");
  };

  const handleQuoteNameChange = (newName: string) => {
    setQuoteName(newName);
  };

  if (!user) {
    return null; // or loading spinner
  }

  return (
    <QuoteCreatorWizard
      user={user.email || ""}
      onLogout={handleLogout}
      quoteName={quoteName}
      onBackToDashboard={handleBackToDashboard}
      onQuoteNameChange={handleQuoteNameChange}
    />
  );
};

export default NewQuote;