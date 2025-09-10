
export interface AccordionWallSpecification {
  wallSystemType: 'Accordion Partition';
  lengthFeet: number | string;
  lengthInches: number | string;
  heightFeet: number | string;
  heightInches: number | string;
  quantity: number | string;
  panelCount: number | string;
  
  panelConfiguration: string;
  series: string;
  model: string;
  stcRating: string; // Auto-calculated from model
  operation: string;
  panelFinish: string;
  options: string;
  trackSystem: string;
  trackSystemOption: string;
  trackMounting: string;
}

export const getAccordionModelsBySeries = (series: string): string[] => {
  switch (series) {
    case 'VL Series':
      return ['VL-2', 'VL-6', 'VL-8'];
    case 'MK Series':
      return ["MK-X", 'MK-XX'];
    default:
      return [];
  }
};

export const getSTCFromModel = (model: string): string => {
  if (model.includes('VL-2')) return '35';
  if (model.includes('VL-6')) return '38';
  if (model.includes('VL-8')) return '40';
  if (["MK-X", "MK-XX"].includes(model)) return 'Non-Acoustic';
  return '';
};

// Helper function to get available panel finishes based on series
export const getPanelFinishesByModel = (model: string): string[] => {
  if (!model) return [];
  if (["VL-2","VL-6","VL-8"].includes(model)) return ['Reinforced vinyl fabric with woven backing','Carpet of non-woven, 100% polyester staple fiber with fusible latex backing','Customer supplied materials (subject to factory approval)'];
  if (["MK-X", "MK-XX"].includes(model)) return ['Reinforced vinyl fabric with woven backing','Carpet of non-woven, 100% polyester staple fiber with fusible latex backing'];
  return [];
};

export const getOptionsByModel = (model: string): string[] => {
  if (!model) return [];
  if (["VL-2","VL-6","VL-8"].includes(model)) return ['Lock on one or both sides','Radius construction for curved applications','Track switches for alternate storage or multi-location applications','Floating posts for latching of multiple partitions in L, T, and X configurations','Storage pocket with sliding jamb','Storage pocket with door','Conversion latch'];
  if (["MK-X","MK-XX"].includes(model)) return ['Lock on one or both sides','Radius construction for curved applications','Track switches for alternate storage or multi-location applications','Floating posts for latching of multiple partitions in L, T, and X configurations','Storage pocket with sliding jamb','Storage pocket with door'];
  return [];
};

export const getAccordionTrackSystemByModel = (model: string): string => {
  if (!model) return "";
  if (["VL-2","VL-6","VL-8","MK-X","MK-XX"].includes(model)) return 'Curtition #4 Architectural Grade Aluminum Extrusion';
  return ""
}

export const getTrackSystemOptions = (model: string): string => {
  if (!model) return "";
  if (["VL-2","VL-6","VL-8","MK-X","MK-XX"].includes(model)) return 'Ceiling Guard';
  return "";
};

export const getTrackMounting = (model: string): string[] => {
  if (!model) return [];
  if (["VL-2","VL-6","VL-8","MK-X","MK-XX"].includes(model)) return ['Surface-Mounted','Concealed'];
  return [];
};