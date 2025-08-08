// Wall Specification ViewModel
// Pure business logic class without React dependencies

import { WallSpecification, WallDetails, GlassWallConfiguration } from '@/types/quote';
import { 
  createDefaultWallSpec, 
  mapGlassWallConfigToWallSpec, 
  getEmptyGlassWallFields,
  cloneWallSpecification
} from '@/models/WallDataMapper';
import { validateAllWalls, ValidationResult } from '@/models/WallValidation';

/**
 * Pure ViewModel class for Wall Specification business logic
 * No React dependencies - purely business logic
 */
export class WallSpecificationViewModel {
  private walls: WallDetails;
  private editingWallName: string | null = null;
  private newWallName: string = "";
  private collapsedWalls: Set<string> = new Set();
  private onUpdate: (walls: WallDetails) => void;

  constructor(initialWalls: WallDetails, onUpdate: (walls: WallDetails) => void) {
    this.walls = { ...initialWalls };
    this.onUpdate = onUpdate;
  }

  // Getters for state
  get currentWalls(): WallDetails {
    return this.walls;
  }

  get currentEditingWallName(): string | null {
    return this.editingWallName;
  }

  get currentNewWallName(): string {
    return this.newWallName;
  }

  get currentCollapsedWalls(): Set<string> {
    return new Set(this.collapsedWalls);
  }

  // Computed properties
  get wallNames(): string[] {
    return Object.keys(this.walls.walls);
  }

  get wallCount(): number {
    return this.wallNames.length;
  }

  get hasWalls(): boolean {
    return this.wallCount > 0;
  }

  get validationResult() {
    return validateAllWalls(this.walls);
  }

  // Private helper to update walls and notify parent
  private updateWalls(newWalls: WallDetails): void {
    this.walls = { ...newWalls };
    this.onUpdate(newWalls);
  }

  // Wall CRUD operations
  addWall(wallSystemType: string = ""): void {
    // Generate unique wall name
    let wallIndex = this.wallCount + 1;
    let newWallName = `Wall ${String.fromCharCode(64 + wallIndex)}`; // Wall A, Wall B, etc.
    
    while (this.walls.walls[newWallName]) {
      wallIndex++;
      newWallName = `Wall ${String.fromCharCode(64 + wallIndex)}`;
    }
    
    const defaultWall = createDefaultWallSpec(wallSystemType);
    
    const updatedWalls = {
      ...this.walls,
      walls: {
        ...this.walls.walls,
        [newWallName]: defaultWall,
      },
    };
    
    this.updateWalls(updatedWalls);
  }

  removeWall(wallName: string): void {
    if (!this.walls.walls[wallName]) return;
    
    const { [wallName]: removedWall, ...remainingWalls } = this.walls.walls;
    const updatedWalls = {
      ...this.walls,
      walls: remainingWalls,
    };
    
    // Also remove from collapsed set if it was collapsed
    this.collapsedWalls.delete(wallName);
    
    this.updateWalls(updatedWalls);
  }

  renameWall(oldName: string, newName: string): void {
    if (!newName || newName === oldName || this.walls.walls[newName] || !this.walls.walls[oldName]) {
      return;
    }
    
    const wallData = this.walls.walls[oldName];
    const { [oldName]: removedWall, ...otherWalls } = this.walls.walls;
    
    const updatedWalls = {
      ...this.walls,
      walls: {
        ...otherWalls,
        [newName]: wallData,
      },
    };
    
    // Update collapsed state if the wall was collapsed
    if (this.collapsedWalls.has(oldName)) {
      this.collapsedWalls.delete(oldName);
      this.collapsedWalls.add(newName);
    }
    
    this.editingWallName = null;
    this.newWallName = "";
    this.updateWalls(updatedWalls);
  }

  duplicateWall(wallName: string): void {
    const originalWall = this.walls.walls[wallName];
    if (!originalWall) return;
    
    // Generate unique name for duplicate
    let copyIndex = 1;
    let copyName = `${wallName} Copy`;
    
    while (this.walls.walls[copyName]) {
      copyIndex++;
      copyName = `${wallName} Copy ${copyIndex}`;
    }
    
    const duplicatedWall = cloneWallSpecification(originalWall);
    
    const updatedWalls = {
      ...this.walls,
      walls: {
        ...this.walls.walls,
        [copyName]: duplicatedWall,
      },
    };
    
    this.updateWalls(updatedWalls);
  }

