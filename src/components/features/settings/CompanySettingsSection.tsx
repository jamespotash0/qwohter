import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyInfoDialog } from "./CompanyInfoDialog";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { extractCompanyInfoForForm } from "@/lib/types/settings/companySettings";

export function CompanySettingsSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Debug wrapper for setIsDialogOpen
  const setIsDialogOpenDebug = (value: boolean) => {
    setIsDialogOpen(value);
  };
  const [user, setUser] = useState<any>(null);
  
  const { 
    organization, 
    isLoading, 
    updateCompanyInfo,
    hasCompanyInfo
  } = useOrganizationSettings();
  
  const { profile } = useUserProfile(user?.id);
  const { currentUserRole } = useOrganizations();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getCurrentUser();
  }, []);

  const handleEdit = () => {
    setIsDialogOpenDebug(true);
  };

  const handleSave = async (data: any) => {
    try {
      await updateCompanyInfo(data);
      toast.success("Company information updated successfully");
      setIsDialogOpenDebug(false);
    } catch (error) {
      // console.error('❌ Error in handleSave:', error);
      toast.error("Failed to update company information");
    }
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
      {hasCompanyInfo() ? (
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
                <div>
                  <span className="font-medium text-muted-foreground">Proposal Starting Number:</span>
                  <p className="font-mono text-lg font-semibold text-blue-700">
                    {companyData?.quote_start_number || 'Not set'}
                  </p>
                </div>
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
              Set up your organization's contact details to enable professional quote generation
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