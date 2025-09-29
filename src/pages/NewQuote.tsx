import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuoteCreatorWizard from "@/components/features/quotes/creation/QuoteCreatorWizard";
import { supabase } from "@/integrations/supabase/client";
import { useQuotesStore } from "@/stores/quotes/quotesStore";

const NewQuote = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const quotes = useQuotesStore((state) => state.quotes);
  
  // Check if we're editing a draft quote
  const editProposalNumber = searchParams.get('edit');
  const existingQuote = editProposalNumber ? quotes.find(q => q.proposal_number === editProposalNumber) : null;
  
  // Get quote name from URL params or existing quote, fallback to "New Quote"
  const initialQuoteName = existingQuote?.project_name || searchParams.get('name') || "New Quote";
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
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
    const editProposal = searchParams.get('edit');
    
    if (editProposal && existingQuote?.project_name && existingQuote.project_name !== quoteName) {
      setQuoteName(existingQuote.project_name);
    } else if (nameFromParams && nameFromParams !== quoteName) {
      setQuoteName(nameFromParams);
    }
  }, [searchParams, quoteName, existingQuote]);

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
      existingQuote={existingQuote as any}
    />
  );
};

export default NewQuote;