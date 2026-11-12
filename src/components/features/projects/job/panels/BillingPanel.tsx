/**
 * Billing panel
 *
 * The last link: a job that has been sold, ordered, delivered and installed
 * becomes money owed.
 *
 * Two components rather than one because they answer different questions.
 * BillingHandoff asks whether a milestone has been earned — derived from the
 * same events as everything else, so "delivered" means product arrived rather
 * than a date passed. The payments section is the schedule itself, once it
 * exists.
 */

import { BillingHandoff } from '@/components/features/projects/BillingHandoff';
import { ProjectPaymentsSection } from '@/components/features/board/ProjectPaymentsSection';

interface BillingPanelProps {
  organizationId: string;
  projectId: string;
  /** Sell total, used as the default contract value on a new schedule. */
  contractDefault: number;
}

export function BillingPanel({
  organizationId,
  projectId,
  contractDefault,
}: BillingPanelProps) {
  return (
    <div className="space-y-5">
      <BillingHandoff organizationId={organizationId} projectId={projectId} />
      <ProjectPaymentsSection
        projectId={projectId}
        organizationId={organizationId}
        contractDefault={contractDefault}
      />
    </div>
  );
}
