import React, { useState } from 'react';
import { Building, Shield, AlertTriangle, RotateCcw, Users, Key, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { regenerateOrganizationCode } from "@/utils/organizationCodeManagement";
import { canRegenerateOrgCode } from "@/utils/permissions";

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
  const [isRegenerating, setIsRegenerating] = useState(false);

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

      onOrganizationUpdate();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Organization Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Organization Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={organization?.name || ''}
                placeholder="Your organization name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-id">Organization ID</Label>
              <Input
                id="org-id"
                value={organization?.id || ''}
                disabled
                className="bg-gray-50 font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label>Created Date</Label>
              <p className="text-sm text-gray-600">
                {organization?.created_at ? formatDate(organization.created_at) : 'Unknown'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Last Updated</Label>
              <p className="text-sm text-gray-600">
                {organization?.updated_at ? formatDate(organization.updated_at) : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button>
              <Building className="w-4 h-4 mr-2" />
              Update Organization
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization Security */}
      {canRegenerateOrgCode(userRole) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Organization Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 mb-1">Organization Code Management</h4>

                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-amber-800">Current code:</Label>
                    <code className="bg-amber-100 px-2 py-1 rounded text-amber-900 font-mono text-sm">
                      {organization?.organization_code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyOrgCode}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

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
          </CardContent>
        </Card>
      )}

      {/* Organization Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">-</div>
              <div className="text-sm text-blue-800">Total Members</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">-</div>
              <div className="text-sm text-green-800">Active Quotes</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">-</div>
              <div className="text-sm text-purple-800">Projects</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};