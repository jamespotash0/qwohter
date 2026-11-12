/**
 * Order deep link
 *
 * An order no longer has a page of its own. It is a part of a job, and the job
 * page shows it — so a link to /orders/:id resolves to the job that order
 * belongs to, with that order selected.
 *
 * This exists because those links are already in the wild: notification
 * emails, the orders list, and anything anybody has bookmarked. Breaking them
 * to make a structural change is a cost paid by the person who followed the
 * link, not by the person who made the change.
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/backoffice';
import { useSalesOrder } from '@/hooks/queries/useSalesOrders';

export default function OrderRedirectPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useSalesOrder(orderId);
  const projectId = order?.project_id ?? null;

  useEffect(() => {
    if (!projectId || !orderId) return;
    navigate(`/projects/${projectId}?order=${orderId}`, { replace: true });
  }, [projectId, orderId, navigate]);

  if (isLoading || projectId) {
    return (
      <PageContent>
        <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </PageContent>
    );
  }

  // An order with no project cannot be shown, because the job page is the only
  // thing that knows how to show one.
  return (
    <PageContent showPageHeader title="Order not found">
      <EmptyState
        title="That order is not on a job"
        description="It may have been deleted, or it belongs to an organization you are not a member of."
        action={<Button onClick={() => navigate('/project-board')}>Back to jobs</Button>}
      />
    </PageContent>
  );
}
