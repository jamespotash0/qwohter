import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { WallSpecification } from "../types/quote";

interface WallSpecificationFormProps {
  walls: WallSpecification[];
  onUpdate: (walls: WallSpecification[]) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const handleWallChange = (wallId: string, field: keyof WallSpecification, value: string) => {
    const updatedWalls = walls.map(wall => {
      if (wall.id === wallId) {
        let updatedWall = { ...wall, [field]: value };
        
        // Cascading logic
        if (field === "panelType") {
          // Reset dependent fields
          updatedWall.series = "";
          updatedWall.model = "";
          updatedWall.panelThickness = "";
          updatedWall.constructType = "";
          updatedWall.stcRating = "";
          updatedWall.trackType = getTrackTypeByPanelType(value);
          updatedWall.trackSystem = "";
        }
        
        if (field === "series") {
          // Auto-update panel thickness based on series
          updatedWall.panelThickness = value === "2000" ? "3" : value === "3000" ? "4" : "";
          // Reset dependent fields
          updatedWall.model = "";
          updatedWall.constructType = "";
          updatedWall.stcRating = "";
        }
        
        if (field === "model") {
          // Reset dependent fields
          updatedWall.constructType = "";
          updatedWall.stcRating = "";
        }
        
        if (field === "constructType" || field === "series") {
          // Auto-calculate STC rating based on series and construction type
          updatedWall.stcRating = getSTCRating(updatedWall.series, updatedWall.constructType);
        }
        
        if (field === "trackType") {
          // Reset track system when track type changes
          updatedWall.trackSystem = "";
        }
        
        return updatedWall;
      }
      return wall;
    });
    onUpdate(updatedWalls);
  };

  // Helper functions for cascading logic
  const getTrackTypeByPanelType = (panelType: string): string => {
    switch (panelType) {
      case "Individual Panels":
        return "Multi-Directional Track";
      case "Hinged-Paired Panels":
        return "Hinged-Pair Track";
      case "Continuously-Hinged Panels":
        return "Curve & Diverter (Individual) Track";
      default:
        return "";
    }
  };

  const getSeriesByPanelType = (panelType: string): string[] => {
    switch (panelType) {
      case "Individual Panels":
        return ["2000", "3000"];
      case "Hinged-Paired Panels":
        return ["3000"];
      case "Continuously-Hinged Panels":
        return ["2000", "3000"];
      default:
        return [];
    }
  };

  const getModelsBySeries = (series: string): string[] => {
    switch (series) {
      case "2000":
        return ["2010", "2020", "2030", "2050e", "2010GL", "2020GL", "2030GL"];
      case "3000":
        return ["3010", "3020", "3030", "3050e", "3010GL", "3020GL", "3030GL"];
      default:
        return [];
    }
  };

  const getConstructionTypesByModel = (model: string): string[] => {
    if (model.includes("GL")) {
      return ["Acoustical Substrate", "Fire-Rated"];
    }
    return ["Acoustical Substrate", "Standard Substrate", "Fire-Rated"];
  };

  const getSTCRating = (series: string, constructType: string): string => {
    if (!series || !constructType) return "";
    
    if (series === "2000") {
      switch (constructType) {
        case "Acoustical Substrate": return "45";
        case "Standard Substrate": return "38";
        case "Fire-Rated": return "42";
        default: return "";
      }
    } else if (series === "3000") {
      switch (constructType) {
        case "Acoustical Substrate": return "52";
        case "Standard Substrate": return "46";
        case "Fire-Rated": return "48";
        default: return "";
      }
    }
    return "";
  };

  const getTrackSystemsByTrackType = (trackType: string): string[] => {
    switch (trackType) {
      case "Multi-Directional Track":
        return ["Type 425 Clear Anodized Aluminum", "Type 850 Clear Anodized Aluminum"];
      case "Hinged-Pair Track":
        return ["Type 425 Clear Anodized Aluminum", "Type 850 Clear Anodized Aluminum"];
      case "Curve & Diverter (Individual) Track":
        return ["Type 850 Steel"];
      default:
        return [];
    }
  };

  const removeWall = (wallId: string) => {
    const updatedWalls = walls.filter(wall => wall.id !== wallId);
    onUpdate(updatedWalls);
  };

  const addNewWall = () => {
    const newWall: WallSpecification = {
      id: Date.now().toString(),
      name: `Wall ${walls.length + 1}`,
      widthFeet: "",
      widthInches: "",
      heightFeet: "",
      heightInches: "",
      quantity: "1",
      panelType: "",
      panelCount: "",
      series: "",
      model: "",
      panelThickness: "",
      constructType: "",
      stcRating: "",
      verticalSealants: "",
      bottomSeals: "",
      topSeals: "",
      endPanelType: "",
      trackType: "",
      trackSystem: ""
    };
    onUpdate([...walls, newWall]);
  };

  const panelTypes = ["Individual Panels", "Hinged-Paired Panels", "Continuously-Hinged Panels"];
  const verticalSealants = ["Tongue-and-Groove", "Compression Seals", "Magnetic Seals"];
  const bottomSeals = ["Retractable Seals", "Fixed Seals", "Adjustable Seals"];
  const topSeals = ["Fixed Top Seals", "Adjustable Top Seals", "No Top Seals"];
  const endPanelTypes = ["Fixed Wall Jamb", "Movable Jamb", "Pocket Door"];

