/**
 * Variance Queue Page
 *
 * What a project manager opens in the morning. Every purchase order line a
 * manufacturer has not answered yet, and every line they answered at a price or
 * date other than the one ordered.
 *
 * The gap between ordered and acknowledged is where dealer margin quietly
 * disappears — a factory confirming at a higher price is routine, and catching
 * it before the invoice arrives is the point of the whole back office.
 */

import { useState } from 'react';
import { ArrowClockwise, Funnel } from '@phosphor-icons/react';
import { PageContent } from '@/components/common/layout';
import { Button } from '@/components/ui/button';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries';
import { useVarianceQueue } from '@/hooks/queries/useVarianceQueue';
import { VarianceSummaryCards } from '@/components/features/variance/VarianceSummaryCards';
import { VarianceTable } from '@/components/features/variance/VarianceTable';
import { RateDriftPanel } from '@/components/features/variance/RateDriftPanel';

export default function VarianceQueuePage() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id ?? '');
  const [includeMatched, setIncludeMatched] = useState(false);

  const { lines, summary, isLoading, error, refetch } = useVarianceQueue(
    organization?.id,
    includeMatched
  );

  return (
    <PageContent
      showPageHeader
      title="Acknowledgments"
      subtitle="Ordered lines awaiting a reply, or acknowledged at a different cost than you quoted"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant={includeMatched ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIncludeMatched(v => !v)}
          >
            <Funnel className="w-4 h-4 mr-1.5" />
            {includeMatched ? 'All lines' : 'Needs review'}
          </Button>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <ArrowClockwise className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <VarianceSummaryCards summary={summary} isLoading={isLoading} />

        {error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Could not load acknowledgments
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
              Try again
            </Button>
          </div>
        ) : (
          <VarianceTable lines={lines} isLoading={isLoading} />
        )}

        {!isLoading && !error && lines.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Unanswered lines first, then by size of the cost difference. A credit
            ranks alongside an overcharge — both are money moving unexpectedly.
          </p>
        )}

        {/* The systemic reading of the same data: not "this line is off" but
            "this series has been off all year, and every quote against it was
            wrong by the same amount". */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <RateDriftPanel organizationId={organization?.id} />
        </div>
      </div>
    </PageContent>
  );
}
