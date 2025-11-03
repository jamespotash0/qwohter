import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes } from "@/stores/quotes/quotesStore";
import { useUser } from "@/auth";
import QuoteEditingWizard from "@/components/features/quotes/editing/QuoteEditingWizard/QuoteEditingWizard";

const QuoteEditIncomplete = () => {
  const navigate = useNavigate();
  const { proposalNumber } = useParams<{ proposalNumber: string }>();
  const user = useUser();

  // Fetch quotes using React Query
  const { data: quotes = [] } = useQuotes(user?.id);

  // Find the quote to edit
  const existingQuote = proposalNumber ? quotes.find(q => q.proposal_number === proposalNumber) : null;

  // Auth is handled by AuthProvider and useUser hook
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

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