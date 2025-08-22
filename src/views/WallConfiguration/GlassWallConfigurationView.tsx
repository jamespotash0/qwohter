// Glass Wall Configuration View - Pure UI Component
// Separated from business logic for better maintainability and testing

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { useGlassWallConfiguration } from '@/hooks/useGlassWallConfiguration';

interface GlassWallConfigurationViewProps {
  viewModel: ReturnType<typeof useGlassWallConfiguration>;
  className?: string;
}

/**
 * Pure UI component for Glass Wall Configuration
 * 
 * This component is responsible only for rendering the UI based on the viewModel state.
 * All business logic, state management, and data processing is handled by the viewModel.
 */
export const GlassWallConfigurationView: React.FC<GlassWallConfigurationViewProps> = ({
  viewModel,
  className = ""
}) => {
  
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="space-y-8">
        
        {/* Row 1: Glass Wall Model, Panel Configuration, Panel Count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Glass Wall Model *</Label>
            <Select value={viewModel.selectedModel} onValueChange={viewModel.setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="Stella">Stella</SelectItem>
                <SelectItem value="Luna">Luna</SelectItem>
                <SelectItem value="Illona">Illona</SelectItem>
                <SelectItem value="Ava">Ava</SelectItem>
                <SelectItem value="Mata">Mata</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="configuration">Panel Configuration *</Label>
            <Select 
              value={viewModel.selectedConfiguration} 
              onValueChange={viewModel.setConfiguration}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={"Select configuration"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableConfigurations.map((config) => (
                  <SelectItem key={config} value={config}>
                    {config}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Third column intentionally left for future use or spacing */}
          <div></div>
        </div>

        {/* Row 2: Operation Type, Glass Type, STC Rating */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="operation">Operation Type *</Label>
            <Select 
              value={viewModel.selectedOperation} 
              onValueChange={viewModel.setOperation}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select operation type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableOperations.map((operation) => (
                  <SelectItem key={operation} value={operation}>
                    {operation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="glassType">Glass Type *</Label>
            <Select 
              value={viewModel.selectedGlassType} 
              onValueChange={viewModel.setGlassType}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select glass type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableGlassTypes.map((glass) => (
                  <SelectItem key={glass} value={glass}>
                    {glass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stcRating">STC Rating *</Label>
            <Select 
              value={viewModel.selectedSTCRating} 
              onValueChange={viewModel.setSTCRating}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select STC rating" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableSTCRatings.map((rating) => (
                  <SelectItem key={rating} value={rating}>
                    {rating}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Partition Support, Frame Thickness, Panel Width */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="partitionSupport">Partition Support *</Label>
            <Select 
              value={viewModel.selectedPartitionSupport} 
              onValueChange={viewModel.setPartitionSupport}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select partition support" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availablePartitionSupports.map((support) => (
                  <SelectItem key={support} value={support}>
                    {support}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frameThickness">Frame Thickness (Auto-calculated)</Label>
            <Input 
              value={viewModel.frameThickness}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="panelWidth">Panel Width (Auto-calculated)</Label>
            <Input 
              value={viewModel.panelWidth}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>
        </div>

        {/* Row 4: Panel Face Options, Frame Finish Options, Hinge Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="panelFace">Panel Face Options</Label>
            <Select 
              value={viewModel.selectedPanelFace} 
              onValueChange={viewModel.setPanelFace}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select panel face" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availablePanelFaces.map((face) => (
                  <SelectItem key={face} value={face}>
                    {face}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frameFinish">Frame Finish Options</Label>
            <Select 
              value={viewModel.selectedFrameFinish} 
              onValueChange={viewModel.setFrameFinish}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select frame finish" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableFrameFinishes.map((finish) => (
                  <SelectItem key={finish} value={finish}>
                    {finish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hingeType">Hinge Type</Label>
            <Select 
              value={viewModel.selectedHingeType} 
              onValueChange={viewModel.setHingeType}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select hinge type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableHingeTypes.map((hinge) => (
                  <SelectItem key={hinge} value={hinge}>
                    {hinge}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 5: Pass Door Type, Pass Door Option, Final Closure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passDoorType">Pass Door Type</Label>
            <Select 
              value={viewModel.selectedPassDoorType} 
              onValueChange={viewModel.setPassDoorType}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select pass door type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availablePassDoorTypes.map((doorType) => (
                  <SelectItem key={doorType} value={doorType}>
                    {doorType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passDoorOption">Pass Door Option</Label>
            <Select 
              value={viewModel.selectedPassDoorOption} 
              onValueChange={viewModel.setPassDoorOption}
              disabled={!viewModel.selectedModel || !viewModel.selectedPassDoorType}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedPassDoorType ? "Select pass door option" : "Select pass door type first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availablePassDoorOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="finalClosure">Final Closure</Label>
            <Select 
              value={viewModel.selectedFinalClosure} 
              onValueChange={viewModel.setFinalClosure}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select final closure" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableFinalClosures.map((closure) => (
                  <SelectItem key={closure} value={closure}>
                    {closure}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 6: Bottom Seals, Top Seals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bottomSeals">Bottom Seals</Label>
            <Select 
              value={viewModel.selectedBottomSeals} 
              onValueChange={viewModel.setBottomSeals}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select bottom seals" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableBottomSeals.map((seal) => (
                  <SelectItem key={seal} value={seal}>
                    {seal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topSeals">Top Seals</Label>
            <Select 
              value={viewModel.selectedTopSeals} 
              onValueChange={viewModel.setTopSeals}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select top seals" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableTopSeals.map((seal) => (
                  <SelectItem key={seal} value={seal}>
                    {seal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 7: Track Type, Track Finish */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trackType">Track Type *</Label>
            <Select 
              value={viewModel.selectedTrackType} 
              onValueChange={viewModel.setTrackType}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select track type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableTrackTypes.map((track) => (
                  <SelectItem key={track} value={track}>
                    {track}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackFinish">Track Finish</Label>
            <Select 
              value={viewModel.selectedTrackFinish} 
              onValueChange={viewModel.setTrackFinish}
              disabled={!viewModel.selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={viewModel.selectedModel ? "Select track finish" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {viewModel.availableTrackFinishes.map((finish) => (
                  <SelectItem key={finish} value={finish}>
                    {finish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};