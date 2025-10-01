import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContent, ContentCard } from "@/components/common/layout";
import {
  FileText,
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  TrendingUp,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuotesStore } from "@/stores/quotes/quotesStore";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Streamlined Dashboard using AppLayout
 *
 * This demonstrates the new unified approach:
 * - AppLayout handles authentication, layout, sidebar automatically
 * - ContentCard provides consistent card styling
 * - Focus only on dashboard-specific content
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);

  useOrganizations(); // Keep for side effects

  // Get current user for dashboard data
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getCurrentUser();
  }, []);

  const { profile } = useUserProfile(user?.id);

  // Initialize quotes store only once when user is available
  useEffect(() => {
    if (user?.id && !isInitialized) {
      console.log('🔑 Dashboard: User authenticated, initializing quotes store...');
      initialize();
    }
  }, [user?.id, isInitialized, initialize]);

  // Calculate stats
  const recentQuotes = quotes.slice(0, 5);

  return (
    <PageContent>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--content-header-text)]">
            Dashboard
          </h1>
          <p className="mt-2 text-base text-[var(--content-body-text)]">
            Welcome back, {profile?.full_name || user?.email || 'User'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-[var(--content-muted-text)]">Today</p>
            <p className="text-sm font-medium text-[var(--content-body-text)]">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
          <Button
            onClick={() => navigate('/quotes/new')}
            className="bg-[var(--content-button-primary-bg)] hover:bg-[var(--content-button-primary-hover)] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Quotes */}
        <div className="lg:col-span-2">
          <ContentCard title="Recent Quotes">
            <div className="space-y-4">
              {quotesLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-[var(--content-button-primary-bg)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[var(--content-muted-text)]">Loading quotes...</p>
                </div>
              ) : recentQuotes.length > 0 ? (
                <>
                  {recentQuotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--content-table-row-hover)] transition-colors group cursor-pointer border border-[var(--content-card-border)]"
                         onClick={() => navigate(`/quotes/edit/${quote.proposal_number}`)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--content-button-primary-bg)] bg-opacity-10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[var(--content-button-primary-bg)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--content-header-text)] group-hover:text-[var(--content-button-primary-bg)] transition-colors">
                            {quote.project_name || quote.quote_details?.project_name || 'Untitled Project'}
                          </p>
                          <p className="text-sm text-[var(--content-muted-text)]">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          quote.status === 'Draft'
                            ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                            : quote.status === 'Submitted'
                            ? 'bg-[var(--brand-primary)] bg-opacity-10 text-[var(--brand-primary)]'
                            : quote.status === 'Won'
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
                            : 'bg-[var(--text-muted)] bg-opacity-10 text-[var(--text-muted)]'
                        }`}>
                          {quote.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add more actions here
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-[var(--content-card-border)]">
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/quotes')}
                      className="w-full text-[var(--content-button-primary-bg)] hover:bg-[var(--content-button-primary-bg)] hover:bg-opacity-10"
                    >
                      View all quotes
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-[var(--content-muted-text)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--content-muted-text)] mb-4">No quotes yet</p>
                  <Button
                    onClick={() => navigate('/quotes/new')}
                    className="bg-[var(--content-button-primary-bg)] hover:bg-[var(--content-button-primary-hover)] text-white"
                  >
                    Create your first quote
                  </Button>
                </div>
              )}
            </div>
          </ContentCard>
        </div>

        {/* Quick Actions */}
        <div>
          <ContentCard title="Quick Actions">
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/quotes/new')}
                className="w-full bg-[var(--content-button-primary-bg)] hover:bg-[var(--content-button-primary-hover)] text-white justify-start h-12"
              >
                <Plus className="h-5 w-5 mr-3" />
                Create New Quote
              </Button>

              <Button
                onClick={() => navigate('/team')}
                className="w-full bg-[var(--content-button-secondary-bg)] hover:bg-[var(--content-button-secondary-hover)] text-[var(--content-body-text)] justify-start h-12 border-0"
              >
                <Users className="h-5 w-5 mr-3" />
                Manage Team
              </Button>

              <Button
                onClick={() => navigate('/analytics')}
                className="w-full bg-[var(--content-button-secondary-bg)] hover:bg-[var(--content-button-secondary-hover)] text-[var(--content-body-text)] justify-start h-12 border-0"
              >
                <TrendingUp className="h-5 w-5 mr-3" />
                View Analytics
              </Button>
            </div>
          </ContentCard>
        </div>
      </div>
    </PageContent>
  );
};

export default Dashboard;