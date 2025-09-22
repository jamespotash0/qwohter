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
import { IndustrySelector } from "@/components/auth/IndustrySelector";
import { FoundViaSelector } from "@/components/auth/FoundViaSelector";

interface OrganizationSetupFormProps {
  orgChoice: "join" | "create" | null;
  orgCode: string;
  orgName: string;
  industry: string;
  foundVia: string;
  loading: boolean;
  onOrgChoiceChange: (choice: "join" | "create") => void;
  onOrgCodeChange: (code: string) => void;
  onOrgNameChange: (name: string) => void;
  onIndustryChange: (industry: string) => void;
  onFoundViaChange: (foundVia: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrganizationSetupForm: React.FC<OrganizationSetupFormProps> = ({
  orgChoice,
  orgCode,
  orgName,
  industry,
  foundVia,
  loading,
  onOrgChoiceChange,
  onOrgCodeChange,
  onOrgNameChange,
  onIndustryChange,
  onFoundViaChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <RadioGroup value={orgChoice || ""} onValueChange={(value) => onOrgChoiceChange(value as "join" | "create")}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-4 border border-slate-200 rounded-lg">
            <RadioGroupItem value="join" id="join" />
            <Label htmlFor="join" className="flex items-center cursor-pointer flex-1">
              <Users className="w-5 h-5 mr-3 text-slate-600" />
              <div>
                <div className="font-medium">Join Organization</div>
                <div className="text-sm text-slate-500">Enter an organization code to join</div>
              </div>
            </Label>
          </div>

          {orgChoice === "join" && (
            <div className="ml-6 space-y-3">
              <Label htmlFor="orgCode" className="text-slate-700 font-medium text-sm">
                Organization Code
              </Label>
              <Input 
                id="orgCode" 
                type="text" 
                value={orgCode} 
                onChange={(e) => onOrgCodeChange(e.target.value)} 
                placeholder="Enter organization code" 
                required 
                className="bg-slate-50 border-slate-200 h-12" 
              />
            </div>
          )}

          <div className="flex items-center space-x-2 p-4 border border-slate-200 rounded-lg">
            <RadioGroupItem value="create" id="create" />
            <Label htmlFor="create" className="flex items-center cursor-pointer flex-1">
              <Plus className="w-5 h-5 mr-3 text-slate-600" />
              <div>
                <div className="font-medium">Create Organization</div>
                <div className="text-sm text-slate-500">Start your own organization</div>
              </div>
            </Label>
          </div>

          {orgChoice === "create" && (
            <div className="ml-6 space-y-6">
              <div>
                <Label htmlFor="orgName" className="text-slate-700 font-medium text-sm">
                  Organization Name
                </Label>
                <Input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => onOrgNameChange(e.target.value)}
                  placeholder="Enter organization name"
                  required
                  className="bg-slate-50 border-slate-200 h-12 mt-2"
                />
              </div>

              <IndustrySelector
                value={industry}
                onChange={onIndustryChange}
                required
                disabled={loading}
              />

              <FoundViaSelector
                value={foundVia}
                onChange={onFoundViaChange}
                required
                disabled={loading}
              />
            </div>
          )}
        </div>
      </RadioGroup>

      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12"
        disabled={
          loading ||
          !orgChoice ||
          (orgChoice === "join" && !orgCode) ||
          (orgChoice === "create" && (!orgName || !industry || !foundVia))
        }
      >
        {loading ? "Processing..." : orgChoice === "create" ? "Create Organization" : "Request to Join"}
      </Button>
    </form>
  );
};