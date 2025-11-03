# Analytics Database Strategy - Industry Analysis

## The Question
**Should we create a separate analytics aggregation table, or calculate everything on-the-fly?**

---

## Industry Comparison

### How Top Companies Handle Analytics

| Company | Approach | Why |
|---------|----------|-----|
| **Stripe** | Hybrid: Real-time + Daily snapshots | Fast historical queries, accurate current data |
| **Salesforce** | Snapshot tables + Materialized views | Billions of records, needs pre-aggregation |
| **HubSpot** | Rolling aggregations (daily/monthly) | Balance between speed and accuracy |
| **Metabase** | Query-time calculation | Smaller datasets, emphasis on flexibility |
| **Google Analytics** | Batch processing + Real-time layer | Massive scale requires pre-aggregation |

### Key Insight
**At scale (>100K quotes), everyone uses snapshots. Under that, it depends on complexity.**

---

## Our Situation Analysis

### Current Scale Estimate
- **Typical Usage**: 50-1000 quotes/month per organization
- **1 Year**: ~600-12,000 quotes per org
- **5 Years**: ~3,000-60,000 quotes per org

### Query Complexity
- **Simple**: Total revenue, quote count ✅ Fast
- **Medium**: Win rate by source, monthly trends ⚠️ Slower
- **Complex**: Multi-dimension segmentation, year-over-year comparisons 🔴 Slow

### Performance Benchmarks

**On-the-Fly Calculation:**
- **<1K quotes**: <100ms ✅ Excellent
- **1K-10K quotes**: 100-500ms ⚠️ Acceptable
- **10K-100K quotes**: 500ms-2s 🔴 Slow
- **>100K quotes**: >2s ❌ Poor UX

**With Aggregation Table:**
- **Any scale**: <100ms ✅ Excellent
- **Historical queries**: <50ms ✅ Excellent

---

## Recommendation: **Hybrid Approach** ⭐

### Why Hybrid?

1. **Current Period (This Month)**: Calculate on-the-fly
   - Always accurate
   - No sync lag
   - Simple implementation

2. **Historical Periods**: Use snapshots
   - Fast queries for trends
   - Accurate at time of snapshot
   - Enables year-over-year comparisons

3. **Transition**: Start without snapshots, add when needed
   - Build for scale
   - Don't over-engineer early
   - Easy to add later

---

## Implementation Strategy

### Phase 1: Start Simple (Now - Month 1-3)
**Calculate everything on-the-fly**

```typescript
// Current approach - keep this
const metrics = useMemo(() => {
  // Calculate from quotes array
  return calculateMetrics(quotes, dateRange);
}, [quotes, dateRange]);
```

**Pros:**
- Simple to build
- No sync issues
- Flexible for iteration

**When to use:**
- < 10K quotes per organization
- < 50 organizations
- Current period analytics

### Phase 2: Add Materialized Views (Month 3-6)
**Use PostgreSQL materialized views for complex queries**

```sql
CREATE MATERIALIZED VIEW analytics_monthly AS
SELECT
  organization_id,
  date_trunc('month', created_at) as month,
  COUNT(*) as total_quotes,
  COUNT(*) FILTER (WHERE status = 'Won') as won_quotes,
  SUM(total_value) FILTER (WHERE status = 'Won') as revenue
FROM quotes
WHERE is_main_version = true
GROUP BY organization_id, date_trunc('month', created_at);

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_monthly;
```

**Pros:**
- PostgreSQL handles it
- No new tables to manage
- Can refresh on schedule

**When to use:**
- 10K-50K quotes per organization
- Historical period queries slow
- Need month-over-month comparisons

### Phase 3: Snapshot Table (Month 6+)
**Create dedicated analytics aggregation table**

```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'

  -- Metrics (denormalized for speed)
  total_quotes INTEGER,
  won_quotes INTEGER,
  lost_quotes INTEGER,
  total_revenue NUMERIC(10,2),
  average_deal_size NUMERIC(10,2),
  win_rate NUMERIC(5,2),

  -- Segmented metrics (JSONB for flexibility)
  metrics_by_source JSONB, -- {"Website": {...}, "Referral": {...}}
  metrics_by_user JSONB,
  metrics_by_status JSONB,

  -- Metadata
  snapshot_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  snapshot_version INTEGER DEFAULT 1,

  UNIQUE(organization_id, period_start, period_type)
);

CREATE INDEX idx_analytics_org_period ON analytics_snapshots(organization_id, period_start);
```

**Background Job (runs daily at midnight):**
```typescript
// Cron job to create snapshots
async function createDailySnapshot(orgId: string, date: Date) {
  const quotes = await getQuotesForPeriod(orgId, date);
  const metrics = calculateAllMetrics(quotes);

  await supabase.from('analytics_snapshots').upsert({
    organization_id: orgId,
    period_start: startOfDay(date),
    period_end: endOfDay(date),
    period_type: 'daily',
    ...metrics
  });
}
```

**When to use:**
- >50K quotes per organization
- Need historical accuracy
- Complex multi-dimension analytics
- Year-over-year trends essential

---

