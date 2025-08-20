import { WallSpecification, PocketDoorConfig, WallDetails } from '@/types/quote';
import { Tables } from '@/integrations/supabase/types';

// Quote data interface based on Supabase schema
interface QuoteData {
  id?: string;
  project_name?: string | null;
  proposal_number?: string;
  status?: string;
  pocket_doors?: {
    foldType?: string;
    foldStyle?: string;
  };
  wall_details?: WallDetails;
  quote_details?: Record<string, unknown>;
  job_details?: Record<string, unknown>;
  delivery_details?: Record<string, unknown>;
  labor_details?: Record<string, unknown>;
  price_details?: Record<string, unknown>;
  support_structure?: Record<string, unknown>;
}

// Extend QuoteData interface for migration flags
interface QuoteDataWithMigrationFlags extends QuoteData {
  _migrationFlags?: {
    pocketDoorsMigratedToPerWall?: boolean;
    migratedAt?: string;
  };
}

/**
 * Migration utilities for updating existing quotes to support per-wall configurations
 */
export class QuoteMigrationUtils {
  
  /**
   * Deep clone an object to avoid mutation issues
   */
  private static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  /**
   * Migrate global pocket_doors to per-wall configurations
   */
  static migratePocketDoorsToPerWall(quote: QuoteDataWithMigrationFlags): QuoteDataWithMigrationFlags {
    try {
      if (!quote.pocket_doors?.foldType || !quote.wall_details?.walls) {
        return quote; // Nothing to migrate
      }

      // Deep clone the quote to avoid mutations
      const migratedQuote = this.deepClone(quote);
      const { foldType, foldStyle } = quote.pocket_doors;

      if (!migratedQuote.wall_details?.walls) {
        return migratedQuote;
      }

      // Create new walls object with pocket doors configuration
      const updatedWalls: { [key: string]: WallSpecification } = {};
      
      Object.entries(migratedQuote.wall_details.walls).forEach(([wallName, wall]) => {
        updatedWalls[wallName] = {
          ...wall,
          pocketDoors: wall.pocketDoors || {
            foldType,
            foldStyle: foldStyle || ''
          }
        };
      });

      // Update the quote with new walls configuration
      migratedQuote.wall_details = {
        ...migratedQuote.wall_details,
        walls: updatedWalls
      };

      // Mark as migrated
      migratedQuote._migrationFlags = {
        ...migratedQuote._migrationFlags,
        pocketDoorsMigratedToPerWall: true,
        migratedAt: new Date().toISOString()
      };

      return migratedQuote;
    } catch (error) {
      console.error('Error migrating pocket doors to per-wall:', error);
      return quote; // Return original quote if migration fails
    }
  }

  /**
   * Initialize default per-wall configurations for new quotes
   */
  static initializePerWallConfigurations(walls: { [key: string]: WallSpecification }): { [key: string]: WallSpecification } {
    try {
      if (!walls || typeof walls !== 'object') {
        return {};
      }

      const initializedWalls: { [key: string]: WallSpecification } = {};

      Object.entries(walls).forEach(([wallName, wall]) => {
        if (!wall || typeof wall !== 'object') {
          console.warn(`Invalid wall data for ${wallName}, skipping initialization`);
          initializedWalls[wallName] = wall;
          return;
        }

        initializedWalls[wallName] = {
          ...wall,
          
          // Initialize pocket doors if not set
          pocketDoors: wall.pocketDoors || {
            foldType: 'None',
            foldStyle: ''
          },

          // Initialize track configuration if not set
          trackConfiguration: wall.trackConfiguration || {
            trackType: wall.trackType || '',
            trackSystem: wall.trackSystem || ''
          },

          // Initialize structure support if not set
          structureSupport: wall.structureSupport || 'None',

          // Ensure pass door panels has a default
          passDoorPanels: wall.passDoorPanels || 'None'
        };
      });

      return initializedWalls;
    } catch (error) {
      console.error('Error initializing per-wall configurations:', error);
      return walls; // Return original walls if initialization fails
    }
  }

