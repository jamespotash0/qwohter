import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  WallSpecification, 
  isOperableWall, 
  getSeriesByPanelConfiguration, 
  getModelsByPanelConfigurationAndSeries, 
  getPanelSkinOptions,
  getSTCRatingOptions,
  getTrackSystemsByTrackType,
  getPanelThicknessBySeries,
  getPanelFinishSpecificItems,
  getPassDoorQuantityOptions,
  panelConfigurations,
  panelDesigns,
  passDoorOptions,
  panelFinishCategories,
  verticalSeals,
  bottomSealOptions,
  topSealOptions,
  endPanelTypes,
  initialClosureSystems,
  getTrackTypeByModel,
} from "@/lib/types";

interface OperableWallCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, fieldOrUpdates: string | Record<string, string>, value?: string) => void;
}

const dependencies: Record<string, string[]> = {
  panelConfiguration: ["series", "model", "panelThickness", "panelSkin", "stcRating", "panelDesign", "trackSystem", "verticalSeals", "bottomSeals", "topSeals", "initialClosureSystem", "endPanelType"],
  series: ["model", "panelThickness", "panelSkin", "stcRating", "trackSystem"],
  model: ["panelSkin", "stcRating", "trackSystem"],
  panelSkin: ["stcRating"],
  passDoorPanels: ["passDoorQuantity"],
  panelFinishCategory: ["panelFinishSpecificItem"]
};

