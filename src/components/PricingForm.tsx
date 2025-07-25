import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useEffect, useState } from "react";

interface PricingData {
  basePrice: number;
  freight: number;
  total: string;
  paymentUponDrawings: string;
  paymentUponTrackInstallation: string;
}

interface PricingFormProps {
  data: PricingData;
  onUpdate: (data: PricingData) => void;
  onGenerate: () => void;
  quoteData?: any;
}

const PricingForm = ({ data, onUpdate, onGenerate, quoteData }: PricingFormProps) => {
  const [calculatedTotal, setCalculatedTotal] = useState("");

  const handleCurrencyChange = (field: 'basePrice' | 'freight', value: number) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleChange = (field: keyof PricingData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  // Calculate total automatically
  useEffect(() => {
    const basePrice = data.basePrice || 0;
    const freight = data.freight || 0;
    const total = basePrice + freight;
    
    if (total > 0) {
      setCalculatedTotal(total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
      }));
      onUpdate({ ...data, total: total.toString() });
    }
  }, [data.basePrice, data.freight]);

  // Validation function
  const isFormValid = () => {
    return data.basePrice > 0 && 
           data.freight > 0 && 
           data.paymentUponDrawings && 
           data.paymentUponTrackInstallation;
  };


  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Pricing Information</h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price ($) *</Label>
            <CurrencyInput
              id="basePrice"
              value={data.basePrice}
              onChange={(value) => handleCurrencyChange("basePrice", value)}
              placeholder="$0.00"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="freight">Estimated Freight + Delivery ($) *</Label>
            <CurrencyInput
              id="freight"
              value={data.freight}
              onChange={(value) => handleCurrencyChange("freight", value)}
              placeholder="$0.00"
              className="w-full"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Payment Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="paymentUponDrawings">Payment % Upon Drawings *</Label>
              <Input
                id="paymentUponDrawings"
                type="text"
                value={data.paymentUponDrawings}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (parseInt(value) <= 100 || value === '') {
                    handleChange("paymentUponDrawings", value);
                  }
                }}
                placeholder="33"
                required
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentUponTrackInstallation">Payment % Upon Track Installation *</Label>
              <Input
                id="paymentUponTrackInstallation"
                type="text"
                value={data.paymentUponTrackInstallation}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (parseInt(value) <= 100 || value === '') {
                    handleChange("paymentUponTrackInstallation", value);
                  }
                }}
                placeholder="33"
                required
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span className="text-blue-600">{calculatedTotal || "$0.00"}</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default PricingForm;
