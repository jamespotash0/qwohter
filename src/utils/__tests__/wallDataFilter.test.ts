import { describe, it, expect } from 'vitest';
import { filterWallDataByType, filterWallDetailsForSave } from '../wallDataFilter';
import type { WallSpecification } from '@/types/quote';

describe('wallDataFilter', () => {
  describe('filterWallDataByType', () => {
    it('should filter operable wall data correctly', () => {
      const operableWallSpec: WallSpecification = {
        wallSystemType: 'operable_wall',
        lengthFeet: 20,
        lengthInches: 6,
        heightFeet: 8,
        heightInches: 0,
        quantity: 2,
        panelConfiguration: 'single',
        panelCount: 10,
        series: 'M-Series',
        model: 'M-100',
        panelThickness: '3"',
        panelDesign: 'solid',
        panelSkin: 'vinyl',
        stcRating: 45,
        passDoorPanels: 1,
        passDoorQuantity: 1,
        // Glass wall specific field that should be filtered out
        glasswallModel: 'should-be-removed',
        // Accordion wall specific field that should be filtered out  
        verticalSeals: 'magnetic',
      } as any;

      const filtered = filterWallDataByType(operableWallSpec);

      // Should include operable wall fields
      expect(filtered.wallSystemType).toBe('operable_wall');
      expect(filtered.lengthFeet).toBe(20);
      expect(filtered.series).toBe('M-Series');
      expect(filtered.panelConfiguration).toBe('single');
      
      // Should exclude glass wall specific fields
      expect(filtered).not.toHaveProperty('glasswallModel');
      
      // Should include common fields like verticalSeals for operable walls
      expect(filtered.verticalSeals).toBe('magnetic');
    });

    it('should filter glass wall data correctly', () => {
      const glassWallSpec: WallSpecification = {
        wallSystemType: 'glass_wall',
        lengthFeet: 15,
        lengthInches: 0,
        heightFeet: 9,
        heightInches: 6,
        quantity: 1,
        panelCount: 8,
        glasswallModel: 'GW-500',
        glasswallOperation: 'manual',
        glasswallPanelConfiguration: 'accordion',
        glasswallFrameFinish: 'anodized',
        glasswallGlassType: 'tempered',
        // Operable wall specific field that should be filtered out
        series: 'should-be-removed',
        panelConfiguration: 'should-be-removed',
      } as any;

      const filtered = filterWallDataByType(glassWallSpec);

      // Should include glass wall fields
      expect(filtered.wallSystemType).toBe('glass_wall');
      expect(filtered.glasswallModel).toBe('GW-500');
      expect(filtered.glasswallOperation).toBe('manual');
      expect(filtered.glasswallFrameFinish).toBe('anodized');
      
      // Should exclude operable wall specific fields
      expect(filtered).not.toHaveProperty('series');
      expect(filtered).not.toHaveProperty('panelConfiguration');
    });

    it('should filter accordion wall data correctly', () => {
      const accordionWallSpec: WallSpecification = {
        wallSystemType: 'accordion_partition',
        lengthFeet: 12,
        lengthInches: 0,
        heightFeet: 8,
        heightInches: 6,
        quantity: 3,
        panelConfiguration: 'paired',
        panelCount: 6,
        series: 'A-Series',
        model: 'A-200',
        panelThickness: '2.5"',
        verticalSeals: 'brush',
        bottomSeals: 'automatic',
        // Glass wall specific field that should be filtered out
        glasswallModel: 'should-be-removed',
        glasswallGlassType: 'should-be-removed',
      } as any;

      const filtered = filterWallDataByType(accordionWallSpec);

      // Should include accordion wall fields
      expect(filtered.wallSystemType).toBe('accordion_partition');
      expect(filtered.panelConfiguration).toBe('paired');
      expect(filtered.series).toBe('A-Series');
      expect(filtered.verticalSeals).toBe('brush');
      
      // Should exclude glass wall specific fields
      expect(filtered).not.toHaveProperty('glasswallModel');
      expect(filtered).not.toHaveProperty('glasswallGlassType');
    });

    it('should handle undefined wallSystemType by defaulting to operable wall', () => {
      const unknownSpec: WallSpecification = {
        lengthFeet: 10,
        heightFeet: 8,
        quantity: 1,
        series: 'Test-Series',
        glasswallModel: 'should-be-removed',
      } as any;

      const filtered = filterWallDataByType(unknownSpec);

      // Should default to operable wall filtering
      expect(filtered.series).toBe('Test-Series');
      expect(filtered).not.toHaveProperty('glasswallModel');
    });

    it('should handle empty specification object', () => {
      const emptySpec: WallSpecification = {} as WallSpecification;
      
      const filtered = filterWallDataByType(emptySpec);
      
      expect(filtered).toEqual({});
    });
  });

  describe('filterWallDetailsForSave', () => {
    it('should filter multiple walls correctly', () => {
      const wallDetails = {
        walls: {
          'Wall A': {
            wallSystemType: 'operable_wall',
            lengthFeet: 20,
            series: 'M-Series',
            glasswallModel: 'should-be-removed',
          },
          'Wall B': {
            wallSystemType: 'glass_wall',
            lengthFeet: 15,
            glasswallModel: 'GW-500',
            series: 'should-be-removed',
          },
        },
        otherProperty: 'should-be-preserved',
      };

      const filtered = filterWallDetailsForSave(wallDetails);

      // Should preserve non-wall properties
      expect(filtered.otherProperty).toBe('should-be-preserved');
      
      // Should filter Wall A (operable wall)
      expect(filtered.walls['Wall A'].series).toBe('M-Series');
      expect(filtered.walls['Wall A']).not.toHaveProperty('glasswallModel');
      
      // Should filter Wall B (glass wall)  
      expect(filtered.walls['Wall B'].glasswallModel).toBe('GW-500');
      expect(filtered.walls['Wall B']).not.toHaveProperty('series');
    });

    it('should handle missing walls property', () => {
      const wallDetails = {
        someOtherProperty: 'test',
      };

      const filtered = filterWallDetailsForSave(wallDetails);
      
      expect(filtered).toEqual(wallDetails);
    });

    it('should handle null/undefined input', () => {
      expect(filterWallDetailsForSave(null)).toBeNull();
      expect(filterWallDetailsForSave(undefined)).toBeUndefined();
    });

    it('should handle empty walls object', () => {
      const wallDetails = {
        walls: {},
        otherProperty: 'preserved',
      };

      const filtered = filterWallDetailsForSave(wallDetails);
      
      expect(filtered.walls).toEqual({});
      expect(filtered.otherProperty).toBe('preserved');
    });
  });
});