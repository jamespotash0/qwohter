import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallSpecification } from '@/lib/types';
import { useOperableWallForm } from '../hooks/useOperableWallForm';

interface OperableWallFormFieldsProps {
  wall: WallSpecification;
  wallName: string;
  onChange: (wallName: string, updates: Record<string, string>) => void;
  showFullFields?: boolean;
  layout?: 'creation' | 'edit';
}

export const OperableWallFormFields: React.FC<OperableWallFormFieldsProps> = ({
  wall,
  wallName,
  onChange,
  showFullFields = false,
  layout = 'creation'
}) => {
  const {
    selectedPanelConfiguration,
    selectedSeries,
    selectedModel,
    selectedPanelThickness,
    selectedPanelSkin,
    selectedSTCRating,
    selectedPassDoorPanels,
    selectedPassDoorQuantity,
    selectedPanelFinishCategory,
    selectedPanelFinishSpecificItem,
    selectedInitialClosureSystem,
    selectedEndPanelType,
    selectedVerticalSeals,
    selectedBottomSeals,
    selectedTopSeals,
    selectedTrackType,
    calculatedTrackSystem,
    handleFieldChange,
    getAvailableSeries,
    getAvailableModels,
    getAvailablePanelSkins,
    getAvailableSTCRatings,
    // getAvailablePanelThickness,
    getAvailablePassDoorQuantity,
    getAvailablePanelFinishItems,
    getAvailableTrackSystems,
    getAvailableVerticalSeals,
    getAvailableBottomSeals,
    getAvailableTopSeals,
    panelConfigurations,
    passDoorOptions,
    panelFinishCategories,
    endPanelTypes,
    initialClosureSystems
  } = useOperableWallForm({ wall, wallName, onChange });

  // Layout classes based on context
  const labelClass = layout === 'edit' ? 'text-sm font-medium' : 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

  return (
    <div className="space-y-6">
      {/* Row 1: Panel Configuration, Series, Model */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelConfiguration" className={labelClass}>Panel Configuration *</Label>
          <Select
            value={selectedPanelConfiguration}
            onValueChange={(value) => handleFieldChange("panelConfiguration", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select panel configuration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {panelConfigurations.map((config) => (
                <SelectItem key={config} value={config}>
                  {config}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="series" className={labelClass}>Series *</Label>
          <Select
            value={selectedSeries}
            onValueChange={(value) => handleFieldChange("series", value)}
            disabled={!selectedPanelConfiguration}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getAvailableSeries().map((series) => (
                <SelectItem key={series} value={series}>
                  {series}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className={labelClass}>Model *</Label>
          <Select
            value={selectedModel}
            onValueChange={(value) => handleFieldChange("model", value)}
            disabled={!selectedSeries}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getAvailableModels().map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Panel Skin, STC Rating */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelSkin" className={labelClass}>Panel Skin *</Label>
          <Select
            value={selectedPanelSkin}
            onValueChange={(value) => handleFieldChange("panelSkin", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select panel skin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getAvailablePanelSkins().map((skin) => (
                <SelectItem key={skin} value={skin}>
                  {skin}
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
            disabled={!selectedPanelSkin}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select STC rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {getAvailableSTCRatings().map((rating) => (
                <SelectItem key={rating} value={rating}>
                  {rating}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {showFullFields && (
        <>
        {/* Row 3: Panel Thickness */}
          {/* <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="panelThickness" className={labelClass}>Panel Thickness (Calculated)</Label>
              <Input
                value={selectedPanelThickness}
                readOnly
                className="bg-gray-50"
                placeholder={selectedModel ? "Auto-calculated" : "Select model first"}
              />
            </div>

          </div> */}

          {/* Row 4: Pass Door Panels, Pass Door Quantity */}
          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
              <Label htmlFor="panelThickness" className={labelClass}>Panel Thickness (Calculated)</Label>
              <Input
                value={selectedPanelThickness}
                readOnly
                className="bg-gray-50"
                placeholder={selectedModel ? "Auto-calculated" : "Select model first"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passDoorPanels" className={labelClass}>Pass Door Panels</Label>
              <Select
                value={selectedPassDoorPanels}
                onValueChange={(value) => handleFieldChange("passDoorPanels", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pass door panels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {passDoorOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passDoorQuantity" className={labelClass}>Pass Door Quantity</Label>
              <Select
                value={selectedPassDoorQuantity}
                onValueChange={(value) => handleFieldChange("passDoorQuantity", value)}
                disabled={!selectedPassDoorPanels || selectedPassDoorPanels === "None"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quantity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailablePassDoorQuantity().map((quantity) => (
                    <SelectItem key={quantity} value={quantity}>
                      {quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Panel Finish Category, Panel Finish Specific Item */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="panelFinishCategory" className={labelClass}>Panel Finish Category</Label>
              <Select
                value={selectedPanelFinishCategory}
                onValueChange={(value) => handleFieldChange("panelFinishCategory", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select finish category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {panelFinishCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="panelFinishSpecificItem" className={labelClass}>Panel Finish Specific Item</Label>
              <Select
                value={selectedPanelFinishSpecificItem}
                onValueChange={(value) => handleFieldChange("panelFinishSpecificItem", value)}
                disabled={!selectedPanelFinishCategory || selectedPanelFinishCategory === "None"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specific item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailablePanelFinishItems().map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Initial Closure System, End Panel Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialClosureSystem" className={labelClass}>Initial Closure System</Label>
              <Select
                value={selectedInitialClosureSystem}
                onValueChange={(value) => handleFieldChange("initialClosureSystem", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select closure system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {initialClosureSystems.map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endPanelType" className={labelClass}>End Panel Type</Label>
              <Select
                value={selectedEndPanelType}
                onValueChange={(value) => handleFieldChange("endPanelType", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end panel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {endPanelTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 7: Vertical Seals, Bottom Seals, Top Seals */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verticalSeals" className={labelClass}>Vertical Seals</Label>
              <Select
                value={selectedVerticalSeals}
                onValueChange={(value) => handleFieldChange("verticalSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vertical seals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableVerticalSeals().map((seal) => (
                    <SelectItem key={seal} value={seal}>
                      {seal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bottomSeals" className={labelClass}>Horizontal Bottom Seals</Label>
              <Select
                value={selectedBottomSeals}
                onValueChange={(value) => handleFieldChange("bottomSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select horizontal bottom seals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableBottomSeals().map((seal) => (
                    <SelectItem key={seal} value={seal}>
                      {seal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topSeals" className={labelClass}>Horizontal Top Seals</Label>
              <Select
                value={selectedTopSeals}
                onValueChange={(value) => handleFieldChange("topSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select horizontal top seals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableTopSeals().map((seal) => (
                    <SelectItem key={seal} value={seal}>
                      {seal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 8: Track Type, Track System */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackType" className={labelClass}>Track Type (Calculated)</Label>
              <Input
                value={selectedTrackType}
                readOnly
                className="bg-gray-50"
                placeholder={selectedModel ? "Auto-calculated" : "Select model first"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackSystem" className={labelClass}>Track System *</Label>
              <Select
                value={calculatedTrackSystem}
                onValueChange={(value) => handleFieldChange("trackSystem", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger className="text-left">
                  <SelectValue placeholder={selectedModel ? "Select track system" : "Select model first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableTrackSystems().map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
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