## Cost-Benefit Analysis

### Without Snapshots (On-the-Fly)
**Development Time:** 2-3 weeks
**Maintenance:** Low
**Performance:** Good for current scale
**Scalability:** Limited to ~10K quotes
**Storage Cost:** $0 extra

### With Materialized Views
**Development Time:** +1 week
**Maintenance:** Low (PostgreSQL handles it)
**Performance:** Excellent
**Scalability:** Good to 50K quotes
**Storage Cost:** ~$5-10/month extra

### With Snapshot Table
**Development Time:** +2-3 weeks
**Maintenance:** Medium (cron job, backfills)
**Performance:** Excellent at any scale
**Scalability:** Unlimited
**Storage Cost:** ~$20-50/month extra

---

## My Recommendation

### Start Without Snapshots ✅

**Reasoning:**
1. Your current scale doesn't justify the complexity
2. Build the analytics UI first (more valuable)
3. Optimize when you have real performance data
4. Easy to add snapshots later without changing UI

### When to Add Snapshots

**Trigger Points:**
- Dashboard load time >2 seconds
- >10,000 quotes per organization
- Users requesting year-over-year reports
- Multi-organization comparison features

### Migration Path

```typescript
// Phase 1: On-the-fly (Now)
function getMetrics(dateRange) {
  const quotes = await fetchQuotes(dateRange);
  return calculateMetrics(quotes);
}

// Phase 2: Hybrid (Later)
function getMetrics(dateRange) {
  const isHistorical = dateRange.end < startOfCurrentMonth();

  if (isHistorical) {
    // Use snapshot table
    return await fetchSnapshotMetrics(dateRange);
  } else {
    // Calculate on-the-fly for current period
    const quotes = await fetchQuotes(dateRange);
    return calculateMetrics(quotes);
  }
}
```

**This is transparent to the UI - no changes needed!**

---

## What Other SaaS Companies Do

### By Company Size

**Startups (<100 customers):**
- On-the-fly calculation
- Example: Early Notion, Early Airtable

**Growth Stage (100-1000 customers):**
- Materialized views
- Example: Linear, Coda

**Enterprise (>1000 customers):**
- Full snapshot tables + data warehouse
- Example: Salesforce, HubSpot, Stripe

### By Data Volume

**<10K records/org:** On-the-fly
**10K-100K records/org:** Materialized views
**>100K records/org:** Snapshot tables
**>1M records/org:** Data warehouse (Snowflake, BigQuery)

---

## Decision Matrix

| Factor | On-the-Fly | Materialized Views | Snapshot Table |
|--------|------------|-------------------|----------------|
| **Development Time** | ✅ 2 weeks | ⚠️ 3 weeks | 🔴 5 weeks |
| **Maintenance** | ✅ Low | ✅ Low | ⚠️ Medium |
| **Current Performance** | ✅ Fast | ✅ Fast | ✅ Fast |
| **Future Performance** | 🔴 Degrades | ⚠️ Good | ✅ Excellent |
| **Flexibility** | ✅ High | ⚠️ Medium | 🔴 Low |
| **Historical Accuracy** | ✅ Perfect | ⚠️ Refresh lag | ✅ Point-in-time |
| **Storage Cost** | ✅ $0 | ⚠️ Low | 🔴 Medium |
| **Complexity** | ✅ Simple | ⚠️ Moderate | 🔴 Complex |

---

## Final Recommendation: Start Simple, Scale Later

### **Phase 1 (Now):** On-the-Fly Calculation
- Build all analytics features with current approach
- Add caching layer (5-minute TTL)
- Monitor performance metrics

### **Phase 2 (If Needed):** Add Materialized Views
- When queries >500ms consistently
- For historical period queries only
- PostgreSQL handles refresh

### **Phase 3 (If Needed):** Snapshot Table
- When >10K quotes per org
- For multi-year trend analysis
- Requires background job

---

## Monitoring Strategy

**Add these metrics to track when to optimize:**

```typescript
// Track query performance
const startTime = performance.now();
const metrics = await calculateMetrics(quotes);
const duration = performance.now() - startTime;

// Log slow queries
if (duration > 500) {
  console.warn('Slow analytics query', {
    duration,
    quoteCount: quotes.length,
    dateRange
  });
}

// Send to monitoring (optional)
analytics.track('Analytics Query Performance', {
  duration,
  quoteCount: quotes.length,
  cached: false
});
```

**Set alert thresholds:**
- Warning: P95 latency >500ms
- Error: P95 latency >1000ms
- Action: Consider materialized views/snapshots

---

## Conclusion

**For WallQu right now: Don't add snapshot table yet.**

**Rationale:**
1. Current scale doesn't justify complexity
2. Focus on analytics features, not infrastructure
3. Add performance layer when you have data proving it's needed
4. Migration path is straightforward

**Build the amazing analytics UI first, optimize infrastructure later when needed.** 🚀

This is what I'd do as a startup CTO, and what most successful SaaS companies did early on.

---

**Status**: Recommendation Complete
**Recommended Path**: Phase 1 → Monitor → Add Phase 2/3 only if needed
