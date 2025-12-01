/**
 * Organization Setup Form Component
 *
 * Simplified form - only handles organization creation (default flow)
 * Joining organizations now requires an invitation link
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface OrganizationSetupFormProps {
  orgName: string;
  loading: boolean;
  onOrgNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrganizationSetupForm: React.FC<OrganizationSetupFormProps> = ({
  orgName,
  loading,
  onOrgNameChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
          <Building2 className="w-6 h-6 text-orange-600" />
        </div>
        <p className="text-sm text-gray-600">
          Let's set up your organization to get started
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgName" className="text-gray-700 font-medium text-sm">
          Organization Name
        </Label>
        <Input
          id="orgName"
          type="text"
          value={orgName}
          onChange={(e) => onOrgNameChange(e.target.value)}
          placeholder="e.g., Acme Corporation"
          required
          className="bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the name your team will see. You can change it later in settings.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold h-12 transition-colors"
        disabled={loading || !orgName.trim()}
      >
        {loading ? "Creating Organization..." : "Create Organization"}
      </Button>

    </form>
  );
};