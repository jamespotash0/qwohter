
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LaborData {
  laborType: string;
  wageRate: string;
}

interface LaborFormProps {
  data: LaborData;
  onUpdate: (data: LaborData) => void;
}

const LaborForm = ({ data, onUpdate }: LaborFormProps) => {
  const handleChange = (field: keyof LaborData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Labor Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="laborType">Labor Type</Label>
          <Select
            value={data.laborType}
            onValueChange={(value) => handleChange("laborType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select labor type" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Union">Union</SelectItem>
              <SelectItem value="Non-Union">Non-Union</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wageRate">Wage Rate</Label>
          <Select
            value={data.wageRate}
            onValueChange={(value) => handleChange("wageRate", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select wage rate" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Prevailing">Prevailing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default LaborForm;
