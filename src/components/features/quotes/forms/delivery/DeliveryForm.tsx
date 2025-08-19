
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeliveryData {
  trackDeliveryWeeks: string;
  panelDeliveryWeeks: string;
  trackInstallationDays: string;
  panelInstallationDays: string;
}

interface DeliveryFormProps {
  data: DeliveryData;
  onUpdate: (data: DeliveryData) => void;
}

const DeliveryForm = ({ data, onUpdate }: DeliveryFormProps) => {
  const handleChange = (field: keyof DeliveryData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Delivery Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="trackDeliveryWeeks">Track Delivery After Approval (Weeks)</Label>
          <Input
            id="trackDeliveryWeeks"
            value={data.trackDeliveryWeeks}
            onChange={(e) => handleChange("trackDeliveryWeeks", e.target.value)}
            placeholder="1-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="panelDeliveryWeeks">Panel Delivery After Approval (Weeks)</Label>
          <Input
            id="panelDeliveryWeeks"
            value={data.panelDeliveryWeeks}
            onChange={(e) => handleChange("panelDeliveryWeeks", e.target.value)}
            placeholder="3-4"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trackInstallationDays">Installation of Track (Days)</Label>
          <Input
            id="trackInstallationDays"
            value={data.trackInstallationDays}
            onChange={(e) => handleChange("trackInstallationDays", e.target.value)}
            placeholder="3-4"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="panelInstallationDays">Installation of Panels (Days)</Label>
          <Input
            id="panelInstallationDays"
            value={data.panelInstallationDays}
            onChange={(e) => handleChange("panelInstallationDays", e.target.value)}
            placeholder="1"
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryForm;
