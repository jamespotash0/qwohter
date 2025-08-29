import { BaseWallSpecification } from './base';

export interface OperableWallSpecification extends BaseWallSpecification {
  wallSystemType: 'Operable Wall';
  panelConfiguration: string;
  series: string;
  model: string;
  panelThickness: string;
  panelDesign: string;
  panelSkin: string;
  stcRating: string;
  passDoorPanels: string;
  passDoorQuantity: string;
  panelFinishCategory: string;
  panelFinishSpecificItem: string;
  initialClosureSystem: string;
  endPanelType: string;
  verticalSeals: string;
}

  export const getSeriesByPanelConfiguration = (panelConfiguration: string): string[] => {
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

  export const getPanelThicknessBySeries = (series: string): string[] => {
    if (series === "2000") return ["3\""];
    if (series === "3000") return ["4\""];
    if (series === "Hufcor: 600") return ["4\""];
    return [];
  };

  export const getModelsByPanelConfigurationAndSeries = (panelConfiguration: string, series: string): string[] => {
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

  export const getPanelSkinOptions = (model: string): string[] => {
    if (["Hufcor 641"].includes(model)) return ["Steel"];
    if (["3010", "3020", "3030"].includes(model))
      return ["Standard Steel Skin", "Optional Acoustical Substrate", "Optional Wood Veneer", "Optional High-Pressure Laminate"];
    if (["3050e", "3010GL", "3020GL", "3030GL"].includes(model))
      return ["Standard Steel Skin", "Optional Acoustical Substrate"];
    if (["2010", "2020", "2030"].includes(model))
      return ["Standard Acoustical Substrate", "Optional Steel Skin", "Optional Wood Veneer", "Optional High-Pressure Laminate"];
    if (["2050e", "2010GL", "2020GL", "2030GL"].includes(model))
      return ["Standard Acoustical Substrate", "Optional Steel Skin"];
    return [];
  };

  export const getSTCRatingOptions = (model: string, panelSkin: string): string[] => {
    if (!model || !panelSkin) return [];
    if (["Hufcor 641"].includes(model)) return ["43", "47", "49", "52", "54", "56"];
    if (["2010GL", "2020GL", "2030GL"].includes(model)) return ["38"];
    if (["3010GL", "3020GL", "3030GL"].includes(model)) return ["43", "48"];
    if (["2010", "2020", "2030", "2050e"].includes(model)) {
      if (panelSkin.includes("Acoustical Substrate")) return ["42", "45", "49", "50"];
      if (panelSkin.includes("Steel")) return ["49", "51"];
    }
    if (["3010", "3020", "3030", "3050e"].includes(model)) {
      if (panelSkin.includes("Steel")) return ["46", "50", "52", "56"];
      if (panelSkin.includes("Acoustical Substrate")) return ["43", "46", "48", "50"];
    }
    return [];
  };

  export const getTrackSystemsByTrackType = (trackType: string, model?: string): string[] => {
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

  export const getPanelFinishSpecificItems = (category: string): string[] => {
    const categoriesWithoutSpecificItems = ["Uncovered", "C.O.M. Material", "Field Painting by Others"];
    if (categoriesWithoutSpecificItems.includes(category)) return [];
    const mapping: Record<string, string[]> = {

      "Koroseal Standard Vinyl": ["Unknown", "Silver Fan", "Dover Gray", "Rectory", "Skylight", "Frost", "Surfside", "Mesh", "Nettle", "Fused", "Tangle", "Spun", "Rolled", "Inscription", "Joie de Vivre", "Zydeco", "Fine Silver", "Beignet", "French Quarter", "Mink", "Tuxedo", "Truffle", "Ionic Grey", "Inkwell", "Magnolia", "Hemline", "Clothesline", "Draperie", "Cotton", "Silk", "Cloth", "Stitch", "Origin", "Artisan", "Linen", "Bone", "Eggshell"],
      "Koroseal Upgrade Vinyl": ["Unknown", "Ash", "Jacobean", "Mocha", "Prairie", "Rustic", "Sedona", "Slate", "Vintage", "Willow", "Origin", "Heir", "Heritage", "Generation", "Pedigree", "Descent", "Illusion", "Mottled", "Opalescence", "Enchanted", "Melded", "Fascination", "Earnest", "Baroness", "Poplar", "Hope", "Expectation", "Smoke"],
      "Shaw Standard Carpet": ["Unknown", "Moonscape", "Whitewood", "Almond", "Pelican", "Teak", "Del Sol", "Mohair", "Pottery Glaze", "Mink", "Hazelnut", "Citrus Leaf", "Mineral Green", "Malachite", "Sierra", "Expresso", "Eclipse", "Antique Silver", "Riverboat", "Seacliff", "Snake Skin", "Flint", 	"PierPointe","Lakeland","Blooms Berry","Ink","Exotic Clay","Red Velvet","Roasted Pepper","Black Nickel","Onynx"],
      "HyTex Upgrade Carpet": ["Unknown", "Ghost", "Porcelain", "Parchment", "Beach", "Cinnabar", "Almond", "Abalone", "Lace", "Curry", "Scarlet", "Marble", "Linen", "Taffy", "Hunter", "Ruby", "Flagstone", "Taupe", "Mocha", "Teal", "Marine", "Gunmetal Grey", "Sepia", "Sumatra", "Danube", "Navy", "Black", "Charcoal", "Juniper", "Cerulean", "Verdigris"],
      "HyTex Standard Fabric": ["Unknown", "Cepheus", "Cassiopeia", "Pegasus", "Phoenix", "Hydrus", "Pyxis", "Monoceros", "Aquila", "Orion", "Pisces", "Snow", "Linen", "Sand", "Mocha", "Graphite", "Black", "Cottage", "Mist", "Starlight", "Parchment", "Plaster", "Gray", "Sand", "Discover", "Bahamas", "Olive Grove", "Graphite", "Silverado", "Glacier", "Element", "Gated", "Casarina", "Armor", "Wilderness", "Truffle", "Pepper", "Laguna"],
      "HyTex Upgrade Fabric": ["Unknown", "Eggshell", "Linen", "Flan", "Light Beige", "Husky Gray", "Primavera", "Dovetail", "Pigeon", "Magnetic", "Deep Navy", "Raisin", "Knight", "Mirage", "Triton", "Rock", "Metal", "Basket", "Coriander", "Greige", "Phoron", "Sand Dollar", "Silouhette", "Nightingale", "Buttercup", "Topaz", "Jade", "Palmwood", "Palm Dessert", "Beach Glass", "Harvest", "Morning Dove", "Boulder", "Bravado", "Saddle Brown", "Earl Gray", "Golden (Echo)", "White (Echo)", "Tan (Echo)", "Ice (Echo)", "Silver (Echo)", "Stone (Echo)", "Lake (Echo)", "Smokey Blue (Echo)"],
      "Standard Wood Veneer": ["Unknown", "Unfinished Flat Cut White Maple", "Unfinished Flat Cut White Oak", "Unfinished Flat Cut Walnut", "Unfinished Flat Cut Cherry", "Unfinished Flat Cut Red Oak"],
      "Wilsonart High Pressure Laminate (HPL)": ["Unknown", "Beigewood", "Raw Chestnut", "Fusion Maple", "Manitoba Maple", "Bannister Oak", "Limber Maple", "Solar Oak", "Fonthill Pear", "Wild Cherry", "Grey Glace", "Neutral Glace", "Shadow Zephyr", "Canyon Zephyr", "Grey Pampas", "Almond Leather", "Beige Pampas", "Miste Zephyr", "Twilight Zephyr", "Desert Zephyr", "Cloud Zephyr", "Burnished Chestnut", "Windswept Pewter", "Titanium Ev", "Carbon Ev", "Cloud Nebula", "White Nebula", "Grey Nebula", "Graphite Nebula", "White Tigris", "Evening Tigris", "Natural Tigris", "Bronze Legacy", "Navy Legacy", "Pewter Brush", "Woolamai Brush", "Grey", "Beige", "White", "Antique White", "Frosty White", "Black", "Graphite", "Regimental Red", "Atlantis", "Natural Almond", "Khaki Brown", "Pewter", "North Sea", "Slate Grey", "Dove Grey", "Shadow", "Hollyberry", "Platinum", "Brittany Blue", "Pepperdust", "Designer White", "Indigo", "Fashion Grey", "Crystal", "White Sand", "Lapis Blue", "Linen Alabaster", "Wallaby", "Coffee Bean", "Island", "Ocean", "Cement", "Fossil Shale", "Midnight", "Beachwalk", "Pebble Piazza", "Milan Quartz", "Mystique Dawn", "Kalahari Topaz"],
    };
    return mapping[category] || [];
  };

  export const getPassDoorQuantityOptions = (passDoorPanels: string): string[] => {
    if (!passDoorPanels || passDoorPanels === "") return [];
    return ["1", "2", "3"];
  };

// Operable Wall Static Data Arrays
export const panelConfigurations = ["Individual Panels", "Hinged-Paired Panels", "Continuously-Hinged Panels"];
export const panelDesigns = ["Trimless U Capped", "U-Capped Trim"];
export const passDoorOptions = ["Single", "Double"];
export const panelFinishCategories = ["Koroseal Standard Vinyl", "Koroseal Upgrade Vinyl", "Shaw Standard Carpet", "HyTex Upgrade Carpet", "HyTex Standard Fabric", "HyTex Upgrade Fabric", "Standard Wood Veneer", "Wilsonart High Pressure Laminate (HPL)", "Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
export const verticalSeals = ["Tongue-and-Groove"];
export const bottomSealOptions = ["Retractable", "Automatic", "Adjustable"];
export const topSealOptions = ["Fixed", "Adjustable", "Operable"];
export const endPanelTypes = ["Standard Expander Panel Closure", "Optional Hinged Panel(s) Closure"];
export const initialClosureSystems = ["Standard Bulb", "Optional Fixed Starter Jamb", "Optional Adjustable Starter Jamb"];


