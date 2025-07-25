import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { WallSpecification, WallDetails } from "@/types/quote";
import { useState } from "react";

interface WallSpecificationFormProps {
  walls: WallDetails;
  onUpdate: (walls: WallDetails) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const [editingWallName, setEditingWallName] = useState<string | null>(null);
  const [newWallName, setNewWallName] = useState("");
  const [collapsedWalls, setCollapsedWalls] = useState<Set<string>>(new Set());

  const handleWallChange = (wallName: string, field: keyof WallSpecification, value: string) => {
    const updatedWalls = {
      ...walls,
      walls: {
        ...walls.walls,
        [wallName]: {
          ...walls.walls[wallName],
          [field]: value,
        },
      },
    };
    
    // Cascading logic
    if (field === "wallSystemType") {
      // Reset all dependent fields when wall system type changes
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        panelConfiguration: "",
        series: "",
        model: "",
        panelThickness: "",
        panelDesign: "",
        panelSkin: "",
        stcRating: "",
        passDoorPanels: "",
        panelFinishCategory: "",
        panelFinishSpecificItem: "",
        trackType: "",
        trackSystem: "",
        verticalSeals: "",
        bottomSeals: "",
        topSeals: "",
        finalSeal: "",
        endPanelType: "",
      };
    }
    
