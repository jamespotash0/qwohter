import { useMemo } from "react";
import { PageContent } from "@/components/common/layout";
import { FileText } from "lucide-react";
import { useProposals } from "@/hooks/queries/useProposals";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";
import { filterMainVersionProposals } from "@/utils/analyticsCalculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tab components
import { AnalyticsOverviewTab } from "@/components/features/analytics/AnalyticsOverviewTab";
import { AnalyticsPipelineTab } from "@/components/features/analytics/AnalyticsPipelineTab";
import { AnalyticsTeamTab } from "@/components/features/analytics/AnalyticsTeamTab";
import { AnalyticsProductsTab } from "@/components/features/analytics/AnalyticsProductsTab";
import { AnalyticsSourcesTab } from "@/components/features/analytics/AnalyticsSourcesTab";

/**
 * Analytics Dashboard - Tabbed Performance Tracking
 *
 * Tabs:
 * - Overview: KPI cards, time-series charts, status breakdown
 * - Pipeline: Velocity metrics, time-to-win distribution, stale proposals
 * - Team: Proposals by team member
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AnalyticsOverviewTab proposals={mainVersionProposals} />
          </TabsContent>

          <TabsContent value="pipeline">
            <AnalyticsPipelineTab proposals={mainVersionProposals} />
          </TabsContent>

          <TabsContent value="team">
            <AnalyticsTeamTab proposals={mainVersionProposals} />
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
