export interface EnhancedPricingData {
  // ========== INPUT FIELDS (Manual Entry) ==========
  kwik_wall_materials_cost: number;           // Panels, track
  misc_materials_cost: number;                // Screws, nuts, bolts
  misc_materials_description: string;         // Descriptor field
  delivery_cost_track: number;                // Delivery cost for track to site
  delivery_cost_panel: number;               // Delivery cost for panels to site
  track_equipment_costs: number;              // Lifts, scaffolding, installation equipment (tracks)
  track_labor_cost: number;                   // Labor to install track
  panel_equipment_costs: number;              // Lift, scaffolding, installation equipment (panels)
  panel_labor_cost: number;                   // Labor to install panel
  
  track_freight_factory: number;              // Freight from factory (tracks)
  panel_freight_factory: number;              // Freight from factory (panels)  
  local_handling_costs: number;               // Local handling costs
  
  materials_markup_percentage: number;                  // Markup percentage (for materials cost)
  shipping_markup_percentage: number;                      // Markup margin (for shipping/freight)
  
  // ========== AUTO-CALCULATED FIELDS ==========
  unseen_costs: number;                       // Calculated from unseen_costs_percentage
  unseen_costs_percentage: number;            // Percentage for unseen costs (default 10%, unlockable)
  unseen_costs_locked: boolean;               // Whether unseen costs percentage is locked at 10%
  cost_subtotal: number;                      // Sum of all cost fields
  base_selling_price: number;                 // Cost subtotal + gross profit
  shipping_cost_subtotal: number;         // Track freight + panel freight + local handling
  shipping_selling_price: number;          // Shipping & handling + gross profit margin
  final_selling_price: number;                      // Final selling price
  
  // ========== LEGACY FIELDS (Mapped from auto-calculated) ==========
  // basePrice: number;                          // Maps to base_selling_price
  // freight: number;                           // Maps to shipping_freight_subtotal  
  // total: string;                             // Maps to final_selling_price
  payment_upon_drawings: string;                // Keep as-is
  payment_upon_track_installation: string;       // Keep as-is
}

// Default values for new pricing data
export const defaultEnhancedPricing: EnhancedPricingData = {
  // Input fields
  kwik_wall_materials_cost: 0,
  misc_materials_cost: 0,
  misc_materials_description: '',
  delivery_cost_track: 0,
  delivery_cost_panel: 0,
  track_equipment_costs: 0,
  track_labor_cost: 0,
  panel_equipment_costs: 0,
  panel_labor_cost: 0,
  track_freight_factory: 0,
  panel_freight_factory: 0,
  local_handling_costs: 0,
  materials_markup_percentage: 0,        // No default - user enters their own
  shipping_markup_percentage: 0,            // No default - user enters their own
  
  // Auto-calculated fields
  unseen_costs: 0,
  unseen_costs_percentage: 10,  // Default 10%
  unseen_costs_locked: true,    // Start locked (auto-calculated)
  cost_subtotal: 0,
  base_selling_price: 0,
  shipping_cost_subtotal: 0,
  shipping_selling_price: 0,
  final_selling_price: 0,
  
  // Legacy fields
  // basePrice: 0,
  // freight: 0,
  // total: '0',
  payment_upon_drawings: '33',
  payment_upon_track_installation: '33'
};

// Helper function to calculate all auto-calculated fields
export const calculateEnhancedPricing = (data: EnhancedPricingData): EnhancedPricingData => {
  // Calculate unseen costs (always percentage-based, but percentage can be unlocked/customized)
  const unseen_costs = data.kwik_wall_materials_cost * (data.unseen_costs_percentage / 100);
  
  // Calculate cost subtotal
  const cost_subtotal = 
    data.kwik_wall_materials_cost +
    data.misc_materials_cost +
    data.delivery_cost_track +
    data.delivery_cost_panel +
    data.track_equipment_costs +
    data.track_labor_cost +
    data.panel_equipment_costs +
    data.panel_labor_cost +
    unseen_costs;
  
  // Calculate base selling price (cost + markup)
  const base_selling_price = cost_subtotal + (cost_subtotal * data.materials_markup_percentage / 100);
  
  // Calculate shipping & handling subtotal
  const shipping_cost_subtotal = 
    data.track_freight_factory +
    data.panel_freight_factory +
    data.local_handling_costs;
  
  // Calculate shipping/freight subtotal (shipping + margin)
  const shipping_selling_price = shipping_cost_subtotal + (shipping_cost_subtotal * data.shipping_markup_percentage / 100);
  
  // Calculate final selling price
  const final_selling_price = base_selling_price + shipping_selling_price;
  
  return {
    ...data,
    // Update auto-calculated fields
    unseen_costs,
    cost_subtotal,
    base_selling_price,
    shipping_cost_subtotal,  // This was missing!
    shipping_selling_price,
    final_selling_price,
    
    // Update legacy fields for backward compatibility
    // basePrice: base_selling_price,
    // freight: shipping_selling_price,
    // total: final_selling_price.toString()
  };
};