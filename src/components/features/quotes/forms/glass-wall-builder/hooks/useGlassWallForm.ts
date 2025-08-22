import { useState, useEffect, useRef, useCallback } from 'react';
import type { GlassWallConfiguration, ModelType } from '../types';
import { MODEL_CONFIGURATIONS, getFrameThickness } from '../data/modelConfigurations';

interface UseGlassWallFormProps {
  onConfigurationChange?: (config: GlassWallConfiguration) => void;
  initialConfig?: Partial<GlassWallConfiguration>;
}

export const useGlassWallForm = ({ 
  onConfigurationChange, 
  initialConfig = {} 
}: UseGlassWallFormProps) => {
  // Form state
  const [selectedModel, setSelectedModel] = useState<string>(initialConfig.model || '');
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>(initialConfig.configurationType || '');
  const [selectedOperation, setSelectedOperation] = useState<string>(initialConfig.operationType || '');
  const [selectedGlassType, setSelectedGlassType] = useState<string>(initialConfig.glassType || '');
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(initialConfig.stc_rating || '');
  const [selectedPartitionSupport, setSelectedPartitionSupport] = useState<string>(initialConfig.partitionSupport || '');
  const [selectedPassDoorType, setSelectedPassDoorType] = useState<string>(initialConfig.passDoorType || '');
  const [selectedPassDoorOption, setSelectedPassDoorOption] = useState<string>(initialConfig.passDoorOption || '');
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(initialConfig.panelFace || '');
  const [selectedHingeType, setSelectedHingeType] = useState<string>(initialConfig.hingeType || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(initialConfig.frameFinish || '');
  const [selectedTrackType, setSelectedTrackType] = useState<string>(initialConfig.trackType || '');
  const [selectedTrackFinish, setSelectedTrackFinish] = useState<string>(initialConfig.trackFinish || '');
  const [selectedFinalClosure, setSelectedFinalClosure] = useState<string>(initialConfig.finalClosure || '');
  const [selectedBottomSeals, setSelectedBottomSeals] = useState<string>(initialConfig.bottomSeals || '');
  const [selectedTopSeals, setSelectedTopSeals] = useState<string>(initialConfig.topSeals || '');

  // Refs to track state changes
  const prevModelRef = useRef<string>('');
  const isSyncingRef = useRef<boolean>(false);
  const prevConfigRef = useRef<string>('');
  const prevPanelConfigRef = useRef<string>('');

  // Get available options based on selected model
  const getAvailableOptions = useCallback((field: keyof typeof MODEL_CONFIGURATIONS.Stella) => {
    if (!selectedModel || !(selectedModel in MODEL_CONFIGURATIONS)) return [];
    return MODEL_CONFIGURATIONS[selectedModel as ModelType][field] || [];
  }, [selectedModel]);

  // Reset all fields when model changes (but skip initial load)
  const resetModelDependentFields = useCallback(() => {
    setSelectedConfiguration('');
    setSelectedOperation('');
    setSelectedGlassType('');
    setSelectedSTCRating('');
    setSelectedPartitionSupport('');
    setSelectedPassDoorType('');
    setSelectedPassDoorOption('');
    setSelectedPanelFace('');
    setSelectedHingeType('');
    setSelectedFrameFinish('');
    setSelectedTrackType('');
    setSelectedTrackFinish('');
    setSelectedFinalClosure('');
    setSelectedBottomSeals('');
    setSelectedTopSeals('');
  }, []);

  // Reset configuration dependent fields
  const resetConfigurationDependentFields = useCallback(() => {
    setSelectedOperation('');
    setSelectedGlassType('');
    setSelectedSTCRating('');
    setSelectedPartitionSupport('');
    setSelectedPassDoorType('');
    setSelectedPassDoorOption('');
    setSelectedPanelFace('');
    setSelectedHingeType('');
    setSelectedFrameFinish('');
    setSelectedTrackType('');
    setSelectedTrackFinish('');
    setSelectedFinalClosure('');
    setSelectedBottomSeals('');
    setSelectedTopSeals('');
  }, []);

  // Sync with initial config changes
  useEffect(() => {
    if (!initialConfig) return;
    isSyncingRef.current = true;

    if (initialConfig.model !== undefined) setSelectedModel(initialConfig.model || '');
    if (initialConfig.configurationType !== undefined) setSelectedConfiguration(initialConfig.configurationType || '');
    if (initialConfig.operationType !== undefined) setSelectedOperation(initialConfig.operationType || '');
    if (initialConfig.glassType !== undefined) setSelectedGlassType(initialConfig.glassType || '');
    if (initialConfig.stc_rating !== undefined) setSelectedSTCRating(initialConfig.stc_rating || '');
    if (initialConfig.partitionSupport !== undefined) setSelectedPartitionSupport(initialConfig.partitionSupport || '');
    if (initialConfig.passDoorType !== undefined) setSelectedPassDoorType(initialConfig.passDoorType || '');
    if (initialConfig.passDoorOption !== undefined) setSelectedPassDoorOption(initialConfig.passDoorOption || '');
    if (initialConfig.panelFace !== undefined) setSelectedPanelFace(initialConfig.panelFace || '');
    if (initialConfig.hingeType !== undefined) setSelectedHingeType(initialConfig.hingeType || '');
    if (initialConfig.frameFinish !== undefined) setSelectedFrameFinish(initialConfig.frameFinish || '');
    if (initialConfig.trackType !== undefined) setSelectedTrackType(initialConfig.trackType || '');
    if (initialConfig.trackFinish !== undefined) setSelectedTrackFinish(initialConfig.trackFinish || '');
    if (initialConfig.finalClosure !== undefined) setSelectedFinalClosure(initialConfig.finalClosure || '');
    if (initialConfig.bottomSeals !== undefined) setSelectedBottomSeals(initialConfig.bottomSeals || '');
    if (initialConfig.topSeals !== undefined) setSelectedTopSeals(initialConfig.topSeals || '');

    setTimeout(() => { isSyncingRef.current = false; }, 0);
  }, [initialConfig]);

  // Model change effect
  useEffect(() => {
    if (!prevModelRef.current && selectedModel) {
      prevModelRef.current = selectedModel;
      return;
    }

    if (prevModelRef.current !== selectedModel) {
      resetModelDependentFields();
    }

    prevModelRef.current = selectedModel;
  }, [selectedModel, resetModelDependentFields]);

  // Configuration change effect
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (!selectedModel) return;

    if (prevPanelConfigRef.current && prevPanelConfigRef.current !== selectedConfiguration) {
      resetConfigurationDependentFields();
    }

    prevPanelConfigRef.current = selectedConfiguration;
  }, [selectedConfiguration, selectedModel, resetConfigurationDependentFields]);

  // Pass door type change effect
  useEffect(() => {
    if (isSyncingRef.current) return;
    setSelectedPassDoorOption('');
  }, [selectedPassDoorType]);

  // Configuration change callback
  useEffect(() => {
    if (!onConfigurationChange || !selectedModel || isSyncingRef.current) return;

    const config: GlassWallConfiguration = {
      model: selectedModel,
      configurationType: selectedConfiguration,
      operationType: selectedOperation,
      glassType: selectedGlassType,
      stc_rating: selectedSTCRating,
      partitionSupport: selectedPartitionSupport,
      passDoorType: selectedPassDoorType,
      passDoorOption: selectedPassDoorOption,
      panelFace: selectedPanelFace,
      hingeType: selectedHingeType,
      frameFinish: selectedFrameFinish,
      frameThickness: getFrameThickness(selectedModel, selectedSTCRating),
      trackType: selectedTrackType,
      trackFinish: selectedTrackFinish,
      finalClosure: selectedFinalClosure,
      bottomSeals: selectedBottomSeals,
      topSeals: selectedTopSeals,
    };

    const serialized = JSON.stringify(config);
    if (serialized !== prevConfigRef.current) {
      prevConfigRef.current = serialized;
      onConfigurationChange(config);
    }
  }, [
    selectedModel, selectedConfiguration, selectedOperation, selectedGlassType, selectedSTCRating,
    selectedPartitionSupport, selectedPassDoorType, selectedPassDoorOption, selectedPanelFace,
    selectedHingeType, selectedFrameFinish, selectedTrackType, selectedTrackFinish,
    selectedFinalClosure, selectedBottomSeals, selectedTopSeals, onConfigurationChange
  ]);

  return {
    // State
    selectedModel,
    selectedConfiguration,
    selectedOperation,
    selectedGlassType,
    selectedSTCRating,
    selectedPartitionSupport,
    selectedPassDoorType,
    selectedPassDoorOption,
    selectedPanelFace,
    selectedHingeType,
    selectedFrameFinish,
    selectedTrackType,
    selectedTrackFinish,
    selectedFinalClosure,
    selectedBottomSeals,
    selectedTopSeals,
    // Setters
    setSelectedModel,
    setSelectedConfiguration,
    setSelectedOperation,
    setSelectedGlassType,
    setSelectedSTCRating,
    setSelectedPartitionSupport,
    setSelectedPassDoorType,
    setSelectedPassDoorOption,
    setSelectedPanelFace,
    setSelectedHingeType,
    setSelectedFrameFinish,
    setSelectedTrackType,
    setSelectedTrackFinish,
    setSelectedFinalClosure,
    setSelectedBottomSeals,
    setSelectedTopSeals,
    // Utilities
    getAvailableOptions
  };
};