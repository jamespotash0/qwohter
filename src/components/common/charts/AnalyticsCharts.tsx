import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { Quote } from '@/hooks/useQuotes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface AnalyticsChartsProps {
  quotes: Quote[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ quotes }) => {
  const chartData = useMemo(() => {
    // Process quotes for analytics
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        fullMonth: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      };
    });

    const monthlyData = last6Months.map(({ month, monthIndex, year }) => {
      const monthQuotes = quotes.filter(q => {
        const quoteDate = new Date(q.created_at);
        return quoteDate.getMonth() === monthIndex && quoteDate.getFullYear() === year;
      });

      const totalValue = monthQuotes.reduce((sum, q) => {
        const price = q.price_details?.total || q.price_details?.basePrice || q.price_details?.base_price || 0;
        return sum + (typeof price === 'string' ? parseFloat(price) || 0 : price);
      }, 0);

      return {
        month,
        count: monthQuotes.length,
        value: totalValue
      };
    });

    // Status distribution
    const statusCounts = quotes.reduce((acc, quote) => {
      const status = quote.status || 'Draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Weekly activity (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toDateString()
      };
    });

    const weeklyData = last7Days.map(({ day, date }) => {
      const dayQuotes = quotes.filter(q => 
        new Date(q.created_at).toDateString() === date
      );
      return {
        day,
        count: dayQuotes.length
      };
    });

    return { monthlyData, statusCounts, weeklyData };
  }, [quotes]);

  // Line Chart - Monthly Quotes
  const monthlyQuotesData = {
    labels: chartData.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Quotes Created',
        data: chartData.monthlyData.map(d => d.count),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  // Bar Chart - Quote Values
  const monthlyValueData = {
    labels: chartData.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Quote Value ($)',
        data: chartData.monthlyData.map(d => d.value),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Doughnut Chart - Status Distribution
  const statusData = {
    labels: Object.keys(chartData.statusCounts),
    datasets: [
      {
        data: Object.values(chartData.statusCounts),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',   // Primary
          'rgba(34, 197, 94, 0.8)',    // Green
          'rgba(251, 146, 60, 0.8)',   // Orange
          'rgba(239, 68, 68, 0.8)',    // Red
          'rgba(156, 163, 175, 0.8)',  // Gray
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Weekly Quote Activity Bar Chart
  const weeklyActivityData = {
    labels: chartData.weeklyData.map(d => d.day),
    datasets: [
      {
        label: 'Daily Quote Activity',
        data: chartData.weeklyData.map(d => d.count),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          color: '#64748b',
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    cutout: '60%',
  };
//Dashboard Shown
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Quotes Trend */}
      <Card className="card-elevated hover:shadow-medium transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monthly Quote Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Line data={monthlyQuotesData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Quote Status Distribution */}
      <Card className="card-elevated hover:shadow-medium transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Quote Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Values */}
      <Card className="card-elevated hover:shadow-medium transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Monthly Quote Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={monthlyValueData} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                tooltip: {
                  ...chartOptions.plugins.tooltip,
                  callbacks: {
                    label: function(context) {
                      return `$${context.parsed.y.toLocaleString()}`;
                    }
                  }
                }
              }
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Quote Activity */}
      <Card className="card-elevated hover:shadow-medium transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Weekly Quote Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={weeklyActivityData} options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    stepSize: 1,
                    precision: 0,
                  },
                  beginAtZero: true,
                },
              },
            }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;