/**
 * Enhanced Form Builder Types
 * For the next-generation form builder with grid layout, dependencies, and calculations
 */

import { type FormField as BaseFormField, type FormTab } from '@/stores/forms/formsStore';

/**
 * Enhanced Field with Layout and Visual Properties
 */
export interface EnhancedFormField extends BaseFormField {
  // Grid layout properties
  layout?: {
    x: number;        // Grid column position
    y: number;        // Grid row position
    w: number;        // Width in grid units (1-12)
    h: number;        // Height in grid units
    minW?: number;    // Minimum width
    maxW?: number;    // Maximum width
    minH?: number;    // Minimum height
    maxH?: number;    // Maximum height
    static?: boolean; // Prevent dragging/resizing
  };

  // Visual styling
  styling?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    padding?: number;
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };

  // Mathematical calculations
  formula?: string; // Excel-like formula: =A1 + B2 * 1.08
  calculatedValue?: number | string;

  // Dependencies (for arrows)
  dependencies?: Array<{
    fieldId: string;
    condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
    action: 'show' | 'hide' | 'enable' | 'disable' | 'calculate';
  }>;

  // Custom component support
  customComponent?: {
    name: string; // e.g., 'CascadingProductSelector'
    props?: Record<string, any>;
  };

  // Data source mapping for auto-population
  dataSource?: {
    type: 'organization' | 'user' | 'organization_members';
    field: string; // e.g., 'phone_number', 'full_name', 'email'
    allowOverride?: boolean; // Whether users can change the auto-populated value
  };
}

/**
 * Enhanced Tab with Layout Mode
 */
export interface EnhancedFormTab extends Omit<FormTab, 'fields'> {
  fields: EnhancedFormField[];
  layoutMode?: 'grid' | 'stack'; // Grid for advanced layout, stack for simple vertical
}

/**
 * Field Palette Item
 */
export interface FieldPaletteItem {
  type: string;
  label: string;
  icon: React.ComponentType<any>;
  category: 'text' | 'date' | 'selection' | 'advanced' | 'custom';
  defaultProps: Partial<EnhancedFormField>;
}

/**
 * Canvas Mode
 */
export type CanvasMode = 'design' | 'preview' | 'dependencies';

/**
 * Form Builder UI State
 */
export interface FormBuilderUIState {
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  activeTabId: string;
  canvasMode: CanvasMode;
  showPropertiesPanel: boolean;
  showFieldPalette: boolean;
  gridSize: number; // Grid cell size in pixels
  snapToGrid: boolean;
}
