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
  Maximize2,
  TrendingUp
} from 'lucide-react';
import { Quote } from '@/stores/quotes/quotesStore';
import { Organization } from '@/services/organizationService';
import { groupQuotesByVersion } from '@/utils/quoteVersionGrouping';

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
  viewMode?: 'monthly' | 'annual';
}

export const AnalyticsPageCharts: React.FC<AnalyticsPageChartsProps> = ({ quotes, organization, viewMode = 'monthly' }) => {
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate time periods based on viewMode
    let periods: Array<{ month: string; fullMonth?: string; monthIndex?: number; year?: number; weekStart?: number; weekEnd?: number }>;

    if (viewMode === 'annual') {
      // Generate 12 months for current year
      periods = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentYear, i, 1);
        const yearAbbrev = date.getFullYear().toString().slice(-2);
        return {
          month: `${date.toLocaleDateString('en-US', { month: 'short' })} '${yearAbbrev}`,
          fullMonth: date.toLocaleDateString('en-US', { month: 'long' }),
          monthIndex: date.getMonth(),
          year: date.getFullYear()
        };
      });
    } else {
      // Generate weeks for current month based on calendar weeks
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

      const weeks: Array<{ start: number; end: number }> = [];
      let currentStart = 1;

      while (currentStart <= endOfMonth.getDate()) {
        const currentEnd = Math.min(currentStart + 6, endOfMonth.getDate());
        weeks.push({ start: currentStart, end: currentEnd });
        currentStart = currentEnd + 1;
      }

      periods = weeks.map(({ start, end }, index) => {
        const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'short' });

        // Format: "Week 1 (Oct 1-7)"
        const weekLabel = `Week ${index + 1} (${monthName} ${start}-${end})`;

        return {
          month: weekLabel,
          weekStart: start,
          weekEnd: end,
          monthIndex: currentMonth,
          year: currentYear
        };
      });
    }

    const months = periods;

    // Group quotes by version to avoid double-counting
    const quoteGroups = groupQuotesByVersion(quotes);

    // Pre-process quote groups - use latest version for display/metrics
    // For charts, we want to count each group once using its representative version
    const quotesWithDates = quoteGroups.map(group => {
      // Use won version if exists, otherwise use base version
      const wonVersion = group.versions.find(v => v.status === 'Won');
      const baseVersion = group.versions.find(v => !v.proposal_number.includes('.'));
      const representativeQuote = wonVersion || group.latestVersion;

      return {
        ...representativeQuote,
        parsedDate: new Date(baseVersion?.created_at || representativeQuote.created_at),
        parsedPrice: parseCurrency(representativeQuote.price_details?.final_selling_price || 0),
        _group: group // Keep reference to group for advanced metrics
      };
    });

    const monthlyData = months.map((period) => {
      const { month, monthIndex, year, weekStart, weekEnd } = period;

      const monthQuotes = quotesWithDates.filter(q => {
        if (viewMode === 'annual') {
          return q.parsedDate.getMonth() === monthIndex && q.parsedDate.getFullYear() === year;
        } else {
          // Monthly view with weeks
          const day = q.parsedDate.getDate();
          return q.parsedDate.getMonth() === monthIndex &&
                 q.parsedDate.getFullYear() === year &&
                 day >= (weekStart || 1) &&
                 day <= (weekEnd || 31);
        }
      });

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
    const revenueVsQuotedData = months.map((period) => {
      const { month, monthIndex, year, weekStart, weekEnd } = period;

      const monthQuotes = quotesWithDates.filter(q => {
        if (viewMode === 'annual') {
          return q.parsedDate.getMonth() === monthIndex && q.parsedDate.getFullYear() === year;
        } else {
          // Monthly view with weeks
          const day = q.parsedDate.getDate();
          return q.parsedDate.getMonth() === monthIndex &&
                 q.parsedDate.getFullYear() === year &&
                 day >= (weekStart || 1) &&
                 day <= (weekEnd || 31);
        }
      });

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

    // Revenue by Wall System Type
    const revenueByWallSystem: Record<string, number> = {};
    quotesWithDates.forEach(q => {
      if (q.status === 'Won' && q.wall_details?.walls) {
        // Get all wall system types from walls object
        Object.values(q.wall_details.walls).forEach((wall: any) => {
          const wallType = wall.wallSystemType || 'Unknown';
          revenueByWallSystem[wallType] = (revenueByWallSystem[wallType] || 0) + q.parsedPrice;
        });
      }
    });

    // Quotes by Wall System Type
    const quotesByWallSystem: Record<string, number> = {};
    quotesWithDates.forEach(q => {
      if (q.wall_details?.walls) {
        // Get all wall system types from walls object
        Object.values(q.wall_details.walls).forEach((wall: any) => {
          const wallType = wall.wallSystemType || 'Unknown';
          quotesByWallSystem[wallType] = (quotesByWallSystem[wallType] || 0) + 1;
        });
      }
    });

    // Lead Source Distribution
    const leadSourceCounts: Record<string, number> = {};
    quotesWithDates.forEach(q => {
      const source = q.quote_source || 'Unknown';
      leadSourceCounts[source] = (leadSourceCounts[source] || 0) + 1;
    });

    // Lead Source Revenue
    const leadSourceRevenue: Record<string, number> = {};
    quotesWithDates.forEach(q => {
      if (q.status === 'Won') {
        const source = q.quote_source || 'Unknown';
        leadSourceRevenue[source] = (leadSourceRevenue[source] || 0) + q.parsedPrice;
      }
    });

    // Won vs Lost over time
    const wonLostData = months.map((period) => {
      const { month, monthIndex, year, weekStart, weekEnd } = period;

      const periodQuotes = quotesWithDates.filter(q => {
        if (viewMode === 'annual') {
          return q.parsedDate.getMonth() === monthIndex && q.parsedDate.getFullYear() === year;
        } else {
          const day = q.parsedDate.getDate();
          return q.parsedDate.getMonth() === monthIndex &&
                 q.parsedDate.getFullYear() === year &&
                 day >= (weekStart || 1) &&
                 day <= (weekEnd || 31);
        }
      });

      const won = periodQuotes.filter(q => q.status === 'Won').length;
      const lost = periodQuotes.filter(q => q.status === 'Rejected').length;
      const winRate = (won + lost) > 0 ? ((won / (won + lost)) * 100) : 0;

      return { month, won, lost, winRate };
    });

    // Revenue by User
    const revenueByUser: Record<string, number> = {};
    quotesWithDates.forEach(q => {
      if (q.status === 'Won') {
        const userName = q.created_by_name || 'Unknown';
        revenueByUser[userName] = (revenueByUser[userName] || 0) + q.parsedPrice;
      }
    });

    // Average Quote Value over time
    const avgQuoteValueData = months.map((period) => {
      const { month, monthIndex, year, weekStart, weekEnd } = period;

      const periodQuotes = quotesWithDates.filter(q => {
        if (viewMode === 'annual') {
          return q.parsedDate.getMonth() === monthIndex && q.parsedDate.getFullYear() === year;
        } else {
          const day = q.parsedDate.getDate();
          return q.parsedDate.getMonth() === monthIndex &&
                 q.parsedDate.getFullYear() === year &&
                 day >= (weekStart || 1) &&
                 day <= (weekEnd || 31);
        }
      });

      const wonQuotes = periodQuotes.filter(q => q.status === 'Won');
      const avgValue = wonQuotes.length > 0
        ? wonQuotes.reduce((sum, q) => sum + q.parsedPrice, 0) / wonQuotes.length
        : 0;

      return { month, avgValue };
    });

    return {
      monthlyData,
      statusCounts,
      revenueVsQuotedData,
      revenueByWallSystem,
      quotesByWallSystem,
      leadSourceCounts,
      leadSourceRevenue,
      wonLostData,
      revenueByUser,
      avgQuoteValueData
    };
  }, [quotes, organization, viewMode]);

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

  // Revenue by Wall System Pie Chart
  const revenueByWallSystemData = useMemo(() => {
    const entries = Object.entries(chartData.revenueByWallSystem).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([name]) => name),
      datasets: [{
        data: entries.map(([, value]) => value),
        backgroundColor: [
          'rgba(34, 197, 94, 0.85)',
          'rgba(99, 102, 241, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(236, 72, 153, 0.85)',
          'rgba(14, 165, 233, 0.85)',
          'rgba(168, 85, 247, 0.85)',
        ],
        borderWidth: 0,
        hoverOffset: 12,
      }],
    };
  }, [chartData.revenueByWallSystem]);

  // Quotes by Wall System Pie Chart
  const quotesByWallSystemData = useMemo(() => {
    const entries = Object.entries(chartData.quotesByWallSystem).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([name]) => name),
      datasets: [{
        data: entries.map(([, value]) => value),
        backgroundColor: [
          'rgba(99, 102, 241, 0.85)',
          'rgba(34, 197, 94, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(236, 72, 153, 0.85)',
          'rgba(14, 165, 233, 0.85)',
          'rgba(168, 85, 247, 0.85)',
        ],
        borderWidth: 0,
        hoverOffset: 12,
      }],
    };
  }, [chartData.quotesByWallSystem]);

  // Lead Source Distribution Pie Chart
  const leadSourceData = useMemo(() => {
    const entries = Object.entries(chartData.leadSourceCounts).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([name]) => name),
      datasets: [{
        data: entries.map(([, value]) => value),
        backgroundColor: [
          'rgba(245, 158, 11, 0.85)',
          'rgba(236, 72, 153, 0.85)',
          'rgba(14, 165, 233, 0.85)',
          'rgba(168, 85, 247, 0.85)',
          'rgba(34, 197, 94, 0.85)',
          'rgba(99, 102, 241, 0.85)',
        ],
        borderWidth: 0,
        hoverOffset: 12,
      }],
    };
  }, [chartData.leadSourceCounts]);

  // Won vs Lost Line Chart
  const wonVsLostData = useMemo(() => ({
    labels: chartData.wonLostData.map(d => d.month),
    datasets: [
      {
        label: 'Won Quotes',
        data: chartData.wonLostData.map(d => d.won),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Lost Quotes',
        data: chartData.wonLostData.map(d => d.lost),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  }), [chartData.wonLostData]);

  // Win Rate Trend Line Chart
  const winRateTrendData = useMemo(() => ({
    labels: chartData.wonLostData.map(d => d.month),
    datasets: [{
      label: 'Win Rate %',
      data: chartData.wonLostData.map(d => d.winRate),
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
    }],
  }), [chartData.wonLostData]);

  // Average Quote Value Trend
  const avgQuoteValueTrendData = useMemo(() => ({
    labels: chartData.avgQuoteValueData.map(d => d.month),
    datasets: [{
      label: 'Average Quote Value',
      data: chartData.avgQuoteValueData.map(d => d.avgValue),
      borderColor: 'rgb(168, 85, 247)',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgb(168, 85, 247)',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
    }],
  }), [chartData.avgQuoteValueData]);

  // Revenue by User Bar Chart
  const revenueByUserData = useMemo(() => {
    const entries = Object.entries(chartData.revenueByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 users

    return {
      labels: entries.map(([name]) => name),
      datasets: [{
        label: 'Revenue Generated',
        data: entries.map(([, value]) => value),
        backgroundColor: 'rgba(34, 197, 94, 0.85)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 0,
        borderRadius: {
          topLeft: 6,
          topRight: 6,
        },
      }],
    };
  }, [chartData.revenueByUser]);

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

      {/* New Charts Grid - Products & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Wall System */}
        <Card className="relative bg-gradient-to-br from-green-50 to-white border-green-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="revenue-by-product" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Revenue by Product</h3>
                <p className="text-sm text-slate-600">Wall system revenue</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={revenueByWallSystemData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Quotes by Wall System */}
        <Card className="relative bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="quotes-by-product" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Quotes by Product</h3>
                <p className="text-sm text-slate-600">Popular wall systems</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={quotesByWallSystemData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Lead Source Distribution */}
        <Card className="relative bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="lead-sources" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Lead Sources</h3>
                <p className="text-sm text-slate-600">Quote origin distribution</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={leadSourceData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Won vs Lost Trend */}
        <Card className="relative bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="won-vs-lost" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Won vs Lost Trend</h3>
                <p className="text-sm text-slate-600">Performance over time</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={wonVsLostData} options={{
                ...professionalOptions,
                plugins: {
                  ...professionalOptions.plugins,
                  legend: { display: true, position: 'top' as const },
                },
              }} />
            </div>
          </CardContent>
        </Card>

        {/* Win Rate Trend */}
        <Card className="relative bg-gradient-to-br from-violet-50 to-white border-violet-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="win-rate" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Win Rate Trend</h3>
                <p className="text-sm text-slate-600">Conversion performance</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={winRateTrendData} options={{
                ...professionalOptions,
                plugins: {
                  ...professionalOptions.plugins,
                  legend: { display: true, position: 'top' as const },
                },
                scales: {
                  ...professionalOptions.scales,
                  y: {
                    ...professionalOptions.scales?.y,
                    ticks: {
                      ...professionalOptions.scales?.y?.ticks,
                      callback: function(value: any) {
                        return value + '%';
                      },
                    },
                  },
                },
              }} />
            </div>
          </CardContent>
        </Card>

        {/* Average Quote Value Trend */}
        <Card className="relative bg-gradient-to-br from-fuchsia-50 to-white border-fuchsia-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="avg-quote-value" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Avg Quote Value Trend</h3>
                <p className="text-sm text-slate-600">Value evolution over time</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={avgQuoteValueTrendData} options={{
                ...professionalOptions,
                plugins: {
                  ...professionalOptions.plugins,
                  legend: { display: true, position: 'top' as const },
                  tooltip: {
                    ...professionalOptions.plugins?.tooltip,
                    callbacks: {
                      label: function(context: any) {
                        return `$${context.parsed.y.toLocaleString()}`;
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
                      callback: function(value: any) {
                        return '$' + value.toLocaleString();
                      },
                    },
                  },
                },
              }} />
            </div>
          </CardContent>
        </Card>

        {/* Revenue by User */}
        <Card className="relative bg-gradient-to-br from-cyan-50 to-white border-cyan-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <ExpandButton chartId="revenue-by-user" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Revenue by User</h3>
                <p className="text-sm text-slate-600">Top 10 performers</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={revenueByUserData} options={{
                ...professionalOptions,
                indexAxis: 'y' as const,
                plugins: {
                  ...professionalOptions.plugins,
                  legend: { display: false },
                  tooltip: {
                    ...professionalOptions.plugins?.tooltip,
                    callbacks: {
                      label: function(context: any) {
                        return `$${context.parsed.x.toLocaleString()}`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    ...professionalOptions.scales?.y,
                    ticks: {
                      ...professionalOptions.scales?.y?.ticks,
                      callback: function(value: any) {
                        return '$' + value.toLocaleString();
                      },
                    },
                  },
                  y: {
                    ...professionalOptions.scales?.x,
                  },
                },
              }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Chart Modal */}
      <Dialog open={expandedChart !== null} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-6 bg-white dark:bg-gray-900">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold">
              {expandedChart === 'volume' && 'Quote Volume Analysis'}
              {expandedChart === 'status' && 'Quote Status Distribution'}
              {expandedChart === 'revenue' && 'Revenue vs Quoted Amount Trends'}
              {expandedChart === 'revenue-by-product' && 'Revenue by Product'}
              {expandedChart === 'quotes-by-product' && 'Quotes by Product'}
              {expandedChart === 'lead-sources' && 'Lead Source Distribution'}
              {expandedChart === 'won-vs-lost' && 'Won vs Lost Trend'}
              {expandedChart === 'win-rate' && 'Win Rate Trend'}
              {expandedChart === 'avg-quote-value' && 'Average Quote Value Trend'}
              {expandedChart === 'revenue-by-user' && 'Revenue by User'}
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

            {expandedChart === 'revenue-by-product' && (
              <div className="h-[70vh] flex items-center justify-center">
                <div className="w-[500px] h-[500px]">
                  <Doughnut data={revenueByWallSystemData} options={doughnutOptions} />
                </div>
              </div>
            )}

            {expandedChart === 'quotes-by-product' && (
              <div className="h-[70vh] flex items-center justify-center">
                <div className="w-[500px] h-[500px]">
                  <Doughnut data={quotesByWallSystemData} options={doughnutOptions} />
                </div>
              </div>
            )}

            {expandedChart === 'lead-sources' && (
              <div className="h-[70vh] flex items-center justify-center">
                <div className="w-[500px] h-[500px]">
                  <Doughnut data={leadSourceData} options={doughnutOptions} />
                </div>
              </div>
            )}

            {expandedChart === 'won-vs-lost' && (
              <div className="h-[70vh]">
                <Line data={wonVsLostData} options={professionalOptions} />
              </div>
            )}

            {expandedChart === 'win-rate' && (
              <div className="h-[70vh]">
                <Line data={winRateTrendData} options={professionalOptions} />
              </div>
            )}

            {expandedChart === 'avg-quote-value' && (
              <div className="h-[70vh]">
                <Line data={avgQuoteValueTrendData} options={professionalOptions} />
              </div>
            )}

            {expandedChart === 'revenue-by-user' && (
              <div className="h-[70vh]">
                <Bar data={revenueByUserData} options={{
                  ...professionalOptions,
                  indexAxis: 'y' as const,
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