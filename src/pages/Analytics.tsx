import { useMemo } from "react";
import { PageContent } from "@/components/common/layout";
import { FileText } from "lucide-react";
import { useProposals } from "@/hooks/queries/useProposals";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";
import { filterMainVersionProposals } from "@/utils/analyticsCalculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics";

// Tab components
import { AnalyticsOverviewTab } from "@/components/features/analytics/AnalyticsOverviewTab";
import { AnalyticsPipelineTab } from "@/components/features/analytics/AnalyticsPipelineTab";
import { AnalyticsProductsTab } from "@/components/features/analytics/AnalyticsProductsTab";
import { AnalyticsSourcesTab } from "@/components/features/analytics/AnalyticsSourcesTab";

/**
 * Analytics Dashboard - Tabbed Performance Tracking
 *
 * Tabs:
 * - Overview: KPI cards, time-series charts, status breakdown
 * - Pipeline: Velocity metrics, time-to-win distribution, stale proposals
 * - Products: Product type and model breakdown
 * - Sources: Source performance, category, project type, location, work classification
 */
const Analytics = () => {
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '');
  const { data: proposals = [], isLoading: proposalsLoading } = useProposals(currentOrganization?.id);

  const mainVersionProposals = useMemo(() => {
    return filterMainVersionProposals(proposals);
  }, [proposals]);

  return (
    <PageContent
      title="Analytics"
      subtitle="Comprehensive performance tracking and business insights"
      showPageHeader={true}
    >
      {proposalsLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#EE6C4D] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No proposals data available</p>
          <p className="text-sm text-gray-500">Create some proposals to see analytics</p>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full" onValueChange={(tab) => trackEvent('analytics_tab_viewed', { tab })}>
          <TabsList className="mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-gray-600 dark:text-gray-400 rounded-md px-4 py-1.5">Overview</TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-gray-600 dark:text-gray-400 rounded-md px-4 py-1.5">Pipeline</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-gray-600 dark:text-gray-400 rounded-md px-4 py-1.5">Products</TabsTrigger>
            <TabsTrigger value="sources" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-gray-600 dark:text-gray-400 rounded-md px-4 py-1.5">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AnalyticsOverviewTab proposals={mainVersionProposals} />
          </TabsContent>

          <TabsContent value="pipeline">
            <AnalyticsPipelineTab proposals={mainVersionProposals} />
          </TabsContent>

          <TabsContent value="products">
            <AnalyticsProductsTab proposals={mainVersionProposals} />
          </TabsContent>

          <TabsContent value="sources">
            <AnalyticsSourcesTab proposals={mainVersionProposals} />
          </TabsContent>
        </Tabs>
      )}
    </PageContent>
  );
};

export default Analytics;
