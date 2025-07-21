import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import jsPDF from 'jspdf';

interface PricingData {
  basePrice: string;
  freight: string;
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

  // Format number with commas and decimals
  const formatNumber = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Handle multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // If there's a decimal point, limit to 2 decimal places
    if (parts.length === 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    return cleanValue;
  };

  const displayNumber = (value: string): string => {
    if (!value || value === '') return '';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleChange = (field: keyof PricingData, value: string) => {
    const formattedValue = formatNumber(value);
    onUpdate({ ...data, [field]: formattedValue });
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

  // Validation function
  const isFormValid = () => {
    return data.basePrice && 
           data.freight && 
           data.paymentUponDrawings && 
           data.paymentUponTrackInstallation;
  };

  const generatePDF = () => {
    if (!isFormValid()) {
      alert("Please fill in all required fields before generating the PDF.");
      return;
    }

    const doc = new jsPDF();
    
    // Header with company name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text('CONTEMPORARY', 20, 30);
    doc.text('WALL SYSTEMS', 20, 40);
    
    // Contact info in top right
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('Contact:', 120, 30);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.contactInfo?.contactName || 'Ed Machinski'}`, 145, 30);
    
    doc.setFont("helvetica", "bold");
    doc.text('Address:', 120, 38);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.contactInfo?.address || '567 Commerce St,'}`, 145, 38);
    doc.text('Franklin Lakes, NJ, 07417', 145, 45);
    
    doc.setFont("helvetica", "bold");
    doc.text('Phone:', 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.contactInfo?.phone || '(973) 884-0474'}`, 145, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text('Fax:', 120, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.contactInfo?.fax || '(973) 884-1606'}`, 145, 59);
    
    doc.setFont("helvetica", "bold");
    doc.text('Website:', 120, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.contactInfo?.website || 'contemporarywalls.com'}`, 145, 66);
    
    // Billed To section
    let yPos = 80;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('BILLED TO:', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.jobDetails?.billedTo?.name || ''}`, 20, yPos);
    doc.line(20, yPos + 2, 100, yPos + 2);
    
    yPos += 10;
    doc.text(`${quoteData?.jobDetails?.billedTo?.company || ''}`, 20, yPos);
    doc.line(20, yPos + 2, 100, yPos + 2);
    
    yPos += 10;
    doc.text(`${quoteData?.jobDetails?.billedTo?.address || ''}`, 20, yPos);
    doc.line(20, yPos + 2, 100, yPos + 2);
    
    // Right side info
    yPos = 90;
    doc.setFont("helvetica", "bold");
    doc.text('Date:', 120, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.jobDetails?.date || ''}`, 160, yPos);
    doc.line(160, yPos + 2, 190, yPos + 2);
    
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text('Proposal #:', 120, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.jobDetails?.proposalNumber || ''}`, 160, yPos);
    doc.line(160, yPos + 2, 190, yPos + 2);
    
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text('Job Location:', 120, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${quoteData?.jobDetails?.jobLocation || ''}`, 160, yPos);
    doc.line(160, yPos + 2, 190, yPos + 2);
    
    // Main content
    yPos = 140;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text('Thank you for considering Contemporary Wall Systems for this project. As discussed, we are', 20, yPos);
    yPos += 7;
    doc.text('offering a proposal to furnish, deliver, and install, as noted,', 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text('TEN (10) - Operable Wall', 175, yPos);
    doc.setFont("helvetica", "normal");
    doc.text('as', 20, yPos + 7);
    doc.text('specified below, at the above named project.', 20, yPos + 14);
    
    yPos += 30;
    doc.setFont("helvetica", "bold");
    doc.text('Specifications as follows:', 20, yPos);
    
    // Wall specifications table
    yPos += 15;
    if (quoteData?.walls && quoteData.walls.length > 0) {
      quoteData.walls.forEach((wall: any, index: number) => {
        doc.setFont("helvetica", "bold");
        doc.text(`Wall ${String.fromCharCode(65 + index)}`, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`${wall.width || ''} W x ${wall.height || ''} H`, 60, yPos);
        doc.text(`${wall.panelCount || ''} (${wall.quantity || '1'})`, 120, yPos);
        doc.text(`${wall.panelType || ''}`, 150, yPos);
        doc.text(`${wall.quantity || '1'} each`, 180, yPos);
        
        // Draw lines
        doc.line(20, yPos + 2, 200, yPos + 2);
        yPos += 10;
      });
    }
    
    // Panel details
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text('PANELS:', 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.text('This wall system utilizes the Kwik-Wall', 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text('2000 Series', 120, yPos);
    doc.text('Model 2030', 160, yPos);
    doc.setFont("helvetica", "normal");
    doc.text('configured with', 185, yPos);
    
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text('Hinged Paired Panels', 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text('designed for use with a', 90, yPos);
    doc.setFont("helvetica", "bold");
    doc.text('Paired Panels Track', 150, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(', and includes', 185, yPos);
    
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text('non GL insulated', 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text('for enhanced acoustic performance.', 80, yPos);
    
    // Pricing section at bottom
    yPos = 240;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('PRICING:', 20, yPos);
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Base Price: $${data.basePrice || '0.00'}`, 20, yPos);
    yPos += 7;
    doc.text(`Freight + Delivery: $${data.freight || '0.00'}`, 20, yPos);
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${calculatedTotal || '$0.00'}`, 20, yPos);
    
    // Payment terms
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text('Payment Terms:', 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`${data.paymentUponDrawings}% due upon approval of shop drawings`, 20, yPos);
    yPos += 7;
    doc.text(`${data.paymentUponTrackInstallation}% due upon track installation`, 20, yPos);
    yPos += 7;
    const remainingPercent = 100 - (parseInt(data.paymentUponDrawings) || 0) - (parseInt(data.paymentUponTrackInstallation) || 0);
    doc.text(`${remainingPercent}% remaining balance due upon final completion`, 20, yPos);
    
    // General Notes
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text('General Notes:', 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.text('• All materials are FOB factory, prepaid, and added to the final invoice', 20, yPos);
    yPos += 7;
    doc.text('• Pricing is firm for 60 days from date above', 20, yPos);
    yPos += 7;
    doc.text('• 10-year factory warranty provided on all operable wall systems', 20, yPos);
    
    // Download the PDF
    doc.save(`quote-${quoteData?.jobDetails?.proposalNumber || 'proposal'}.pdf`);
    
    // Call the original onGenerate callback
    onGenerate();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Pricing Information</h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price ($) *</Label>
            <Input
              id="basePrice"
              type="text"
              value={displayNumber(data.basePrice)}
              onChange={(e) => handleChange("basePrice", e.target.value)}
              placeholder="0.00"
              required
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="freight">Estimated Freight + Delivery ($) *</Label>
            <Input
              id="freight"
              type="text"
              value={displayNumber(data.freight)}
              onChange={(e) => handleChange("freight", e.target.value)}
              placeholder="0.00"
              required
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
        
        <div className="flex justify-end">
          <Button 
            onClick={generatePDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            size="lg"
            disabled={!isFormValid()}
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
