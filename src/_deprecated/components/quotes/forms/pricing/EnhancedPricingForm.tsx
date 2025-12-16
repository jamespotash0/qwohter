import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { InfoIcon } from "@/components/ui/info-icon";
import { useEffect, useState, useCallback } from "react";
import { EnhancedPricingData, defaultEnhancedPricing, calculateEnhancedPricing } from "@/_deprecated/lib/types/pricing/enhancedPricing";
// import { Calculator } from "lucide-react";

interface EnhancedPricingFormProps {
  data: EnhancedPricingData;
  onUpdate: (data: EnhancedPricingData) => void;
  onTouchedFieldsChange?: (fields: Set<string>) => void;
}

const EnhancedPricingForm = ({ data, onUpdate, onTouchedFieldsChange }: EnhancedPricingFormProps) => {
  const [localData, setLocalData] = useState<EnhancedPricingData>(() => {
    // Merge provided data with defaults to ensure all fields are present
    return { ...defaultEnhancedPricing, ...data };
  });

  // Track which fields have been touched by the user
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => {
    const touched = new Set<string>();

    // Check if this is an existing quote (has any meaningful non-zero data)
    // If so, mark ALL fields as touched since they've been saved before
    const hasAnyMeaningfulData =
      (data.kwik_wall_materials_cost !== undefined && data.kwik_wall_materials_cost > 0) ||
      (data.misc_materials_cost !== undefined && data.misc_materials_cost > 0) ||
      (data.final_selling_price !== undefined && data.final_selling_price > 0) ||
      (data.materials_markup_percentage !== undefined && data.materials_markup_percentage > 0) ||
      (data.shipping_markup_percentage !== undefined && data.shipping_markup_percentage > 0);

    if (hasAnyMeaningfulData) {
      // This is an existing quote - mark all input fields as touched
      touched.add('kwik_wall_materials_cost');
      touched.add('misc_materials_cost');
      touched.add('delivery_cost_track');
      touched.add('delivery_cost_panel');
      touched.add('track_labor_cost');
      touched.add('panel_labor_cost');
      touched.add('track_equipment_costs');
      touched.add('panel_equipment_costs');
      touched.add('track_freight_factory');
      touched.add('panel_freight_factory');
      touched.add('local_handling_costs');
      touched.add('materials_markup_percentage');
      touched.add('shipping_markup_percentage');
      touched.add('payment_upon_drawings');
      touched.add('payment_upon_track_installation');
    }

    // Always mark payment fields as touched if they have default values
    if (data.payment_upon_drawings && data.payment_upon_drawings.trim() !== '') {
      touched.add('payment_upon_drawings');
    }
    if (data.payment_upon_track_installation && data.payment_upon_track_installation.trim() !== '') {
      touched.add('payment_upon_track_installation');
    }

    return touched;
  });

  // Separate state for percentage inputs to prevent focus loss during typing
  const [percentageInputs, setPercentageInputs] = useState({
    materials_markup_percentage: data.materials_markup_percentage && data.materials_markup_percentage > 0 ? data.materials_markup_percentage.toString() : '',
    shipping_markup_percentage: data.shipping_markup_percentage && data.shipping_markup_percentage > 0 ? data.shipping_markup_percentage.toString() : '',
  });

  // Handle field focus - mark as touched when user clicks/focuses on a field
  const handleFieldFocus = useCallback((field: keyof EnhancedPricingData) => {
    setTouchedFields(prev => new Set(prev).add(field));
  }, []);

  // Handle currency input changes - mark as touched and update local state
  const handleCurrencyChange = useCallback((field: keyof EnhancedPricingData, value: number) => {
    setTouchedFields(prev => new Set(prev).add(field));
    setLocalData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle text input changes - mark as touched and update local state
  const handleInputChange = useCallback((field: keyof EnhancedPricingData, value: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    setLocalData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle percentage input changes - update both display and data state
  const handlePercentageChange = useCallback((field: 'materials_markup_percentage' | 'shipping_markup_percentage', value: string) => {
    // Allow empty string and valid numbers while typing
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // Mark as touched when user types
      if (value !== '') {
        setTouchedFields(prev => new Set(prev).add(field));
      }

      // Update display value immediately
      setPercentageInputs(prev => ({ ...prev, [field]: value }));

      // Update data with numeric value
      const numericValue = value === '' ? 0 : parseFloat(value) || 0;
      setLocalData(prev => ({ ...prev, [field]: numericValue }));
    }
  }, []);

  // Notify parent when touched fields change
  useEffect(() => {
    if (onTouchedFieldsChange) {
      onTouchedFieldsChange(touchedFields);
    }
  }, [touchedFields, onTouchedFieldsChange]);

  // Auto-calculate and update parent whenever input data changes
  useEffect(() => {
    const calculatedData = calculateEnhancedPricing(localData);

    // Only update if calculations actually changed to prevent loops
    if (JSON.stringify(calculatedData) !== JSON.stringify(localData)) {
      setLocalData(calculatedData);
    }

    // Debounce the parent update to prevent excessive re-renders during typing
    const timeoutId = setTimeout(() => {
      onUpdate(calculatedData);
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [
    localData.kwik_wall_materials_cost,
    localData.misc_materials_cost, 
    localData.delivery_cost_track,
    localData.delivery_cost_panel,
    localData.track_equipment_costs,
    localData.track_labor_cost,
    localData.panel_equipment_costs,
    localData.panel_labor_cost,
    localData.track_freight_factory,
    localData.panel_freight_factory,
    localData.local_handling_costs,
    localData.materials_markup_percentage,
    localData.shipping_markup_percentage,
    localData.unseen_costs_locked,
    localData.unseen_costs,
    onUpdate
  ]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD"
    });
  };

  // Sync with provided data when it changes (e.g., when editing existing quote)
  useEffect(() => {
    // Only update if the incoming data is different from current localData
    const mergedData = { ...defaultEnhancedPricing, ...data };
    const calculatedData = calculateEnhancedPricing(mergedData);
    
    // Avoid unnecessary updates by comparing the essential fields
    const hasSignificantChanges = 
      calculatedData.kwik_wall_materials_cost !== localData.kwik_wall_materials_cost ||
      calculatedData.misc_materials_cost !== localData.misc_materials_cost ||
      calculatedData.final_selling_price !== localData.final_selling_price;
    
    if (hasSignificantChanges) {
      setLocalData(calculatedData);
      // Update percentage inputs display as well
      setPercentageInputs({
        materials_markup_percentage: calculatedData.materials_markup_percentage > 0 ? calculatedData.materials_markup_percentage.toString() : '',
        shipping_markup_percentage: calculatedData.shipping_markup_percentage > 0 ? calculatedData.shipping_markup_percentage.toString() : '',
      });
    }
  }, [data]); // React to changes in the data prop


  return (
    <div className="p-1">
      <div className="space-y-6">

        {/* ========== MATERIALS ========== */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Materials</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="kwik_wall_materials_cost" className="text-sm font-medium text-gray-900">
                  Kwik-Wall Materials Cost <span className="text-red-500">*</span>
                </Label>
                <InfoIcon 
                  title="Kwik-Wall Materials Cost"
                  description="Total cost of all Kwik-Wall materials including panels and track systems. This is typically the largest component of your material costs and forms the basis for calculating unseen costs."
                  size={14}
                />
              </div>
              <CurrencyInput
                id="kwik_wall_materials_cost"
                value={localData.kwik_wall_materials_cost}
                onChange={(value) => handleCurrencyChange("kwik_wall_materials_cost", value)}
                touched={touchedFields.has('kwik_wall_materials_cost')}
                className={`w-full h-11 border ${touchedFields.has('kwik_wall_materials_cost') ? "border-green-500" : "border-red-500"}
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="misc_materials_cost" className="text-sm font-medium text-gray-900">
                  Misc. Materials From Shop <span className="text-red-500">*</span>
                </Label>
                <InfoIcon 
                  title="Miscellaneous Materials"
                  description="Cost of miscellaneous materials sourced from your shop such as screws, nuts, bolts, anchors, and other hardware needed for installation."
                  size={14}
                />
              </div>
              <CurrencyInput
                id="misc_materials_cost"
                value={localData.misc_materials_cost}
                onChange={(value) => handleCurrencyChange("misc_materials_cost", value)}
                touched={touchedFields.has('misc_materials_cost')}
                className={`w-full h-11 border ${touchedFields.has('misc_materials_cost') ? "border-green-500" : "border-red-500"}
                  bg-gray-100 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>

            {/* Delivery Costs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="delivery_cost_track" className="text-sm font-medium text-gray-900">
                    Delivery Cost (Track to Site) <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Track Delivery Cost"
                    description="Transportation cost to deliver track systems from warehouse to the installation site. This may include fuel, driver time, and vehicle rental costs."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="delivery_cost_track"
                  value={localData.delivery_cost_track}
                  onChange={(value) => handleCurrencyChange("delivery_cost_track", value)}
                  className={`w-full h-11 border ${touchedFields.has('delivery_cost_track') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="delivery_cost_panel" className="text-sm font-medium text-gray-900">
                    Delivery Cost (Panels to Site) <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Panel Delivery Cost"
                    description="Transportation cost to deliver wall panels from warehouse to the installation site. This covers vehicle costs, fuel, and delivery logistics for panel components."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="delivery_cost_panel"
                  value={localData.delivery_cost_panel}
                  onChange={(value) => handleCurrencyChange("delivery_cost_panel", value)}
                  className={`w-full h-11 border ${touchedFields.has('delivery_cost_panel') ? "border-green-500" : "border-red-500"}
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>
            </div>

            {/* Labor Costs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="track_labor_cost" className="text-sm font-medium text-gray-900">
                    Labor to Install Track <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Track Labor Cost"
                    description="Direct labor costs for installing track systems including technician wages, benefits, and project management time specific to track installation."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="track_labor_cost"
                  value={localData.track_labor_cost}
                  onChange={(value) => handleCurrencyChange("track_labor_cost", value)}
                  className={`w-full h-11 border ${touchedFields.has('track_labor_cost') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}                
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="panel_labor_cost" className="text-sm font-medium text-gray-900">
                    Labor to Install Panels <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Panel Labor Cost"
                    description="Direct labor costs for installing panels including technician wages, benefits, and project management time specific to panel installation and alignment."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="panel_labor_cost"
                  value={localData.panel_labor_cost}
                  onChange={(value) => handleCurrencyChange("panel_labor_cost", value)}
                  className={`w-full h-11 border ${touchedFields.has('panel_labor_cost') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}  
                />
              </div>
            </div>

            {/* Equipment Costs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="track_equipment_costs" className="text-sm font-medium text-gray-900">
                    Track Equipment Costs <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Track Installation Equipment"
                    description="Cost of lifts, scaffolding, and specialized installation equipment needed for track installation. Includes rental fees and operator costs."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="track_equipment_costs"
                  value={localData.track_equipment_costs}
                  onChange={(value) => handleCurrencyChange("track_equipment_costs", value)}
                  className={`w-full h-11 border ${touchedFields.has('track_equipment_costs') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="panel_equipment_costs" className="text-sm font-medium text-gray-900">
                    Panel Equipment Costs <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Panel Installation Equipment"
                    description="Cost of lifts, scaffolding, and specialized installation equipment needed for panel installation. Includes rental fees and operator costs."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="panel_equipment_costs"
                  value={localData.panel_equipment_costs}
                  onChange={(value) => handleCurrencyChange("panel_equipment_costs", value)}
                  className={`w-full h-11 border ${touchedFields.has('panel_equipment_costs') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>
            </div>

          </div>

          {/* Editable Unseen Costs */}
          <div className="mt-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="unseen_costs" className="text-sm font-medium text-gray-900">
                  Unseen Costs
                </Label>
                <InfoIcon 
                  title="Unseen Costs"
                  description="Additional costs to account for unexpected expenses, waste, and miscellaneous items. Default is $500, but can be customized by unlocking."
                  size={14}
                />
                <button
                  type="button"
                  onClick={() => setLocalData(prev => ({ ...prev, unseen_costs_locked: !prev.unseen_costs_locked }))}
                  className={`ml-2 px-3 py-1 text-xs rounded-full transition-colors ${
                    localData.unseen_costs_locked
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  {localData.unseen_costs_locked ? '🔒 Unlock' : '🔓 Lock'}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CurrencyInput
                    id="unseen_costs"
                    value={localData.unseen_costs}
                    onChange={(value) => handleCurrencyChange("unseen_costs", value)}
                    disabled={localData.unseen_costs_locked}
                    className={`w-full h-11 border ${
                      localData.unseen_costs_locked
                        ? 'bg-gray-50 border-gray-200 text-gray-500'
                        : `${localData.unseen_costs ? 'border-green-500' : 'border-red-500'} focus:border-blue-500 focus:ring-blue-500`
                    }`}
                  />
                </div>
                <span className="text-lg font-semibold text-blue-600 min-w-[80px]">
                  {localData.unseen_costs_percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Shipping & Freight Fields - 3 columns */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Shipping & Freight</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="track_freight_factory" className="text-sm font-medium text-gray-900">
                    Factory Freight (Tracks) <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Track Factory Freight"
                    description="Shipping cost from the manufacturer to your warehouse for track components. This is typically charged by weight or volume and varies by distance."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="track_freight_factory"
                  value={localData.track_freight_factory}
                  onChange={(value) => handleCurrencyChange("track_freight_factory", value)}
                  className={`w-full h-11 border ${touchedFields.has('track_freight_factory') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="panel_freight_factory" className="text-sm font-medium text-gray-900">
                    Factory Freight (Panels) <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Panel Factory Freight"
                    description="Shipping costs for wall panels from the manufacturer's factory to your location. This typically includes special handling for oversized items and may vary based on distance and panel specifications."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="panel_freight_factory"
                  value={localData.panel_freight_factory}
                  onChange={(value) => handleCurrencyChange("panel_freight_factory", value)}
                  className={`w-full h-11 border ${touchedFields.has('panel_freight_factory') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="local_handling_costs" className="text-sm font-medium text-gray-900">
                    Local Handling Costs <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Local Handling Costs"
                    description="Additional costs for local handling, unloading, and temporary storage of materials. Includes crane services, special equipment rentals, or warehouse handling fees required for your project."
                    size={14}
                  />
                </div>
                <CurrencyInput
                  id="local_handling_costs"
                  value={localData.local_handling_costs}
                  onChange={(value) => handleCurrencyChange("local_handling_costs", value)}
                  className={`w-full h-11 border ${touchedFields.has('local_handling_costs') ? "border-green-500" : "border-red-500"} 
                    bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}
                />
              </div>
            </div>
          </div>

          {/* Profit Percentages - 2 columns */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Markup & Profit Margins</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="materials_markup_percentage" className="text-sm font-medium text-gray-900">
                    Base Cost Markup Percentage <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Base Cost Markup Percentage"
                    description="The percentage markup applied to your total base costs (materials, labor, equipment, unseen costs) to determine the base selling price before shipping. Industry standard is typically 20-40% depending on market conditions and competition."
                    size={14}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="materials_markup_percentage"
                      // type="text"
                      value={percentageInputs.materials_markup_percentage}
                      onChange={(e) => handlePercentageChange("materials_markup_percentage", e.target.value)}
                      placeholder="Enter a number"
                      className={`w-full h-11 border ${touchedFields.has('materials_markup_percentage') ? "border-green-500" : "border-red-500"} 
                        bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}   
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600 min-w-[100px]">
                    {formatCurrency(localData.base_selling_price - localData.cost_subtotal)}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Gross Profit: {localData.base_selling_gross_profit_percentage.toFixed(1)}%
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="shipping_markup_percentage" className="text-sm font-medium text-gray-900">
                    Shipping Markup Percentage <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Shipping Markup Percentage"
                    description="Additional markup margin applied to shipping and handling costs. This helps cover administrative overhead and provides additional profit on freight services."
                    size={14}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="shipping_markup_percentage"
                      // type="text"
                      value={percentageInputs.shipping_markup_percentage}
                      onChange={(e) => handlePercentageChange("shipping_markup_percentage", e.target.value)}
                      placeholder="Enter a number"
                      className={`w-full h-11 border ${touchedFields.has('shipping_markup_percentage') ? "border-green-500" : "border-red-500"} 
                        bg-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}   
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                  <span className="text-lg font-semibold text-orange-600 min-w-[100px]">
                    {formatCurrency(localData.shipping_selling_price - localData.shipping_cost_subtotal)}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Gross Profit: {localData.shipping_selling_gross_profit_percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

           {/* Payment Terms */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="payment_upon_drawings" className="text-sm font-medium text-gray-700">
                    Payment % Upon Drawings <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Payment Upon Drawings"
                    description="Percentage of total project cost due when construction drawings are approved and submitted. This upfront payment helps cover design and engineering costs."
                    size={14}
                  />
                </div>
                <div className="relative">
                  <Input
                    id="payment_upon_drawings"
                    type="text"
                    value={localData.payment_upon_drawings}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      if (parseInt(value) <= 100 || value === '') {
                        handleInputChange("payment_upon_drawings", value);
                      }
                    }}
                    placeholder="Enter a number"
                    required
                    className={`w-full h-11 border ${touchedFields.has('payment_upon_drawings') ? "border-green-500" : "border-red-500"} 
                        focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}   
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="payment_upon_track_installation" className="text-sm font-medium text-gray-900">
                    Payment % Upon Track Installation <span className="text-red-500">*</span>
                  </Label>
                  <InfoIcon 
                    title="Payment Upon Track Installation"
                    description="Percentage of total project cost due when track installation is completed. This milestone payment covers the bulk of materials and installation work."
                    size={14}
                  />
                </div>
                <div className="relative">
                  <Input
                    id="payment_upon_track_installation"
                    type="text"
                    value={localData.payment_upon_track_installation}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      if (parseInt(value) <= 100 || value === '') {
                        handleInputChange("payment_upon_track_installation", value);
                      }
                    }}
                    placeholder="Enter a number"
                    required
                    className={`w-full h-11 border ${touchedFields.has('payment_upon_track_installation') ? "border-green-500" : "border-red-500"} 
                        focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600`}   
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Totals */}
        <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Cost Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(localData.cost_subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Base Cost Markup Percentage ({localData.materials_markup_percentage}%)</span>
              <span className="font-semibold text-green-600">{formatCurrency(localData.base_selling_price - localData.cost_subtotal)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-emerald-200">
              <span className="text-xl font-bold text-gray-900">Base Selling Price</span>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(localData.base_selling_price)}</span>
            </div>
            
            {/* Shipping & Handling Section */}
            <div className="pt-3 border-t border-emerald-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Shipping & Freight Cost Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(localData.shipping_cost_subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Shipping Markup Percentage ({localData.shipping_markup_percentage}%)</span>
                <span className="font-semibold text-orange-600">{formatCurrency(localData.shipping_selling_price - localData.shipping_cost_subtotal)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                <span className="text-xl font-bold text-gray-900">Shipping Selling Price</span>
                <span className="text-2xl font-bold text-orange-600">{formatCurrency(localData.shipping_selling_price)}</span>
              </div>
            </div>
            
            {/* Final Selling Price */}
            <div className="pt-4 border-t-2 border-emerald-300">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">Final Selling Price</span>
                <span className="text-3xl font-bold text-emerald-600">{formatCurrency(localData.final_selling_price)}</span>
              </div>
              {/* Total Gross Profit */}
              {localData.final_selling_price > 0 && (localData.cost_subtotal > 0 || localData.shipping_cost_subtotal > 0) && (
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium text-gray-700">
                    Total Gross Profit ({localData.final_selling_gross_profit_percentage.toFixed(1)}%)
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(localData.final_selling_price_profit_amount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPricingForm;