/**
 * Proposal Filler Page
 *
 * Wrapper page for the new Proposal Editor with Apple-level design.
 * In "filler" mode for entering proposal values (not structure definition).
 */

import { useParams } from 'react-router-dom';
import { ProposalEditor } from '@/features/proposals/components/ProposalEditor';

export default function ProposalFiller() {
  const { proposalId } = useParams<{ proposalId: string }>();

  // Pass mode='filler' to indicate this is for entering proposal data
  return <ProposalEditor proposalId={proposalId} mode="filler" />;
}
