import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WallSpecification } from "@/types/quote";

interface OperableWallSpecsProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, field: keyof WallSpecification, value: string) => void;
}

const OperableWallSpecs = ({ wall, wallName, onWallChange }: OperableWallSpecsProps) => {
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
    const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others"];
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

  const panelConfigurations = ["Individual Panels", "Hinged-Paired Panels", "Continuously-Hinged Panels"];
  const panelDesigns = ["Trimless U Capped", "U-Capped Trim"];
  const passDoorOptions = ["Single", "Double"];
  const panelFinishCategories = ["Koroseal Standard Vinyl", "Koroseal Upgrade Vinyl", "Shaw Standard Carpet", "HyTex Upgrade Carpet", "HyTex Standard Fabric", "HyTex Upgrade Fabric", "Standard Wood Veneer", "Wilsonart High Pressure Laminate (HPL)", "Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
  const verticalSeals = ["Tongue-and-Groove"];
  const bottomSeals = ["Retractable", "Automatic", "Adjustable"];
  const topSeals = ["Fixed", "Adjustable", "Operable"];
  const endPanelTypes = ["Standard Expander Panel Closure", "Optional Hinged Panel(s) Closure"];
  const initialClosureSystem = ["Standard Bulb", "Optional Fixed Starter Jamb", "Optional Adjustable Starter Jamb"];
  // const structureSupportOptions = ["Pre-Drilled", "Existing Steel Beam", "Custom Support", "None Required"];

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Operable Wall Details</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Configuration *</Label>
          <Select
            value={wall.panelConfiguration}
            onValueChange={(value) => onWallChange(wallName, "panelConfiguration", value)}
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
            onValueChange={(value) => onWallChange(wallName, "series", value)}
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
            onValueChange={(value) => onWallChange(wallName, "model", value)}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Thickness (inches)</Label>
          <Input
            value={wall.panelThickness}
            onChange={(e) => onWallChange(wallName, "panelThickness", e.target.value)}
            placeholder="Thickness"
            readOnly
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Skin *</Label>
          <Select
            value={wall.panelSkin}
            onValueChange={(value) => onWallChange(wallName, "panelSkin", value)}
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
            onValueChange={(value) => onWallChange(wallName, "stcRating", value)}
            disabled={!wall.model || !wall.panelSkin}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select STC rating" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {getSTCRatingOptions(wall.model, wall.panelSkin).map((rating) => (
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
          <Label className="text-sm font-medium">Panel Design *</Label>
          <Select
            value={wall.panelDesign}
            onValueChange={(value) => onWallChange(wallName, "panelDesign", value)}
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
            onValueChange={(value) => onWallChange(wallName, "passDoorPanels", value)}
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
            value={wall.passDoorQuantity || ""}
            onValueChange={(value) => onWallChange(wallName, "passDoorQuantity", value)}
            disabled={!wall.passDoorPanels || wall.passDoorPanels === "None"}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select quantity" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Vertical Seals</Label>
          <Select
            value={wall.verticalSeals}
            onValueChange={(value) => onWallChange(wallName, "verticalSeals", value)}
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
            value={wall.bottomSeals}
            onValueChange={(value) => onWallChange(wallName, "bottomSeals", value)}
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
            onValueChange={(value) => onWallChange(wallName, "topSeals", value)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Initial Closure System</Label>
          <Select
            value={wall.initialClosureSystem}
            onValueChange={(value) => onWallChange(wallName, "initialClosureSystem", value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select initial closure system" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="None">None</SelectItem>
              {initialClosureSystem.map((seal) => (
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
            value={wall.endPanelType}
            onValueChange={(value) => onWallChange(wallName, "endPanelType", value)}
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

      <div className={`grid grid-cols-1 gap-4 mb-6 ${getPanelFinishSpecificItems(wall.panelFinishCategory).length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Finish Category</Label>
          <Select
            value={wall.panelFinishCategory}
            onValueChange={(value) => onWallChange(wallName, "panelFinishCategory", value)}
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
              onValueChange={(value) => onWallChange(wallName, "panelFinishSpecificItem", value)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            onValueChange={(value) => onWallChange(wallName, "trackSystem", value)}
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

      {/* <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Structure Support Type *</Label>
          <Select
            value={wall.structureSupport || ""}
            onValueChange={(value) => onWallChange(wallName, "structureSupport", value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select structure support type" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {structureSupportOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div> */}
    </div>
  );
};

export default OperableWallSpecs;