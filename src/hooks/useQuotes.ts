import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { WallDetails, WallSpecification, QuoteCustomization } from "@/lib/types";
// Note: filterWallDetailsForSave removed - discriminated union types now prevent invalid data
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";

type QuoteRow = Database['public']['Tables']['quotes']['Row'];

export interface Quote {
  id: string;
  proposal_number: string;
  project_name?: string;
  quote_details: any;
  job_details: any;
  wall_details: WallDetails;
  price_details: any;
  delivery_details: any;
  labor_details: any;
  status: string;
  quote_source?: string;
  follow_up_days?: number;
  created_by?: string;
  creator_name?: string; // Full name from profiles table
  status_last_updated?: string;
  date_last_downloaded?: string;
  version: number;
  created_at: string;
  updated_at: string;
  customization?: QuoteCustomization;
}


// Helper function to prepare wall data for database save
const prepareWallDataForSave = (wallsData: any): WallDetails => {
  if (!wallsData || typeof wallsData !== 'object') {
    return {
      id: crypto.randomUUID(),
      walls: {}
    };
  }

  // If wallsData already has the WallDetails structure (id + walls), return it as-is
  if (wallsData.id && wallsData.walls && typeof wallsData.walls === 'object') {
    return wallsData;
  }

  // Otherwise, wrap the data as walls
  return {
    id: crypto.randomUUID(),
    walls: wallsData
  };
};