  // Field update operations
  updateWallField(wallName: string, field: keyof WallSpecification, value: string): void {
    const wall = this.walls.walls[wallName];
    if (!wall) return;
    
    // Convert "None" to empty string to reset to placeholder state
    const actualValue = value === "None" ? "" : value;
    
    let updatedWall = {
      ...wall,
      [field]: actualValue,
    };
    
    // Handle cascading field resets based on field dependencies
    if (field === "wallSystemType") {
      // Reset all fields when wall system type changes
      const baseFields = {
        panelConfiguration: "",
        series: "",
        model: "",
        panelThickness: "",
        panelDesign: "",
        panelSkin: "",
        stcRating: "",
        passDoorPanels: "",
        panelFinishCategory: "",
        panelFinishSpecificItem: "",
        trackType: "",
        trackSystem: "",
        verticalSeals: "",
        bottomSeals: "",
        topSeals: "",
        initialClosureSystem: "",
        endPanelType: "",
      };
      
      updatedWall = {
        ...updatedWall,
        ...baseFields,
        ...getEmptyGlassWallFields(),
      };
    } else if (field === "panelConfiguration") {
      // Reset dependent fields when panel configuration changes
      updatedWall = {
        ...updatedWall,
        series: "",
        model: "",
        panelThickness: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        trackType: "",
        trackSystem: "",
        initialClosureSystem: "",
      };
    } else if (field === "series") {
      // Auto-update panel thickness based on series
      const thicknessMap: { [key: string]: string } = {
        "2000": "3",
        "3000": "4",
        "Hufcor: 600": "4"
      };
      
      updatedWall = {
        ...updatedWall,
        panelThickness: thicknessMap[actualValue] || "",
        model: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        trackType: "",
        trackSystem: "",
        initialClosureSystem: "",
      };
    }
    
    const updatedWalls = {
      ...this.walls,
      walls: {
        ...this.walls.walls,
        [wallName]: updatedWall,
      },
    };
    
    this.updateWalls(updatedWalls);
  }

  updateGlassWallConfig(wallName: string, config: GlassWallConfiguration): void {
    const wall = this.walls.walls[wallName];
    if (!wall) return;
    
    const mappedConfig = mapGlassWallConfigToWallSpec(config);
    
    const updatedWalls = {
      ...this.walls,
      walls: {
        ...this.walls.walls,
        [wallName]: {
          ...wall,
          ...mappedConfig,
        },
      },
    };
    
    this.updateWalls(updatedWalls);
  }

  // UI state management
  startEditingWallName(wallName: string): void {
    this.editingWallName = wallName;
    this.newWallName = wallName;
  }

  cancelEditingWallName(): void {
    this.editingWallName = null;
    this.newWallName = "";
  }

  setNewWallName(name: string): void {
    this.newWallName = name;
  }

  toggleWallCollapse(wallName: string): void {
    if (this.collapsedWalls.has(wallName)) {
      this.collapsedWalls.delete(wallName);
    } else {
      this.collapsedWalls.add(wallName);
    }
  }

  isWallCollapsed(wallName: string): boolean {
    return this.collapsedWalls.has(wallName);
  }

  // Bulk operations
  clearAllWalls(): void {
    const updatedWalls = {
      ...this.walls,
      walls: {},
    };
    this.collapsedWalls.clear();
    this.updateWalls(updatedWalls);
  }

  importWalls(importedWalls: WallDetails): void {
    this.collapsedWalls.clear();
    this.updateWalls(importedWalls);
  }

  exportWalls(): WallDetails {
    return { ...this.walls };
  }

  // Validation
  validateWall(wallName: string): { isValid: boolean; errors: string[] } {
    const wall = this.walls.walls[wallName];
    if (!wall) {
      return { isValid: false, errors: ['Wall not found'] };
    }
    
    return this.validationResult.wallValidations[wallName] || { isValid: true, errors: [] };
  }

  getWallValidationErrors(wallName: string): string[] {
    const validation = this.validateWall(wallName);
    return validation.errors;
  }

  // Utility functions
  getWall(wallName: string): WallSpecification | undefined {
    return this.walls.walls[wallName];
  }

  hasWallType(wallSystemType: string): boolean {
    return this.wallNames.some(name => this.walls.walls[name].wallSystemType === wallSystemType);
  }

  getWallsByType(wallSystemType: string): [string, WallSpecification][] {
    return this.wallNames
      .filter(name => this.walls.walls[name].wallSystemType === wallSystemType)
      .map(name => [name, this.walls.walls[name]]);
  }
}

// Factory function for creating ViewModel instances
export function createWallSpecificationViewModel(
  initialWalls: WallDetails,
  onUpdate: (walls: WallDetails) => void
): WallSpecificationViewModel {
  return new WallSpecificationViewModel(initialWalls, onUpdate);
}