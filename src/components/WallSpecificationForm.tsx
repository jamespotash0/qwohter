
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { WallSpecification } from "./QuoteCreator";

interface WallSpecificationFormProps {
  walls: WallSpecification[];
  onUpdate: (walls: WallSpecification[]) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const handleWallChange = (wallId: string, field: keyof WallSpecification, value: string) => {
    const updatedWalls = walls.map(wall => {
      if (wall.id === wallId) {
        let updatedWall = { ...wall, [field]: value };
        
        // Auto-update panel thickness based on series
        if (field === "series") {
          updatedWall.panelThickness = value === "2000" ? "3" : value === "3000" ? "4" : "3";
        }
        
        return updatedWall;
      }
      return wall;
    });
    onUpdate(updatedWalls);
  };

  const removeWall = (wallId: string) => {
    const updatedWalls = walls.filter(wall => wall.id !== wallId);
    onUpdate(updatedWalls);
  };

  const panelTypes = [
    "Continuously Hinged Panels",
    "Individual Panels",
    "Bi-Fold Panels",
    "Sliding Panels"
  ];

  const seriesOptions = ["2000", "3000"];
  const modelOptions = ["2030", "3040", "Custom"];
  const trackTypes = ["Paired Panels Track", "Individual Track", "Bi-Fold Track"];
  const designTypes = ["Trimless", "Non-Trimless"];
  const constructTypes = ["Acoustical Substrate", "Standard Substrate", "Fire-Rated"];
  const stcRatings = ["50", "53", "56", "59"];
  const trackSystems = ["Steel Track System", "Aluminum Track System"];
  const verticalSealants = ["Tongue-and-Groove", "Compression Seals", "Magnetic Seals"];
  const bottomSeals = ["Retractable Seals", "Fixed Seals", "Adjustable Seals"];
  const endPanelTypes = ["Fixed Wall Jamb", "Movable Jamb", "Pocket Door"];
  const finalSeals = ["Bulb Seal", "Compression Seal", "Magnetic Seal"];

  if (walls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No walls added yet. Click "Add Wall" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {walls.map((wall, index) => (
        <Card key={wall.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">{wall.name}</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeWall(wall.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Basic Dimensions */}
              <div className="space-y-2">
                <Label htmlFor={`width-${wall.id}`}>Width</Label>
                <Input
                  id={`width-${wall.id}`}
                  value={wall.width}
                  onChange={(e) => handleWallChange(wall.id, "width", e.target.value)}
                  placeholder="32'-4&quot;"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`height-${wall.id}`}>Height</Label>
                <Input
                  id={`height-${wall.id}`}
                  value={wall.height}
                  onChange={(e) => handleWallChange(wall.id, "height", e.target.value)}
                  placeholder="8'-6&quot;"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`quantity-${wall.id}`}>Quantity</Label>
                <Input
                  id={`quantity-${wall.id}`}
                  type="number"
                  value={wall.quantity}
                  onChange={(e) => handleWallChange(wall.id, "quantity", e.target.value)}
                  placeholder="1"
                />
              </div>
              
              {/* Panel Configuration */}
              <div className="space-y-2">
                <Label htmlFor={`panelType-${wall.id}`}>Panel Type</Label>
                <Select
                  value={wall.panelType}
                  onValueChange={(value) => handleWallChange(wall.id, "panelType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select panel type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {panelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`panelCount-${wall.id}`}>Panel Count</Label>
                <Input
                  id={`panelCount-${wall.id}`}
                  value={wall.panelCount}
                  onChange={(e) => handleWallChange(wall.id, "panelCount", e.target.value)}
                  placeholder="3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`series-${wall.id}`}>Series</Label>
                <Select
                  value={wall.series}
                  onValueChange={(value) => handleWallChange(wall.id, "series", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select series" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {seriesOptions.map((series) => (
                      <SelectItem key={series} value={series}>
                        {series}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`model-${wall.id}`}>Model</Label>
                <Select
                  value={wall.model}
                  onValueChange={(value) => handleWallChange(wall.id, "model", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {modelOptions.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`trackType-${wall.id}`}>Track Type</Label>
                <Select
                  value={wall.trackType}
                  onValueChange={(value) => handleWallChange(wall.id, "trackType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select track type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {trackTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`panelThickness-${wall.id}`}>Panel Thickness (inches)</Label>
                <Input
                  id={`panelThickness-${wall.id}`}
                  value={wall.panelThickness}
                  onChange={(e) => handleWallChange(wall.id, "panelThickness", e.target.value)}
                  placeholder="3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`designType-${wall.id}`}>Design Type</Label>
                <Select
                  value={wall.designType}
                  onValueChange={(value) => handleWallChange(wall.id, "designType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select design type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {designTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`constructType-${wall.id}`}>Construction Type</Label>
                <Select
                  value={wall.constructType}
                  onValueChange={(value) => handleWallChange(wall.id, "constructType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select construction type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {constructTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`stcRating-${wall.id}`}>STC Rating</Label>
                <Select
                  value={wall.stcRating}
                  onValueChange={(value) => handleWallChange(wall.id, "stcRating", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select STC rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {stcRatings.map((rating) => (
                      <SelectItem key={rating} value={rating}>
                        {rating}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`trackSystem-${wall.id}`}>Track System</Label>
                <Select
                  value={wall.trackSystem}
                  onValueChange={(value) => handleWallChange(wall.id, "trackSystem", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select track system" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {trackSystems.map((system) => (
                      <SelectItem key={system} value={system}>
                        {system}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`verticalSealants-${wall.id}`}>Vertical Sealants</Label>
                <Select
                  value={wall.verticalSealants}
                  onValueChange={(value) => handleWallChange(wall.id, "verticalSealants", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vertical sealants" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {verticalSealants.map((sealant) => (
                      <SelectItem key={sealant} value={sealant}>
                        {sealant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`bottomSeals-${wall.id}`}>Bottom Seals</Label>
                <Select
                  value={wall.bottomSeals}
                  onValueChange={(value) => handleWallChange(wall.id, "bottomSeals", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bottom seals" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {bottomSeals.map((seal) => (
                      <SelectItem key={seal} value={seal}>
                        {seal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`endPanelType-${wall.id}`}>End Panel Type</Label>
                <Select
                  value={wall.endPanelType}
                  onValueChange={(value) => handleWallChange(wall.id, "endPanelType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select end panel type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {endPanelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`finalSeal-${wall.id}`}>Final Seal</Label>
                <Select
                  value={wall.finalSeal}
                  onValueChange={(value) => handleWallChange(wall.id, "finalSeal", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select final seal" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {finalSeals.map((seal) => (
                      <SelectItem key={seal} value={seal}>
                        {seal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WallSpecificationForm;
