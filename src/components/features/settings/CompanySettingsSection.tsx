import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyInfoDialog } from "./CompanyInfoDialog";
import { useUser, useProfile } from "@/auth";
import { useCurrentOrganization, useUpdateOrganization } from "@/hooks/queries";
import { extractCompanyInfoForForm } from "@/lib/types/companySettings";

export function CompanySettingsSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Debug wrapper for setIsDialogOpen
  const setIsDialogOpenDebug = (value: boolean) => {
    setIsDialogOpen(value);
  };

  // Get user and organization from React Query
  const user = useUser();
  const { data: profile } = useProfile(user?.id);
  const { organization, role: currentUserRole, isLoading } = useCurrentOrganization(user?.id);
  const { mutate: updateOrganization } = useUpdateOrganization();

  // Helper to check if organization has company info
  const hasCompanyInfo = useMemo(() => {
    if (!organization) return false;
    const hasPhone = !!(organization.phone_number?.trim());
    const hasFax = !!(organization.fax_number?.trim());
    const hasAddress = !!(organization.company_address?.trim());
    const hasWebsite = !!(organization.website?.trim());
    return hasPhone || hasFax || hasAddress || hasWebsite;
  }, [organization]);

  const handleEdit = () => {
    setIsDialogOpenDebug(true);
  };

  const handleSave = async (data: any) => {
    if (!organization?.id) return;

    updateOrganization(
      { organizationId: organization.id, updates: data },
      {
        onSuccess: () => {
          toast.success("Company information updated successfully");
          setIsDialogOpenDebug(false);
        },
        onError: () => {
          toast.error("Failed to update company information");
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  const companyData = organization ?
    extractCompanyInfoForForm(organization) : null;

  // Check if user is admin
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'Owner';

  return (
    <div className="space-y-4">
      {/* Company Information Display */}
      {hasCompanyInfo ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {organization?.logo_data?.logo_public_url ? (
                  <div className="w-8 h-8 border border-muted-foreground/20 rounded overflow-hidden bg-white flex-shrink-0">
                    <img 
                      src={organization.logo_data.logo_public_url} 
                      alt="Company logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <Building2 className="w-5 h-5 hidden" />
                  </div>
                ) : (
                  <Building2 className="w-5 h-5" />
                )}
                {organization?.name}
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {/* Left Side - Contact Info */}
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-muted-foreground">Phone:</span>
                  <p>{companyData?.phone_number || 'Not provided'}</p>
                </div>
                {companyData?.fax_number && (
                  <div>
                    <span className="font-medium text-muted-foreground">Fax:</span>
                    <p>{companyData.fax_number}</p>
                  </div>
                )}
              </div>
              
              {/* Right Side - Website and Address */}
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-muted-foreground">Website:</span>
                  <p>{companyData?.website || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Address:</span>
                  <p>{companyData?.company_address || 'Not provided'}</p>
                </div>
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
            <h3 className="font-medium mb-2">Company information not set up</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up your organization's contact details to enable professional proposal generation
            </p>
            {isAdmin && (
              <Button onClick={handleEdit} size="sm">
                Set Up Company Information
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Info Dialog */}
      <CompanyInfoDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpenDebug(false)}
        onSave={handleSave}
        organizationName={organization?.name}
        initialData={companyData}
        userId={user?.id || ''}
        organizationId={organization?.id || ''}
      />
    </div>
  );
}