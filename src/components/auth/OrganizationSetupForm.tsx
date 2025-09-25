/**
 * Organization Setup Form Component
 * 
 * Extracted from Auth.tsx - handles organization creation or joining
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Plus } from "lucide-react";

interface OrganizationSetupFormProps {
  orgChoice: "join" | "create" | null;
  orgCode: string;
  orgName: string;
  loading: boolean;
  onOrgChoiceChange: (choice: "join" | "create") => void;
  onOrgCodeChange: (code: string) => void;
  onOrgNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrganizationSetupForm: React.FC<OrganizationSetupFormProps> = ({
  orgChoice,
  orgCode,
  orgName,
  loading,
  onOrgChoiceChange,
  onOrgCodeChange,
  onOrgNameChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Two selection boxes side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            orgChoice === "join"
              ? "border-orange-500 bg-orange-50/30"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onOrgChoiceChange("join")}
        >
          <div className="text-center space-y-1.5">
            <Users className="w-6 h-6 mx-auto text-gray-600" />
            <div className="font-semibold text-gray-900 text-sm">Join Organization</div>
            <div className="text-xs text-gray-600">Enter an organization code</div>
          </div>
        </div>

        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            orgChoice === "create"
              ? "border-orange-500 bg-orange-50/30"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onOrgChoiceChange("create")}
        >
          <div className="text-center space-y-1.5">
            <Plus className="w-6 h-6 mx-auto text-gray-600" />
            <div className="font-semibold text-gray-900 text-sm">Create Organization</div>
            <div className="text-xs text-gray-600">Start your own organization</div>
          </div>
        </div>
      </div>

      {/* Dynamic input section */}
      {orgChoice === "join" && (
        <div className="space-y-2">
          <Label htmlFor="orgCode" className="text-gray-700 font-medium text-sm">
            Organization Code
          </Label>
          <Input
            id="orgCode"
            type="text"
            value={orgCode}
            onChange={(e) => onOrgCodeChange(e.target.value)}
            placeholder="Enter organization code"
            required
            className="bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
      )}

      {orgChoice === "create" && (
        <div className="space-y-2">
          <Label htmlFor="orgName" className="text-gray-700 font-medium text-sm">
            Organization Name
          </Label>
          <Input
            id="orgName"
            type="text"
            value={orgName}
            onChange={(e) => onOrgNameChange(e.target.value)}
            placeholder="Enter organization name"
            required
            className="bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
        disabled={
          loading ||
          !orgChoice ||
          (orgChoice === "join" && !orgCode) ||
          (orgChoice === "create" && !orgName)
        }
      >
        {loading ? "Processing..." : orgChoice === "create" ? "Create Organization" : "Request to Join"}
      </Button>
    </form>
  );
};