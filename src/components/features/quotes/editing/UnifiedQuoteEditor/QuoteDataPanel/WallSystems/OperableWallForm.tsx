import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallTypeFormProps } from './types';

export const OperableWallForm: React.FC<WallTypeFormProps> = ({
  wallName,
  wall,
  onFieldChange
}) => {
  // Helper functions from original OperableWallSpecs
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

  const getPanelSkinOptions = (model: string): string[] => {
    if (["Hufcor 641"].includes(model)) {
      return ["Steel"];
    }
    if (["3010", "3020", "3030"].includes(model)) {
      return ["Standard Steel Skin", "Optional Acoustical Substrate", "Optional Wood Veneer", "Optional High-Pressure Laminate"];
    }
    if (["3050e", "3010GL", "3020GL", "3030GL"].includes(model)) {
      return ["Standard Steel Skin", "Optional Acoustical Substrate"];
    }
    if (["2010", "2020", "2030"].includes(model)) {
      return ["Standard Acoustical Substrate", "Optional Steel Skin", "Optional Wood Veneer", "Optional High-Pressure Laminate"];
    }
    if (["2050e", "2010GL", "2020GL", "2030GL"].includes(model)) {
      return ["Standard Acoustical Substrate", "Optional Steel Skin"];
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
    const categoriesWithoutSpecificItems = ["", "Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
    if (categoriesWithoutSpecificItems.includes(category)) {
      return [];
    }
    
    switch (category) {
      case "Koroseal Standard Vinyl":
        return ["Unknown", "Silver Fan", "Dover Gray", "Rectory", "Skylight", "Frost", "Surfside", "Mesh", "Nettle", "Fused", "Tangle", "Spun", "Rolled", "Inscription", "Joie de Vivre", "Zydeco", "Fine Silver", "Beignet", "French Quarter", "Mink", "Tuxedo", "Truffle", "Ionic Grey", "Inkwell", "Magnolia", "Hemline", "Clothesline", "Draperie", "Cotton", "Silk", "Cloth", "Stitch", "Origin", "Artisan", "Linen", "Bone", "Eggshell"];
      case "Koroseal Upgrade Vinyl":
        return ["Unknown", "Ash", "Jacobean", "Mocha", "Prairie", "Rustic", "Sedona", "Slate", "Vintage", "Willow", "Origin", "Heir", "Heritage", "Generation", "Pedigree", "Descent", "Illusion", "Mottled", "Opalescence", "Enchanted", "Melded", "Fascination", "Earnest", "Baroness", "Poplar", "Hope", "Expectation", "Smoke"];
      case "Shaw Standard Carpet":
        return ["Unknown", "Moonscape", "Whitewood", "Almond", "Pelican", "Teak", "Del Sol", "Mohair", "Pottery Glaze", "Mink", "Hazelnut", "Citrus Leaf", "Mineral Green", "Malachite", "Sierra", "Expresso", "Eclipse", "Antique Silver", "Riverboat", "Seacliff", "Snake Skin", "Flint", "PierPointe", "Lakeland", "Blooms Berry", "Ink", "Exotic Clay", "Red Velvet", "Roasted Pepper", "Black Nickel", "Onynx"];
      case "HyTex Upgrade Carpet":
        return ["Unknown", "Ghost", "Porcelain", "Parchment", "Beach", "Cinnabar", "Almond", "Abalone", "Lace", "Curry", "Scarlet", "Marble", "Linen", "Taffy", "Hunter", "Ruby", "Flagstone", "Taupe", "Mocha", "Teal", "Marine", "Gunmetal Grey", "Sepia", "Sumatra", "Danube", "Navy", "Black", "Charcoal", "Juniper", "Cerulean", "Verdigris"];
      case "HyTex Standard Fabric":
        return ["Unknown", "Cepheus", "Cassiopeia", "Pegasus", "Phoenix", "Hydrus", "Pyxis", "Monoceros", "Aquila", "Orion", "Pisces", "Snow", "Linen", "Sand", "Mocha", "Graphite", "Black", "Cottage", "Mist", "Starlight", "Parchment", "Plaster", "Gray", "Sand", "Discover", "Bahamas", "Olive Grove", "Graphite", "Silverado", "Glacier", "Element", "Gated", "Casarina", "Armor", "Wilderness", "Truffle", "Pepper", "Laguna"];
      case "HyTex Upgrade Fabric":
        return ["Unknown", "Eggshell", "Linen", "Flan", "Light Beige", "Husky Gray", "Primavera", "Dovetail", "Pigeon", "Magnetic", "Deep Navy", "Raisin", "Knight", "Mirage", "Triton", "Rock", "Metal", "Basket", "Coriander", "Greige", "Phoron", "Sand Dollar", "Silouhette", "Nightingale", "Buttercup", "Topaz", "Jade", "Palmwood", "Palm Dessert", "Beach Glass", "Harvest", "Morning Dove", "Boulder", "Bravado", "Saddle Brown", "Earl Gray", "Golden (Echo)", "White (Echo)", "Tan (Echo)", "Ice (Echo)", "Silver (Echo)", "Stone (Echo)", "Lake (Echo)", "Smokey Blue (Echo)"];
      case "Standard Wood Veneer":
        return ["Unknown", "Unfinished Flat Cut White Maple", "Unfinished Flat Cut White Oak", "Unfinished Flat Cut Walnut", "Unfinished Flat Cut Cherry", "Unfinished Flat Cut Red Oak"];
      case "Wilsonart High Pressure Laminate (HPL)":
        return ["Unknown", "Beigewood", "Raw Chestnut", "Fusion Maple", "Manitoba Maple", "Bannister Oak", "Limber Maple", "Solar Oak", "Fonthill Pear", "Wild Cherry", "Grey Glace", "Neutral Glace", "Shadow Zephyr", "Canyon Zephyr", "Grey Pampas", "Almond Leather", "Beige Pampas", "Miste Zephyr", "Twilight Zephyr", "Desert Zephyr", "Cloud Zephyr", "Burnished Chestnut", "Windswept Pewter", "Titanium Ev", "Carbon Ev", "Cloud Nebula", "White Nebula", "Grey Nebula", "Graphite Nebula", "White Tigris", "Evening Tigris", "Natural Tigris", "Bronze Legacy", "Navy Legacy", "Pewter Brush", "Woolamai Brush", "Grey", "Beige", "White", "Antique White", "Frosty White", "Black", "Graphite", "Regimental Red", "Atlantis", "Natural Almond", "Khaki Brown", "Pewter", "North Sea", "Slate Grey", "Dove Grey", "Shadow", "Hollyberry", "Platinum", "Brittany Blue", "Pepperdust", "Designer White", "Indigo", "Fashion Grey", "Crystal", "White Sand", "Lapis Blue", "Linen Alabaster", "Wallaby", "Coffee Bean", "Island", "Ocean", "Cement", "Fossil Shale", "Midnight", "Beachwalk", "Pebble Piazza", "Milan Quartz", "Mystique Dawn", "Kalahari Topaz"];
      default:
        return [];
    }
  };

  const getTrackTypeByModel = (model: string): string => {
    if (["Hufcor 641", "2010", "2010GL", "3010", "3010GL"].includes(model)) {
      return "Curve & Diverter (Individual) Track";
    } else if (["2020", "2020GL", "3020", "3020GL"].includes(model)) {
      return "Multi-Directional Track";
    } else if (["2050e", "3050e", "3030", "3030GL", "2030", "2030GL"].includes(model)) {
      return "Hinged-Pair (Straight Line) Track";
    }
    return "";
  };

  const handleFieldChange = (field: string, value: any) => {
    const actualValue = value === "None" ? "" : value;
    
    
    // Apply the main field change first
    onFieldChange(wallName, field, actualValue);

    // Cascading logic - reset all dependent fields

    if (field === "panelConfiguration") {
      // In edit mode, only reset fields that would be invalid for the new configuration
      // Don't reset everything to allow manual editing
      const currentSeries = wall.series;
      const validSeries = getSeriesByPanelConfiguration(actualValue);
      
      setTimeout(() => {
        // Only reset series if current series is not valid for new configuration
        if (currentSeries && !validSeries.includes(currentSeries)) {
          onFieldChange(wallName, 'series', '');
          onFieldChange(wallName, 'model', '');
          onFieldChange(wallName, 'panelThickness', '');
          onFieldChange(wallName, 'panelSkin', '');
          onFieldChange(wallName, 'stcRating', '');
          onFieldChange(wallName, 'trackType', '');
          onFieldChange(wallName, 'trackSystem', '');
        }
        // Reset auto-calculated fields
        const thickness = currentSeries === "2000" ? "3\"" : currentSeries === "3000" ? "4\"" : currentSeries === "Hufcor: 600" ? "4\"" : "";
        if (thickness && thickness !== wall.panelThickness) {
          onFieldChange(wallName, 'panelThickness', thickness);
        }
      }, 0);
    }

    if (field === "series") {
      // Auto-update panel thickness based on series
      const thickness = actualValue === "2000" ? "3\"" : actualValue === "3000" ? "4\"" : actualValue === "Hufcor: 600" ? "4\"" : "";
      const currentModel = wall.model;
      const validModels = getModelsByPanelConfigurationAndSeries(wall.panelConfiguration, actualValue);
      
      setTimeout(() => {
        onFieldChange(wallName, 'panelThickness', thickness);
        
        // Only reset model if current model is not valid for new series
        if (currentModel && !validModels.includes(currentModel)) {
          onFieldChange(wallName, 'model', '');
          onFieldChange(wallName, 'panelSkin', '');
          onFieldChange(wallName, 'stcRating', '');
          onFieldChange(wallName, 'trackType', '');
          onFieldChange(wallName, 'trackSystem', '');
        }
      }, 0);
    }

    if (field === "model") {
      // Auto-update track type based on model
      const trackType = getTrackTypeByModel(actualValue);
      const currentPanelSkin = wall.panelSkin;
      const validPanelSkins = getPanelSkinOptions(actualValue);
      
      setTimeout(() => {
        onFieldChange(wallName, 'trackType', trackType);
        onFieldChange(wallName, 'trackSystem', ''); // Always reset track system since it depends on track type
        
        // Only reset panel skin if current skin is not valid for new model
        if (currentPanelSkin && !validPanelSkins.includes(currentPanelSkin)) {
          onFieldChange(wallName, 'panelSkin', '');
          onFieldChange(wallName, 'stcRating', ''); // STC depends on panel skin, so reset if skin changes
        }
      }, 0);
    }

    if (field === "panelSkin") {
      setTimeout(() => {
        onFieldChange(wallName, 'stcRating', '');
      }, 0);
    }

    if (field === "trackType") {
      setTimeout(() => {
        onFieldChange(wallName, 'trackSystem', '');
      }, 0);
    }

    if (field === "passDoorPanels") {
      if (actualValue === "None") {
        setTimeout(() => {
          onFieldChange(wallName, 'passDoorQuantity', '');
        }, 0);
      }
    }

    if (field === "panelFinishCategory") {
      const categoriesWithoutSpecificItems = ["", "Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
      
      // Clear panelFinishSpecificItem when category doesn't support specific items
      if (categoriesWithoutSpecificItems.includes(actualValue)) {
        setTimeout(() => {
          onFieldChange(wallName, 'panelFinishSpecificItem', "");
        }, 10);
      }
    }
  };


  return (
    <div className="space-y-2">
      {/* Panel Configuration - Full width */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Panel Configuration *</Label>
          {/* {wall.panelConfiguration && (
            <button
              type="button"
              onClick={() => {
                onFieldChange(wallName, 'panelConfiguration', '');
                onFieldChange(wallName, 'series', '');
                onFieldChange(wallName, 'model', '');
                onFieldChange(wallName, 'panelThickness', '');
                onFieldChange(wallName, 'panelSkin', '');
                onFieldChange(wallName, 'stcRating', '');
                onFieldChange(wallName, 'trackType', '');
                onFieldChange(wallName, 'trackSystem', '');
              }}
              className="text-xs text-gray-500 hover:text-red-600 underline"
            >
              Clear & Reset
            </button>
          )} */}
        </div>
        <Select
          value={wall.panelConfiguration || ''}
          onValueChange={(value) => handleFieldChange('panelConfiguration', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select config" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
            <SelectItem className="text-left" value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
            <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2x2 Grid Layout for Wall System Fields */}
      <div className="grid grid-cols-2 gap-2">
        {/* Row 1 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Series *</Label>
            {/* {wall.series && (
              <button
                type="button"
                onClick={() => {
                  onFieldChange(wallName, 'series', '');
                  onFieldChange(wallName, 'model', '');
                  onFieldChange(wallName, 'panelThickness', '');
                  onFieldChange(wallName, 'panelSkin', '');
                  onFieldChange(wallName, 'stcRating', '');
                  onFieldChange(wallName, 'trackType', '');
                  onFieldChange(wallName, 'trackSystem', '');
                }}
                className="text-xs text-gray-500 hover:text-red-600 underline"
              >
                Clear
              </button>
            )} */}
          </div>
          <Select
            value={wall.series || ''}
            onValueChange={(value) => handleFieldChange('series', value)}
            disabled={!wall.panelConfiguration}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select series" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {getSeriesByPanelConfiguration(wall.panelConfiguration).map((series) => (
                <SelectItem key={series} className="text-left" value={series}>
                  {series}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Model *</Label>
            {/* {wall.model && (
              <button
                type="button"
                onClick={() => {
                  onFieldChange(wallName, 'model', '');
                  onFieldChange(wallName, 'panelSkin', '');
                  onFieldChange(wallName, 'stcRating', '');
                  onFieldChange(wallName, 'trackType', '');
                  onFieldChange(wallName, 'trackSystem', '');
                }}
                className="text-xs text-gray-500 hover:text-red-600 underline"
              >
                Clear
              </button>
            )} */}
          </div>
          <Select
            value={wall.model || ''}
            onValueChange={(value) => handleFieldChange('model', value)}
            disabled={!wall.series}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {getModelsByPanelConfigurationAndSeries(wall.panelConfiguration, wall.series).map((model) => (
                <SelectItem key={model} className="text-left" value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2 */}
        <div className="space-y-1">
          <Label className="text-xs">Panel Thickness</Label>
          <Input
            value={wall.panelThickness || ''}
            readOnly
            className="text-xs h-8 bg-muted text-muted-foreground"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">STC Rating *</Label>
          <Select
            value={wall.stcRating || ''}
            onValueChange={(value) => handleFieldChange('stcRating', value)}
            disabled={!wall.model || !wall.panelSkin}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select STC" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {getSTCRatingOptions(wall.model, wall.panelSkin).map((rating) => (
                <SelectItem key={rating} className="text-left" value={rating}>
                  {rating}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3 */}
        <div className="space-y-1">
          <Label className="text-xs">Panel Design *</Label>
          <Select
            value={wall.panelDesign || ''}
            onValueChange={(value) => handleFieldChange('panelDesign', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select design" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="Trimless U Capped">Trimless U Capped</SelectItem>
              <SelectItem className="text-left" value="U-Capped Trim">U-Capped Trim</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Panel Skin *</Label>
          <Select
            value={wall.panelSkin || ''}
            onValueChange={(value) => handleFieldChange('panelSkin', value)}
            disabled={!wall.model}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select skin" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {getPanelSkinOptions(wall.model).map((skin) => (
                <SelectItem key={skin} className="text-left" value={skin}>
                  {skin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 4 */}
        <div className="space-y-1">
          <Label className="text-xs">Panel Finish Category</Label>
          <Select
            value={wall.panelFinishCategory || ''}
            onValueChange={(value) => handleFieldChange('panelFinishCategory', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select finish" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="Koroseal Standard Vinyl">Koroseal Standard Vinyl</SelectItem>
              <SelectItem className="text-left" value="Koroseal Upgrade Vinyl">Koroseal Upgrade Vinyl</SelectItem>
              <SelectItem className="text-left" value="Shaw Standard Carpet">Shaw Standard Carpet</SelectItem>
              <SelectItem className="text-left" value="HyTex Upgrade Carpet">HyTex Upgrade Carpet</SelectItem>
              <SelectItem className="text-left" value="HyTex Standard Fabric">HyTex Standard Fabric</SelectItem>
              <SelectItem className="text-left" value="HyTex Upgrade Fabric">HyTex Upgrade Fabric</SelectItem>
              <SelectItem className="text-left" value="Standard Wood Veneer">Standard Wood Veneer</SelectItem>
              <SelectItem className="text-left" value="Wilsonart High Pressure Laminate (HPL)">Wilsonart High Pressure Laminate (HPL)</SelectItem>
              <SelectItem className="text-left" value="Full Height Marker (Tack) Board">Full Height Marker (Tack) Board</SelectItem>
              <SelectItem className="text-left" value="Uncovered">Uncovered</SelectItem>
              <SelectItem className="text-left" value="C.O.M. Material">C.O.M. Material</SelectItem>
              <SelectItem className="text-left" value="Field Painting by Others">Field Painting by Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          {getPanelFinishSpecificItems(wall.panelFinishCategory).length > 0 ? (
            <>
              <Label className="text-xs">Panel Finish Specific Item</Label>
              <Select
                value={wall.panelFinishSpecificItem || ''}
                onValueChange={(value) => handleFieldChange('panelFinishSpecificItem', value)}
                disabled={!wall.panelFinishCategory}
              >
                <SelectTrigger className="text-xs h-8 text-left">
                  <SelectValue placeholder="Select specific item" />
                </SelectTrigger>
                <SelectContent className="text-left">
                  {getPanelFinishSpecificItems(wall.panelFinishCategory).map((item) => (
                    <SelectItem key={item} className="text-left" value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <div className="h-8"></div>
          )}
        </div>

        {/* Row 5 */}
        <div className="space-y-1">
          <Label className="text-xs">Vertical Seals</Label>
          <Select
            value={wall.verticalSeals || ''}
            onValueChange={(value) => handleFieldChange('verticalSeals', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select seals" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="None">None</SelectItem>
              <SelectItem className="text-left" value="Tongue-and-Groove">Tongue-and-Groove</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bottom Seals</Label>
          <Select
            value={wall.bottomSeals || ''}
            onValueChange={(value) => handleFieldChange('bottomSeals', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select seals" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="None">None</SelectItem>
              <SelectItem className="text-left" value="Retractable">Retractable</SelectItem>
              <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
              <SelectItem className="text-left" value="Adjustable">Adjustable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 6 */}
        <div className="space-y-1">
          <Label className="text-xs">Top Seals</Label>
          <Select
            value={wall.topSeals || ''}
            onValueChange={(value) => handleFieldChange('topSeals', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select seals" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="None">None</SelectItem>
              <SelectItem className="text-left" value="Fixed">Fixed</SelectItem>
              <SelectItem className="text-left" value="Adjustable">Adjustable</SelectItem>
              <SelectItem className="text-left" value="Operable">Operable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Initial Closure System</Label>
          <Select
            value={wall.initialClosureSystem || ''}
            onValueChange={(value) => handleFieldChange('initialClosureSystem', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select closure" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="None">None</SelectItem>
              <SelectItem className="text-left" value="Standard Bulb">Standard Bulb</SelectItem>
              <SelectItem className="text-left" value="Optional Fixed Starter Jamb">Optional Fixed Starter Jamb</SelectItem>
              <SelectItem className="text-left" value="Optional Adjustable Starter Jamb">Optional Adjustable Starter Jamb</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 7 - End Panel Type spans full width */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">End Panel Type</Label>
          <Select
            value={wall.endPanelType || ''}
            onValueChange={(value) => handleFieldChange('endPanelType', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select end panel" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="None">None</SelectItem>
              <SelectItem className="text-left" value="Standard Expander Panel Closure">Standard Expander Panel Closure</SelectItem>
              <SelectItem className="text-left" value="Optional Hinged Panel(s) Closure">Optional Hinged Panel(s) Closure</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 8 */}
        <div className="space-y-1">
          <Label className="text-xs">Pass Door Panels</Label>
          <Select
            value={wall.passDoorPanels || ''}
            onValueChange={(value) => handleFieldChange('passDoorPanels', value)}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select pass door" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="None">None</SelectItem>
              <SelectItem className="text-left" value="Single">Single</SelectItem>
              <SelectItem className="text-left" value="Double">Double</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pass Door Quantity</Label>
          <Select
            value={wall.passDoorQuantity || ''}
            onValueChange={(value) => handleFieldChange('passDoorQuantity', value)}
            disabled={!wall.passDoorPanels || wall.passDoorPanels === "None"}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select quantity" />
            </SelectTrigger>
            <SelectContent className="text-left">
              <SelectItem className="text-left" value="1">1</SelectItem>
              <SelectItem className="text-left" value="2">2</SelectItem>
              <SelectItem className="text-left" value="3">3</SelectItem>
              <SelectItem className="text-left" value="4">4</SelectItem>
              <SelectItem className="text-left" value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 9 - Track Type spans full width */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Track Type *</Label>
          <Input
            value={wall.trackType || ''}
            readOnly
            className="text-xs h-8 bg-muted text-muted-foreground"
          />
        </div>

        {/* Row 10 - Track System spans full width */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Track System *</Label>
          <Select
            value={wall.trackSystem || ''}
            onValueChange={(value) => handleFieldChange('trackSystem', value)}
            disabled={!wall.trackType && !wall.model}
          >
            <SelectTrigger className="text-xs h-8 text-left">
              <SelectValue placeholder="Select system" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {getTrackSystemsByTrackType(wall.trackType, wall.model).map((system) => (
                <SelectItem key={system} className="text-left" value={system}>
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