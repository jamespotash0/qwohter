import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallSpecification } from '@/lib/types';
import { useWallForm } from '../hooks/useWallForm';
import { modelConfigurations } from '@/lib/types/walls/glass';

interface GlassWallFormFieldsProps {
  wall: WallSpecification;
  wallName: string;
  onChange: (wallName: string, updates: Record<string, string>) => void;
  showFullFields?: boolean;
  layout?: 'creation' | 'edit';
}

export const GlassWallFormFields: React.FC<GlassWallFormFieldsProps> = ({
  wall,
  wallName,
  onChange,
  showFullFields = false,
  layout = 'creation'
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
    selectedFloorGuide,
    calculatedFrameThickness,
    calculatedTrackSystem,
    handleFieldChange,
    getOptions,
    validateForm
  } = useWallForm({ wall, wallName, onChange });

  // Layout classes based on context
  const labelClass = layout === 'edit' ? 'text-sm font-medium' : 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

  return (
    <div className="space-y-6">
      {/* Row 1: Model, Panel Configuration, Operation */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model" className={labelClass}>Model *</Label>
          <Select
            value={selectedModel}
            onValueChange={(value) => handleFieldChange("model", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {Object.keys(modelConfigurations).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="panelConfiguration" className={labelClass}>Panel Configuration *</Label>
          <Select
            value={selectedConfiguration}
            onValueChange={(value) => handleFieldChange("panelConfiguration", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select configuration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("panelConfiguration").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="panelOperation" className={labelClass}>Panel Operation *</Label>
          <Select
            value={selectedOperation}
            onValueChange={(value) => handleFieldChange("panelOperation", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("panelOperation").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Glass Type, STC Rating, Partition Support */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="glassType" className={labelClass}>Glass Type *</Label>
          <Select
            value={selectedGlassType}
            onValueChange={(value) => handleFieldChange("glassType", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select glass type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("glassType").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stcRating" className={labelClass}>STC Rating *</Label>
          <Select
            value={selectedSTCRating}
            onValueChange={(value) => handleFieldChange("stcRating", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select STC rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("stcRating").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partitionSupport" className={labelClass}>Partition Support *</Label>
          <Select
            value={selectedPartitionSupport}
            onValueChange={(value) => handleFieldChange("partitionSupport", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select partition support" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("partitionSupport").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Panel Face, Frame Finish, Frame Thickness */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelFace" className={labelClass}>Panel Face</Label>
          <Select
            value={selectedPanelFace}
            onValueChange={(value) => handleFieldChange("panelFace", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select panel face" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("panelFace").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frameFinish" className={labelClass}>Frame Finish</Label>
          <Select
            value={selectedFrameFinish}
            onValueChange={(value) => handleFieldChange("frameFinish", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frame finish" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getOptions("frameFinish").map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frameThickness" className={labelClass}>Frame Thickness (Calculated)</Label>
          <Input
            value={calculatedFrameThickness}
            readOnly
            className="bg-gray-50"
            placeholder="Auto-calculated"
          />
        </div>
      </div>

      {/* Extended fields - show based on showFullFields */}
      {showFullFields && (
        <>
          {/* Row 4: Hinge Type, Final Closure, Floor Guide */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hingeType" className={labelClass}>Hinge Type</Label>
              <Select
                value={selectedHingeType}
                onValueChange={(value) => handleFieldChange("hingeType", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hinge type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("hingeType").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalClosure" className={labelClass}>Final Closure</Label>
              <Select
                value={selectedFinalClosure}
                onValueChange={(value) => handleFieldChange("finalClosure", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select final closure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("finalClosure").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floorGuide" className={labelClass}>Floor Guide</Label>
              <Select
                value={selectedFloorGuide}
                onValueChange={(value) => handleFieldChange("floorGuide", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select floor guide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("floorGuide").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Top Seals, Bottom Seals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topSeals" className={labelClass}>Top Seals</Label>
              <Select
                value={selectedTopSeals}
                onValueChange={(value) => handleFieldChange("topSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select top seals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("topSeals").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bottomSeals" className={labelClass}>Bottom Seals</Label>
              <Select
                value={selectedBottomSeals}
                onValueChange={(value) => handleFieldChange("bottomSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bottom seals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("bottomSeals").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Pass Door Type, Pass Door Option */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passDoorType" className={labelClass}>Pass Door Type</Label>
              <Select
                value={selectedPassDoorType}
                onValueChange={(value) => handleFieldChange("passDoorType", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pass door type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("passDoorType").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passDoorOption" className={labelClass}>
                Pass Door Option{selectedPassDoorType && selectedPassDoorType !== "None" ? " *" : ""}
              </Label>
              <Select
                value={selectedPassDoorOption}
                onValueChange={(value) => handleFieldChange("passDoorOption", value)}
                disabled={!selectedPassDoorType || selectedPassDoorType === "None"}
              >
                <SelectTrigger className={selectedPassDoorType && selectedPassDoorType !== "None" && (!selectedPassDoorOption || selectedPassDoorOption === "None") ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select pass door option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("passDoorOption").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 7: Track Type, Track System, Track Finish */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackType" className={labelClass}>Track Type *</Label>
              <Select
                value={selectedTrackType}
                onValueChange={(value) => handleFieldChange("trackType", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select track type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("trackType").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackSystem" className={labelClass}>Track System (Calculated)</Label>
              <Input
                value={calculatedTrackSystem}
                readOnly
                className="bg-gray-50"
                placeholder="Auto-calculated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackFinish" className={labelClass}>Track Finish</Label>
              <Select
                value={selectedTrackFinish}
                onValueChange={(value) => handleFieldChange("trackFinish", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select track finish" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getOptions("trackFinish").map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

    </div>
  );
};