import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowSettingsSectionProps {
  organizationId: string;
  requireProposalApproval: boolean;
  hasEditPermission: boolean;
  onUpdate?: () => void;
}

export const WorkflowSettingsSection: React.FC<WorkflowSettingsSectionProps> = ({
  organizationId,
  requireProposalApproval,
  hasEditPermission,
  onUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [approvalEnabled, setApprovalEnabled] = useState(requireProposalApproval);

  // Sync with prop changes
  useEffect(() => {
    setApprovalEnabled(requireProposalApproval);
  }, [requireProposalApproval]);

  const handleToggleApproval = async (enabled: boolean) => {
    if (!hasEditPermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to change workflow settings.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    setApprovalEnabled(enabled); // Optimistic update

    try {
      // Type assertion needed until Supabase types are regenerated after migration
      const { error } = await supabase
        .from('organizations')
        .update({ require_proposal_approval: enabled } as never)
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: enabled ? "Approval Required" : "Approval Disabled",
        description: enabled
          ? "Members must now request approval before changing proposals from Draft to Submitted."
          : "All team members can now change proposal status to Submitted directly.",
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error updating approval setting:', error);
      setApprovalEnabled(!enabled); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update workflow settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Workflow Settings</h2>
      <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

      <div className="space-y-1">
        {/* Proposal Approval Toggle */}
        <div className="flex items-start justify-between py-6 px-6 rounded-lg">
          <div className="flex-1 pr-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Proposal Approval
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Members will require approval from an Admin or Owner to change a proposal status from Draft to another status.
              Admins and Owners can change status directly without approval.
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[120px] justify-end">
            <span className="text-sm text-gray-500">
              {approvalEnabled ? 'Required' : 'Not Required'}
            </span>
            <Switch
              checked={approvalEnabled}
              onCheckedChange={handleToggleApproval}
              disabled={!hasEditPermission || isUpdating}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
