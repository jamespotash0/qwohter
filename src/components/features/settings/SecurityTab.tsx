import React, { useState } from 'react';
import { Shield, AlertTriangle, RotateCcw, Copy, Eye, EyeOff, Info } from 'lucide-react';
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
  const [showInfoBox, setShowInfoBox] = useState(false);

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
    <div className="max-w-3xl">
      {/* Security Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Security</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        {canRegenerateOrgCode(userRole) ? (
          <div className="space-y-6">
            {/* Organization Code Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Organization Code</h3>
                  <div className="relative group">
                    <button className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                      <AlertTriangle className="w-3 h-3" />
                    </button>
                    {/* Hover tooltip */}
                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <p className="text-sm text-amber-900 dark:text-amber-200">
                        If compromised, regenerate this code to invalidate all existing invite links.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateOrgCode}
                  disabled={isRegenerating}
                  className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  {isRegenerating ? (
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Share this code with team members to allow them to join your organization.
              </p>

              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                  {displayedCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCodeVisible(!isCodeVisible)}
                  className="h-10 w-10 p-0"
                >
                  {isCodeVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyOrgCode}
                  className="h-10 w-10 p-0"
                  disabled={!isCodeVisible}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Access Restricted</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You need Admin or Owner permissions to manage organization security settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
