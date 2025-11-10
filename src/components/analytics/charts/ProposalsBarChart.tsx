/**
 * 📊 Proposals Bar Chart Component
 *
 * Bar chart showing proposal counts by status or period
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

export interface ProposalsBarChartProps {
  data: Array<{
    name: string;
    accepted: number;
    lost: number;
    pending: number;
  }>;
}

const COLORS = {
  accepted: '#10B981', // Green
  lost: '#EF4444', // Red
  pending: '#F59E0B', // Amber
};

export const ProposalsBarChart = ({ data }: ProposalsBarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#E5E7EB"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px' }}
          iconType="circle"
        />
        <Bar dataKey="accepted" fill={COLORS.accepted} name="Accepted" radius={[4, 4, 0, 0]} />
        <Bar dataKey="lost" fill={COLORS.lost} name="Lost" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pending" fill={COLORS.pending} name="Pending" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
