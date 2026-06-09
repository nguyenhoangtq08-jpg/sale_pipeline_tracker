import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../shared/MetricCard';
import { Badge } from '../shared/Badge';
import { STAGES, SOURCES, STAGE_COLORS } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export function Reports() {
  const { leads, activities } = useApp();

  const totalLeads = leads.length;
  const totalPipeline = leads.reduce((sum, l) => sum + Number(l.deal_size), 0);
  const wonLeads = leads.filter(l => l.stage === 'Closed Won');
  const lostLeads = leads.filter(l => l.stage === 'Closed Lost');
  const winRate = leads.filter(l => ['Closed Won', 'Closed Lost'].includes(l.stage)).length > 0
    ? Math.round((wonLeads.length / leads.filter(l => ['Closed Won', 'Closed Lost'].includes(l.stage)).length) * 100)
    : 0;

  // Pipeline by Stage
  const pipelineByStage = STAGES.map(stage => ({
    stage,
    value: leads.filter(l => l.stage === stage).reduce((sum, l) => sum + Number(l.deal_size), 0),
  }));

  const pipelineChartData = {
    labels: pipelineByStage.map(p => p.stage),
    datasets: [{
      label: 'Pipeline Value',
      data: pipelineByStage.map(p => p.value),
      backgroundColor: STAGES.map(s => STAGE_COLORS[s]),
      borderRadius: 6,
    }],
  };

  const pipelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => formatCurrency(context.parsed.y || 0),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  };

  // Activity Breakdown
  const activityBreakdown = {
    labels: ['Call', 'Email', 'Meeting', 'Note'],
    datasets: [{
      data: [
        activities.filter(a => a.type === 'Call').length,
        activities.filter(a => a.type === 'Email').length,
        activities.filter(a => a.type === 'Meeting').length,
        activities.filter(a => a.type === 'Note').length,
      ],
      backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#64748b'],
      borderWidth: 0,
    }],
  };

  const activityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 16,
          font: { size: 12 },
          color: '#64748b',
        },
      },
    },
    cutout: '60%',
  };

  // Source Performance Table
  const sourcePerformance = SOURCES.map(source => {
    const sourceLeads = leads.filter(l => l.source === source);
    const totalValue = sourceLeads.reduce((sum, l) => sum + Number(l.deal_size), 0);
    const won = sourceLeads.filter(l => l.stage === 'Closed Won').length;
    const completedDeals = sourceLeads.filter(l => ['Closed Won', 'Closed Lost'].includes(l.stage)).length;
    const winRate = completedDeals > 0 ? Math.round((won / completedDeals) * 100) : 0;

    return {
      source,
      leads: sourceLeads.length,
      value: totalValue,
      won,
      winRate,
    };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Reports</h1>
        <p className="text-text-secondary dark:text-text-muted">Analyze your sales performance and metrics</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Leads"
          value={totalLeads}
          icon="fa-users"
          color="#6366f1"
        />
        <MetricCard
          label="Total Pipeline Value"
          value={formatCurrency(totalPipeline)}
          icon="fa-chart-line"
          color="#10b981"
        />
        <MetricCard
          label="Overall Win Rate"
          value={`${winRate}%`}
          icon="fa-trophy"
          color="#f59e0b"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage Chart */}
        <div className="bg-bg-card dark:bg-bg-card rounded-xl p-6 shadow-sm border border-border dark:border-border">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Pipeline Value by Stage</h3>
          <div className="h-[300px]">
            <Bar data={pipelineChartData} options={pipelineChartOptions} />
          </div>
        </div>

        {/* Activity Breakdown Chart */}
        <div className="bg-bg-card dark:bg-bg-card rounded-xl p-6 shadow-sm border border-border dark:border-border">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Activity Breakdown</h3>
          <div className="h-[300px]">
            <Doughnut data={activityBreakdown} options={activityChartOptions} />
          </div>
        </div>
      </div>

      {/* Source Performance Table */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border dark:border-border">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white">Source Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Pipeline Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Won</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {sourcePerformance.map((row) => (
                <tr key={row.source} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant="default">{row.source}</Badge>
                  </td>
                  <td className="px-6 py-4 font-medium text-text-primary dark:text-white">{row.leads}</td>
                  <td className="px-6 py-4 font-medium text-text-primary dark:text-white">{formatCurrency(row.value)}</td>
                  <td className="px-6 py-4 text-text-secondary dark:text-text-muted">{row.won}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${row.winRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-text-secondary dark:text-text-muted">{row.winRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {sourcePerformance.every(r => r.leads === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Won/Lost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <i className="fa-solid fa-check text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Closed Won</h3>
              <p className="text-sm text-green-600 dark:text-green-500">{wonLeads.length} deals</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(wonLeads.reduce((s, l) => s + Number(l.deal_size), 0))}
          </p>
          <p className="text-sm text-green-600 dark:text-green-500 mt-2">
            Average deal: {wonLeads.length > 0 ? formatCurrency(wonLeads.reduce((s, l) => s + Number(l.deal_size), 0) / wonLeads.length) : '$0'}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
              <i className="fa-solid fa-xmark text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Closed Lost</h3>
              <p className="text-sm text-red-600 dark:text-red-500">{lostLeads.length} deals</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(lostLeads.reduce((s, l) => s + Number(l.deal_size), 0))}
          </p>
          <p className="text-sm text-red-600 dark:text-red-500 mt-2">
            Average deal: {lostLeads.length > 0 ? formatCurrency(lostLeads.reduce((s, l) => s + Number(l.deal_size), 0) / lostLeads.length) : '$0'}
          </p>
        </div>
      </div>
    </div>
  );
}
