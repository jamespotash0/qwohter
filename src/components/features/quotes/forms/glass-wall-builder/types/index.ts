export interface GlassWallConfiguration {
  model: string;
  configurationType: string;
  operationType: string;
  glassType: string;
  stc_rating: string;
  partitionSupport: string;
  passDoorType: string;
  passDoorOption: string;
  panelFace: string;
  hingeType: string;
  frameFinish: string;
  frameThickness: string;
  trackType: string;
  trackFinish: string;
  finalClosure: string;
  bottomSeals: string;
  topSeals: string;
}

export interface GlassWallConfigurationFormProps {
  onConfigurationChange?: (config: GlassWallConfiguration) => void;
  initialConfig?: Partial<GlassWallConfiguration>;
}

export type ModelType = 'Stella' | 'Luna' | 'Illona' | 'Ava' | 'Mata';

export interface FormFieldProps {
  selectedModel: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  required?: boolean;
}

export interface ComputedFieldProps {
  selectedModel: string;
  selectedSTCRating?: string;
  label: string;
}

export interface FormRowProps {
  children: React.ReactNode;
}

export interface ModelConfiguration {
  configurations: string[];
  operations: string[];
  glassType: string[];
  stcRating: string[];
  partitionSupport: string[];
  passDoorType: string[];
  passDoorOption: string[];
  panelFaces: string[];
  hinging: string[];
  frameFinishes: string[];
  trackType: string[];
  trackFinish: string[];
  floorGuide?: string[];
  finalClosure: string[];
  bottomSeals: string[];
  topSeals: string[];
}

export type ModelConfigurations = Record<ModelType, ModelConfiguration>;