// Helper function to convert database row to Quote interface
const convertRowToQuote = (row: any): Quote => {
  return {
    ...row,
    wall_details: row.wall_details as unknown as WallDetails,
    project_name: row.project_name || undefined,
    date_last_downloaded: row.date_last_downloaded || undefined,
    status: row.status || 'Draft',
    creator_name: row.creator_name || 'Unknown',
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
      .select(`
        *,
        creator:profiles!quotes_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });
    
      if (error) throw error;

    const quotesWithCreatorNames = data
      ? data.map(quote => ({
          ...quote as object,
          creator_name: quote.creator?.full_name || 'Unknown',
        }))
      : [];

    setQuotes(quotesWithCreatorNames.map(convertRowToQuote));
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
      // Get user's organization through membership and profile data
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          organization_id,
          profiles (
            full_name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'Active')
        .single();

      if (membershipError) throw membershipError;
      if (!membershipData?.organization_id) throw new Error('User not assigned to an organization');

      const profileData = (membershipData as any).profiles;
      if (!profileData?.full_name) throw new Error('User profile incomplete');
      
      // Generate proposal number
      const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber();
      
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          proposal_number: proposalInfo.fullNumber,
          project_name: quoteData.quoteName || quoteData.project_name,
          quote_details: quoteData.contactInfo || {},
          job_details: {
            job_location: quoteData.jobDetails.jobLocation || '',
            client_name: quoteData.jobDetails.billedTo.name || '',
            client_company: quoteData.jobDetails.billedTo.company || '',
            client_address: quoteData.jobDetails.billedTo.address || '',
            date: quoteData.jobDetails.date
           },
          wall_details: prepareWallDataForSave(quoteData.walls) as any,
          quote_source: quoteData.contactInfo?.quoteSource || '',
          created_by: user.id,
          organization_id: membershipData.organization_id,
          price_details: {
            payment_upon_drawings: quoteData.pricing.payment_upon_drawings,
            payment_upon_track_installation: quoteData.pricing.payment_upon_track_installation,
      
            kwik_wall_materials_cost: quoteData.pricing.kwik_wall_materials_cost || 0,
            misc_materials_cost: quoteData.pricing.misc_materials_cost || 0,
            delivery_cost_track: quoteData.pricing.delivery_cost_track || 0,
            delivery_cost_panel: quoteData.pricing.delivery_cost_panel || 0,
            track_equipment_costs: quoteData.pricing.track_equipment_costs || 0,
            track_labor_cost: quoteData.pricing.track_labor_cost || 0,
            panel_equipment_costs: quoteData.pricing.panel_equipment_costs || 0,
            panel_labor_cost: quoteData.pricing.panel_labor_cost || 0,
            track_freight_factory: quoteData.pricing.track_freight_factory || 0,
            panel_freight_factory: quoteData.pricing.panel_freight_factory || 0,
            local_handling_costs: quoteData.pricing.local_handling_costs || 0,
            materials_markup_percentage: quoteData.pricing.materials_markup_percentage || 0,
            shipping_markup_percentage: quoteData.pricing.shipping_markup_percentage || 0,
            unseen_costs: quoteData.pricing.unseen_costs || 0,
            unseen_costs_percentage: quoteData.pricing.unseen_costs_percentage || 10,
            unseen_costs_locked: quoteData.pricing.unseen_costs_locked !== false,
            cost_subtotal: quoteData.pricing.cost_subtotal || 0,
            base_selling_price: quoteData.pricing.base_selling_price || 0,
            shipping_cost_subtotal: quoteData.pricing.shipping_cost_subtotal || 0,
            shipping_selling_price: quoteData.pricing.shipping_selling_price || 0,
            final_selling_price: quoteData.pricing.final_selling_price || 0,
            base_selling_gross_profit_percentage: quoteData.pricing.base_selling_gross_profit_percentage,
            shipping_selling_gross_profit_percentage: quoteData.pricing.shipping_selling_gross_profit_percentage,
            final_selling_gross_profit_percentage: quoteData.pricing.final_selling_gross_profit_percentage,
            final_selling_price_profit_amount: quoteData.pricing.final_selling_price_profit_amount
          },
          delivery_details: quoteData.deliveryLabor.delivery || {},
          labor_details: quoteData.deliveryLabor.labor || {},
          status: quoteData.status || 'Draft',
          status_last_updated: null,
          follow_up_days: null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newQuote = convertRowToQuote({
        ...data as object,
        creator_name: profileData.full_name
      });
      setQuotes(prev => [newQuote, ...prev]);

      return newQuote;
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
      // Note: wall_details filtering removed - discriminated unions ensure type safety
      let processedUpdates = { ...updates };

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

  // Dedicated function for updating wall systems
  const updateWallSystem = async (quoteId: string, wallName: string, wallData: WallSpecification) => {
    try {
      // Get the current quote
      const { data: currentQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('wall_details')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific wall in the wall_details
      const currentWallDetails = currentQuote.wall_details as unknown as WallDetails;
      const updatedWallDetails = {
        ...currentWallDetails,
        walls: {
          ...currentWallDetails.walls,
          [wallName]: wallData
        }
      };

      // Update only the wall_details field
      const { data, error } = await supabase
        .from('quotes')
        .update({ 
          wall_details: updatedWallDetails as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId ? { ...quote, ...convertRowToQuote(data) } : quote
      ));

      toast({
        title: "Wall system updated",
        description: `${wallName} has been updated successfully.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error updating wall system",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Dedicated function for removing wall systems with renaming logic
  const removeWallSystem = async (quoteId: string, wallNameToRemove: string) => {
    try {
      // Get the current quote
      const { data: currentQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('wall_details')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Get current wall details  
      const currentWallDetails = currentQuote.wall_details as unknown as WallDetails;
      const currentWalls = { ...currentWallDetails.walls };

      // Remove the specified wall
      delete currentWalls[wallNameToRemove];

      // Get all remaining wall names and sort them alphabetically for consistent renaming
      const remainingWallNames = Object.keys(currentWalls).sort();

      // Create renaming map for remaining walls
      const renamedWalls: { [key: string]: WallSpecification } = {};
      const wallLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

      remainingWallNames.forEach((oldWallName, index) => {
        const newWallName = `Wall ${wallLabels[index]}`;
        renamedWalls[newWallName] = currentWalls[oldWallName] as WallSpecification; //wallSpecification
      });

      // Update the wall details with renamed walls
      const updatedWallDetails = {
        ...currentWallDetails,
        walls: renamedWalls
      };

      // Update the database
      const { data, error } = await supabase
        .from('quotes')
        .update({ 
          wall_details: updatedWallDetails as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId ? { ...quote, ...convertRowToQuote(data) } : quote
      ));

      toast({
        title: "Wall removed successfully",
        description: `${wallNameToRemove} has been removed and remaining walls have been renumbered.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error removing wall system",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const updateFollowUpDays = async (id: string, days: number | null) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({ follow_up_days: days })
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
        title: "Error updating follow-up days",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const createQuoteVersion = async (existingQuoteId: string) => {
    try {
      // Get the existing quote
      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', existingQuoteId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new version number
      const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber(existingQuote.proposal_number);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's profile to get full_name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Create new quote with incremented version
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          ...existingQuote as any,
          id: undefined, // Let Supabase generate new ID
          proposal_number: proposalInfo.fullNumber,
          created_by: user.id, // Use current user as creator
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          date_last_downloaded: null,
          version: proposalInfo.version
        })
        .select()
        .single();

      if (error) throw error;

      const newQuote = convertRowToQuote({
        ...data as object,
        creator_name: profileData.full_name
      });
      setQuotes(prev => [newQuote, ...prev]);

      return newQuote;
    } catch (error: any) {
      toast({
        title: "Error creating quote version",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    quotes,
    loading,
    createQuote,
    createQuoteVersion,
    updateQuote,
    updateFollowUpDays,
    updateWallSystem,
    removeWallSystem,
    deleteQuote,
    markAsDownloaded,
    saveQuoteCustomization,
    refreshQuotes: fetchQuotes
  };
};