
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeliveryLaborData {
  delivery: {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="trackDelivery">Track Delivery (Weeks) *</Label>
            <Input
              id="trackDelivery"
              value={data.delivery.trackDeliveryWeeks}
              onChange={(e) => handleDeliveryChange("trackDeliveryWeeks", e.target.value)}
              placeholder="e.g., 1-2 or 3"
              required
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panelDelivery">Panel Delivery (Weeks) *</Label>
            <Input
              id="panelDelivery"
              value={data.delivery.panelDeliveryWeeks}
              onChange={(e) => handleDeliveryChange("panelDeliveryWeeks", e.target.value)}
              placeholder="e.g., 3-4 or 5"
              required
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="trackInstallation">Track Installation (Days) *</Label>
            <Input
              id="trackInstallation"
              value={data.delivery.trackInstallationDays}
              onChange={(e) => handleDeliveryChange("trackInstallationDays", e.target.value)}
              placeholder="e.g., 3-4 or 2"
              required
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panelInstallation">Panel Installation (Days) *</Label>
            <Input
              id="panelInstallation"
              value={data.delivery.panelInstallationDays}
              onChange={(e) => handleDeliveryChange("panelInstallationDays", e.target.value)}
              placeholder="e.g., 1 or 2-3"
              required
              className="h-10"
            />
          </div>
        </div>
      </div>

      {/* Labor Section */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="laborType">Labor Type *</Label>
            <Select
              value={data.labor.laborType}
              onValueChange={(value) => handleLaborChange("laborType", value)}
              required
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select labor type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Union">Union</SelectItem>
                <SelectItem value="Non-Union">Non-Union</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="wageRate">Wage Rate *</Label>
            <Select
              value={data.labor.wageRate}
              onValueChange={(value) => handleLaborChange("wageRate", value)}
              required
            >
              <SelectTrigger className="h-10">
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
