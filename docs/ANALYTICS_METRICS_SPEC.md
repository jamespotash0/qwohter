# Analytics Metrics Specification

## Available Data from Quote Schema

### Quote Fields for Analytics:
- `status`: Draft, Submitted, Won, Rejected, Archived
- `created_at`: Quote creation timestamp
- `submitted_at`: When quote was sent to client
- `won_at`: When quote was accepted
- `rejected_at`: When quote was rejected/lost
- `closed_at`: Final closure timestamp
- `total_value`: Grand total of quote
- `subtotal`: Subtotal before tax
- `quote_source`: Where the lead came from
- `price_details.grand_total`: Detailed pricing
- `job_details`: Client and location info
- `wall_details`: Wall specifications

## Key Metrics to Track

### 1. Revenue Metrics
- **Total Revenue (Won)**: Sum of `total_value` for status='Won'
- **Revenue by Time Period**: Monthly/Weekly/Yearly breakdown
- **Revenue Growth**: Month-over-month % change
- **Average Quote Value**: Mean of all quote totals
- **Average Won Quote Value**: Mean of won quotes only

### 2. Conversion Metrics
- **Conversion Rate**: (Won / Submitted) × 100%
- **Win Rate**: Won quotes as % of total submitted
- **Loss Rate**: Rejected quotes as % of total submitted
- **Quotes Sent**: Count of submitted quotes
- **Quotes Won**: Count of won quotes
- **Quotes Rejected**: Count of rejected quotes

### 3. Quote Source Analytics
- **Quotes by Source**: Breakdown by `quote_source`
- **Revenue by Source**: Total revenue per source
- **Conversion Rate by Source**: Win rate per source
- **Top Performing Sources**: Ranked by conversion & revenue

### 4. Time-Based Metrics
- **Quotes per Month/Week**: Count of quotes created
- **Submission Rate**: Quotes submitted vs created
- **Time to Close**: Average days from submitted → won/rejected
- **Quote Velocity**: Quotes created per time period

### 5. Performance Indicators
- **Pipeline Value**: Total value of submitted quotes (not won/rejected yet)
- **Win Rate Trend**: Win rate over time
- **Average Days to Close**: Mean time from submit to decision
- **Quote Value Distribution**: Small/Medium/Large quote breakdown

## Dashboard Layout

### Top Row: KPI Cards (4 cards)
1. **Total Revenue** (This Month/Year)
   - Value: Sum of won quotes
   - Trend: % change vs last period
   - Icon: DollarSign (coral)

2. **Quotes Sent** (This Month/Year)
   - Value: Count of submitted quotes
   - Trend: % change vs last period
   - Icon: FileText (blue)

3. **Conversion Rate** (This Month/Year)
   - Value: Win rate %
   - Trend: % change vs last period
   - Icon: TrendingUp (green)

4. **Average Quote Value** (This Month/Year)
   - Value: Mean of all quotes
   - Trend: % change vs last period
   - Icon: Calculator (purple)

### Main Charts

#### Chart 1: Revenue Over Time
- **Type**: Area chart with gradient
- **Time Periods**: Monthly, Weekly, Yearly (toggle)
- **Metrics**: Revenue trend
- **Actions**: Export, Enlarge
- **Filter**: Date range

#### Chart 2: Quote Conversion Funnel
- **Type**: Bar chart (stacked)
- **Metrics**: Created → Submitted → Won/Rejected
- **Time Periods**: Monthly, Weekly, Yearly
- **Actions**: Export, Enlarge

#### Chart 3: Quote Source Performance
- **Type**: Donut chart + data table
- **Metrics**: Quotes by source, Revenue by source, Conversion by source
- **Actions**: Export, Enlarge
- **Filter**: Time period

#### Chart 4: Revenue vs Quote Count
- **Type**: Dual-axis line chart
- **Metrics**: Revenue (left axis), Quote count (right axis)
- **Time Periods**: Monthly, Weekly, Yearly
- **Actions**: Export, Enlarge

## Time Period Calculation

### Monthly View
- Current month data
- Compare to previous month
- Show 12-month trend

### Weekly View
- Current week data
- Compare to previous week
- Show 12-week trend

### Yearly View
- Current year data
- Compare to previous year
- Show multi-year trend

## Missing Data (To Add Later)
- **Time to Complete Quote**: Need to track when quote work started
- **Quote Edit History**: Track iterations/revisions
- **Client Response Time**: Time from submit to decision
- **Team Member Performance**: Per-user metrics
