import { useState, useEffect, ButtonHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { WallDetails, WallSpecification, QuoteCustomization } from "@/types/quote";
import { filterWallDetailsForSave } from "@/utils/wallDataFilter";

type QuoteRow = Database['public']['Tables']['quotes']['Row'];

export interface Quote {
  id: string;
  proposal_number: string;
  project_name?: string;
  quote_details: any;
  job_details: any;
  wall_details: WallDetails;
  pocket_doors?: any;
  price_details: any;
  support_structure: any;
  delivery_details: any;
  labor_details: any;
  status: string;
  date_last_downloaded?: string;
  version: number;
  created_at: string;
  updated_at: string;
  customization?: QuoteCustomization;
}

// Helper function to migrate wall_details to the new format with id and walls
const migrateWallDetails = (wallDetails: any): WallDetails => {
  // If it's already in the new format with id and walls, return as is
  if (wallDetails && wallDetails.id && wallDetails.walls) {
    return wallDetails;
  }
  
  // If it's in the object format but without id (previous migration), wrap it
  if (wallDetails && typeof wallDetails === 'object' && !Array.isArray(wallDetails) && !wallDetails.id) {
    return {
      id: crypto.randomUUID(),
      walls: wallDetails
    };
  }
  
  // If it's an array (old format), convert to new format
  if (Array.isArray(wallDetails)) {
    const wallsObject: { [key: string]: WallSpecification } = {};
    wallDetails.forEach((wall: any, index: number) => {
      const wallName = wall.name || `Wall ${index + 1}`;
      const { id, name, ...wallSpec } = wall;
      wallsObject[wallName] = wallSpec;
    });
    return {
      id: crypto.randomUUID(),
      walls: wallsObject
    };
  }
  
  // If empty or null, return default structure
  return {
    id: crypto.randomUUID(),
    walls: {}
  };
};

// Helper function to convert database row to Quote interface
const convertRowToQuote = (row: QuoteRow): Quote => {
  return {
    ...row,
    wall_details: migrateWallDetails(row.wall_details),
    project_name: row.project_name || undefined,
    date_last_downloaded: row.date_last_downloaded || undefined,
    status: row.status || undefined
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

      // Get user's organization from their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData?.organization_id) throw new Error('User not assigned to an organization');
      
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          proposal_number: quoteData.jobDetails.proposalNumber,
          project_name: quoteData.quoteName || quoteData.project_name,
          quote_details: quoteData.contactInfo || {},
          job_details: {
            job_location: quoteData.jobDetails.jobLocation || '',
            client_name: quoteData.jobDetails.billedTo.name || '',
            client_company: quoteData.jobDetails.billedTo.company || '',
            client_address: quoteData.jobDetails.billedTo.address || '',
            date: quoteData.jobDetails.date
           },
          wall_details: filterWallDetailsForSave(quoteData.walls || {}),
          pocket_doors: quoteData.pocketDoors || {},
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
          user_id: user.id,
          organization_id: profileData.organization_id
        })
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => [convertRowToQuote(data), ...prev]);
      toast({
        title: "Quote created",
        description: `Quote ${quoteData.proposal_number} has been created successfully.`,
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
      // Filter wall_details based on wall system type before saving
      let processedUpdates = { ...updates };
      if (updates.wall_details) {
        processedUpdates.wall_details = filterWallDetailsForSave(updates.wall_details);
      }

      const { data, error } = await supabase
        .from('quotes')
        .update(processedUpdates as any)
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

  const saveQuoteCustomization = async (id: string, customization: QuoteCustomization) => {
    try {
      // Update the version for customization tracking
      const currentQuote = quotes.find(q => q.id === id);
      const newVersion = (currentQuote?.version || 0) + 1;
      
      const updateData = {
        customization: {
          ...customization,
          lastModified: new Date().toISOString(),
          version: newVersion
        },
        version: newVersion
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? { ...quote, ...convertRowToQuote(data) } : quote
      ));
      
      toast({
        title: "Customization saved",
        description: "Quote customization has been saved successfully.",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error saving customization",
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
    saveQuoteCustomization,
    refreshQuotes: fetchQuotes
  };
};