  if (walls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No walls added yet. Click "Add Wall" to get started.</p>
        <button
            onClick={addNewWall}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Add Wall
          </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Wall Specifications</h2>
        <Button
          onClick={addNewWall}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Add Wall
        </Button>
      </div>
      {walls.map((wall, index) => (
        <Card key={wall.id} className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">{wall.name}</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeWall(wall.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Dimensions Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Dimensions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Width */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Width</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={wall.widthFeet}
                          onChange={(e) => handleWallChange(wall.id, "widthFeet", e.target.value)}
                          placeholder="32"
                          className="text-center"
                        />
                        <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={wall.widthInches}
                          onChange={(e) => handleWallChange(wall.id, "widthInches", e.target.value)}
                          placeholder="4"
                          className="text-center"
                        />
                        <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
                      </div>
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Height</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={wall.heightFeet}
                          onChange={(e) => handleWallChange(wall.id, "heightFeet", e.target.value)}
                          placeholder="8"
                          className="text-center"
                        />
                        <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={wall.heightInches}
                          onChange={(e) => handleWallChange(wall.id, "heightInches", e.target.value)}
                          placeholder="6"
                          className="text-center"
                        />
                        <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
                      </div>
                    </div>
                  </div>

                  {/* Panel Count */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Panel Count</Label>
                    <Input
                      value={wall.panelCount}
                      onChange={(e) => handleWallChange(wall.id, "panelCount", e.target.value)}
                      placeholder="3"
                      className="text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Wall Details Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Wall Details</h4>
                
                {/* First Row - Panel Type Selection */}
                <div className="mb-6">
                  <div className="space-y-2">
                    <Label htmlFor={`panelType-${wall.id}`} className="text-sm font-medium">Panel Type</Label>
                    <Select
                      value={wall.panelType}
                      onValueChange={(value) => handleWallChange(wall.id, "panelType", value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select panel type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {panelTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Second Row - Series and Model */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor={`series-${wall.id}`} className="text-sm font-medium">Series</Label>
                    <Select
                      value={wall.series}
                      onValueChange={(value) => handleWallChange(wall.id, "series", value)}
                      disabled={!wall.panelType}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select series" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {getSeriesByPanelType(wall.panelType).map((series) => (
                          <SelectItem key={series} value={series}>
                            {series} Series
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`model-${wall.id}`} className="text-sm font-medium">Model</Label>
                    <Select
                      value={wall.model}
                      onValueChange={(value) => handleWallChange(wall.id, "model", value)}
                      disabled={!wall.series}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {getModelsBySeries(wall.series).map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Third Row - Thickness and Construction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor={`panelThickness-${wall.id}`} className="text-sm font-medium">Panel Thickness (inches)</Label>
                    <Input
                      id={`panelThickness-${wall.id}`}
                      value={wall.panelThickness}
                      placeholder="Auto-calculated"
                      className="text-center bg-muted"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`constructType-${wall.id}`} className="text-sm font-medium">Construction Type</Label>
                    <Select
                      value={wall.constructType}
                      onValueChange={(value) => handleWallChange(wall.id, "constructType", value)}
                      disabled={!wall.model}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select construction type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {getConstructionTypesByModel(wall.model).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fourth Row - STC Rating and Seals */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor={`stcRating-${wall.id}`} className="text-sm font-medium">STC Rating</Label>
                    <Input
                      id={`stcRating-${wall.id}`}
                      value={wall.stcRating}
                      placeholder="Auto-calculated"
                      className="text-center bg-muted"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`verticalSealants-${wall.id}`} className="text-sm font-medium">Vertical Sealants</Label>
                    <Select
                      value={wall.verticalSealants}
                      onValueChange={(value) => handleWallChange(wall.id, "verticalSealants", value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select vertical sealants" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {verticalSealants.map((sealant) => (
                          <SelectItem key={sealant} value={sealant}>
                            {sealant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bottomSeals-${wall.id}`} className="text-sm font-medium">Bottom Seals</Label>
                    <Select
                      value={wall.bottomSeals}
                      onValueChange={(value) => handleWallChange(wall.id, "bottomSeals", value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select bottom seals" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {bottomSeals.map((seal) => (
                          <SelectItem key={seal} value={seal}>
                            {seal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`topSeals-${wall.id}`} className="text-sm font-medium">Top Seals</Label>
                    <Select
                      value={wall.topSeals}
                      onValueChange={(value) => handleWallChange(wall.id, "topSeals", value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select top seals" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {topSeals.map((seal) => (
                          <SelectItem key={seal} value={seal}>
                            {seal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fifth Row - End Panel Type */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`endPanelType-${wall.id}`} className="text-sm font-medium">End Panel Type</Label>
                    <Select
                      value={wall.endPanelType}
                      onValueChange={(value) => handleWallChange(wall.id, "endPanelType", value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select end panel type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {endPanelTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Track Details Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Track Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor={`trackType-${wall.id}`} className="text-sm font-medium">Track Type</Label>
                    <Input
                      id={`trackType-${wall.id}`}
                      value={wall.trackType}
                      placeholder="Auto-selected based on panel type"
                      className="text-center bg-muted"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`trackSystem-${wall.id}`} className="text-sm font-medium">Track System</Label>
                    <Select
                      value={wall.trackSystem}
                      onValueChange={(value) => handleWallChange(wall.id, "trackSystem", value)}
                      disabled={!wall.trackType}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select track system" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {getTrackSystemsByTrackType(wall.trackType).map((system) => (
                          <SelectItem key={system} value={system}>
                            {system}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Quantity Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Quantity</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`quantity-${wall.id}`} className="text-sm font-medium">Quantity</Label>
                    <Input
                      id={`quantity-${wall.id}`}
                      type="number"
                      value={wall.quantity}
                      onChange={(e) => handleWallChange(wall.id, "quantity", e.target.value)}
                      placeholder="1"
                      className="text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WallSpecificationForm;