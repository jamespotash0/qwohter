import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyInfoDialog } from "./CompanyInfoDialog";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { extractPrimaryContactInfo } from "@/types/companySettings";

export function CompanySettingsSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { 
    organization, 
    isLoading, 
    updateCompanyInfo,
    hasCompanyInfo
  } = useOrganizationSettings();

  const handleEdit = () => {
    setIsDialogOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      await updateCompanyInfo(data);
      toast.success("Company information updated successfully");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update company information");
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  const companyData = organization ? 
    extractPrimaryContactInfo(organization.organization_info || {}) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Company Information</h3>
          <p className="text-sm text-muted-foreground">
            Manage your organization's company details for quote generation
          </p>
        </div>
        <Button onClick={handleEdit} className="gap-2">
          <Edit2 className="w-4 h-4" />
          {hasCompanyInfo() ? 'Edit Information' : 'Add Information'}
        </Button>
      </div>

      {/* Company Information Display */}
      {hasCompanyInfo() ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {organization?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Phone:</span>
                <p>{companyData?.phone}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Fax:</span>
                <p>{companyData?.fax}</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-muted-foreground">Address:</span>
                <p>{companyData?.address}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Website:</span>
                <p>{companyData?.website}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No company information added</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your organization's company details to get started with quote generation
            </p>
            <Button onClick={handleEdit} size="sm">
              Add Company Information
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Company Info Dialog */}
      <CompanyInfoDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        organizationName={organization?.name}
        initialData={companyData}
      />
    </div>
  );
}