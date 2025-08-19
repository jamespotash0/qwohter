
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MapboxInput from "@/components/common/inputs/MapboxInput";

interface JobDetailsData {
  date: string;
  proposalNumber: string;
  jobLocation: string;
  billedTo: {
    name: string;
    company: string;
    address: string;
  };
}

interface JobDetailsFormProps {
  data: JobDetailsData;
  onUpdate: (data: JobDetailsData) => void;
}

const JobDetailsForm = ({ data, onUpdate }: JobDetailsFormProps) => {
  const handleChange = (field: keyof JobDetailsData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleBilledToChange = (field: keyof JobDetailsData["billedTo"], value: string) => {
    onUpdate({
      ...data,
      billedTo: { ...data.billedTo, [field]: value }
    });
  };

  return (
    <div className="p-1">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={data.date}
                onChange={(e) => handleChange("date", e.target.value)}
                required
                className="h-10 pr-8 sm:pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-1 sm:[&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:bg-transparent [&::-webkit-calendar-picker-indicator]:hover:bg-gray-100 [&::-webkit-calendar-picker-indicator]:rounded [&::-webkit-calendar-picker-indicator]:p-0.5 sm:[&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 sm:[&::-webkit-calendar-picker-indicator]:w-6 sm:[&::-webkit-calendar-picker-indicator]:h-4"
                style={{
                  colorScheme: 'light'
                }}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="proposalNumber" className="text-sm font-medium">Proposal Number *</Label>
            <Input
              id="proposalNumber"
              value={data.proposalNumber}
              onChange={(e) => handleChange("proposalNumber", e.target.value)}
              placeholder="Enter proposal number"
              required
              readOnly
              className="h-10 bg-muted text-muted-foreground"
            />
          </div>
          
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="jobLocation" className="text-sm font-medium">Job Location *</Label>
            <MapboxInput
              label=""
              value={data.jobLocation}
              onChange={(value) => handleChange("jobLocation", value)}
              placeholder="Enter job location"
              id="jobLocation"
              required
            />
          </div>
        </div>
        
        <div className="border-t pt-3">
          <h3 className="text-lg font-medium mb-3">Billed To</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="billedName" className="text-sm font-medium">Name *</Label>
              <Input
                id="billedName"
                value={data.billedTo.name}
                onChange={(e) => handleBilledToChange("name", e.target.value)}
                placeholder="Client name"
                required
                className="h-10"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="billedCompany" className="text-sm font-medium">Company *</Label>
              <Input
                id="billedCompany"
                value={data.billedTo.company}
                onChange={(e) => handleBilledToChange("company", e.target.value)}
                placeholder="Company name"
                required
                className="h-10"
              />
            </div>
            
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="billedAddress" className="text-sm font-medium">Client Address *</Label>
              <MapboxInput
                label=""
                value={data.billedTo.address}
                onChange={(value) => handleBilledToChange("address", value)}
                placeholder="Client address"
                id="billedAddress"
                required
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsForm;
