import { supabase } from '@/integrations/supabase/client';

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
    
    return this.generateNewQuoteNumber();
  }

  private static async generateNewQuoteNumber(): Promise<ProposalNumberInfo> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('proposal_number')
        .order('proposal_number', { ascending: false })
        .limit(100);

      if (error) throw error;

      let highestMainNumber = 100000;

      if (data && data.length > 0) {
        const mainNumbers = data
          .map(quote => this.extractMainNumber(quote.proposal_number))
          .filter(num => num !== null)
          .map(num => num as number);

        if (mainNumbers.length > 0) {
          highestMainNumber = Math.max(...mainNumbers);
        }
      }

      const newMainNumber = highestMainNumber + 1;
      const mainNumber = `P${newMainNumber}`;
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
          .map(quote => this.extractVersion(quote.proposal_number))
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

  private static extractMainNumber(proposalNumber: string): number | null {
    const match = proposalNumber.match(/^P(\d+)(?:\.\d+)?$/);
    return match ? parseInt(match[1], 10) : null;
  }

  private static extractMainNumberString(proposalNumber: string): string {
    const match = proposalNumber.match(/^(P\d+)(?:\.\d+)?$/);
    return match ? match[1] : proposalNumber;
  }

  private static extractVersion(proposalNumber: string): number | null {
    const match = proposalNumber.match(/^P\d+\.(\d+)$/);
    return match ? parseInt(match[1], 10) : 1;
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