
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SupportStructureData {
  mountingTrack: string;
}

interface SupportStructureFormProps {
  data: SupportStructureData;
  onUpdate: (data: SupportStructureData) => void;
}

const SupportStructureForm = ({ data, onUpdate }: SupportStructureFormProps) => {
  const handleChange = (field: keyof SupportStructureData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div className="p-1">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor="mountingTrack">Mounting Track *</Label>
          <Select
            value={data.mountingTrack}
            onValueChange={(value) => handleChange("mountingTrack", value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select mounting track type" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Pre-Drilled Steel Beam">Pre-Drilled Steel Beam</SelectItem>
              <SelectItem value="Existing Steel Beam">Existing Steel Beam</SelectItem>
              <SelectItem value="Secured to Concrete">Secured to Concrete</SelectItem>
              <SelectItem value="Secured to Wood Header">Secured to Wood Header</SelectItem>
              <SelectItem value="Unispan Truss System">Unispan Truss System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SupportStructureForm;
