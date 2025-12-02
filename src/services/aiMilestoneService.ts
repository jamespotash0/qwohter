/**
 * AI Milestone Service
 *
 * Generates project milestone suggestions via Supabase Edge Function
 * The API key is securely stored server-side in Supabase secrets
 */

import { supabase } from '@/integrations/supabase/client';
import type { TimelineMilestone } from '@/lib/timelineMilestones';
import { generateMilestoneId } from '@/lib/timelineMilestones';

interface MilestoneSuggestion {
  label: string;
  date: string;
  notes?: string;
}

interface EdgeFunctionResponse {
  success: boolean;
  milestones: MilestoneSuggestion[];
  reasoning: string;
  error?: string;
}

export interface AIMilestoneResult {
  milestones: TimelineMilestone[];
  reasoning: string;
}

export class AIMilestoneService {
  /**
   * Generate milestone suggestions based on quote data
   * Calls Supabase Edge Function which securely handles OpenAI API
   */
  static async generateMilestones(
    quoteData: Record<string, unknown>,
    wonDate: string
  ): Promise<AIMilestoneResult> {
    try {
      const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
        'ai-milestones',
        {
          body: {
            quoteData,
            wonDate,
          },
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate AI milestones');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'AI milestone generation failed');
      }

      // Convert to TimelineMilestone format
      const milestones: TimelineMilestone[] = data.milestones.map((suggestion, index) => ({
        id: generateMilestoneId(),
        label: suggestion.label,
        date: suggestion.date,
        notes: suggestion.notes,
        completed: false,
        order: index,
        created_at: new Date().toISOString(),
      }));

      return {
        milestones,
        reasoning: data.reasoning,
      };
    } catch (error) {
      console.error('Error generating AI milestones:', error);
      throw error;
    }
  }

  /**
   * Check if AI milestone service is available
   * Always returns true since the API key is managed server-side
   */
  static isConfigured(): boolean {
    return true;
  }
}