  /**
   * Check if quote needs migration
   */
  static needsMigration(quote: QuoteDataWithMigrationFlags): boolean {
    try {
      if (!quote || typeof quote !== 'object') {
        return false;
      }

      const hasPocketDoorsMigration = quote.pocket_doors?.foldType && 
        !quote._migrationFlags?.pocketDoorsMigratedToPerWall;
      
      const hasUninitializedWalls = quote.wall_details?.walls && 
        Object.values(quote.wall_details.walls).some(wall => {
          const wallSpec = wall as WallSpecification;
          return wallSpec && (
            !wallSpec.pocketDoors || 
            !wallSpec.structureSupport || 
            wallSpec.structureSupport === '' ||
            (!wallSpec.passDoorPanels || wallSpec.passDoorPanels === '')
          );
        });

      return hasPocketDoorsMigration || hasUninitializedWalls;
    } catch (error) {
      console.error('Error checking if migration is needed:', error);
      return false;
    }
  }

  /**
   * Run all necessary migrations on a quote
   */
  static migrateQuote(quote: QuoteDataWithMigrationFlags): QuoteDataWithMigrationFlags {
    try {
      if (!quote || typeof quote !== 'object') {
        console.warn('Invalid quote object provided for migration');
        return quote;
      }

      let migratedQuote = this.deepClone(quote);

      // Step 1: Migrate global pocket doors to per-wall
      if (migratedQuote.pocket_doors?.foldType) {
        migratedQuote = this.migratePocketDoorsToPerWall(migratedQuote);
      }

      // Step 2: Initialize missing per-wall configurations
      if (migratedQuote.wall_details?.walls) {
        const initializedWalls = this.initializePerWallConfigurations(
          migratedQuote.wall_details.walls
        );
        
        migratedQuote.wall_details = {
          ...migratedQuote.wall_details,
          walls: initializedWalls
        };
      }

      return migratedQuote;
    } catch (error) {
      console.error('Error migrating quote:', error);
      return quote; // Return original quote if migration fails
    }
  }

  /**
   * Get migration summary for logging/debugging
   */
  static getMigrationSummary(originalQuote: QuoteDataWithMigrationFlags, migratedQuote: QuoteDataWithMigrationFlags): string {
    try {
      const changes: string[] = [];

      if (originalQuote.pocket_doors?.foldType && !originalQuote._migrationFlags?.pocketDoorsMigratedToPerWall) {
        changes.push(`Migrated global pocket doors (${originalQuote.pocket_doors.foldType}) to per-wall`);
      }

      const wallCount = Object.keys(migratedQuote.wall_details?.walls || {}).length;
      if (wallCount > 0) {
        const uninitializedCount = Object.values(originalQuote.wall_details?.walls || {}).filter(wall => 
          wall && (!(wall as WallSpecification).pocketDoors || !(wall as WallSpecification).structureSupport)
        ).length;
        
        if (uninitializedCount > 0) {
          changes.push(`Initialized per-wall configurations for ${uninitializedCount} of ${wallCount} walls`);
        }
      }

      return changes.length > 0 ? changes.join('; ') : 'No migration needed';
    } catch (error) {
      console.error('Error generating migration summary:', error);
      return 'Migration summary unavailable due to error';
    }
  }

  /**
   * Validate migrated quote data integrity
   */
  static validateMigratedQuote(quote: QuoteDataWithMigrationFlags): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (!quote) {
        errors.push('Quote is null or undefined');
        return { isValid: false, errors };
      }

      if (quote.wall_details?.walls) {
        Object.entries(quote.wall_details.walls).forEach(([wallName, wall]) => {
          if (!wall) {
            errors.push(`Wall ${wallName} is null or undefined`);
            return;
          }

          const wallSpec = wall as WallSpecification;

          if (!wallSpec.pocketDoors) {
            errors.push(`Wall ${wallName} missing pocketDoors configuration`);
          }

          if (!wallSpec.structureSupport) {
            errors.push(`Wall ${wallName} missing structureSupport configuration`);
          }

          if (!wallSpec.passDoorPanels) {
            errors.push(`Wall ${wallName} missing passDoorPanels configuration`);
          }
        });
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }
}