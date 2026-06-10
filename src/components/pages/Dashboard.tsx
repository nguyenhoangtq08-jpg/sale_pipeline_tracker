import { useState, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useApp, useFilteredData } from '../../context/AppContext';
import { MetricCard } from '../shared/MetricCard';
import { STAGE_COLORS, STAGES, type Activity } from '../../types';
import { AddActivityModal } from '../modals/AddActivityModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type PeriodPreset = 'QUARTER' | 'MONTH' | 'YEAR';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const STAGE_BADGE_CLASSES: Record<string, string> = {
  'Prospecting': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'Qualification': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'Proposal': 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'Negotiation': 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  'Closed Won': 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'Closed Lost': 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const ACTIVITY_THEME: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'Call': { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', icon: 'fa-phone' },
  'Email': { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-700', icon: 'fa-envelope' },
  'Meeting': { bg: 'bg-purple-50', border: 'border-purple-200/60', text: 'text-purple-700', icon: 'fa-handshake' },
  'Note': { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-700', icon: 'fa-note-sticky' },
};

function getPeriodDates(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date('2026-06-10'); // Use consistent baseline date
  const year = now.getFullYear();
  if (preset === 'QUARTER') {
    return { start: `${year}-04-01`, end: `${year}-06-30` };
  }
  if (preset === 'MONTH') {
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return { start: `${year}-${m}-01`, end: `${year}-${m}-${String(now.getDate()).padStart(2, '0')}` };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function Dashboard() {
  const { currentUser, setSelectedActivity, setCurrentPage, showToast, darkMode } = useApp();
  const { getFilteredLeads, getFilteredActivities } = useFilteredData();

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('QUARTER');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [timelineRepFilter, setTimelineRepFilter] = useState<string>('ALL');

  const isManager = currentUser?.role === 'manager';

  // Apply period preset
  const handlePresetChange = useCallback((preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const dates = getPeriodDates(preset);
    setStartDate(dates.start);
    setEndDate(dates.end);
  }, []);

  // Filter leads by date range + role
  const allLeads = getFilteredLeads();
  const allActivities = getFilteredActivities();

  const filteredLeads = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    return allLeads.filter(l => {
      const updated = new Date(l.updated_at);
      return updated >= start && updated <= end;
    });
  }, [allLeads, startDate, endDate]);

  const filteredActivities = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    return allActivities.filter(a => {
      const updated = new Date(a.created_at);
      return updated >= start && updated <= end;
    });
  }, [allActivities, startDate, endDate]);

  // ═══════════════════════════════════════════════════════════
  // KPI CALCULATIONS
  // ═══════════════════════════════════════════════════════════

  const activeOpenDeals = filteredLeads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage));
  const wonDeals = filteredLeads.filter(l => l.stage === 'Closed Won');
  const lostDeals = filteredLeads.filter(l => l.stage === 'Closed Lost');

  const netOpenCount = activeOpenDeals.length;
  const grossPipelineValue = activeOpenDeals.reduce((sum, d) => sum + Number(d.deal_size), 0);
  const weightedForecastRevenue = activeOpenDeals.reduce((sum, d) => sum + Number(d.deal_size) * (d.probability / 100), 0);
  const totalWonRevenue = wonDeals.reduce((sum, d) => sum + Number(d.deal_size), 0);
  const totalLostRevenue = lostDeals.reduce((sum, d) => sum + Number(d.deal_size), 0);

  const totalClosedValueSum = totalWonRevenue + totalLostRevenue;
  const absoluteWinRate = totalClosedValueSum > 0 ? ((totalWonRevenue / totalClosedValueSum) * 100).toFixed(1) : '0.0';

  // ═══════════════════════════════════════════════════════════
  // CHART DATA: Mixed Bar/Line Pipeline Chart
  // ═══════════════════════════════════════════════════════════

  const pipelineStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
  const stageVolumes = pipelineStages.map(s => filteredLeads.filter(d => d.stage === s).length);
  const stageValues = pipelineStages.map(s => filteredLeads.filter(d => d.stage === s).reduce((sum, d) => sum + Number(d.deal_size), 0));

  const mixedChartData = {
    labels: pipelineStages,
    datasets: [
      {
        type: 'line' as const,
        label: 'Pipeline Capacity Value ($)',
        data: stageValues,
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
        borderWidth: 3.5,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#6366f1',
        pointBorderWidth: 2.5,
        tension: 0.15,
        yAxisID: 'yValue',
        pointStyle: 'line' as const,
      },
      {
        type: 'bar' as const,
        label: 'Deals Volume (Count)',
        data: stageVolumes,
        backgroundColor: [
          'rgba(148, 163, 184, 0.85)',
          'rgba(59, 130, 246, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(249, 115, 22, 0.85)',
        ],
        borderColor: ['#475569', '#1d4ed8', '#b45309', '#c2410c'],
        borderWidth: 1.5,
        borderRadius: 6,
        yAxisID: 'yVolume',
        barPercentage: 0.45,
        pointStyle: 'rect' as const,
      },
    ],
  };

  const textColor = darkMode ? '#f1f5f9' : '#334155';
  const gridColor = darkMode ? '#334155' : '#f1f5f9';

  const mixedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', weight: '700' as const, size: 11 }, color: textColor },
      },
      yVolume: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'Volume Count', font: { family: 'Plus Jakarta Sans', weight: '800' as const, size: 11 }, color: textColor },
        grid: { color: gridColor },
        ticks: { stepSize: 1, font: { family: 'Plus Jakarta Sans', weight: '700' as const }, color: textColor },
      },
      yValue: {
        type: 'linear' as const,
        position: 'right' as const,
        title: { display: true, text: 'Financial Capacity ($)', font: { family: 'Plus Jakarta Sans', weight: '800' as const, size: 11 }, color: textColor },
        grid: { display: false },
        ticks: {
          font: { family: 'Plus Jakarta Sans', weight: '700' as const },
          color: textColor,
          callback: function(v: number) { return '$' + (v >= 1000 ? (v / 1000) + 'k' : v); },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'Plus Jakarta Sans', weight: '700' as const, size: 12 },
          color: textColor,
          usePointStyle: true,
          boxWidth: 16,
        },
      },
    },
  };

  // ═══════════════════════════════════════════════════════════
  // DONUT CHART: Lead Status Composition
  // ═══════════════════════════════════════════════════════════

  // For demo: static composition data based on role
  const leadCompositionData = useMemo(() => ({
    labels: ['New Leads', 'Converted', 'Rejected/Archived'],
    datasets: [{
      data: isManager ? [45, 120, 25] : [15, 42, 8],
      backgroundColor: ['#6366f1', '#10b981', '#ef4444'],
      borderWidth: 2,
      borderColor: darkMode ? '#1e293b' : '#ffffff',
    }],
  }), [isManager, darkMode]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' as const },
          color: textColor,
        },
      },
    },
    cutout: '72%',
  };

  // ═══════════════════════════════════════════════════════════
  // UPCOMING TIMELINE ACTIVITIES
  // ═══════════════════════════════════════════════════════════

  const upcomingActivities = useMemo(() => {
    const baseline = new Date('2026-06-10T00:00:00');
    let acts = [...allActivities];

    // Filter by rep if manager has selected one
    if (isManager && timelineRepFilter !== 'ALL') {
      acts = acts.filter(a => a.owner_id === timelineRepFilter);
    } else if (!isManager && currentUser) {
      acts = acts.filter(a => a.owner_id === currentUser.id);
    }

    // Future activities only
    acts = acts.filter(a => new Date(a.date) >= baseline);
    acts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return acts;
  }, [allActivities, isManager, timelineRepFilter, currentUser]);

  // ═══════════════════════════════════════════════════════════
  // RECENTLY UPDATED DEALS FEED
  // ═══════════════════════════════════════════════════════════

  const recentDeals = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4);
  }, [filteredLeads]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-primary">Dashboard</h1>
          <p className="text-text-secondary dark:text-text-muted">
            {isManager
              ? "Welcome back! Here's your team's sales overview."
              : "Welcome back! Here's your sales overview."}
          </p>
        </div>
        <button
          onClick={() => setShowQuickLogModal(true)}
          className="px-4 py-2 bg-green-500 text-primary rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 w-fit"
        >
          <i className="fa-solid fa-plus"></i>
          Quick Log
        </button>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 border border-border dark:border-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Period Preset */}
            <div className="w-full sm:w-48">
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Cohort Period Filter
              </label>
              <select
                value={periodPreset}
                onChange={e => handlePresetChange(e.target.value as PeriodPreset)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <option value="QUARTER">Current Quarter (Q2 2026)</option>
                <option value="MONTH">Current Month</option>
                <option value="YEAR">Fiscal Year (YTD)</option>
              </select>
            </div>
            {/* Date Range */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                />
              </div>
              <span className="pb-2 text-text-muted font-bold">—</span>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - 6 metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          label="My Open Deals"
          value={netOpenCount}
          subtext="ACTIVE IN PIPELINES"
          icon="fa-folder-open"
          color="#6366f1"
        />
        <MetricCard
          label="Total Pipeline Value"
          value={formatCurrency(grossPipelineValue)}
          subtext="UNWEIGHTED SUM"
          icon="fa-chart-line"
          color="#3b82f6"
        />
        <MetricCard
          label="Forecasted Revenue"
          value={formatCurrency(Math.round(weightedForecastRevenue))}
          subtext="WEIGHTED BY PROBABILITY"
          icon="fa-scale-balanced"
          color="#8b5cf6"
        />
        <MetricCard
          label="Won Revenue"
          value={formatCurrency(totalWonRevenue)}
          subtext="CLOSED WON DEALS"
          icon="fa-trophy"
          color="#10b981"
        />
        <MetricCard
          label="Lost Revenue"
          value={formatCurrency(totalLostRevenue)}
          subtext="CLOSED LOST DEALS"
          icon="fa-xmark"
          color="#ef4444"
        />
        <MetricCard
          label="Win Outcome Rate"
          value={`${absoluteWinRate}%`}
          subtext="BASED ON VALUE"
          icon="fa-percent"
          color="#f59e0b"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut: Lead Status Composition */}
        <div className="lg:col-span-4 bg-bg-card dark:bg-bg-card rounded-xl p-5 border border-border dark:border-border shadow-sm flex flex-col h-[320px]">
          <div className="flex items-center gap-2 text-text-primary dark:text-primary mb-3 flex-shrink-0">
            <i className="fa-solid fa-chart-pie text-accent"></i>
            <h3 className="font-bold text-sm tracking-tight uppercase">Lead Status Composition</h3>
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            <Doughnut data={leadCompositionData} options={donutOptions} />
          </div>
        </div>

        {/* Mixed Bar/Line: Pipeline Stage Distribution */}
        <div className="lg:col-span-8 bg-bg-card dark:bg-bg-card rounded-xl p-5 border border-border dark:border-border shadow-sm flex flex-col h-[320px]">
          <div className="flex items-center gap-2 text-text-primary dark:text-primary mb-3 flex-shrink-0">
            <i className="fa-solid fa-chart-line text-accent"></i>
            <h3 className="font-bold text-sm uppercase tracking-wider">Deal Pipeline Stage Distribution</h3>
          </div>
          <div className="flex-1 relative min-h-0 px-2">
            {/* @ts-expect-error Chart.js mixed chart typing */}
            <Bar data={mixedChartData} options={mixedChartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Row: Timeline + Deals Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upcoming Timeline Activities */}
        <div className="lg:col-span-5 bg-bg-card dark:bg-bg-card rounded-xl border border-border dark:border-border shadow-sm overflow-hidden flex flex-col h-[540px]">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-primary dark:text-primary">
              <i className="fa-regular fa-clock text-accent font-bold"></i>
              <h4 className="font-bold text-sm tracking-tight">Upcoming Timeline Activities</h4>
            </div>
            {isManager && (
              <select
                value={timelineRepFilter}
                onChange={e => setTimelineRepFilter(e.target.value)}
                className="border border-border dark:border-border bg-bg-card dark:bg-bg-card rounded-lg px-2 py-1 text-[11px] font-bold text-text-primary dark:text-primary outline-none"
              >
                <option value="ALL">All Team Members</option>
                <option value="1">Duy Tran</option>
                <option value="2">Mai Le</option>
                <option value="3">Hung Vo</option>
              </select>
            )}
          </div>
          <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-bg-card dark:bg-bg-card px-6">
            {upcomingActivities.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-text-muted italic">
                No future activities logged matching target criteria filter parameters.
              </div>
            ) : (
              upcomingActivities.map(act => {
                const theme = ACTIVITY_THEME[act.type] ||ACTIVITY_THEME['Note'];
                return (
                  <button
                    key={act.id}
                    onClick={() => setCurrentPage('activities')}
                    className="w-full text-left p-4 border border-border dark:border-border/80 rounded-xl hover:border-accent/40 hover:shadow-sm bg-gray-50/30 dark:bg-gray-900/30 transition space-y-2 cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${theme.bg} ${theme.border} ${theme.text}`}>
                        {act.type}
                      </span>
                      <span className="text-[11px] text-text-muted font-bold tracking-tight">
                        <i className="fa-regular fa-calendar-days mr-1"></i>
                        {formatFullDate(act.date)}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-text-primary dark:text-primary group-hover:text-accent transition tracking-tight">
                      {act.notes}
                    </h5>
                    <div className="pt-1.5 border-t border-border dark:border-border/50 flex items-center justify-between text-[11px] text-text-muted font-semibold">
                      <span>Rep: {act.lead_name || '—'}</span>
                      <span className="text-text-secondary font-bold">
                        <i className="fa-regular fa-building mr-1"></i>
                        {act.company || '—'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Recently Updated Deals Feed */}
        <div className="lg:col-span-7 bg-bg-card dark:bg-bg-card rounded-xl border border-border dark:border-border shadow-sm overflow-hidden flex flex-col h-[540px]">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-primary dark:text-primary">
              <i className="fa-solid fa-rectangle-list text-accent"></i>
              <h4 className="font-bold text-sm tracking-tight">Recently Updated Deals Feed</h4>
            </div>
            <button
              onClick={() => setCurrentPage('deals')}
              className="text-accent hover:text-indigo-600 text-xs font-bold transition flex items-center gap-1"
            >
              <span>View All Deals</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
          <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-bg-card dark:bg-bg-card px-6">
            {recentDeals.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-text-muted italic">
                No deals recorded during this specified window timeframe filter.
              </div>
            ) : (
              recentDeals.map(deal => {
                const badgeClass = STAGE_BADGE_CLASSES[deal.stage] || STAGE_BADGE_CLASSES['Prospecting'];
                return (
                  <div
                    key={deal.id}
                    className="p-4 border border-border dark:border-border/80 bg-bg-card dark:bg-bg-card rounded-xl shadow-sm flex items-center justify-between hover:border-accent/40 transition"
                  >
                    <div className="space-y-1 min-w-0 pr-3 flex-1">
                      <h4 className="font-bold text-text-primary dark:text-primary text-sm tracking-tight truncate">
                        {deal.name}
                      </h4>
                      <p className="text-[11px] text-text-muted font-semibold tracking-tight">
                        Owner: {deal.company || '—'} &bull; Updated: {formatShortDate(deal.updated_at)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <span className="font-extrabold text-text-primary dark:text-primary text-sm block">
                        {formatCurrency(Number(deal.deal_size))}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted justify-end">
                        <span>Prob: {deal.probability}%</span>
                        <span className={`badge ${badgeClass} px-2 py-0.5 rounded text-[10px] font-semibold`}>
                          { deal.stage}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Log Modal */}
      <AddActivityModal
        isOpen={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        mode="log"
        onModeChange={() => {}}
      />
    </div>
  );
}
