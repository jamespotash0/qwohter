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
    wall_details: (() => {
      const migrated = migrateWallDetails(row.wall_details);
      return {
        ...migrated,
        id: migrated.id || crypto.randomUUID()
      };
    })(),
    project_name: row.project_name || undefined,
    date_last_downloaded: row.date_last_downloaded || undefined,
    status: row.status || 'Draft',
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
          wall_details: quoteData.walls || {},
          price_details: {
            base_price: quoteData.pricing.basePrice,
            freight: quoteData.pricing.freight,
            total: quoteData.pricing.total,
            payment_upon_drawings: quoteData.pricing.paymentUponDrawings,
            payment_upon_track_installation: quoteData.pricing.paymentUponTrackInstallation
          },
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
      const currentWallDetails = migrateWallDetails(currentQuote.wall_details);
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

      // Get current wall details and migrate if needed
      const currentWallDetails = migrateWallDetails(currentQuote.wall_details);
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

      // Create new quote with incremented version
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          ...existingQuote,
          id: undefined, // Let Supabase generate new ID
          proposal_number: proposalInfo.fullNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          date_last_downloaded: null,
          version: proposalInfo.version
        })
        .select()
        .single();

      if (error) throw error;

      setQuotes(prev => [convertRowToQuote(data), ...prev]);
      
      return data;
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
    updateWallSystem,
    removeWallSystem,
    deleteQuote,
    markAsDownloaded,
    saveQuoteCustomization,
    refreshQuotes: fetchQuotes
  };
};