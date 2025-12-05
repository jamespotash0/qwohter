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
    selectedFinalClosureSystem,
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
    getAvailableInitialClosureSystems,
    getAvailableFinalClosureSystems,
    panelConfigurations,
    passDoorOptions,
    panelFinishCategories,
    // finalClosureSystems,
    // initialClosureSystems
  } = useOperableWallForm({ wall, wallName, onChange });

  // Layout classes based on context
  const labelClass = layout === 'edit' ? 'text-sm font-medium' : 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

  return (
    <div className="space-y-6">
      {/* Row 1: Panel Configuration, Series, Model */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelConfiguration" className={labelClass}>
            Panel Configuration <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedPanelConfiguration}
            onValueChange={(value) => handleFieldChange("panelConfiguration", value)}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedPanelConfiguration
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
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
          <Label htmlFor="series" className={labelClass}>
            Series <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedSeries}
            onValueChange={(value) => handleFieldChange("series", value)}
            disabled={!selectedPanelConfiguration}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedSeries
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
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
          <Label htmlFor="model" className={labelClass}>
            Model <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedModel}
            onValueChange={(value) => handleFieldChange("model", value)}
            disabled={!selectedSeries}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
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
          <Label htmlFor="panelSkin" className={labelClass}>
            Panel Skin <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedPanelSkin}
            onValueChange={(value) => handleFieldChange("panelSkin", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedPanelSkin
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
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
          <Label htmlFor="stcRating" className={labelClass}>
            STC Rating <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedSTCRating}
            onValueChange={(value) => handleFieldChange("stcRating", value)}
            disabled={!selectedPanelSkin}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedSTCRating
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
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
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedPassDoorPanels ? "border-green-500" : "border-gray-300"
                  }`}
                >
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
              <Label htmlFor="passDoorQuantity" className={labelClass}>
                Pass Door Quantity
              {selectedPassDoorPanels != '' && (<span className="text-red-500"> *</span>)}
              </Label>
              <Select
                value={selectedPassDoorQuantity}
                onValueChange={(value) => handleFieldChange("passDoorQuantity", value)}
                disabled={!selectedPassDoorPanels || selectedPassDoorPanels === "None"}
              >
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedPassDoorPanels === "" 
                      ? "border-gray-300"  // nothing selected yet
                      : (!selectedPassDoorQuantity || selectedPassDoorQuantity === "None")
                        ? "border-red-500" // invalid
                        : "border-green-500" // completed
                  }`}
                >
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
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedPanelFinishCategory ? "border-green-500" : "border-gray-300"
                  }`}
                >
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
              <Label htmlFor="panelFinishSpecificItem" className={labelClass}>
                Panel Finish Specific Item
                {(() => {
                  const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others", "Full-Height Marker (Tack) Board"];
                  const requiresSpecificItem = selectedPanelFinishCategory && !categoriesWithoutSpecificItems.includes(selectedPanelFinishCategory);
                  return requiresSpecificItem && (<span className="text-red-500"> *</span>);
                })()}
              </Label>
              <Select
                value={selectedPanelFinishSpecificItem}
                onValueChange={(value) => handleFieldChange("panelFinishSpecificItem", value)}
                disabled={(() => {
                  const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others", "Full-Height Marker (Tack) Board"];
                  // Disable if no category selected, "None" selected, or category has no specific items
                  return !selectedPanelFinishCategory ||
                         selectedPanelFinishCategory === "None" ||
                         categoriesWithoutSpecificItems.includes(selectedPanelFinishCategory);
                })()}
              >
                 <SelectTrigger
                  className={`border rounded-md ${
                    (() => {
                      const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others", "Full-Height Marker (Tack) Board"];
                      const requiresSpecificItem = selectedPanelFinishCategory && !categoriesWithoutSpecificItems.includes(selectedPanelFinishCategory);

                      if (selectedPanelFinishCategory === "") {
                        return "border-gray-300"; // nothing selected yet
                      }
                      if (requiresSpecificItem && (!selectedPanelFinishSpecificItem || selectedPanelFinishSpecificItem === "None")) {
                        return "border-red-500"; // invalid - required but missing
                      }
                      if (selectedPanelFinishSpecificItem && selectedPanelFinishSpecificItem !== "None") {
                        return "border-green-500"; // completed
                      }
                      return "border-gray-300"; // optional/disabled
                    })()
                  }`}
                >
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
              <Label htmlFor="initialClosureSystem" className={labelClass}>
                Initial Closure System <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedInitialClosureSystem}
                onValueChange={(value) => handleFieldChange("initialClosureSystem", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedInitialClosureSystem ? "border-green-500" : "border-gray-300"
                  }`}
                >
                  <SelectValue placeholder="Select closure system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableInitialClosureSystems().map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalClosureSystem" className={labelClass}>
                Final Closure System <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedFinalClosureSystem}
                onValueChange={(value) => handleFieldChange("finalClosureSystem", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedFinalClosureSystem ? "border-green-500" : "border-gray-300"
                  }`}
                >
                  <SelectValue placeholder="Select final closure system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableFinalClosureSystems().map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 7: Vertical Seals, Bottom Seals, Top Seals */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verticalSeals" className={labelClass}>
                Vertical Seals <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedVerticalSeals}
                onValueChange={(value) => handleFieldChange("verticalSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedVerticalSeals ? "border-green-500" : "border-gray-300"
                  }`}
                >
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
              <Label htmlFor="bottomSeals" className={labelClass}>
                Horizontal Bottom Seals <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedBottomSeals}
                onValueChange={(value) => handleFieldChange("bottomSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedBottomSeals ? "border-green-500" : "border-gray-300"
                  }`}
                >
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
              <Label htmlFor="topSeals" className={labelClass}>
                Horizontal Top Seals <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedTopSeals}
                onValueChange={(value) => handleFieldChange("topSeals", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger
                  className={`border rounded-md ${
                    selectedTopSeals ? "border-green-500" : "border-gray-300"
                  }`}
                >
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
              <Label htmlFor="trackSystem" className={labelClass}>
                Track System <span className="text-red-500">*</span>
              </Label>
              <Select
                value={calculatedTrackSystem}
                onValueChange={(value) => handleFieldChange("trackSystem", value)}
                disabled={!selectedModel}
              >
                <SelectTrigger
                  className={`text-left border rounded-md ${calculatedTrackSystem ? "border-green-500" : "border-red-500"}`}
                >
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