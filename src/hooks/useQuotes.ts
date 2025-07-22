import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { WallDetails } from "@/types/quote";

type QuoteRow = Database['public']['Tables']['quotes']['Row'];

export interface Quote {
  id: string;
  proposal_number: string;
  project_name?: string;
  quote_details: any;
  job_details: any;
  wall_details: WallDetails;
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

// Helper function to migrate wall_details from old array format to new object format
const migrateWallDetails = (wallDetails: any): WallDetails => {
  if (!wallDetails) return {};
  
  // If it's already an object, return as is
  if (typeof wallDetails === 'object' && !Array.isArray(wallDetails)) {
    return wallDetails;
  }
  
  // If it's an array, convert to object format
  if (Array.isArray(wallDetails)) {
    const migratedWalls: WallDetails = {};
    wallDetails.forEach((wall, index) => {
      const wallName = wall.name || `Wall ${index + 1}`;
      const { id, name, ...wallSpec } = wall;
      migratedWalls[wallName] = wallSpec;
    });
    return migratedWalls;
  }
  
  return {};
};

// Helper function to convert database row to Quote interface
const convertRowToQuote = (row: QuoteRow): Quote => {
  return {
    ...row,
    wall_details: migrateWallDetails(row.wall_details),
    project_name: row.project_name || undefined,
    date_last_downloaded: row.date_last_downloaded || undefined
  };
};

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
      setQuotes(data ? data.map(convertRowToQuote) : []);
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
          wall_details: quoteData.walls || {},
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
          status: quoteData.status || 'Draft',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => [convertRowToQuote(data), ...prev]);
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
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? { ...quote, ...convertRowToQuote(data) } : quote
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
        quote.id === id ? { ...quote, ...convertRowToQuote(data) } : quote
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