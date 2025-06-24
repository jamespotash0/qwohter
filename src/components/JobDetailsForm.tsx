
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <div>
      <h2 className="text-xl font-semibold mb-6">Job Details</h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={data.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proposalNumber">Proposal Number</Label>
            <Input
              id="proposalNumber"
              value={data.proposalNumber}
              onChange={(e) => handleChange("proposalNumber", e.target.value)}
              placeholder="Enter proposal number"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="jobLocation">Job Location</Label>
          <Input
            id="jobLocation"
            value={data.jobLocation}
            onChange={(e) => handleChange("jobLocation", e.target.value)}
            placeholder="Enter job location"
          />
        </div>
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Billed To</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="billedName">Name</Label>
              <Input
                id="billedName"
                value={data.billedTo.name}
                onChange={(e) => handleBilledToChange("name", e.target.value)}
                placeholder="Client name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="billedCompany">Company</Label>
              <Input
                id="billedCompany"
                value={data.billedTo.company}
                onChange={(e) => handleBilledToChange("company", e.target.value)}
                placeholder="Company name"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="billedAddress">Address</Label>
              <Textarea
                id="billedAddress"
                value={data.billedTo.address}
                onChange={(e) => handleBilledToChange("address", e.target.value)}
                placeholder="Client address"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsForm;
