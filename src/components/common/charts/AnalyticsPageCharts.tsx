import React, { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  BarChart3, 
  PieChart,
  Target,
  Maximize2
} from 'lucide-react';
import { Quote } from '@/hooks/useQuotes';
import { Organization } from '@/hooks/useOrganizations';

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
  organization?: Organization | null;
}

export const AnalyticsPageCharts: React.FC<AnalyticsPageChartsProps> = ({ quotes, organization }) => {
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const ExpandButton = ({ chartId, className = "" }: { chartId: string; className?: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setExpandedChart(chartId)}
      className={`absolute top-3 right-3 h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity ${className}`}
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
  );
  const chartData = useMemo(() => {
    const parseCurrency = (formatted: string | number): number => {
      if (typeof formatted === 'number') return formatted;
      return Number(formatted.toString().replace(/[^0-9.-]+/g, ''));
    };

    // Generate a full year of months starting from organization creation
    const orgCreationDate = organization ? new Date(organization.created_at) : new Date();
    
    // Start from organization creation month and show 12 months forward
    const startDate = new Date(orgCreationDate.getFullYear(), orgCreationDate.getMonth(), 1);
    
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i);
      
      const yearAbbrev = date.getFullYear().toString().slice(-2);
      return {
        month: `${date.toLocaleDateString('en-US', { month: 'short' })} '${yearAbbrev}`,
        fullMonth: date.toLocaleDateString('en-US', { month: 'long' }),
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      };
    });

    // Pre-process quotes with parsed dates for better performance
    const quotesWithDates = quotes.map(q => ({
      ...q,
      parsedDate: new Date(q.created_at),
      parsedPrice: parseCurrency(q.price_details?.final_selling_price || 0)
    }));

    const monthlyData = months.map(({ month, monthIndex, year }) => {
      const monthQuotes = quotesWithDates.filter(q => 
        q.parsedDate.getMonth() === monthIndex && q.parsedDate.getFullYear() === year
      );

      let wonCount = 0, pendingCount = 0, rejectedCount = 0, totalValue = 0;
      
      // Single loop for all calculations
      monthQuotes.forEach(q => {
        switch (q.status) {
          case 'Won':
            wonCount++;
            totalValue += q.parsedPrice;
            break;
          case 'Pending':
            pendingCount++;
            break;
          case 'Rejected':
            rejectedCount++;
            break;
        }
      });

      return {
        month,
        count: monthQuotes.length,
        value: totalValue,
        won: wonCount,
        pending: pendingCount,
        rejected: rejectedCount
      };
    });

    // Status distribution
    const statusCounts = quotes.reduce((acc, quote) => {
      const status = quote.status || 'Draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Monthly Revenue (Won quotes only) vs Total Quoted Amounts (Optimized)
    const revenueVsQuotedData = months.map(({ month, monthIndex, year }) => {
      const monthQuotes = quotesWithDates.filter(q => 
        q.parsedDate.getMonth() === monthIndex && q.parsedDate.getFullYear() === year
      );

      let wonRevenue = 0, totalQuotedAmount = 0;
      
      // Single loop for both calculations
      monthQuotes.forEach(q => {
        totalQuotedAmount += q.parsedPrice;
        if (q.status === 'Won') {
          wonRevenue += q.parsedPrice;
        }
      });

      return {
        month,
        wonRevenue,
        totalQuotedAmount
      };
    });

    return { monthlyData, statusCounts, revenueVsQuotedData };
  }, [quotes, organization]);

  // Professional Chart Options
  const professionalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.4)',
        borderWidth: 2,
        cornerRadius: 16,
        displayColors: true,
        padding: 16,
        titleFont: {
          size: 15,
          weight: 'bold' as const,
          family: "'Inter', sans-serif",
        },
        bodyFont: {
          size: 14,
          family: "'Inter', sans-serif",
        },
        titleSpacing: 8,
        bodySpacing: 6,
        usePointStyle: true,
        boxPadding: 8,
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
            size: 13,
            weight: 500,
            family: "'Inter', sans-serif",
          },
          padding: 8,
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.08)',
          drawBorder: false,
          lineWidth: 1,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 13,
            weight: 500,
            family: "'Inter', sans-serif",
          },
          padding: 12,
        },
      },
    },
  };


  // Professional Quote Volume Chart Data
  const volumeData = useMemo(() => ({
    labels: chartData.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Total Quotes',
        data: chartData.monthlyData.map(d => d.count),
        backgroundColor: 'rgba(34, 197, 94, 0.85)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 0,
        borderRadius: {
          topLeft: 6,
          topRight: 6,
          bottomLeft: 2,
          bottomRight: 2,
        },
        borderSkipped: false,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(34, 197, 94, 0.2)',
      },
      {
        label: 'Won Quotes',
        data: chartData.monthlyData.map(d => d.won),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 0,
        borderRadius: {
          topLeft: 6,
          topRight: 6,
          bottomLeft: 2,
          bottomRight: 2,
        },
        borderSkipped: false,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(59, 130, 246, 0.2)',
      },
    ],
  }), [chartData.monthlyData]);

  // Professional Status Doughnut Chart
  const statusData = useMemo(() => {
    const statusLabels = Object.keys(chartData.statusCounts);
    const statusValues = Object.values(chartData.statusCounts);
    return {
      labels: statusLabels,
      datasets: [
        {
          data: statusValues,
          backgroundColor: [
            'rgba(99, 102, 241, 0.92)',   // Indigo - Pending
            'rgba(34, 197, 94, 0.92)',    // Green - Won  
            'rgba(245, 101, 101, 0.92)',  // Red - Rejected
            'rgba(251, 146, 60, 0.92)',   // Orange - Draft
            'rgba(156, 163, 175, 0.92)',  // Gray - Other
          ],
          borderColor: [
            'rgba(99, 102, 241, 0.1)',
            'rgba(34, 197, 94, 0.1)',
            'rgba(245, 101, 101, 0.1)',
            'rgba(251, 146, 60, 0.1)',
            'rgba(156, 163, 175, 0.1)',
          ],
          borderWidth: 8,
          hoverBorderWidth: 12,
          hoverOffset: 12,
          hoverBorderColor: [
            'rgba(99, 102, 241, 0.3)',
            'rgba(34, 197, 94, 0.3)',
            'rgba(245, 101, 101, 0.3)',
            'rgba(251, 146, 60, 0.3)',
            'rgba(156, 163, 175, 0.3)',
          ],
          spacing: 2,
        },
      ],
    };
  }, [chartData.statusCounts]);



  // Professional Revenue Line Chart
  const revenueVsQuotedData = useMemo(() => ({
    labels: chartData.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Revenue (Quotes Won)',
        data: chartData.revenueVsQuotedData.map(d => d.wonRevenue),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        borderWidth: 4,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 4,
        pointHoverBackgroundColor: 'rgb(34, 197, 94)',
        pointHoverBorderColor: '#ffffff',
        segment: {
          borderDash: (ctx: any) => 
            ctx.p0.parsed.y === 0 && ctx.p1.parsed.y === 0 ? [5, 5] : undefined,
        },
      },
      {
        label: 'Total Quoted Amount (Potential)',
        data: chartData.revenueVsQuotedData.map(d => d.totalQuotedAmount),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.06)',
        borderWidth: 4,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 10,
        pointHoverBorderWidth: 4,
        pointHoverBackgroundColor: 'rgb(99, 102, 241)',
        pointHoverBorderColor: '#ffffff',
        segment: {
          borderDash: (ctx: any) => 
            ctx.p0.parsed.y === 0 && ctx.p1.parsed.y === 0 ? [5, 5] : undefined,
        },
      },
    ],
  }), [chartData.monthlyData, chartData.revenueVsQuotedData]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    layout: {
      padding: 8,
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1200,
      easing: 'easeInOutCubic' as const,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 24,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#475569',
          font: {
            size: 14,
            weight: 500,
            family: "'Inter', sans-serif",
          },
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(99, 102, 241, 0.4)',
        borderWidth: 2,
        cornerRadius: 16,
        padding: 16,
        titleFont: {
          size: 15,
          weight: 'bold' as const,
          family: "'Inter', sans-serif",
        },
        bodyFont: {
          size: 14,
          family: "'Inter', sans-serif",
        },
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

  // Stock Market Style Chart Options for Revenue Charts (Memoized)
  const stockMarketOptions = useMemo(() => ({
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
  }), []);

  return (
    <div className="space-y-8">
      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Volume */}
        <Card className="relative bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 group">
          <ExpandButton chartId="volume" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quote Volume</h3>
                <p className="text-sm text-slate-600">Total vs Won quotes by month</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={volumeData} options={{
                ...professionalOptions,
                plugins: {
                  ...professionalOptions.plugins,
                  legend: {
                    display: true,
                    position: 'top' as const,
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                      color: '#475569',
                      font: {
                        size: 14,
                        weight: 500,
                        family: "'Inter', sans-serif",
                      },
                    },
                  },
                },
                scales: {
                  ...professionalOptions.scales,
                  y: {
                    ...professionalOptions.scales?.y,
                    ticks: {
                      ...professionalOptions.scales?.y?.ticks,
                      stepSize: 1,
                      callback: function(value: any) {
                        if (Number.isInteger(value)) {
                          return value;
                        }
                        return null;
                      },
                    },
                  },
                },
              }} />
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="relative bg-gradient-to-br from-purple-50 to-white border-purple-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 group">
          <ExpandButton chartId="status" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quote Status</h3>
                <p className="text-sm text-slate-600">Distribution breakdown</p>
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
      <Card className="relative bg-gradient-to-br from-indigo-50 to-white border-indigo-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 group">
        <ExpandButton chartId="revenue" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue vs Quoted Amount</h3>
              <p className="text-sm text-slate-600">Actual revenue vs potential over time</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={revenueVsQuotedData} options={stockMarketOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Expanded Chart Modal */}
      <Dialog open={expandedChart !== null} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold">
              {expandedChart === 'volume' && 'Quote Volume Analysis'}
              {expandedChart === 'status' && 'Quote Status Distribution'}
              {expandedChart === 'revenue' && 'Revenue vs Quoted Amount Trends'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            {expandedChart === 'volume' && (
              <div className="h-[70vh]">
                <Bar data={volumeData} options={{
                  ...professionalOptions,
                  plugins: {
                    ...professionalOptions.plugins,
                    legend: {
                      display: true,
                      position: 'top' as const,
                      labels: {
                        padding: 24,
                        usePointStyle: true,
                        color: '#475569',
                        font: {
                          size: 16,
                          weight: 500,
                          family: "'Inter', sans-serif",
                        },
                      },
                    },
                  },
                  scales: {
                    ...professionalOptions.scales,
                    y: {
                      ...professionalOptions.scales?.y,
                      ticks: {
                        ...professionalOptions.scales?.y?.ticks,
                        stepSize: 1,
                        callback: function(value: any) {
                          if (Number.isInteger(value)) {
                            return value;
                          }
                          return null;
                        },
                      },
                    },
                  },
                }} />
              </div>
            )}
            
            {expandedChart === 'status' && (
              <div className="h-[70vh] flex items-center justify-center">
                <div className="w-[500px] h-[500px]">
                  <Doughnut data={statusData} options={{
                    ...doughnutOptions,
                    plugins: {
                      ...doughnutOptions.plugins,
                      legend: {
                        position: 'right' as const,
                        labels: {
                          padding: 24,
                          usePointStyle: true,
                          pointStyle: 'circle',
                          color: '#475569',
                          font: {
                            size: 16,
                            weight: 500,
                            family: "'Inter', sans-serif",
                          },
                          boxWidth: 16,
                          boxHeight: 16,
                        },
                      },
                    },
                  }} />
                </div>
              </div>
            )}
            
            {expandedChart === 'revenue' && (
              <div className="h-[70vh]">
                <Line data={revenueVsQuotedData} options={{
                  ...stockMarketOptions,
                  plugins: {
                    ...stockMarketOptions.plugins,
                    legend: {
                      position: 'top' as const,
                      labels: {
                        padding: 24,
                        usePointStyle: true,
                        color: '#475569',
                        font: {
                          size: 16,
                          weight: 500,
                          family: "'Inter', sans-serif",
                        },
                      },
                    },
                  },
                }} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsPageCharts;