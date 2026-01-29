/**
 * Shared constants for analytics chart components.
 */

export const CHART_COLORS = {
  primary: '#EE6C4D',
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  orange: '#F97316',
  teal: '#14B8A6',
};

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'white',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '12px',
};

export const TOOLTIP_LABEL_STYLE = {
  fontWeight: 'bold' as const,
  marginBottom: '8px',
};

export const PIE_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.orange,
  CHART_COLORS.teal,
  CHART_COLORS.primary,
];

export const MODEL_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.orange,
  CHART_COLORS.teal,
  CHART_COLORS.primary,
  '#F59E0B',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
];

export const PRODUCT_TYPE_COLORS: Record<string, string> = {
  'Operable Wall': CHART_COLORS.blue,
  'Glass Wall': CHART_COLORS.green,
  'Accordion Partition': CHART_COLORS.purple,
};

/**
 * Create a monthly tooltip label formatter for charts that have fullDate in payload.
 */
export const createMonthlyLabelFormatter = (timePeriod: string) =>
  (label: string, payload: any[]) => {
    if (timePeriod === 'monthly' && payload && payload[0]?.payload?.fullDate) {
      const fullDate = payload[0].payload.fullDate;
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(fullDate));
    }
    return label;
  };
