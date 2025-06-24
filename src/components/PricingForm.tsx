
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface PricingData {
  basePrice: string;
  freight: string;
  total: string;
}

interface PricingFormProps {
  data: PricingData;
  onUpdate: (data: PricingData) => void;
  onGenerate: () => void;
}

const PricingForm = ({ data, onUpdate, onGenerate }: PricingFormProps) => {
  const [calculatedTotal, setCalculatedTotal] = useState("");

  const handleChange = (field: keyof PricingData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  // Calculate total automatically
  useEffect(() => {
    const basePrice = parseFloat(data.basePrice) || 0;
    const freight = parseFloat(data.freight) || 0;
    const total = basePrice + freight;
    
    if (total > 0) {
      setCalculatedTotal(total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
      }));
      onUpdate({ ...data, total: total.toString() });
    }
  }, [data.basePrice, data.freight]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Pricing Information</h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price ($)</Label>
            <Input
              id="basePrice"
              type="number"
              step="0.01"
              value={data.basePrice}
              onChange={(e) => handleChange("basePrice", e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="freight">Estimated Freight + Delivery ($)</Label>
            <Input
              id="freight"
              type="number"
              step="0.01"
              value={data.freight}
              onChange={(e) => handleChange("freight", e.target.value)}
              placeholder="0.00"
            />
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
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Terms & Conditions</h3>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
            <p><strong>Payment Terms:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>33% due upon approval of shop drawings</li>
              <li>33% due upon track installation</li>
              <li>Remaining balance due upon final completion</li>
            </ul>
            <p className="mt-4"><strong>General Notes:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All materials are FOB factory, prepaid, and added to the final invoice</li>
              <li>Pricing is firm for 60 days from date above</li>
              <li>10-year factory warranty provided on all operable wall systems</li>
              <li>STC rating of 56 minimum (Highest Available)</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={onGenerate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            size="lg"
          >
            <FileText className="w-5 h-5 mr-2" />
            Generate Quote PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PricingForm;
