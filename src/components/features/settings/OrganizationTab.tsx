import React, { useState, useEffect } from 'react';
import { Building, Globe, Phone, Printer, MapPin, Save, Edit3, X, Upload, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { hasAdminPermissions } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { LogoUpload } from "@/components/common/uploads/LogoUpload";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { useAuthStore } from "@/stores/auth/authStore";

interface OrganizationTabProps {
  organization: any;
  userRole: string;
  onOrganizationUpdate: () => void;
}

export const OrganizationTab: React.FC<OrganizationTabProps> = ({
  organization,
  userRole,
  onOrganizationUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const [editedData, setEditedData] = useState({
    name: organization?.name || '',
    industry: organization?.industry || '',
    phone_number: organization?.phone_number || '',
    fax_number: organization?.fax_number || '',
    company_address: organization?.company_address || '',
    website: organization?.website || ''
  });

  const hasEditPermission = hasAdminPermissions(userRole);

  // Update editedData when organization changes
  useEffect(() => {
    if (organization) {
      setEditedData({
        name: organization.name || '',
        industry: organization.industry || '',
        phone_number: organization.phone_number || '',
        fax_number: organization.fax_number || '',
        company_address: organization.company_address || '',
        website: organization.website || ''
      });
    }
  }, [organization]);

  // Handle logo upload success
  const handleLogoUploadSuccess = (result: LogoUploadResult) => {
    console.log('✅ Logo upload successful:', result);
    toast({
      title: "Logo Uploaded",
      description: "Your company logo has been uploaded successfully.",
    });

    // Refresh organization data to show new logo
    if (typeof onOrganizationUpdate === 'function') {
      onOrganizationUpdate();
    }
  };

  // Handle logo upload error
  const handleLogoUploadError = (error: string) => {
    console.error('❌ Logo upload failed:', error);
    toast({
      title: "Upload Failed",
      description: error,
      variant: "destructive",
    });
  };

  const handleSaveOrganization = async () => {
    console.log('🔄 Save organization attempt:');
    console.log('  - hasEditPermission:', hasEditPermission);
    console.log('  - userRole:', userRole);
    console.log('  - organization:', organization);
    console.log('  - organization.id:', organization?.id);

    if (!hasEditPermission) {
      console.log('❌ Permission denied');
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit organization details.",
        variant: "destructive",
      });
      return;
    }

    if (!organization?.id) {
      console.log('❌ No organization ID');
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      console.log('📝 About to update with data:', editedData);
      console.log('🎯 Updating organization ID:', organization.id);

      const updateData = {
        name: editedData.name,
        industry: editedData.industry,
        phone_number: editedData.phone_number,
        fax_number: editedData.fax_number || null,
        company_address: editedData.company_address,
        website: editedData.website || null
      };

      console.log('📋 Update payload:', updateData);

      const { error, data } = await supabase
        .from('organizations')
        .update(updateData as {
          name: string;
          industry: string;
          phone_number: string | null;
          fax_number: string | null;
          company_address: string | null;
          website: string | null;
        })
        .eq('id', organization.id)
        .select();

      console.log('📊 Update result:', { error, data });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      toast({
        title: "Organization Updated",
        description: "Organization details have been updated successfully.",
      });

      setIsEditing(false);
      console.log('🔄 About to call onOrganizationUpdate (save):', typeof onOrganizationUpdate);
      if (typeof onOrganizationUpdate === 'function') {
        onOrganizationUpdate();
      } else {
        console.error('❌ onOrganizationUpdate is not a function:', onOrganizationUpdate);
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update organization",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedData({
      name: organization?.name || '',
      industry: organization?.industry || '',
      phone_number: organization?.phone_number || '',
      fax_number: organization?.fax_number || '',
      company_address: organization?.company_address || '',
      website: organization?.website || ''
    });
    setIsEditing(false);
  };

  if (!hasEditPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            You need Admin or Owner permissions to view organization settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Company Logo */}
      <div className="pb-8 border-b border-[var(--content-card-border)]">
        <h2 className="text-lg font-semibold text-[var(--content-header-text)] mb-6 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Company Logo
        </h2>
        <div>
          {currentUser && (
            <LogoUpload
              onUploadSuccess={handleLogoUploadSuccess}
              onUploadError={handleLogoUploadError}
              currentLogoUrl={organization?.logo_data?.logo_public_url || organization?.logo_data?.logo_url || ''}
              userId={currentUser.id}
              disabled={isEditing}
            />
          )}
        </div>
      </div>

      {/* Organization Information */}
      <div className="pb-8 border-b border-[var(--content-card-border)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--content-header-text)] flex items-center gap-2">
            <Building className="w-5 h-5" />
            Organization Information
          </h2>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                <Input
                  id="org-name"
                  value={isEditing ? editedData.name : organization?.name || ''}
                  onChange={(e) => isEditing && setEditedData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your organization name"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <Input
                  id="industry"
                  value={isEditing ? editedData.industry : organization?.industry || ''}
                  onChange={(e) => isEditing && setEditedData(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="Enter an industry"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <Input
                  id="phone"
                  value={isEditing ? editedData.phone_number : organization?.phone_number || ''}
                  onChange={(e) => isEditing && setEditedData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="Enter a phone number"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {/* Fax Number */}
            <div className="space-y-2">
              <Label htmlFor="fax">Fax Number</Label>
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-gray-500" />
                <Input
                  id="fax"
                  value={isEditing ? editedData.fax_number : organization?.fax_number || ''}
                  onChange={(e) => isEditing && setEditedData(prev => ({ ...prev, fax_number: e.target.value }))}
                  placeholder={organization?.fax_number || "Enter a fax number"}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {/* Company Address */}
            <div className="space-y-2">
              {isEditing ? (
                <MapboxInput
                  id="address"
                  label="Company Address"
                  value={editedData.company_address}
                  onChange={(value) => setEditedData(prev => ({ ...prev, company_address: value }))}
                  placeholder="123 Main St, Suite 100, City, State 12345"
                />
              ) : (
                <>
                  <Label htmlFor="address">Company Address</Label>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-3" />
                    <Input
                      id="address"
                      value={organization?.company_address || ''}
                      placeholder="Enter an address"
                      disabled={true}
                      className="bg-gray-50"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <Input
                  id="website"
                  value={isEditing ? editedData.website : organization?.website || ''}
                  onChange={(e) => isEditing && setEditedData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.example.com"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={handleSaveOrganization}
                disabled={isUpdating}
                size="sm"
                className="bg-blue-600 hover:bg-[var(--sidebar-nav-bg-hover)] text-white"
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};