    if (field === "panelConfiguration") {
      // Reset dependent fields
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        series: "",
        model: "",
        panelThickness: "",
        panelSkin: "",
        panelDesign: "",  
        stcRating: "",
        trackType: "",
        trackSystem: "",
        finalSeal: "",
      };
    }
    
    if (field === "series") {
      // Auto-update panel thickness based on series
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        panelThickness: value === "2000" ? "3" : value === "3000" ? "4" : value === "Hufcor: 600" ? "4" : "",
        model: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        finalSeal: "",
      };
    }
    
    if (field === "model") {
      // Auto-update track type based on model
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        trackType: getTrackTypeByModel(value),
        trackSystem: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        finalSeal: "",
      };
    }
    
    if (field === "panelSkin" || field === "model") {
      // Reset STC rating when model or panel skin changes
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        stcRating: "",
      };
    }
    
    if (field === "trackType") {
      // Reset track system when track type changes
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        trackSystem: "",
      };
    }
    
    if (field === "panelFinishCategory") {
      // Reset specific item when category changes
      // Clear the field entirely if the category doesn't need specific items
      const categoriesWithoutSpecificItems = ["Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        panelFinishSpecificItem: categoriesWithoutSpecificItems.includes(value) ? "" : "",
      };
    }
    
    onUpdate(updatedWalls);
  };

  const getSeriesByPanelConfiguration = (panelConfiguration: string): string[] => {
    switch (panelConfiguration) {
      case "Individual Panels":
        return ["2000", "3000", "Hufcor: 600"];
      case "Hinged-Paired Panels":
        return ["2000", "3000"];
      case "Continuously-Hinged Panels":
        return ["2000", "3000"];
      default:
        return [];
    }
  };

  const getModelsByPanelConfigurationAndSeries = (panelConfiguration: string, series: string): string[] => {
    if (panelConfiguration === "Individual Panels") {
      if (series === "2000") return ["2010", "2020", "2010GL", "2020GL"];
      if (series === "3000") return ["3010", "3020", "3010GL", "3020GL"];
      if (series === "Hufcor: 600") return ["Hufcor 641"];
    } else if (panelConfiguration === "Continuously-Hinged Panels") {
      if (series === "2000") return ["2050e"];
      if (series === "3000") return ["3050e"];
    } else if (panelConfiguration === "Hinged-Paired Panels") {
      if (series === "2000") return ["2030", "2030GL"];
      if (series === "3000") return ["3030", "3030GL"];
    }
    return [];
  };

  const getTrackTypeByModel = (model: string): string => {
    if (["Hufcor 641", "2010", "2010GL", "3010", "3010GL"].includes(model)) {
      return "Curve & Diverter (Individual) Track";
    } else if (["Hufcor 641", "2020", "2020GL", "3020", "3020GL"].includes(model)) {
      return "Multi-Directional Track";
    } else if (["2050e", "3050e", "3030", "3030GL", "2030", "2030GL"].includes(model)) {
      return "Hinged-Pair (Straight Line) Track";
    }
    return "";
  };

  const getPanelSkinOptions = (model: string): string[] => {
    if (["Hufcor 641"].includes(model)) {
      return ["Steel"];
    }
    if (["3010", "3020", "3030"].includes(model)) {
      return ["Steel (Standard)", "Acoustical Substrate (Optional)", "Wood Veneer (Optional)", "High-Pressure Laminate/Gypsum (Optional)"];
    }
    if (["3050e", "3010GL", "3020GL", "3030GL"].includes(model)) {
      return ["Steel (Standard)", "Acoustical Substrate (Optional)"];
    }
    if (["2010", "2020", "2030"].includes(model)) {
      return ["Acoustical Substrate (Standard)", "Steel (Optional)", "Wood Veneer (Optional)", "High-Pressure Laminate (Optional)"];
    }
    if (["2050e", "2010GL", "2020GL", "2030GL"].includes(model)) {
      return ["Acoustical Substrate (Standard)", "Steel (Optional)"];
    }
    return [];
  };

  const getSTCRatingOptions = (model: string, panelSkin: string): string[] => {
    if (!model || !panelSkin) return [];
    if (["Hufcor 641"].includes(model)) {
      return ["43", "47", "49", "52", "54", "56"];
    }
    if (["2010GL", "2020GL", "2030GL"].includes(model)) {
      return ["38"];
    }

    if (["3010GL", "3020GL", "3030GL"].includes(model)) {
      return ["43", "48"];
    }

    if (["2010", "2020", "2030", "2050e"].includes(model)) {
      if (panelSkin.includes("Acoustical Substrate")) {
        return ["42", "45", "49", "50"];
      }
      if (panelSkin.includes("Steel")) {
        return ["49", "51"];
      }
    }

    if (["3010", "3020", "3030", "3050e"].includes(model)) {
      if (panelSkin.includes("Steel")) {
        return ["46", "50", "52", "56"];
      }
      if (panelSkin.includes("Acoustical Substrate")) {
        return ["43", "46", "48", "50"];
      }
    }

    return [];
  };

  const getTrackSystemsByTrackType = (trackType: string, model?: string): string[] => {
    if (model === "Hufcor 641") {
      return ["Type 26 Clear Satin-Anodized Aluminum", "Type 36 Clear Satin-Anodized Aluminum", "Type 57 Clear Anodized Aluminum", "Type 11L Powder Coated Off-White Steel", "Type 11 Powder Coated Off-White Steel"];
    }
    switch (trackType) {
      case "Multi-Directional Track":
        return ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum"];
      case "Hinged-Pair (Straight Line) Track":
        return ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum"];
      case "Curve & Diverter (Individual) Track":
        return ["Type 850 Powder Coated Off-White Steel"];
      default:
        return [];
    }
  };

  const getPanelFinishSpecificItems = (category: string): string[] => {
    // Categories that don't need specific items
    const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others"];
    if (categoriesWithoutSpecificItems.includes(category)) {
      return [];
    }
    
    switch (category) {
      case "Koroseal Standard Vinyl":
        return ["Silver Fan", "Dover Gray", "Rectory", "Skylight", "Frost", "Surfside", "Mesh", "Nettle", "Fused", "Tangle", "Spun", "Rolled", "Inscription", "Joie de Vivre", "Zydeco", "Fine Silver", "Beignet", "French Quarter", "Mink", "Tuxedo", "Truffle", "Ionic Grey", "Inkwell", "Magnolia", "Hemline", "Clothesline", "Draperie", "Cotton", "Silk", "Cloth", "Stitch", "Origin", "Artisan", "Linen", "Bone", "Eggshell"];
      case "Koroseal Upgrade Vinyl":
        return ["Ash", "Jacobean", "Mocha", "Prairie", "Rustic", "Sedona", "Slate", "Vintage", "Willow", "Origin", "Heir", "Heritage", "Generation", "Pedigree", "Descent", "Illusion", "Mottled", "Opalescence", "Enchanted", "Melded", "Fascination", "Earnest", "Baroness", "Poplar", "Hope", "Expectation", "Smoke"];
      case "Shaw Standard Carpet":
        return ["Moonscape", "Whitewood", "Almond", "Pelican", "Teak", "Del Sol", "Mohair", "Pottery Glaze", "Mink", "Hazelnut", "Citrus Leaf", "Mineral Green", "Malachite", "Sierra", "Expresso", "Eclipse", "Antique Silver", "Riverboat", "Seacliff", "Snake Skin", "Flint", "PierPointe", "Lakeland", "Blooms Berry", "Ink", "Exotic Clay", "Red Velvet", "Roasted Pepper", "Black Nickel", "Onynx"];
      case "HyTex Upgrade Carpet":
        return ["Ghost", "Porcelain", "Parchment", "Beach", "Cinnabar", "Almond", "Abalone", "Lace", "Curry", "Scarlet", "Marble", "Linen", "Taffy", "Hunter", "Ruby", "Flagstone", "Taupe", "Mocha", "Teal", "Marine", "Gunmetal Grey", "Sepia", "Sumatra", "Danube", "Navy", "Black", "Charcoal", "Juniper", "Cerulean", "Verdigris"];
      case "HyTex Standard Fabric":
        return ["Cepheus", "Cassiopeia", "Pegasus", "Phoenix", "Hydrus", "Pyxis", "Monoceros", "Aquila", "Orion", "Pisces", "Snow", "Linen", "Sand", "Mocha", "Graphite", "Black", "Cottage", "Mist", "Starlight", "Parchment", "Plaster", "Gray", "Sand", "Discover", "Bahamas", "Olive Grove", "Graphite", "Silverado", "Glacier", "Element", "Gated", "Casarina", "Armor", "Wilderness", "Truffle", "Pepper", "Laguna"];
      case "HyTex Upgrade Fabric":
        return ["Eggshell", "Linen", "Flan", "Light Beige", "Husky Gray", "Primavera", "Dovetail", "Pigeon", "Magnetic", "Deep Navy", "Raisin", "Knight", "Mirage", "Triton", "Rock", "Metal", "Basket", "Coriander", "Greige", "Phoron", "Sand Dollar", "Silouhette", "Nightingale", "Buttercup", "Topaz", "Jade", "Palmwood", "Palm Dessert", "Beach Glass", "Harvest", "Morning Dove", "Boulder", "Bravado", "Saddle Brown", "Earl Gray", "Golden (Echo)", "White (Echo)", "Tan (Echo)", "Ice (Echo)", "Silver (Echo)", "Stone (Echo)", "Lake (Echo)", "Smokey Blue (Echo)"];
      case "Standard Wood Veneer":
        return ["White Maple Flat Cut", "White Oak Flat Cut", "Walnut Flat Cut", "Cherry Flat Cut", "Red Oak Flat Cut"];
      case "Wilsonart High Pressure Laminate (HPL)":
        return ["Beigewood", "Raw Chestnut", "Fusion Maple", "Manitoba Maple", "Bannister Oak", "Limber Maple", "Solar Oak", "Fonthill Pear", "Wild Cherry", "Grey Glace", "Neutral Glace", "Shadow Zephyr", "Canyon Zephyr", "Grey Pampas", "Almond Leather", "Beige Pampas", "Miste Zephyr", "Twilight Zephyr", "Desert Zephyr", "Cloud Zephyr", "Burnished Chestnut", "Windswept Pewter", "Titanium Ev", "Carbon Ev", "Cloud Nebula", "White Nebula", "Grey Nebula", "Graphite Nebula", "White Tigris", "Evening Tigris", "Natural Tigris", "Bronze Legacy", "Navy Legacy", "Pewter Brush", "Woolamai Brush", "Grey", "Beige", "White", "Antique White", "Frosty White", "Black", "Graphite", "Regimental Red", "Atlantis", "Natural Almond", "Khaki Brown", "Pewter", "North Sea", "Slate Grey", "Dove Grey", "Shadow", "Hollyberry", "Platinum", "Brittany Blue", "Pepperdust", "Designer White", "Indigo", "Fashion Grey", "Crystal", "White Sand", "Lapis Blue", "Linen Alabaster", "Wallaby", "Coffee Bean", "Island", "Ocean", "Cement", "Fossil Shale", "Midnight", "Beachwalk", "Pebble Piazza", "Milan Quartz", "Mystique Dawn", "Kalahari Topaz"];
      default:
        return [];
    }
  };

  const removeWall = (wallName: string) => {
    const { [wallName]: removedWall, ...remainingWalls } = walls.walls;
    onUpdate({
      ...walls,
      walls: remainingWalls
    });
  };

  const addNewWall = () => {
    const wallCount = Object.keys(walls.walls).length;
    const newWallName = `Wall ${String.fromCharCode(65 + wallCount)}`;
    const newWall: WallSpecification = {
      wallSystemType: "",
      widthFeet: "",
      widthInches: "",
      heightFeet: "",
      heightInches: "",
      quantity: "1",
      panelConfiguration: "",
      panelCount: "",
      series: "",
      model: "",
      panelThickness: "",
      panelSkin: "",
      panelDesign: "",
      stcRating: "",
      passDoorPanels: "",
      panelFinishCategory: "",
      panelFinishSpecificItem: "",
      verticalSeals: "",
      bottomSeals: "",
      topSeals: "",
      finalSeal: "",
      endPanelType: "",
      trackType: "",
      trackSystem: ""
    };
    onUpdate({
      ...walls,
      walls: {
        ...walls.walls,
        [newWallName]: newWall,
      }
    });
  };

  const renameWall = (oldName: string, newName: string) => {
    if (newName && newName !== oldName && !walls.walls[newName]) {
      const { [oldName]: wallData, ...otherWalls } = walls.walls;
      onUpdate({
        ...walls,
        walls: {
          ...otherWalls,
          [newName]: wallData,
        }
      });
    }
    setEditingWallName(null);
    setNewWallName("");
  };

  const toggleWallCollapse = (wallName: string) => {
    setCollapsedWalls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wallName)) {
        newSet.delete(wallName);
      } else {
        newSet.add(wallName);
      }
      return newSet;
    });
  };

  const wallSystemTypes = ["Operable Wall", "Glass Wall", "Accordion Partitions", "Unispan Support", "FlexTact"];
  const panelConfigurations = ["Individual Panels", "Hinged-Paired Panels", "Continuously-Hinged Panels"];
  const panelDesigns = ["Trimless", "Cap Trimmed"];
  const passDoorOptions = ["Single", "Double"];
  const panelFinishCategories = ["Koroseal Standard Vinyl", "Koroseal Upgrade Vinyl", "Shaw Standard Carpet", "HyTex Upgrade Carpet", "HyTex Standard Fabric", "HyTex Upgrade Fabric", "Standard Wood Veneer", "Wilsonart High Pressure Laminate (HPL)", "Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
  const verticalSeals = ["Tongue-and-Groove"];
  const bottomSeals = ["Retractable", "Automatic", "Adjustable"];
  const topSeals = ["Adjustable", "Operable"];
  const endPanelTypes = ["Fixed Wall Jamb", "Telescoping Closure", "Closure Panel", "Adjustable Wall Jamb", "Articulating Panel"];
  const finalSeal = ["Bulb", "Fixed Jamb", "Sliding Jamb"];

  const wallNames = Object.keys(walls.walls);

  if (wallNames.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No walls added yet. Click "Add Wall" to get started.</p>
        <Button
          onClick={addNewWall}
          className="mt-4"
        >
          Add Wall
        </Button>
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
      {wallNames.map((wallName) => {
        const wall = walls.walls[wallName];
        const isCollapsed = collapsedWalls.has(wallName);
        return (
          <Collapsible key={wallName} open={!isCollapsed} onOpenChange={() => toggleWallCollapse(wallName)}>
            <Card className="shadow-sm border">
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {editingWallName === wallName ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={newWallName}
                          onChange={(e) => setNewWallName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              renameWall(wallName, newWallName);
                            }
                          }}
                          onBlur={() => renameWall(wallName, newWallName)}
                          className="text-lg font-semibold"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-lg font-semibold">{wallName}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWallName(wallName);
                            setNewWallName(wallName);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2 ml-4">
                          <Label className="text-sm font-medium">Qty:</Label>
                          <Input
                            value={wall.quantity}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleWallChange(wallName, "quantity", e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="1"
                            className="w-16 h-8 text-center"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWall(wallName);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-8">
                    {/* Dimensions Section */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Dimensions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Width */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Width *</Label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                value={wall.widthFeet}
                                onChange={(e) => handleWallChange(wallName, "widthFeet", e.target.value)}
                                placeholder="32"
                                className="text-center"
                              />
                              <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
                            </div>
                            <div className="flex-1">
                              <Input
                                value={wall.widthInches}
                                onChange={(e) => handleWallChange(wallName, "widthInches", e.target.value)}
                                placeholder="4"
                                className="text-center"
                              />
                              <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
                            </div>
                          </div>
                        </div>

                        {/* Height */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Height *</Label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                value={wall.heightFeet}
                                onChange={(e) => handleWallChange(wallName, "heightFeet", e.target.value)}
                                placeholder="8"
                                className="text-center"
                              />
                              <Label className="text-xs text-muted-foreground mt-1 block text-center">Feet</Label>
                            </div>
                            <div className="flex-1">
                              <Input
                                value={wall.heightInches}
                                onChange={(e) => handleWallChange(wallName, "heightInches", e.target.value)}
                                placeholder="6"
                                className="text-center"
                              />
                              <Label className="text-xs text-muted-foreground mt-1 block text-center">Inches</Label>
                            </div>
                          </div>
                        </div>

                        {/* Panel Count */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Panel Count *</Label>
                          <Input
                            value={wall.panelCount}
                            onChange={(e) => handleWallChange(wallName, "panelCount", e.target.value)}
                            placeholder="3"
                            className="text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Wall System Type Section */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Wall System</h4>
                      
                      {/* Wall System Type Selection */}
                      <div className="mb-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Wall System Type *</Label>
                          <Select
                            value={wall.wallSystemType}
                            onValueChange={(value) => handleWallChange(wallName, "wallSystemType", value)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select wall system type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border z-50">
                              {wallSystemTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Operable Wall Details Section - Only show if Operable Wall is selected */}
                    {wall.wallSystemType === "Operable Wall" && (
                      <div>
                        <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Operable Wall Details</h4>
                        
                        {/* First Row - Panel Configuration, Series, Model */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Panel Configuration *</Label>
                            <Select
                              value={wall.panelConfiguration}
                              onValueChange={(value) => handleWallChange(wallName, "panelConfiguration", value)}
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
                              value={wall.series}
                              onValueChange={(value) => handleWallChange(wallName, "series", value)}
                              disabled={!wall.panelConfiguration}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select series" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {getSeriesByPanelConfiguration(wall.panelConfiguration).map((series) => (
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
                              value={wall.model}
                              onValueChange={(value) => handleWallChange(wallName, "model", value)}
                              disabled={!wall.series}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {getModelsByPanelConfigurationAndSeries(wall.panelConfiguration, wall.series).map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Second Row - Panel Thickness, Panel Skin, STC Rating */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Panel Thickness (inches)</Label>
                            <Input
                              value={wall.panelThickness}
                              onChange={(e) => handleWallChange(wallName, "panelThickness", e.target.value)}
                              placeholder="Thickness"
                              readOnly
                              className="bg-muted"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Panel Skin *</Label>
                            <Select
                              value={wall.panelSkin}
                              onValueChange={(value) => handleWallChange(wallName, "panelSkin", value)}
                              disabled={!wall.model}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select panel skin" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {getPanelSkinOptions(wall.model).map((skin) => (
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
                              value={wall.stcRating}
                              onValueChange={(value) => handleWallChange(wallName, "stcRating", value)}
                              disabled={!wall.model || !wall.panelSkin}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select STC rating" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {getSTCRatingOptions(wall.model, wall.panelSkin).map((rating) => (
                                  <SelectItem key={rating} value={rating}>
                                    STC {rating}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Third Row - Panel Design, Pass Door Panels, Vertical Seals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Panel Design *</Label>
                            <Select
                              value={wall.panelDesign}
                              onValueChange={(value) => handleWallChange(wallName, "panelDesign", value)}
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
                              value={wall.passDoorPanels}
                              onValueChange={(value) => handleWallChange(wallName, "passDoorPanels", value)}
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
                            <Label className="text-sm font-medium">Vertical Seals</Label>
                            <Select
                              value={wall.verticalSeals}
                              onValueChange={(value) => handleWallChange(wallName, "verticalSeals", value)}
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
                        </div>

                        {/* Fourth Row - Final Seal, Bottom Seals, Top Seals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Final Seal</Label>
                            <Select
                              value={wall.finalSeal}
                              onValueChange={(value) => handleWallChange(wallName, "finalSeal", value)}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select final seal" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                <SelectItem value="None">None</SelectItem>
                                {finalSeal.map((seal) => (
                                  <SelectItem key={seal} value={seal}>
                                    {seal}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Bottom Seals</Label>
                            <Select
                              value={wall.bottomSeals}
                              onValueChange={(value) => handleWallChange(wallName, "bottomSeals", value)}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select bottom seals" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                <SelectItem value="None">None</SelectItem>
                                {bottomSeals.map((seal) => (
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
                              value={wall.topSeals}
                              onValueChange={(value) => handleWallChange(wallName, "topSeals", value)}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select top seals" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                <SelectItem value="None">None</SelectItem>
                                {topSeals.map((seal) => (
                                  <SelectItem key={seal} value={seal}>
                                    {seal}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Panel Finish Section */}
                        <div className={`grid grid-cols-1 gap-4 mb-6 ${getPanelFinishSpecificItems(wall.panelFinishCategory).length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Panel Finish Category</Label>
                            <Select
                              value={wall.panelFinishCategory}
                              onValueChange={(value) => handleWallChange(wallName, "panelFinishCategory", value)}
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

                          {getPanelFinishSpecificItems(wall.panelFinishCategory).length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Panel Finish Specific Item *</Label>
                              <Select
                                value={wall.panelFinishSpecificItem}
                                onValueChange={(value) => handleWallChange(wallName, "panelFinishSpecificItem", value)}
                                disabled={!wall.panelFinishCategory}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select specific item" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  {getPanelFinishSpecificItems(wall.panelFinishCategory).map((item) => (
                                    <SelectItem key={item} value={item}>
                                      {item}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Fifth Row - End Panel Type, Track Type, Track System */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">End Panel Type</Label>
                            <Select
                              value={wall.endPanelType}
                              onValueChange={(value) => handleWallChange(wallName, "endPanelType", value)}
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

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Track Type *</Label>
                            <Input
                              value={wall.trackType}
                              placeholder="Track type (auto-filled)"
                              readOnly
                              className="bg-muted"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Track System *</Label>
                            <Select
                              value={wall.trackSystem}
                              onValueChange={(value) => handleWallChange(wallName, "trackSystem", value)}
                              disabled={!wall.trackType}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select track system" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {getTrackSystemsByTrackType(wall.trackType, wall.model).map((system) => (
                                  <SelectItem key={system} value={system}>
                                    {system}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default WallSpecificationForm;