/**
 * AI Milestone Service
 *
 * Generates project milestone suggestions using OpenAI API
 * Tailored for wall installation projects with payment milestones
 *
 * The AI intelligently parses the raw quote data to find delivery timeline
 * information regardless of where it's stored in the data structure.
 */

import OpenAI from 'openai';
import type { TimelineMilestone } from '@/lib/timelineMilestones';
import { generateMilestoneId } from '@/lib/timelineMilestones';

interface MilestoneSuggestion {
  label: string;
  date: string;
  notes?: string;
}

interface AIResponse {
  reasoning: string;
  milestones: MilestoneSuggestion[];
}

export interface AIMilestoneResult {
  milestones: TimelineMilestone[];
  reasoning: string;
}

export class AIMilestoneService {
  private static client: OpenAI | null = null;

  private static getClient(): OpenAI {
    if (!this.client) {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('VITE_OPENAI_API_KEY not found in environment variables');
      }

      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    return this.client;
  }

  /**
   * Sanitize quote data - remove sensitive info, keep relevant fields
   */
  private static sanitizeQuoteData(quoteData: Record<string, unknown>): string {
    // Remove potentially sensitive fields
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'credit_card'];

    const sanitize = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);

      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(s => lowerKey.includes(s))) continue;
        result[key] = sanitize(value);
      }
      return result;
    };

    const sanitized = sanitize(quoteData);
    return JSON.stringify(sanitized, null, 2);
  }

  /**
   * Generate milestone suggestions based on quote data
   */
  static async generateMilestones(
    quoteData: Record<string, unknown>,
    wonDate: string
  ): Promise<AIMilestoneResult> {
    try {
      const client = this.getClient();
      const rawQuoteJson = this.sanitizeQuoteData(quoteData);

      const prompt = `You are a project coordinator for a wall installation company. Analyze the quote data below and generate a realistic project timeline.

PROJECT WON DATE: ${wonDate}

RAW QUOTE DATA (JSON):
${rawQuoteJson}

YOUR TASK:
1. Search through the entire quote data structure to find delivery/timeline information
2. Look for fields like: shopDrawingWeeks, trackDeliveryWeeks, panelDeliveryWeeks, trackInstallationDays, panelInstallationDays
3. These could be nested anywhere: delivery_details, form_data, delivery, etc.
4. If you find these values, use them EXACTLY to calculate dates
5. If no delivery timeline exists, use standard estimates

MILESTONE SEQUENCE TO CREATE:
1. 30% Deposit Received - within 1 week of won date
2. Shop Drawings Delivered - use shopDrawingWeeks (or estimate 2 weeks)
3. Shop Drawings Approved - ~1 week after delivery for client review
4. Track Delivered to Site - use trackDeliveryWeeks after approval (or estimate 4 weeks)
5. Track Installation Complete - use trackInstallationDays after track delivery (or estimate 3 days)
6. Panels Delivered to Site - use panelDeliveryWeeks after track installation (or estimate 4 weeks)
7. Panel Installation Complete - use panelInstallationDays after panel delivery (or estimate 2 days)
8. Final Walkthrough - 1-2 days after installation complete
9. Final Payment Due - upon completion

IMPORTANT:
- If a value shows "4" weeks, use 4 weeks (28 days)
- If it shows "3-4" weeks, use the average
- Tell me in your reasoning what delivery values you found (or didn't find) in the data

Respond with JSON only:
{
  "reasoning": "I found/didn't find delivery timeline in the quote. [Explain what you found and how you calculated dates]",
  "milestones": [{"label": "Milestone Name", "date": "YYYY-MM-DD", "notes": "Brief description"}]
}`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a wall installation project coordinator. Analyze JSON data to find delivery timeline values and calculate precise dates. Respond with valid JSON only, no markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      // Clean up response
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const aiResponse: AIResponse = JSON.parse(cleanedResponse);

      // Convert to TimelineMilestone format
      const milestones: TimelineMilestone[] = aiResponse.milestones.map((suggestion, index) => ({
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
        reasoning: aiResponse.reasoning,
      };
    } catch (error) {
      console.error('Error generating AI milestones:', error);
      throw error;
    }
  }

  static isConfigured(): boolean {
    return !!import.meta.env.VITE_OPENAI_API_KEY;
  }
}
