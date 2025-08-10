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
  RadialLinearScale,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart,
  Target
} from 'lucide-react';
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
  Filler,
  RadialLinearScale
);

interface AnalyticsPageChartsProps {
  quotes: Quote[];
}

export const AnalyticsPageCharts: React.FC<AnalyticsPageChartsProps> = ({ quotes }) => {
  const chartData = useMemo(() => {
    const parseCurrency = (formatted: string | number): number => {
      if (typeof formatted === 'number') return formatted;
      return Number(formatted.toString().replace(/[^0-9.-]+/g, ''));
    };

    // Generate last 12 months data
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const yearAbbrev = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
      return {
        month: `${date.toLocaleDateString('en-US', { month: 'short' })} '${yearAbbrev}`,
        fullMonth: date.toLocaleDateString('en-US', { month: 'long' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      };
    });

    const monthlyData = months.map(({ month, monthIndex, year }) => {
      const monthQuotes = quotes.filter(q => {
        const quoteDate = new Date(q.created_at);
        return quoteDate.getMonth() === monthIndex && quoteDate.getFullYear() === year;
      });

      const wonQuotes = monthQuotes.filter(q => q.status === 'Won');
      const totalValue = wonQuotes.reduce((sum, q) => {
        const price = q.price_details?.total || q.price_details?.basePrice || q.price_details?.base_price || 0;
        return sum + parseCurrency(price);
      }, 0);

      return {
        month,
        count: monthQuotes.length,
        value: totalValue,
        won: wonQuotes.length,
        pending: monthQuotes.filter(q => q.status === 'Pending').length,
        rejected: monthQuotes.filter(q => q.status === 'Rejected').length
      };
    });

    // Status distribution
    const statusCounts = quotes.reduce((acc, quote) => {
      const status = quote.status || 'Draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Monthly Revenue (Won quotes only) vs Total Quoted Amounts
    const revenueVsQuotedData = months.map(({ month, monthIndex, year }) => {
      const monthQuotes = quotes.filter(q => {
        const quoteDate = new Date(q.created_at);
        return quoteDate.getMonth() === monthIndex && quoteDate.getFullYear() === year;
      });

      // Won quotes revenue (actual revenue)
      const wonQuotes = monthQuotes.filter(q => q.status === 'Won');
      const wonRevenue = wonQuotes.reduce((sum, q) => {
        const price = q.price_details?.total || q.price_details?.basePrice || q.price_details?.base_price || 0;
        return sum + parseCurrency(price);
      }, 0);

      // Total quoted amounts (potential revenue)
      const totalQuotedAmount = monthQuotes.reduce((sum, q) => {
        const price = q.price_details?.total || q.price_details?.basePrice || q.price_details?.base_price || 0;
        return sum + parseCurrency(price);
      }, 0);

      return {
        month,
        wonRevenue,
        totalQuotedAmount
      };
    });

    return { monthlyData, statusCounts, revenueVsQuotedData };
  }, [quotes]);

  // Advanced Chart Options
  const advancedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
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
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.12)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
          },
        },
      },
    },
  };


  // Quote Volume Multi-Bar Chart
  const volumeData = {
    labels: chartData.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Total Quotes',
        data: chartData.monthlyData.map(d => d.count),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Won Quotes',
        data: chartData.monthlyData.map(d => d.won),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Status Doughnut Chart
  const statusLabels = Object.keys(chartData.statusCounts);
  const statusValues = Object.values(chartData.statusCounts);
  const statusData = {
    labels: statusLabels,
    datasets: [
      {
        data: statusValues,
        backgroundColor: [
          'rgba(99, 102, 241, 0.9)',   // Primary
          'rgba(16, 185, 129, 0.9)',   // Green  
          'rgba(251, 146, 60, 0.9)',   // Orange
          'rgba(239, 68, 68, 0.9)',    // Red
          'rgba(156, 163, 175, 0.9)',  // Gray
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 8,
      },
    ],
  };


  // Dual Line Chart - Revenue vs Quoted Amounts
  const revenueVsQuotedData = {
    labels: chartData.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Revenue (Quotes Won)',
        data: chartData.revenueVsQuotedData.map(d => d.wonRevenue),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: (context: any) => {
          if (!context.chart.chartArea) {
            return;
          }
          const { ctx, chartArea: { top, bottom } } = context.chart;
          const gradient = ctx.createLinearGradient(0, top, 0, bottom);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Total Quoted Amount (Potential)',
        data: chartData.revenueVsQuotedData.map(d => d.totalQuotedAmount),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: (context: any) => {
          if (!context.chart.chartArea) {
            return;
          }
          const { ctx, chartArea: { top, bottom } } = context.chart;
          const gradient = ctx.createLinearGradient(0, top, 0, bottom);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          color: '#64748b',
          font: {
            size: 13,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      },
    },
  };

  // Stock Market Style Chart Options for Revenue Charts
  const stockMarketOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          color: '#64748b',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
          }
        }
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
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.12)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return `$${value.toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Volume */}
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quote Volume</h3>
                <p className="text-sm text-slate-600">Total vs Won quotes</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={volumeData} options={{
                ...advancedOptions,
                plugins: {
                  ...advancedOptions.plugins,
                  legend: {
                    display: true,
                    position: 'top' as const,
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                      color: '#64748b',
                      font: {
                        size: 12,
                      },
                    },
                  },
                },
              }} />
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quote Status</h3>
                <p className="text-sm text-slate-600">Current distribution</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={statusData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Quoted Amounts Comparison */}
      <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue vs Quoted Amount</h3>
              {/* <p className="text-sm text-slate-600">Revenue (Quotes Won) vs Potential Revenue (All Quotes)</p> */}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={revenueVsQuotedData} options={stockMarketOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPageCharts;