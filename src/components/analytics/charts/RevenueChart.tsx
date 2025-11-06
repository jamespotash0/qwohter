/**
 * 💰 Revenue Chart Component
 *
 * Line/Area chart showing revenue over time with coral (#EE6C4D) theme
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface RevenueChartProps {
  data: Array<{
    period: string;
    revenue: number;
    target?: number;
  }>;
  showTarget?: boolean;
}

export const RevenueChart = ({ data, showTarget = false }: RevenueChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EE6C4D" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#EE6C4D" stopOpacity={0} />
          </linearGradient>
          {showTarget && (
            <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#E5E7EB"
          vertical={false}
        />
        <XAxis
          dataKey="period"
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          tickLine={false}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px' }}
          iconType="circle"
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#EE6C4D"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          name="Revenue"
        />
        {showTarget && (
          <Area
            type="monotone"
            dataKey="target"
            stroke="#3B82F6"
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorTarget)"
            name="Target"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};
