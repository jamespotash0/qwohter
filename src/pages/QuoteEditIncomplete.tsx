import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import QuoteEditingWizard from "@/components/features/quotes/editing/QuoteEditingWizard/QuoteEditingWizard";

const QuoteEditIncomplete = () => {
  const navigate = useNavigate();
  const { proposalNumber } = useParams<{ proposalNumber: string }>();
  const [user, setUser] = useState<any>(null);
  const quotes = useQuotesStore((state) => state.quotes);
  
  // Find the quote to edit
  const existingQuote = proposalNumber ? quotes.find(q => q.proposal_number === proposalNumber) : null;

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

  // Redirect if quote not found or not incomplete
  useEffect(() => {
    if (user && quotes.length > 0) {
      if (!existingQuote) {
        navigate("/quotes");
        return;
      }
      
      // If quote is not incomplete, redirect to appropriate editor
      if (existingQuote.status !== "Incomplete") {
        if (existingQuote.status === "Draft") {
          navigate(`/quotes/new?edit=${encodeURIComponent(proposalNumber!)}`);
        } else {
          navigate(`/editor/${proposalNumber}`);
        }
        return;
      }
    }
  }, [user, quotes, existingQuote, navigate, proposalNumber]);

  const handleBackToDashboard = () => {
    navigate("/quotes");
  };

  const handleQuoteNameChange = (newName: string) => {
    // This will be handled by the editing wizard itself
  };

  if (!user || !existingQuote) {
    return null; // or loading spinner
  }

  // Only render if the quote is actually incomplete
  if (existingQuote.status !== "Incomplete") {
    return null;
  }

  return (
    <QuoteEditingWizard
      existingQuote={existingQuote}
      onBackToDashboard={handleBackToDashboard}
      onQuoteNameChange={handleQuoteNameChange}
    />
  );
};

export default QuoteEditIncomplete;