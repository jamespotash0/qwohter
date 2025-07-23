import { useState } from "react";
import { Plus, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizations, Organization } from "@/hooks/useOrganizations";

interface OrganizationSelectorProps {
  currentOrganization: Organization | null;
  organizations: Organization[];
  onOrganizationChange: (org: Organization) => void;
  onCreateOrganization: (name: string) => void;
}

export const OrganizationSelector = ({
  currentOrganization,
  organizations,
  onOrganizationChange,
  onCreateOrganization
}: OrganizationSelectorProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateOrganization(newOrgName.trim());
      setNewOrgName("");
      setShowCreateDialog(false);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={currentOrganization?.id || ""} 
        onValueChange={(value) => {
          const org = organizations.find(o => o.id === value);
          if (org) onOrganizationChange(org);
        }}
      >
        <SelectTrigger className="w-48">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <SelectValue placeholder="Select workspace" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center gap-2">
                <span>{org.name}</span>
                {currentOrganization?.id === org.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="orgName">Workspace Name</Label>
              <Input
                id="orgName"
                placeholder="Enter workspace name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateOrganization();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateOrganization}
                disabled={!newOrgName.trim() || isCreating}
              >
                {isCreating ? "Creating..." : "Create Workspace"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};