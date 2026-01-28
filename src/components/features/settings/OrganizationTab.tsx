import React, { useState, useEffect } from 'react';
import { Shield, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { hasAdminPermissions } from "@/utils/permissions";
import { supabase } from "@/integrations/supabase/client";
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { LogoUpload } from "@/components/common/uploads/LogoUpload";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { useUser } from "@/auth";
import { DocumentNumberingSection } from "./DocumentNumberingSection";
import { WorkflowSettingsSection } from "./WorkflowSettingsSection";

/**
 * Format a phone number as (xxx) xxx-xxxx
 * Accepts any input and extracts only digits, then formats
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = digits.slice(0, 10);

  // Format based on length
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Check if a phone number has exactly 10 digits
 */
function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10;
}

/**
 * Get raw digits from formatted phone number
 */
function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

interface OrganizationTabProps {
  organization: any;
  userRole: string;
  onOrganizationUpdate: (userId?: string, forceRefresh?: boolean) => Promise<void>;
}

export const OrganizationTab: React.FC<OrganizationTabProps> = ({
  organization,
  userRole,
  onOrganizationUpdate
}) => {
  const currentUser = useUser();

  // Individual field editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingIndustry, setIsEditingIndustry] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingFax, setIsEditingFax] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Individual field values
  const [editedName, setEditedName] = useState(organization?.name || '');
  const [editedIndustry, setEditedIndustry] = useState(organization?.industry || '');
  const [editedWebsite, setEditedWebsite] = useState(organization?.website || '');
  const [editedPhone, setEditedPhone] = useState(organization?.phone_number || '');
  const [editedFax, setEditedFax] = useState(organization?.fax_number || '');
  const [editedAddress, setEditedAddress] = useState(organization?.company_address || '');

  // Individual loading states
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingIndustry, setIsUpdatingIndustry] = useState(false);
  const [isUpdatingWebsite, setIsUpdatingWebsite] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isUpdatingFax, setIsUpdatingFax] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);

  const hasEditPermission = hasAdminPermissions(userRole);

  // Update field values when organization changes
  useEffect(() => {
    if (organization) {
      setEditedName(organization.name || '');
      setEditedIndustry(organization.industry || '');
      setEditedWebsite(organization.website || '');
      setEditedPhone(organization.phone_number || '');
      setEditedFax(organization.fax_number || '');
      setEditedAddress(organization.company_address || '');
    }
  }, [organization]);

  // Handle logo upload success
  const handleLogoUploadSuccess = (result: LogoUploadResult) => {
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

  // Generic update function
  const handleUpdateField = async (
    field: string,
    value: string | null,
    setIsUpdating: (val: boolean) => void,
    setIsEditing: (val: boolean) => void
  ) => {
    if (!hasEditPermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit organization details.",
        variant: "destructive",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData: Record<string, string | null> = { [field]: value };
      // @ts-ignore - Dynamic field update
      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Organization details have been updated successfully.",
      });

      setIsEditing(false);

      // Force refetch with the updated data
      if (typeof onOrganizationUpdate === 'function') {
        await onOrganizationUpdate(undefined, true);
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
    <div className="max-w-5xl">
      <div className="space-y-8">
        {/* Company Profile Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Company Profile</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

          <div className="space-y-1">
            {/* Company Logo */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Company Logo</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Upload your organization's logo
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {currentUser && (
                  <LogoUpload
                    onUploadSuccess={handleLogoUploadSuccess}
                    onUploadError={handleLogoUploadError}
                    currentLogoUrl={organization?.logo_data?.logo_public_url || organization?.logo_data?.logo_url || ''}
                    userId={currentUser.id}
                    disabled={false}
                  />
                )}
              </div>
            </div>

            {/* Organization Name */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                  Organization Name <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  The name of your organization
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingName ? (
                  <>
                    <div className="flex-1 flex flex-col">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter your organization name"
                        className="h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                      />
                      {editedName.trim() === '' && (
                        <span className="text-xs text-red-500 mt-1">Organization name is required</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('name', editedName.trim(), setIsUpdatingName, setIsEditingName)}
                      disabled={isUpdatingName || editedName.trim() === ''}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdatingName ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedName(organization?.name || '');
                        setIsEditingName(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {organization?.name || <span className="text-red-400">Required</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Industry */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Industry</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Your organization's industry sector
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingIndustry ? (
                  <>
                    <Input
                      value={editedIndustry}
                      onChange={(e) => setEditedIndustry(e.target.value)}
                      placeholder="Enter your industry (e.g., Technology, Finance)"
                      className="flex-1 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('industry', editedIndustry, setIsUpdatingIndustry, setIsEditingIndustry)}
                      disabled={isUpdatingIndustry}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdatingIndustry ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedIndustry(organization?.industry || '');
                        setIsEditingIndustry(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {organization?.industry || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingIndustry(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Website</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Your organization's website URL
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingWebsite ? (
                  <>
                    <Input
                      value={editedWebsite}
                      onChange={(e) => setEditedWebsite(e.target.value)}
                      placeholder="Enter your website URL (e.g., https://example.com)"
                      className="flex-1 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('website', editedWebsite || null, setIsUpdatingWebsite, setIsEditingWebsite)}
                      disabled={isUpdatingWebsite}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdatingWebsite ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedWebsite(organization?.website || '');
                        setIsEditingWebsite(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {organization?.website || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingWebsite(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Contact Information</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

          <div className="space-y-1">
            {/* Phone Number */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Phone Number</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Primary Phone Number
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingPhone ? (
                  <>
                    <div className="flex-1 flex flex-col">
                      <Input
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(formatPhoneNumber(e.target.value))}
                        placeholder="(555) 123-4567"
                        className="h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        maxLength={14}
                      />
                      {editedPhone && !isValidPhoneNumber(editedPhone) && (
                        <span className="text-xs text-amber-600 mt-1">Enter 10 digits</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('phone_number', editedPhone, setIsUpdatingPhone, setIsEditingPhone)}
                      disabled={isUpdatingPhone || (editedPhone !== '' && !isValidPhoneNumber(editedPhone))}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdatingPhone ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedPhone(organization?.phone_number || '');
                        setIsEditingPhone(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {organization?.phone_number || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPhone(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Fax Number */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Fax Number</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Fax number
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingFax ? (
                  <>
                    <div className="flex-1 flex flex-col">
                      <Input
                        value={editedFax}
                        onChange={(e) => setEditedFax(formatPhoneNumber(e.target.value))}
                        placeholder="(555) 123-4567"
                        className="h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                        maxLength={14}
                      />
                      {editedFax && !isValidPhoneNumber(editedFax) && (
                        <span className="text-xs text-amber-600 mt-1">Enter 10 digits</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('fax_number', editedFax || null, setIsUpdatingFax, setIsEditingFax)}
                      disabled={isUpdatingFax || (editedFax !== '' && !isValidPhoneNumber(editedFax))}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdatingFax ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedFax(organization?.fax_number || '');
                        setIsEditingFax(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {organization?.fax_number || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingFax(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Company Address */}
            <div className="flex items-start justify-between py-6 px-6 rounded-lg">
              <div className="flex-1 pr-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Company Address</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Your organization's physical address
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-[480px] justify-end">
                {isEditingAddress ? (
                  <>
                    <div className="flex-1">
                      <MapboxInput
                        id="address"
                        label=""
                        value={editedAddress}
                        onChange={(value) => setEditedAddress(value)}
                        placeholder="Start typing your address to search..."
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateField('company_address', editedAddress, setIsUpdatingAddress, setIsEditingAddress)}
                      disabled={isUpdatingAddress}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {isUpdatingAddress ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedAddress(organization?.company_address || '');
                        setIsEditingAddress(false);
                      }}
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                      {organization?.company_address || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingAddress(true)}
                      className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Document Numbering Section */}
        {organization?.id && (
          <DocumentNumberingSection
            organizationId={organization.id}
            hasEditPermission={hasEditPermission}
          />
        )}

        {/* Workflow Settings Section */}
        {organization?.id && (
          <WorkflowSettingsSection
            organizationId={organization.id}
            requireProposalApproval={organization?.require_proposal_approval ?? false}
            hasEditPermission={hasEditPermission}
            onUpdate={() => onOrganizationUpdate(undefined, true)}
          />
        )}
      </div>
    </div>
  );
};
