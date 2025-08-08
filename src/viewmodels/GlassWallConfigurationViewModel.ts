// Glass Wall Configuration ViewModel
// Pure business logic class without React dependencies

import { GlassWallConfiguration } from '@/types/quote';
import { 
  modelConfigurations, 
  getAvailableOptions, 
  getFrameThickness, 
  getPanelWidth,
  GlassWallModel 
} from '@/models/constants/modelConfigurations';
import { validateGlassWallConfiguration } from '@/models/WallDataMapper';

export class GlassWallConfigurationViewModel {
  // Private state
  private selectedModel: string = '';
  private selectedConfiguration: string = '';
  private selectedOperation: string = '';
  private selectedGlassType: string = '';
  private selectedSTCRating: string = '';
  private selectedPartitionSupport: string = '';
  private selectedPassDoorType: string = '';
  private selectedPassDoorOption: string = '';
  private selectedPanelFace: string = '';
  private selectedHingeType: string = '';
  private selectedFrameFinish: string = '';
  private selectedTrackType: string = '';
  private selectedTrackFinish: string = '';
  private selectedFinalClosure: string = '';
  private selectedBottomSeals: string = '';
  private selectedTopSeals: string = '';
  private isInitialized: boolean = false;
  
  // Configuration change callback
  private onConfigurationChange?: (config: GlassWallConfiguration) => void;
  
  constructor(
    initialConfig: Partial<GlassWallConfiguration> = {},
    onConfigurationChange?: (config: GlassWallConfiguration) => void
  ) {
    this.onConfigurationChange = onConfigurationChange;
    
    // Initialize with provided config
    this.selectedModel = initialConfig.model || '';
    this.selectedConfiguration = initialConfig.configurationType || '';
    this.selectedOperation = initialConfig.operationType || '';
    this.selectedGlassType = initialConfig.glassType || '';
    this.selectedSTCRating = initialConfig.stc_rating || '';
    this.selectedPartitionSupport = initialConfig.partitionSupport || '';
    this.selectedPassDoorType = initialConfig.passDoorType || '';
    this.selectedPassDoorOption = initialConfig.passDoorOption || '';
    this.selectedPanelFace = initialConfig.panelFace || '';
    this.selectedHingeType = initialConfig.hingeType || '';
    this.selectedFrameFinish = initialConfig.frameFinish || '';
    this.selectedTrackType = initialConfig.trackType || '';
    this.selectedTrackFinish = initialConfig.trackFinish || '';
    this.selectedFinalClosure = initialConfig.finalClosure || '';
    this.selectedBottomSeals = initialConfig.bottomSeals || '';
    this.selectedTopSeals = initialConfig.topSeals || '';
    
    // Mark as initialized after a delay to prevent premature callbacks
    setTimeout(() => {
      this.isInitialized = true;
    }, 500);
  }

  // Getters for state
  get model() { return this.selectedModel; }
  get configuration() { return this.selectedConfiguration; }
  get operation() { return this.selectedOperation; }
  get glassType() { return this.selectedGlassType; }
  get stcRating() { return this.selectedSTCRating; }
  get partitionSupport() { return this.selectedPartitionSupport; }
  get passDoorType() { return this.selectedPassDoorType; }
  get passDoorOption() { return this.selectedPassDoorOption; }
  get panelFace() { return this.selectedPanelFace; }
  get hingeType() { return this.selectedHingeType; }
  get frameFinish() { return this.selectedFrameFinish; }
  get trackType() { return this.selectedTrackType; }
  get trackFinish() { return this.selectedTrackFinish; }
  get finalClosure() { return this.selectedFinalClosure; }
  get bottomSeals() { return this.selectedBottomSeals; }
  get topSeals() { return this.selectedTopSeals; }
  get initialized() { return this.isInitialized; }

  // Computed properties
  get frameThickness(): string {
    return getFrameThickness(this.selectedModel as GlassWallModel, this.selectedSTCRating);
  }
  
  get panelWidth(): string {
    return getPanelWidth(this.selectedModel as GlassWallModel);
  }

  // Helper function to get available options based on selected model
  private getModelOptions(field: keyof typeof modelConfigurations.Stella): string[] {
    if (!this.selectedModel || !(this.selectedModel in modelConfigurations)) return [];
    return getAvailableOptions(this.selectedModel as GlassWallModel, field);
  }

