import { useState } from 'react';
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
import { STAGE_COLORS, STAGES } from '../../types';
import type { Activity } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const SAMPLE_LEADS = [
  { name: 'Nguyen Thi Linh', company: 'TechCorp Vietnam', dealSize: 45000, source: 'Website', stage: 'Qualification', probability: 40 },
  { name: 'Tran Minh Duc', company: 'ABC Manufacturing', dealSize: 78000, source: 'Referral', stage: 'Proposal', probability: 60 },
  { name: 'Pham Thi Hoa', company: 'Global Solutions Ltd', dealSize: 32500, source: 'Event', stage: 'Negotiation', probability: 80 },
  { name: 'Le Van Nam', company: 'VietnamTrade JSC', dealSize: 92500, source: 'Cold Call', stage: 'Prospecting', probability: 20 },
  { name: 'Vo Thi Mai', company: 'Pacific Foods Inc', dealSize: 56000, source: 'Referral', stage: 'Closed Won', probability: 100 },
  { name: 'Dang Quoc Hung', company: 'SME Solutions', dealSize: 28750, source: 'Website', stage: 'Closed Lost', probability: 0 },
  { name: 'Bui Thi Lan', company: 'Innovatech Vietnam', dealSize: 112000, source: 'Event', stage: 'Proposal', probability: 65 },
  { name: 'Hoang Van Tung', company: 'DataPro Services', dealSize: 47000, source: 'Website', stage: 'Qualification', probability: 35 },
];

const SAMPLE_ACTIVITIES = [
  { type: 'Call', leadName: 'Nguyen Thi Linh', stage: 'Qualification', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), notes: 'Discussed product features and pricing options' },
  { type: 'Email', leadName: 'Tran Minh Duc', stage: 'Proposal', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), notes: 'Sent revised proposal document' },
  { type: 'Meeting', leadName: 'Pham Thi Hoa', stage: 'Negotiation', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), notes: 'Contract review meeting, final terms discussed' },
  { type: 'Call', leadName: 'Le Van Nam', stage: 'Prospecting', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), notes: 'Initial discovery call' },
  { type: 'Note', leadName: 'Bui Thi Lan', stage: 'Proposal', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), notes: 'Need to follow up next week about timeline' },
];

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

async function loadSampleData(addLead: Function, addActivity: Function, showToast: Function, setLoading: Function) {
  setLoading(true);
  for (const lead of SAMPLE_LEADS) {
    await addLead({
      name: lead.name,
      company: lead.company,
      email: null,
      phone: null,
      deal_size: lead.dealSize,
      source: lead.source,
      stage: lead.stage,
      probability: lead.probability,
      notes: null,
      user_id: '0',
    });
  }
  for (const activity of SAMPLE_ACTIVITIES) {
    await addActivity({
      type: activity.type,
      lead_id: null,
      lead_name: activity.leadName,
      company: null,
      stage: activity.stage,
      date: new Date().toISOString().split('T')[0],
      duration: activity.type === 'Meeting' ? 60 : activity.type === 'Call' ? 15 : 0,
      notes: activity.notes,
      next_action: null,
      user_id: '0',
    });
  }
  showToast('success', 'Sample data loaded successfully');
  setLoading(false);
}

export function Dashboard() {
  const { leads, activities, addLead, addActivity, showToast, setSelectedActivity } = useApp();
  const [loadingSample, setLoadingSample] = useState(false);

  const totalPipeline = leads
    .filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage))
    .reduce((sum, l) => sum + Number(l.deal_size), 0);

  const weightedForecast = leads
    .filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage))
    .reduce((sum, l) => sum + Number(l.deal_size) * (l.probability / 100), 0);

  const wonLeads = leads.filter(l => l.stage === 'Closed Won');
  const lostLeads = leads.filter(l => l.stage === 'Closed Lost');
  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

  const activeDeals = leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage)).length;

  const pipelineByStage = STAGES.map(stage => ({
    stage,
    count: leads.filter(l => l.stage === stage).length,
    value: leads.filter(l => l.stage === stage).reduce((sum, l) => sum + Number(l.deal_size), 0),
  }));

  const chartData = {
    labels: pipelineByStage.map(p => p.stage),
    datasets: [{
      label: 'Leads',
      data: pipelineByStage.map(p => p.count),
      backgroundColor: STAGES.map(s => STAGE_COLORS[s]),
      borderRadius: 6,
    }],
  };

  const chartOptions = {
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
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  };

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

  const recentActivities = activities.slice(0, 5).map(a => ({
    ...a,
    timeAgo: timeAgo(a.created_at),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Dashboard</h1>
          <p className="text-text-secondary dark:text-text-muted">Welcome back! Here&apos;s your sales overview.</p>
        </div>
        {leads.length === 0 && (
          <button
            onClick={() => loadSampleData(addLead, addActivity, showToast, setLoadingSample)}
            disabled={loadingSample}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loadingSample ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Loading...</>
            ) : (
              <><i className="fa-solid fa-database"></i> Load Sample Data</>
            )}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Pipeline"
          value={formatCurrency(totalPipeline)}
          icon="fa-chart-line"
          color="#6366f1"
        />
        <MetricCard
          label="Weighted Forecast"
          value={formatCurrency(weightedForecast)}
          icon="fa-scale-balanced"
          color="#10b981"
        />
        <MetricCard
          label="Win Rate"
          value={`${winRate}%`}
          icon="fa-trophy"
          color="#f59e0b"
        />
        <MetricCard
          label="Active Deals"
          value={activeDeals}
          icon="fa-bolt"
          color="#3b82f6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-bg-card dark:bg-bg-card rounded-xl p-6 shadow-sm border border-border dark:border-border">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Pipeline by Stage</h3>
          <div className="h-[280px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Won/Lost Panel */}
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <i className="fa-solid fa-check text-green-500"></i>
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">Closed Won</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(wonLeads.reduce((s, l) => s + Number(l.deal_size), 0))}</p>
              </div>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">{wonLeads.length} deals won</p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-red-500"></i>
              </div>
              <div>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">Closed Lost</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(lostLeads.reduce((s, l) => s + Number(l.deal_size), 0))}</p>
              </div>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{lostLeads.length} deals lost</p>
          </div>

          {/* Doughnut Chart */}
          {activities.length > 0 && (
            <div className="bg-bg-card dark:bg-bg-card rounded-xl p-5 border border-border dark:border-border">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Activity Breakdown</h3>
              <div className="h-[140px]">
                <Doughnut
                  data={activityBreakdown}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } },
                    cutout: '60%',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border">
        <div className="px-6 py-4 border-b border-border dark:border-border">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white">Recent Activities</h3>
        </div>
        {recentActivities.length === 0 ? (
          <div className="p-8 text-center">
            <i className="fa-solid fa-clock-rotate-left text-4xl text-text-muted mb-3"></i>
            <p className="text-text-secondary dark:text-text-muted">No activities yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-border">
            {recentActivities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity as Activity)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'Call' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                  activity.type === 'Email' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                  activity.type === 'Meeting' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600'
                }`}>
                  <i className={`fa-solid ${
                    activity.type === 'Call' ? 'fa-phone' :
                    activity.type === 'Email' ? 'fa-envelope' :
                    activity.type === 'Meeting' ? 'fa-users' :
                    'fa-note-sticky'
                  }`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary dark:text-white">{activity.lead_name}</span>
                    <Badge variant="stage" color={STAGE_COLORS[activity.stage as keyof typeof STAGE_COLORS]}>
                      {activity.stage}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-muted truncate">{activity.notes || 'No notes'}</p>
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">{activity.timeAgo}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
