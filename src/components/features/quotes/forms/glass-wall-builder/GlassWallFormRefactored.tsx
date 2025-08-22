import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGlassWallForm } from './hooks/useGlassWallForm';
import { FormRow, SelectField, FrameThicknessField, PanelWidthField, ModelSelector } from './components';
import type { GlassWallConfigurationFormProps } from './types';

export const GlassWallFormRefactored: React.FC<GlassWallConfigurationFormProps> = ({
  onConfigurationChange,
  initialConfig = {}
}) => {
  const {
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
    getAvailableOptions
  } = useGlassWallForm({ onConfigurationChange, initialConfig });

  return (
    <Card className="w-full">
      <CardContent className="space-y-8">
        {/* Row 1: Glass Wall Model, Panel Configuration */}
        <FormRow>
          <ModelSelector 
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedConfiguration}
            onChange={setSelectedConfiguration}
            label="Panel Configuration"
            required
            options={getAvailableOptions('configurations')}
          />
          <div /> {/* Empty third column */}
        </FormRow>

        {/* Row 2: Operation Type, Glass Type, STC Rating */}
        <FormRow>
          <SelectField
            selectedModel={selectedModel}
            value={selectedOperation}
            onChange={setSelectedOperation}
            label="Operation Type"
            required
            options={getAvailableOptions('operations')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedGlassType}
            onChange={setSelectedGlassType}
            label="Glass Type"
            required
            options={getAvailableOptions('glassType')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedSTCRating}
            onChange={setSelectedSTCRating}
            label="STC Rating"
            required
            options={getAvailableOptions('stcRating')}
          />
        </FormRow>

        {/* Row 3: Partition Support, Frame Thickness, Panel Width */}
        <FormRow>
          <SelectField
            selectedModel={selectedModel}
            value={selectedPartitionSupport}
            onChange={setSelectedPartitionSupport}
            label="Partition Support"
            required
            options={getAvailableOptions('partitionSupport')}
          />
          <FrameThicknessField
            selectedModel={selectedModel}
            selectedSTCRating={selectedSTCRating}
            label="Frame Thickness"
          />
          <PanelWidthField
            selectedModel={selectedModel}
            label="Panel Width"
          />
        </FormRow>

        {/* Row 4: Panel Face Options, Frame Finish Options, Hinge Type */}
        <FormRow>
          <SelectField
            selectedModel={selectedModel}
            value={selectedPanelFace}
            onChange={setSelectedPanelFace}
            label="Panel Face Options"
            options={getAvailableOptions('panelFaces')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedFrameFinish}
            onChange={setSelectedFrameFinish}
            label="Frame Finish Options"
            options={getAvailableOptions('frameFinishes')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedHingeType}
            onChange={setSelectedHingeType}
            label="Hinge Type"
            options={getAvailableOptions('hinging')}
          />
        </FormRow>

        {/* Row 5: Pass Door Type, Pass Door Option, Final Closure */}
        <FormRow>
          <SelectField
            selectedModel={selectedModel}
            value={selectedPassDoorType}
            onChange={setSelectedPassDoorType}
            label="Pass Door Type"
            options={getAvailableOptions('passDoorType')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedPassDoorOption}
            onChange={setSelectedPassDoorOption}
            label="Pass Door Option"
            disabled={!selectedPassDoorType}
            options={getAvailableOptions('passDoorOption')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedFinalClosure}
            onChange={setSelectedFinalClosure}
            label="Final Closure"
            options={getAvailableOptions('finalClosure')}
          />
        </FormRow>

        {/* Row 6: Bottom Seals, Top Seals */}
        <FormRow>
          <SelectField
            selectedModel={selectedModel}
            value={selectedBottomSeals}
            onChange={setSelectedBottomSeals}
            label="Bottom Seals"
            options={getAvailableOptions('bottomSeals')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedTopSeals}
            onChange={setSelectedTopSeals}
            label="Top Seals"
            options={getAvailableOptions('topSeals')}
          />
          <div /> {/* Empty third column */}
        </FormRow>

        {/* Row 7: Track Type, Track Finish */}
        <FormRow>
          <SelectField
            selectedModel={selectedModel}
            value={selectedTrackType}
            onChange={setSelectedTrackType}
            label="Track Type"
            required
            options={getAvailableOptions('trackType')}
          />
          <SelectField
            selectedModel={selectedModel}
            value={selectedTrackFinish}
            onChange={setSelectedTrackFinish}
            label="Track Finish"
            options={getAvailableOptions('trackFinish')}
          />
          <div /> {/* Empty third column */}
        </FormRow>
      </CardContent>
    </Card>
  );
};

export default GlassWallFormRefactored;