export interface EnhancedPricingData {
  // ========== INPUT FIELDS (Manual Entry) ==========
  kwik_wall_materials_cost: number;           // Panels, track
  misc_materials_cost: number;                // Screws, nuts, bolts
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
  final_selling_price: number;                    // Final selling price
  base_selling_gross_profit_percentage: number;
  shipping_selling_gross_profit_percentage: number;
  final_selling_gross_profit_percentage: number;
  final_selling_price_profit_amount: number;
  payment_upon_drawings: string;                // Keep as-is
  payment_upon_track_installation: string;       // Keep as-is
}

// Default values for new pricing data
export const defaultEnhancedPricing: EnhancedPricingData = {
  // Input fields
  kwik_wall_materials_cost: 0,
  misc_materials_cost: 0,
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
  unseen_costs: 500,            // Default $500
  unseen_costs_percentage: 0,   // Auto-calculated from dollar amount
  unseen_costs_locked: true,    // Start locked (auto-calculated)
  cost_subtotal: 0,
  base_selling_price: 0,
  shipping_cost_subtotal: 0,
  shipping_selling_price: 0,
  final_selling_price: 0,
  base_selling_gross_profit_percentage: 0,
  shipping_selling_gross_profit_percentage: 0,
  final_selling_gross_profit_percentage: 0,
  final_selling_price_profit_amount: 0,
  payment_upon_drawings: '33',
  payment_upon_track_installation: '33'
};

// Helper function to calculate all auto-calculated fields
export const calculateEnhancedPricing = (data: EnhancedPricingData): EnhancedPricingData => {
  // Unseen costs are now dollar-based, calculate percentage from amount
  const unseen_costs = data.unseen_costs;
  const unseen_costs_percentage = data.kwik_wall_materials_cost > 0 
    ? (unseen_costs / data.kwik_wall_materials_cost) * 100 
    : 0;
  
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

  // Calculate gross profit percentages - handle division by zero
  const base_selling_gross_profit_percentage = base_selling_price > 0 && cost_subtotal > 0 
    ? ((base_selling_price - cost_subtotal) / base_selling_price * 100) 
    : 0;
    
  const shipping_selling_gross_profit_percentage = shipping_selling_price > 0 && shipping_cost_subtotal > 0 
    ? ((shipping_selling_price - shipping_cost_subtotal) / shipping_selling_price * 100) 
    : 0;
    
  const final_selling_gross_profit_percentage = final_selling_price > 0 && (cost_subtotal > 0 || shipping_cost_subtotal > 0)
    ? (((base_selling_price - cost_subtotal) + (shipping_selling_price - shipping_cost_subtotal)) / final_selling_price * 100)
    : 0;
    
  const final_selling_price_profit_amount = (base_selling_price - cost_subtotal) + (shipping_selling_price - shipping_cost_subtotal);

  
  return {
    ...data,
    // Update auto-calculated fields
    unseen_costs,
    unseen_costs_percentage,
    cost_subtotal,
    base_selling_price,
    shipping_cost_subtotal,
    shipping_selling_price,
    final_selling_price,
    base_selling_gross_profit_percentage,
    shipping_selling_gross_profit_percentage,
    final_selling_gross_profit_percentage,
    final_selling_price_profit_amount,
  };
};