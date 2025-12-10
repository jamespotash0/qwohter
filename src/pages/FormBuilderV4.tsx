/**
 * Form Builder V4 Page
 *
 * Wrapper page for the new Proposal Editor with Apple-level design.
 * In "builder" mode for defining form structure (not data entry).
 */

import { useParams } from 'react-router-dom';
import { ProposalEditor } from '@/features/proposals/components/ProposalEditor';

export default function FormBuilderV4() {
  const { id } = useParams<{ id?: string }>();

  // Pass mode='builder' to indicate this is for defining form structure
  return <ProposalEditor formId={id} mode="builder" />;
}
