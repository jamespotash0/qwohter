import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type QuoteRow = Database['public']['Tables']['quotes']['Row'];

export interface Quote {
  id: string;
  proposal_number: string;
  project_name?: string;
  quote_details: any;
  job_details: any;
  wall_details: any;
  price_details: any;
  support_structure: any;
  delivery_details: any;
  labor_details: any;
  status: string;
  date_last_downloaded?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((data as Quote[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching quotes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async (quoteData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          proposal_number: quoteData.jobDetails.proposalNumber,
          project_name: quoteData.contactInfo.project_name || quoteData.quoteName,
          quote_details: quoteData.contactInfo || {},
          job_details: {
            job_location: quoteData.jobDetails.jobLocation,
            client_name: quoteData.jobDetails.billedTo.name,
            client_company: quoteData.jobDetails.billedTo.company,
            client_address: quoteData.jobDetails.billedTo.address,
            date: quoteData.jobDetails.date
          },
          wall_details: quoteData.walls || [],
          price_details: {
            base_price: quoteData.pricing.basePrice,
            freight: quoteData.pricing.freight,
            total: quoteData.pricing.total,
            payment_upon_drawings: quoteData.pricing.paymentUponDrawings,
            payment_upon_track_installation: quoteData.pricing.paymentUponTrackInstallation
          },
          support_structure: quoteData.supportStructure || {},
          delivery_details: quoteData.deliveryLabor.delivery || {},
          labor_details: quoteData.deliveryLabor.labor || {},
          status: quoteData.status || 'draft',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => [data as Quote, ...prev]);
      toast({
        title: "Quote created",
        description: `Quote ${quoteData.jobDetails.proposalNumber} has been created successfully.`,
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error creating quote",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateQuote = async (id: string, updates: Partial<Quote>) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? { ...quote, ...(data as Partial<Quote>) } : quote
      ));
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating quote",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setQuotes(prev => prev.filter(quote => quote.id !== id));
      toast({
        title: "Quote deleted",
        description: "Quote has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting quote",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const markAsDownloaded = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ date_last_downloaded: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? { ...quote, ...(data as Partial<Quote>) } : quote
      ));
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating download status",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  return {
    quotes,
    loading,
    createQuote,
    updateQuote,
    deleteQuote,
    markAsDownloaded,
    refreshQuotes: fetchQuotes
  };
};