const OperableWallCreationForm = ({ wall, wallName, onWallChange }: OperableWallCreationFormProps) => {
  if (!isOperableWall(wall)) {
    return <div>This form is only for Operable Walls</div>;
  }

  const [selectedPanelConfiguration, setSelectedPanelConfiguration] = React.useState(wall.panelConfiguration || "");
  const [selectedSeries, setSelectedSeries] = React.useState(wall.series || "");
  const [selectedModel, setSelectedModel] = React.useState(wall.model || "");
  const [selectedPanelSkin, setSelectedPanelSkin] = React.useState(wall.panelSkin || "");
  const [selectedSTCRating, setSelectedSTCRating] = React.useState(wall.stcRating || "");
  const [selectedPassDoorPanels, setSelectedPassDoorPanels] = React.useState(wall.passDoorPanels || "");
  const [selectedPassDoorQuantity, setSelectedPassDoorQuantity] = React.useState(wall.passDoorQuantity || "");
  const [selectedPanelFinishCategory, setSelectedPanelFinishCategory] = React.useState(wall.panelFinishCategory || "");
  const [selectedPanelFinishSpecificItem, setSelectedPanelFinishSpecificItem] = React.useState(wall.panelFinishSpecificItem || "");
  const [selectedTrackSystem, setSelectedTrackSystem] = React.useState(wall.trackSystem || "");
  const [selectedVerticalSeals, setSelectedVerticalSeals] = React.useState(wall.verticalSeals || "");
  const [selectedBottomSeals, setSelectedBottomSeals] = React.useState(wall.bottomSeals || "");
  const [selectedTopSeals, setSelectedTopSeals] = React.useState(wall.topSeals || "");
  const [selectedInitialClosureSystem, setSelectedInitialClosureSystem] = React.useState(wall.initialClosureSystem || "");
  const [selectedEndPanelType, setSelectedEndPanelType] = React.useState(wall.endPanelType || "");
  const [selectedPanelDesign, setSelectedPanelDesign] = React.useState(wall.panelDesign || "");


  const handleFieldChange = (field: string, value: string) => {
    const displayValue = value === "None" ? "" : value;
    const updates: Record<string, string> = { [field]: displayValue };

    // Reset dependent fields
    if (dependencies[field]) {
      (dependencies[field] || []).forEach(dep => {
        updates[dep] = "";
      });
    }

    onWallChange(wallName, updates);

    // Update controlled state
    switch (field) {
      case "panelConfiguration": 
        setSelectedPanelConfiguration(displayValue);
        if (dependencies[field]) {
          setSelectedSeries("");
          setSelectedModel("");
          setSelectedPanelSkin("");
          setSelectedSTCRating("");
          setSelectedTrackSystem("");
        }
        break;
      case "series": 
        setSelectedSeries(displayValue);
        if (dependencies[field]) {
          setSelectedModel("");
          setSelectedPanelSkin("");
          setSelectedSTCRating("");
          setSelectedTrackSystem("");
        }
        break;
      case "model": 
        setSelectedModel(displayValue);
        if (dependencies[field]) {
          setSelectedPanelSkin("");
          setSelectedSTCRating("");
          setSelectedTrackSystem("");
        }
        break
      case "panelSkin":
        setSelectedPanelSkin(displayValue);
        if (dependencies[field]) {
          setSelectedSTCRating("");
        }
        break;
      case "stcRating": setSelectedSTCRating(displayValue); break;
      case "trackSystem": setSelectedTrackSystem(displayValue); break;
      case "verticalSeals": 
        setSelectedVerticalSeals(displayValue);
        break;
      case "bottomSeals": 
        setSelectedBottomSeals(displayValue);
        break;
      case "topSeals": 
        setSelectedTopSeals(displayValue);
        break;
      case "initialClosureSystem": 
        setSelectedInitialClosureSystem(displayValue);
        break;
      case "endPanelType": 
        setSelectedEndPanelType(displayValue);
        break;
      case "panelDesign": 
        setSelectedPanelDesign(displayValue);
        break;  
      case "passDoorPanels":
        setSelectedPassDoorPanels(displayValue);
        if (dependencies[field]) {
          setSelectedPassDoorQuantity("");
        }
        break;
      case "passDoorQuantity": setSelectedPassDoorQuantity(displayValue); break;
      case "panelFinishCategory": 
        setSelectedPanelFinishCategory(displayValue);
        if (dependencies[field]) {
          setSelectedPanelFinishSpecificItem("");
        }
        break;
      case "panelFinishSpecificItem": setSelectedPanelFinishSpecificItem(displayValue); break;  
      default: break;
    }
  };
  
  return (
    <div>
      <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Operable Wall Details</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Configuration *</Label>
          <Select
            value={selectedPanelConfiguration}
            onValueChange={(value) => handleFieldChange("panelConfiguration", value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select panel configuration" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {panelConfigurations.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Series *</Label>
          <Select
            value={selectedSeries}
            onValueChange={(value) => handleFieldChange("series", value)}
            disabled={!selectedPanelConfiguration}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select series" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getSeriesByPanelConfiguration(selectedPanelConfiguration).map((series) => (
                <SelectItem key={series} value={series}>
                  {series} Series
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Model *</Label>
          <Select
            value={selectedModel}
            onValueChange={(value) => handleFieldChange("model", value)}
            disabled={!selectedSeries}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getModelsByPanelConfigurationAndSeries(selectedPanelConfiguration, selectedSeries).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Thickness (inches)</Label>
          <Input
            value={getPanelThicknessBySeries(selectedSeries)}
            placeholder={"Auto-calculated"}
            readOnly
            className="bg-muted text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Skin *</Label>
          <Select
            value={selectedPanelSkin}
            onValueChange={(value) => handleFieldChange("panelSkin", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select panel skin" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getPanelSkinOptions(selectedModel).map((skin) => (
                <SelectItem key={skin} value={skin}>
                  {skin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">STC Rating *</Label>
          <Select
            value={selectedSTCRating}
            onValueChange={(value) => handleFieldChange("stcRating", value)}
            disabled={!selectedModel || !selectedPanelSkin}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select STC rating" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getSTCRatingOptions(selectedModel, selectedPanelSkin).map((rating) => (
                <SelectItem key={rating} value={rating}>
                  {rating}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Design</Label>
          <Select
            value={selectedPanelDesign || ""}
            onValueChange={(value) => handleFieldChange("panelDesign", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select panel design" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {panelDesigns.map((design) => (
                <SelectItem key={design} value={design}>
                  {design}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Pass Door Panels</Label>
          <Select
            value={selectedPassDoorPanels || ""}
            onValueChange={(value) => handleFieldChange("passDoorPanels", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select pass door panels" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
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
          <Label className="text-sm font-medium">Pass Door Quantity</Label>
          <Select
            value={selectedPassDoorQuantity || ""}
            onValueChange={(value) => handleFieldChange("passDoorQuantity", value)}
            disabled={!selectedPassDoorPanels || !selectedModel || selectedPassDoorPanels === ""} 
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select quantity" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getPassDoorQuantityOptions(selectedPassDoorPanels).map((qty) => (
                <SelectItem key={qty} value={qty}>
                  {qty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Vertical Seals</Label>
          <Select
            value={selectedVerticalSeals || ""}
            onValueChange={(value) => handleFieldChange("verticalSeals", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select vertical seals" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="None">None</SelectItem>
              {verticalSeals.map((sealant) => (
                <SelectItem key={sealant} value={sealant}>
                  {sealant}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Bottom Seals</Label>
          <Select
            value={selectedBottomSeals || ""}
            onValueChange={(value) => handleFieldChange("bottomSeals", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select bottom seals" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="None">None</SelectItem>
              {bottomSealOptions.map((seal) => (
                <SelectItem key={seal} value={seal}>
                  {seal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Top Seals</Label>
          <Select
            value={selectedTopSeals || ""}
            onValueChange={(value) => handleFieldChange("topSeals", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select top seals" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="None">None</SelectItem>
              {topSealOptions.map((seal) => (
                <SelectItem key={seal} value={seal}>
                  {seal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Initial Closure System</Label>
          <Select
            value={selectedInitialClosureSystem || ""}
            onValueChange={(value) => handleFieldChange("initialClosureSystem", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select initial closure system" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="None">None</SelectItem>
              {initialClosureSystems.map((seal) => (
                <SelectItem key={seal} value={seal}>
                  {seal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">End Panel Type</Label>
          <Select
            value={selectedEndPanelType || ""}
            onValueChange={(value) => handleFieldChange("endPanelType", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select end panel type" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
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

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 ${getPanelFinishSpecificItems(wall.panelFinishCategory).length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Finish Category</Label>
          <Select
            value={selectedPanelFinishCategory || ""}
            onValueChange={(value) => handleFieldChange("panelFinishCategory", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select panel finish category" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="None">None</SelectItem>
              {panelFinishCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {getPanelFinishSpecificItems(selectedPanelFinishCategory).length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Panel Finish Specific Item *</Label>
            <Select
              value={selectedPanelFinishSpecificItem || ""}
              onValueChange={(value) => handleFieldChange("panelFinishSpecificItem", value)}
              disabled={!selectedPanelFinishCategory || !selectedModel}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select specific item" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getPanelFinishSpecificItems(selectedPanelFinishCategory).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Track Type *</Label>
          <Input
            value={getTrackTypeByModel(selectedModel)}
            placeholder={"Auto-calculated"}
            readOnly
            className="bg-muted text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Track System *</Label>
          <Select
            value={selectedTrackSystem || ""}
            onValueChange={(value) => handleFieldChange("trackSystem", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select track system" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getTrackSystemsByTrackType(getTrackTypeByModel(selectedModel), selectedModel).map((system) => (
                <SelectItem key={system} value={system}>
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default OperableWallCreationForm;