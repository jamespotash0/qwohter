import React, { useState } from 'react';
import { Shield, AlertTriangle, RotateCcw, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { regenerateOrganizationCode } from "@/utils/organizationCodeManagement";
import { canRegenerateOrgCode } from "@/utils/permissions";

interface SecurityTabProps {
  organization: any;
  userRole: string;
  onOrganizationUpdate: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  organization,
  userRole,
  onOrganizationUpdate
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);

  const handleRegenerateOrgCode = async () => {
    console.log('🔄 Regenerate button clicked');
    console.log('Organization:', organization);
    console.log('User Role:', userRole);
    console.log('Can regenerate?', canRegenerateOrgCode(userRole));

    if (!organization?.id || !canRegenerateOrgCode(userRole)) {
      console.log('❌ Permission denied or no organization ID');
      toast({
        title: "Permission Denied",
        description: "You don't have permission to regenerate the organization code.",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    console.log('🚀 Starting regeneration process...');

    try {
      const result = await regenerateOrganizationCode(organization.id, userRole);
      console.log('✅ Regeneration successful:', result);

      toast({
        title: "Organization Code Regenerated",
        description: `New code: ${result.newCode}. ${result.invalidatedTokens} invite tokens were invalidated for security.`,
      });

      console.log('🔄 About to call onOrganizationUpdate (regenerate):', typeof onOrganizationUpdate);
      if (typeof onOrganizationUpdate === 'function') {
        onOrganizationUpdate();
      } else {
        console.error('❌ onOrganizationUpdate is not a function:', onOrganizationUpdate);
      }
    } catch (error) {
      console.error('❌ Error regenerating organization code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate organization code",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
      console.log('🏁 Regeneration process finished');
    }
  };

  const copyOrgCode = () => {
    if (organization?.organization_code) {
      navigator.clipboard.writeText(organization.organization_code);
      toast({
        title: "Copied!",
        description: "Organization code copied to clipboard.",
      });
    }
  };

  const displayedCode = isCodeVisible
    ? organization?.organization_code
    : '••••••••';

  return (
    <div className="space-y-8">
      {/* Organization Code Security */}
      <div className="pb-8 border-b border-[var(--content-card-border)] last:border-0 last:pb-0">
        <h2 className="text-lg font-semibold text-[var(--content-header-text)] mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Organization Code Security
        </h2>
        <div>
          {canRegenerateOrgCode(userRole) ? (
            <div className="space-y-4">
              {/* Organization Code Display */}
              <div className="p-4 border border-[var(--content-card-border)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-[var(--content-header-text)]">Organization Code</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCodeVisible(!isCodeVisible)}
                      className="h-7 w-7 p-0"
                    >
                      {isCodeVisible ? (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyOrgCode}
                      className="h-7 w-7 p-0"
                      disabled={!isCodeVisible}
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-900">
                  {displayedCode}
                </code>
                <p className="text-xs text-gray-600 mt-2">
                  Share this code with team members to allow them to join your organization.
                </p>
              </div>

              {/* Regenerate Code Section */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900 mb-1">Regenerate Organization Code</h4>
                    <p className="text-xs text-amber-700 mb-3">
                      If you suspect your organization code has been compromised, you can regenerate it.
                      This will invalidate all existing invite links for security.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateOrgCode}
                      disabled={isRegenerating}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      {isRegenerating ? (
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      {isRegenerating ? 'Regenerating...' : 'Regenerate Code'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                You need Admin or Owner permissions to manage organization security settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
