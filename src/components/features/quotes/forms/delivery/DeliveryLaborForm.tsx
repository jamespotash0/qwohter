
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeliveryLaborData {
  delivery: {
    shopDrawingWeeks: string;
    trackDeliveryWeeks: string;
    panelDeliveryWeeks: string;
    trackInstallationDays: string;
    panelInstallationDays: string;
  };
  labor: {
    laborType: string;
    wageRate: string;
  };
}

interface DeliveryLaborFormProps {
  data: DeliveryLaborData;
  onUpdate: (data: DeliveryLaborData) => void;
}

const DeliveryLaborForm = ({ data, onUpdate }: DeliveryLaborFormProps) => {
  const handleDeliveryChange = (field: keyof DeliveryLaborData["delivery"], value: string) => {
    onUpdate({
      ...data,
      delivery: { ...data.delivery, [field]: value }
    });
  };

  const handleLaborChange = (field: keyof DeliveryLaborData["labor"], value: string) => {
    onUpdate({
      ...data,
      labor: { ...data.labor, [field]: value }
    });
  };

  return (
    <div className="p-1">
      {/* Delivery Section */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="shopDrawing">Shop Drawing Delivery (Weeks) <span className="text-red-500">*</span></Label>
            <Input
              id="shopDrawing"
              value={data.delivery.shopDrawingWeeks}
              onChange={(e) => handleDeliveryChange("shopDrawingWeeks", e.target.value)}
              placeholder="e.g., 1-2 or 2"
              required
              className={data.delivery.shopDrawingWeeks == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="trackDelivery">Track Delivery (Weeks) <span className="text-red-500">*</span></Label>
            <Input
              id="trackDelivery"
              value={data.delivery.trackDeliveryWeeks}
              onChange={(e) => handleDeliveryChange("trackDeliveryWeeks", e.target.value)}
              placeholder="e.g., 1-2 or 3"
              required
               className={data.delivery.trackDeliveryWeeks == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panelDelivery">Panel Delivery (Weeks) <span className="text-red-500">*</span></Label>
            <Input
              id="panelDelivery"
              value={data.delivery.panelDeliveryWeeks}
              onChange={(e) => handleDeliveryChange("panelDeliveryWeeks", e.target.value)}
              placeholder="e.g., 3-4 or 5"
              required
               className={data.delivery.panelDeliveryWeeks == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="trackInstallation">Track Installation (Days) <span className="text-red-500">*</span></Label>
            <Input
              id="trackInstallation"
              value={data.delivery.trackInstallationDays}
              onChange={(e) => handleDeliveryChange("trackInstallationDays", e.target.value)}
              placeholder="e.g., 3-4 or 2"
              required
               className={data.delivery.trackInstallationDays == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panelInstallation">Panel Installation (Days) <span className="text-red-500">*</span></Label>
            <Input
              id="panelInstallation"
              value={data.delivery.panelInstallationDays}
              onChange={(e) => handleDeliveryChange("panelInstallationDays", e.target.value)}
              placeholder="e.g., 1 or 2-3"
              required
               className={data.delivery.panelInstallationDays == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
            />
          </div>
        </div>
      </div>

      {/* Labor Section */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="laborType">Labor Type <span className="text-red-500">*</span></Label>
            <Select
              value={data.labor.laborType}
              onValueChange={(value) => handleLaborChange("laborType", value)}
              required
            >
              <SelectTrigger 
                className={data.labor.laborType == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
              >
                <SelectValue placeholder="Select labor type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Union">Union</SelectItem>
                <SelectItem value="Non-Union">Non-Union</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="wageRate">Wage Rate <span className="text-red-500">*</span></Label>
            <Select
              value={data.labor.wageRate}
              onValueChange={(value) => handleLaborChange("wageRate", value)}
              required
            >
              <SelectTrigger 
                className={data.labor.wageRate == '' ? "h-10 border-red-500" : "h-10 border-green-500"}
              >
                <SelectValue placeholder="Select wage rate" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Prevailing">Prevailing</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLaborForm;
