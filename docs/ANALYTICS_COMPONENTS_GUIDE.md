# Analytics Components Usage Guide

## 🎨 Custom Analytics UI Library

All components built to match your coral (#EE6C4D) brand theme with white backgrounds and clean design.

---

## ✅ Components Created

### 1. **KPICard** - Key Performance Indicator Cards
**Location**: `src/components/analytics/KPICard.tsx`

**Features:**
- Large metric display
- Icon with colored background
- Trend badge (up/down/neutral)
- Click-through functionality
- Hover effects

**Usage:**
```tsx
import { KPICard } from '@/components/analytics';
import { DollarSign } from 'lucide-react';

<KPICard
  title="Revenue This Month"
  value={`$${revenue.toLocaleString()}`}
  subtitle="Won quotes only"
  icon={DollarSign}
  iconColor="orange"  // Uses your coral color
  trend={{
    value: 12.5,
    direction: 'up',
    label: 'vs last month'
  }}
  onClick={() => console.log('Show details')}
/>
```

**Icon Colors:**
- `orange` - Coral #EE6C4D (your brand) - Use for revenue/primary metrics
- `blue` - #3B82F6 - Use for quote counts/info
- `green` - #10B981 - Use for growth/success metrics
- `purple` - #8B5CF6 - Use for secondary metrics
- `gray` - Neutral - Use for less important metrics

---

### 2. **TrendBadge** - Percentage Change Indicators
**Location**: `src/components/analytics/TrendBadge.tsx`

**Features:**
- Up/down/neutral arrows
- Percentage display
- Optional label
- Color-coded (green/red/gray)

**Usage:**
```tsx
import { TrendBadge } from '@/components/analytics';

<TrendBadge
  value={12.5}
  direction="up"
  label="vs last month"
  size="md"
/>
```

---

### 3. **ChartCard** - Chart Container
**Location**: `src/components/analytics/ChartCard.tsx`

**Features:**
- Title and subtitle
- Expand button
- Export button
- White background with clean styling

**Usage:**
```tsx
import { ChartCard, RevenueChart } from '@/components/analytics';

<ChartCard
  title="Revenue Over Time"
  subtitle="Monthly revenue for current year"
  onExpand={() => setExpandedChart('revenue')}
  onExport={() => exportChart('revenue')}
  height="h-80"
>
  <RevenueChart data={revenueData} />
</ChartCard>
```

---

### 4. **DateRangePicker** - Date Range Selection
**Location**: `src/components/analytics/DateRangePicker.tsx`

**Features:**
- Quick presets (Today, Last 7 days, This Month, etc.)
- Custom date range picker
- Two-month calendar view

**Usage:**
```tsx
import { DateRangePicker } from '@/components/analytics';
import { useState } from 'react';

const [dateRange, setDateRange] = useState({
  from: new Date(),
  to: new Date()
});

<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
/>
```

**Available Presets:**
- Today
- Last 7 days
- Last 30 days
- This Month
- Last Month
- This Year

---

### 5. **RevenueChart** - Area Chart
**Location**: `src/components/analytics/charts/RevenueChart.tsx`

**Features:**
- Area chart with coral gradient
- Optional target line
- Formatted currency tooltips
- Responsive

**Usage:**
```tsx
import { RevenueChart } from '@/components/analytics';

const revenueData = [
  { period: 'Jan', revenue: 45000, target: 50000 },
  { period: 'Feb', revenue: 52000, target: 50000 },
  { period: 'Mar', revenue: 48000, target: 50000 },
];

<RevenueChart
  data={revenueData}
  showTarget={true}
/>
```

---

### 6. **QuotesBarChart** - Stacked Bar Chart
**Location**: `src/components/analytics/charts/QuotesBarChart.tsx`

**Features:**
- Won/Lost/Pending bars
- Color-coded (green/red/amber)
- Responsive

**Usage:**
```tsx
import { QuotesBarChart } from '@/components/analytics';

const quotesData = [
  { name: 'Jan', won: 12, lost: 3, pending: 8 },
  { name: 'Feb', won: 15, lost: 2, pending: 6 },
  { name: 'Mar', won: 10, lost: 5, pending: 10 },
];

<QuotesBarChart data={quotesData} />
```

---

### 7. **SourcePieChart** - Donut Chart
**Location**: `src/components/analytics/charts/SourcePieChart.tsx`

**Features:**
- Donut chart
- Multiple colors (coral first)
- Percentage labels
- Legend

**Usage:**
```tsx
import { SourcePieChart } from '@/components/analytics';

const sourceData = [
  { name: 'Website', value: 45 },
  { name: 'Referral', value: 30 },
  { name: 'Direct', value: 25 },
];

<SourcePieChart data={sourceData} />
```

---

## 🎨 Color Scheme

**Your Brand Colors:**
- **Primary/Coral**: `#EE6C4D` - Use for revenue, main CTAs, primary metrics
- **Success/Green**: `#10B981` - Use for wins, growth, positive trends
- **Info/Blue**: `#3B82F6` - Use for counts, neutral info
- **Warning/Amber**: `#F59E0B` - Use for pending, caution
- **Danger/Red**: `#EF4444` - Use for losses, negative trends

**Backgrounds:**
- **White**: `#FFFFFF` - Cards, main areas
- **Light Gray**: `#F9FAFB` - Subtle backgrounds
- **Borders**: `#E5E7EB` - Light gray borders

---

## 📊 Complete Analytics Page Example

```tsx
import { useState } from 'react';
import {
  KPICard,
  ChartCard,
  DateRangePicker,
  RevenueChart,
  QuotesBarChart,
  SourcePieChart,
} from '@/components/analytics';
import { DollarSign, TrendingUp, FileText, Target } from 'lucide-react';

export const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date(),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header with Date Picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Track your business performance</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value="$456,789"
          subtitle="Won quotes"
          icon={DollarSign}
          iconColor="orange"
          trend={{ value: 12.5, direction: 'up', label: 'vs last month' }}
        />
        <KPICard
          title="Win Rate"
          value="68.5%"
          subtitle="Conversion rate"
          icon={Target}
          iconColor="green"
          trend={{ value: 4.2, direction: 'up' }}
        />
        <KPICard
          title="Total Quotes"
          value="142"
          subtitle="This month"
          icon={FileText}
          iconColor="blue"
          trend={{ value: 8.1, direction: 'up' }}
        />
        <KPICard
          title="Avg Deal Size"
          value="$12,450"
          subtitle="Per won quote"
          icon={TrendingUp}
          iconColor="purple"
          trend={{ value: 2.3, direction: 'down' }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Over Time"
          subtitle="Monthly revenue trend"
        >
          <RevenueChart data={revenueData} showTarget />
        </ChartCard>

        <ChartCard
          title="Quote Status"
          subtitle="Won, lost, and pending"
        >
          <QuotesBarChart data={quotesData} />
        </ChartCard>

        <ChartCard
          title="Quote Sources"
          subtitle="Where quotes come from"
        >
          <SourcePieChart data={sourceData} />
        </ChartCard>
      </div>
    </div>
  );
};
```

---

## 🚀 Next Steps

### 1. Install Missing Dependencies
```bash
npm install date-fns  # For date formatting
```

### 2. Import and Use
All components are exported from `@/components/analytics`:
```tsx
import {
  KPICard,
  TrendBadge,
  ChartCard,
  DateRangePicker,
  RevenueChart,
  QuotesBarChart,
  SourcePieChart,
} from '@/components/analytics';
```

### 3. Replace Current Analytics
Update your Analytics.tsx page to use these components instead of the current implementation.

---

## 🎯 Benefits

✅ **Matches Your Brand** - Coral (#EE6C4D) theme throughout
✅ **Consistent Design** - All components follow same style
✅ **Reusable** - Use across multiple pages
✅ **Type-Safe** - Full TypeScript support
✅ **Responsive** - Works on all screen sizes
✅ **Customizable** - Easy to modify colors/spacing
✅ **Professional** - Industry-standard analytics look

---

## 📦 Files Created

```
src/components/analytics/
├── index.ts                    # Barrel export
├── KPICard.tsx                # Metric card component
├── TrendBadge.tsx             # Trend indicator
├── ChartCard.tsx              # Chart container
├── DateRangePicker.tsx        # Date range selector
└── charts/
    ├── RevenueChart.tsx       # Area chart
    ├── QuotesBarChart.tsx     # Bar chart
    └── SourcePieChart.tsx     # Donut chart
```

---

**Status**: ✅ Complete and Ready to Use
**Theme**: Coral (#EE6C4D) with white backgrounds
**Next**: Update Analytics.tsx to use these components