  // Available options based on selected model
  get availableConfigurations(): string[] { return this.getModelOptions('configurations'); }
  get availableOperations(): string[] { return this.getModelOptions('operations'); }
  get availableGlassTypes(): string[] { return this.getModelOptions('glassType'); }
  get availableSTCRatings(): string[] { return this.getModelOptions('stcRating'); }
  get availablePartitionSupports(): string[] { return this.getModelOptions('partitionSupport'); }
  get availablePassDoorTypes(): string[] { return this.getModelOptions('passDoorType'); }
  get availablePassDoorOptions(): string[] { return this.getModelOptions('passDoorOption'); }
  get availablePanelFaces(): string[] { return this.getModelOptions('panelFaces'); }
  get availableHingeTypes(): string[] { return this.getModelOptions('hinging'); }
  get availableFrameFinishes(): string[] { return this.getModelOptions('frameFinishes'); }
  get availableTrackTypes(): string[] { return this.getModelOptions('trackType'); }
  get availableTrackFinishes(): string[] { return this.getModelOptions('trackFinish'); }
  get availableFinalClosures(): string[] { return this.getModelOptions('finalClosure'); }
  get availableBottomSeals(): string[] { return this.getModelOptions('bottomSeals'); }
  get availableTopSeals(): string[] { return this.getModelOptions('topSeals'); }

  // Action methods
  setModel(model: string): void {
    this.selectedModel = model;
    
    // Only reset fields after initialization to preserve loaded data
    if (this.isInitialized) {
      this.resetAllFields();
    }
    this.triggerConfigurationChange();
  }

  setConfiguration(config: string): void {
    this.selectedConfiguration = config;
    this.triggerConfigurationChange();
  }

  setOperation(operation: string): void {
    this.selectedOperation = operation;
    this.triggerConfigurationChange();
  }

  setGlassType(type: string): void {
    this.selectedGlassType = type;
    this.triggerConfigurationChange();
  }

  setSTCRating(rating: string): void {
    this.selectedSTCRating = rating;
    this.triggerConfigurationChange();
  }

  setPartitionSupport(support: string): void {
    this.selectedPartitionSupport = support;
    this.triggerConfigurationChange();
  }

  setPassDoorType(type: string): void {
    this.selectedPassDoorType = type;
    
    // Reset pass door option when type changes (but not during initialization)
    if (this.isInitialized) {
      this.selectedPassDoorOption = '';
    }
    this.triggerConfigurationChange();
  }

  setPassDoorOption(option: string): void {
    this.selectedPassDoorOption = option;
    this.triggerConfigurationChange();
  }

  setPanelFace(face: string): void {
    this.selectedPanelFace = face;
    this.triggerConfigurationChange();
  }

  setHingeType(type: string): void {
    this.selectedHingeType = type;
    this.triggerConfigurationChange();
  }

  setFrameFinish(finish: string): void {
    this.selectedFrameFinish = finish;
    this.triggerConfigurationChange();
  }

  setTrackType(type: string): void {
    this.selectedTrackType = type;
    this.triggerConfigurationChange();
  }

  setTrackFinish(finish: string): void {
    this.selectedTrackFinish = finish;
    this.triggerConfigurationChange();
  }

  setFinalClosure(closure: string): void {
    this.selectedFinalClosure = closure;
    this.triggerConfigurationChange();
  }

  setBottomSeals(seals: string): void {
    this.selectedBottomSeals = seals;
    this.triggerConfigurationChange();
  }

  setTopSeals(seals: string): void {
    this.selectedTopSeals = seals;
    this.triggerConfigurationChange();
  }

  // Reset all fields (except model)
  resetAllFields(): void {
    this.selectedConfiguration = '';
    this.selectedOperation = '';
    this.selectedGlassType = '';
    this.selectedSTCRating = '';
    this.selectedPartitionSupport = '';
    this.selectedPassDoorType = '';
    this.selectedPassDoorOption = '';
    this.selectedPanelFace = '';
    this.selectedHingeType = '';
    this.selectedFrameFinish = '';
    this.selectedTrackType = '';
    this.selectedTrackFinish = '';
    this.selectedFinalClosure = '';
    this.selectedBottomSeals = '';
    this.selectedTopSeals = '';
  }

  // Get current configuration object
  getCurrentConfiguration(): GlassWallConfiguration {
    return {
      model: this.selectedModel,
      configurationType: this.selectedConfiguration,
      operationType: this.selectedOperation,
      glassType: this.selectedGlassType,
      stc_rating: this.selectedSTCRating,
      partitionSupport: this.selectedPartitionSupport,
      passDoorType: this.selectedPassDoorType,
      passDoorOption: this.selectedPassDoorOption,
      panelFace: this.selectedPanelFace,
      hingeType: this.selectedHingeType,
      frameFinish: this.selectedFrameFinish,
      frameThickness: this.frameThickness,
      trackType: this.selectedTrackType,
      trackFinish: this.selectedTrackFinish,
      finalClosure: this.selectedFinalClosure,
      bottomSeals: this.selectedBottomSeals,
      topSeals: this.selectedTopSeals,
    };
  }

  // Get validation result
  getValidationResult(): { isValid: boolean; missingFields: string[] } {
    return validateGlassWallConfiguration(this.getCurrentConfiguration());
  }

  // Trigger configuration change callback
  private triggerConfigurationChange(): void {
    if (this.onConfigurationChange && this.selectedModel && this.isInitialized) {
      const config = this.getCurrentConfiguration();
      this.onConfigurationChange(config);
    }
  }
}