/**
 * @deprecated This utility is DEPRECATED. Use proposalsService.generateNextProposalNumber() instead.
 *
 * This file uses the old 'quotes' table which is being phased out.
 * The new system uses the 'proposals' table with React Query.
 *
 * Migration:
 * - OLD: ProposalNumberGenerator.getNextProposalNumber()
 * - NEW: generateNextProposalNumber(organizationId) from '@/services/proposalsService'
 *
 * See: src/services/proposalsService.ts
 * ============================================================================
 * DEPRECATED - DO NOT USE
 * ============================================================================
 */

import { supabase } from '@/integrations/supabase/client';
import { organizationSettingsService } from '@/services/companySettingsService';

export interface ProposalNumberInfo {
  mainNumber: string;
  version: number;
  fullNumber: string;
  displayNumber: string;
}

export class ProposalNumberGenerator {
  static async getNextProposalNumber(existingProposalNumber?: string): Promise<ProposalNumberInfo> {
    if (existingProposalNumber) {
      return this.generateNewVersion(existingProposalNumber);
    }

    return this.generateNewProposalNumber();
  }

  private static async generateNewProposalNumber(): Promise<ProposalNumberInfo> {
    try {
      // Get organization's quote starting point
      const organization = await organizationSettingsService.getOrganization();
      const quoteStartingPoint = organization?.quote_start_number || 'P100001';

      const { data, error } = await supabase
        .from('quotes')
        .select('proposal_number')
        .order('proposal_number', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Parse the starting point to extract prefix and number
      const { prefix, baseNumber } = this.parseQuoteStartingPoint(quoteStartingPoint);
      // Start one below the base number so that incrementing gives us the base number as the first quote
      let highestMainNumber = baseNumber - 1;

      if (data && data.length > 0) {
        // Only consider quotes with the same prefix
        const mainNumbers = data
          .map((quote: any) => this.extractMainNumberWithPrefix(quote.proposal_number, prefix))
          .filter(num => num !== null)
          .map(num => num as number);

        if (mainNumbers.length > 0) {
          highestMainNumber = Math.max(highestMainNumber, ...mainNumbers);
        }
      }

      const newMainNumber = highestMainNumber + 1;
      const mainNumber = `${prefix}${newMainNumber}`;
      const fullNumber = mainNumber;
      const displayNumber = mainNumber;

      return {
        mainNumber,
        version: 1,
        fullNumber,
        displayNumber
      };
    } catch (error) {
      console.error('Error generating new quote number:', error);
      const fallbackNumber = `P${Date.now()}`;
      return {
        mainNumber: fallbackNumber,
        version: 1,
        fullNumber: fallbackNumber,
        displayNumber: fallbackNumber
      };
    }
  }

  private static async generateNewVersion(existingProposalNumber: string): Promise<ProposalNumberInfo> {
    try {
      const mainNumber = this.extractMainNumberString(existingProposalNumber);

      const { data, error } = await supabase
        .from('quotes')
        .select('proposal_number')
        .like('proposal_number', `${mainNumber}%`)
        .order('proposal_number', { ascending: false });

      if (error) throw error;

      let highestVersion = 1;

      if (data && data.length > 0) {
        const versions = data
          .map((quote: any) => this.extractVersion(quote.proposal_number))
          .filter(version => version !== null)
          .map(version => version as number);

        if (versions.length > 0) {
          highestVersion = Math.max(...versions);
        }
      }

      const newVersion = highestVersion + 1;
      const fullNumber = `${mainNumber}.${newVersion}`;
      const displayNumber = mainNumber;

      return {
        mainNumber,
        version: newVersion,
        fullNumber,
        displayNumber
      };
    } catch (error) {
      console.error('Error generating new version number:', error);
      const fallbackNumber = `${existingProposalNumber}.${Date.now()}`;
      return {
        mainNumber: this.extractMainNumberString(existingProposalNumber),
        version: 1,
        fullNumber: fallbackNumber,
        displayNumber: this.extractMainNumberString(existingProposalNumber)
      };
    }
  }

  /**
   * Parse the organization's quote starting point to extract prefix and base number
   * Supports formats like: P10001, 15000, Q-10001, etc.
   */
  private static parseQuoteStartingPoint(startingPoint: string): { prefix: string; baseNumber: number } {
    // Remove any spaces and convert to uppercase
    const cleaned = startingPoint.replace(/\s/g, '').toUpperCase();

    // Try to match prefix + number patterns (P10001, Q-10001, etc.)
    const prefixMatch = cleaned.match(/^([A-Z-]*)(\d+)$/);

    if (prefixMatch) {
      const prefix = prefixMatch[1] || '';
      const number = parseInt(prefixMatch[2]!, 10);
      return { prefix, baseNumber: number };
    }

    // If no prefix found, treat as pure number (15000)
    const numberMatch = cleaned.match(/^(\d+)$/);
    if (numberMatch) {
      return { prefix: '', baseNumber: parseInt(numberMatch[1]!, 10) };
    }

    // Fallback for unparseable formats
    console.warn('Could not parse quote starting point:', startingPoint);
    return { prefix: 'P', baseNumber: 100001 };
  }

  /**
   * Extract main number from proposal number, considering the prefix
   */
  private static extractMainNumberWithPrefix(proposalNumber: string, expectedPrefix: string): number | null {
    const escapedPrefix = expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}(\\d+)(?:\\.\\d+)?$`);
    const match = proposalNumber.match(pattern);
    return match ? parseInt(match[1]!, 10) : null;
  }


  private static extractMainNumberString(proposalNumber: string): string {
    // Updated to handle any prefix pattern
    const match = proposalNumber.match(/^([A-Z-]*\d+)(?:\.\d+)?$/);
    return match ? match[1]! : proposalNumber;
  }

  private static extractVersion(proposalNumber: string): number | null {
    // Updated to handle any prefix pattern
    const match = proposalNumber.match(/^[A-Z-]*\d+\.(\d+)$/);
    return match ? parseInt(match[1]!, 10) : 1;
  }

  static parseProposalNumber(proposalNumber: string): ProposalNumberInfo {
    const mainNumber = this.extractMainNumberString(proposalNumber);
    const version = this.extractVersion(proposalNumber) || 1;

    return {
      mainNumber,
      version,
      fullNumber: proposalNumber,
      displayNumber: proposalNumber
    };
  }
}
