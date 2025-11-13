import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuoteCreatorWizard from "@/components/features/quotes/creation/QuoteCreatorWizard";
import { useQuotes } from "@/hooks/queries/useQuotes";
import { useUser, useSignOut } from "@/auth";

const NewQuote = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ✅ v3.0.0: Use new auth system
  const user = useUser();
  const { mutate: signOut } = useSignOut();
  const { data: quotes = [] } = useQuotes(user?.id);

  // Check if we're editing a draft quote
  const editProposalNumber = searchParams.get('edit');
  const existingQuote = editProposalNumber ? quotes.find(q => q.proposal_number === editProposalNumber) : null;

  // Get quote name from URL params or existing quote, fallback to empty string
  const initialQuoteName = existingQuote?.project_name || searchParams.get('name') || "";
  const [quoteName, setQuoteName] = useState(initialQuoteName);

  // Auth is handled by AuthProvider
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);


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

  const handleLogout = () => {
    signOut(undefined, {
      onSuccess: () => {
        navigate("/auth");
      }
    });
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