import { useState, useMemo } from 'react';
import { useApp, useFilteredData } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { STAGE_COLORS, type Stage } from '../../types';

type ReportTab = 'PIPELINE' | 'PERFORMANCE' | 'SOURCING';

const PIPELINE_STAGES: Stage[] = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];

const SOURCE_BENCHMARKS: Record<string, number> = {
  'Website': 150,
  'Referral': 35,
  'Event': 40,
  'Cold Call': 600,
  'Other': 85,
};

const TEAM_MEMBERS = [
  { id: '1', name: 'Duy Tran' },
  { id: '2', name: 'Mai Le' },
  { id: '3', name: 'Hung Vo' },
];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function Reports() {
  const { currentUser, showToast } = useApp();
  const { getFilteredLeads } = useFilteredData();

  const [activeTab, setActiveTab] = useState<ReportTab>('PIPELINE');
  const [selectedRep, setSelectedRep] = useState<string>(currentUser?.role === 'manager' ? 'ALL' : currentUser?.id || '1');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  const isManager = currentUser?.role === 'manager';

  // Filter leads based on selection
  const filteredLeads = useMemo(() => {
    let leads = getFilteredLeads();

    // Filter by rep if not ALL
    if (selectedRep !== 'ALL') {
      leads = leads.filter(l => l.owner_id === selectedRep);
    }

    // Filter by date range (based on created_at)
    leads = leads.filter(l => {
      const created = l.created_at?.split('T')[0] || '';
      return created >= startDate && created <= endDate;
    });

    return leads;
  }, [getFilteredLeads, selectedRep, startDate, endDate]);

  // Tab 1: Pipeline Value & Forecast
  const pipelineData = useMemo(() => {
    const activeLeads = filteredLeads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage));

    return PIPELINE_STAGES.map(stage => {
      const stageLeads = activeLeads.filter(l => l.stage === stage);
      const totalValue = stageLeads.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const weightedForecast = stageLeads.reduce((sum, l) => sum + Number(l.deal_size) * (l.probability / 100), 0);
      const avgAge = stageLeads.length > 0
        ? stageLeads.reduce((sum, l) => {
            const created = new Date(l.created_at).getTime();
            const diff = Math.floor((Date.now() - created) / 86400000);
            return sum + diff;
          }, 0) / stageLeads.length
        : 0;

      return {
        stage,
        count: stageLeads.length,
        totalValue,
        weightedForecast,
        avgAge,
      };
    });
  }, [filteredLeads]);

  const pipelineTotals = useMemo(() => {
    const totals = pipelineData.reduce((acc, row) => ({
      count: acc.count + row.count,
      totalValue: acc.totalValue + row.totalValue,
      weightedForecast: acc.weightedForecast + row.weightedForecast,
      avgAge: acc.avgAge + row.avgAge,
    }), { count: 0, totalValue: 0, weightedForecast: 0, avgAge: 0 });

    totals.avgAge = totals.count > 0 ? totals.avgAge : 0;
    return totals;
  }, [pipelineData]);

  // Tab 2: Performance Summary
  const performanceData = useMemo(() => {
    if (selectedRep !== 'ALL') {
      // Single rep view
      const repLeads = filteredLeads.filter(l => l.owner_id === selectedRep);
      const won = repLeads.filter(l => l.stage === 'Closed Won');
      const lost = repLeads.filter(l => l.stage === 'Closed Lost');
      const closedCount = won.length + lost.length;
      const wonAmt = won.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const lostAmt = lost.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const rate = closedCount > 0 ? ((won.length / closedCount) * 100).toFixed(1) : '0';

      return {
        singleRep: true,
        name: TEAM_MEMBERS.find(m => m.id === selectedRep)?.name || currentUser?.name || 'Sales Rep',
        closedCount,
        wonAmt,
        lostAmt,
        rate,
      };
    }

    // Manager view - all reps
    const reps = TEAM_MEMBERS.map(member => {
      const repLeads = filteredLeads.filter(l => l.owner_id === member.id);
      const won = repLeads.filter(l => l.stage === 'Closed Won');
      const lost = repLeads.filter(l => l.stage === 'Closed Lost');
      const closedCount = won.length + lost.length;
      const wonAmt = won.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const lostAmt = lost.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const rate = closedCount > 0 ? ((won.length / closedCount) * 100).toFixed(1) : '0';

      return {
        name: member.name,
        closedCount,
        wonAmt,
        lostAmt,
        rate,
      };
    });

    return { singleRep: false, reps };
  }, [filteredLeads, selectedRep, currentUser]);

  // Tab 3: Lead Source ROI Attribution
  const sourcingData = useMemo(() => {
    return Object.entries(SOURCE_BENCHMARKS).map(([source, benchmarkLeads]) => {
      const sourceLeads = filteredLeads.filter(l => l.source === source);
      const wonLeads = sourceLeads.filter(l => l.stage === 'Closed Won');
      const attributedRevenue = wonLeads.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const conversionRate = ((sourceLeads.length / benchmarkLeads) * 100).toFixed(1);
      const avgDealSize = wonLeads.length > 0 ? Math.round(attributedRevenue / wonLeads.length) : 0;

      return {
        source,
        benchmarkLeads,
        actualLeads: sourceLeads.length,
        conversionRate,
        attributedRevenue,
        avgDealSize,
      };
    }).sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }, [filteredLeads]);

  const handleExport = () => {
    showToast('info', 'Export feature coming soon');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Analytics Reports</h1>
      </div>

      {/* Filters */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Rep Filter */}
            <div className="w-full sm:w-48">
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">
                Sales Representative
              </label>
              <select
                value={selectedRep}
                onChange={e => setSelectedRep(e.target.value)}
                disabled={!isManager}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
              >
                {isManager && <option value="ALL">All Team Members</option>}
                {TEAM_MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <span className="pb-2 text-text-muted font-bold">—</span>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end print:hidden">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <i className="fa-solid fa-file-excel"></i>
              <span>Export</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <i className="fa-solid fa-print"></i>
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 print:hidden">
        <button
          onClick={() => setActiveTab('PIPELINE')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'PIPELINE'
              ? 'text-accent border-accent'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Tab 1: Pipeline Value & Forecast
        </button>
        <button
          onClick={() => setActiveTab('PERFORMANCE')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'PERFORMANCE'
              ? 'text-accent border-accent'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Tab 2: Performance Summary
        </button>
        <button
          onClick={() => setActiveTab('SOURCING')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'SOURCING'
              ? 'text-accent border-accent'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Tab 3: Lead Source ROI Attribution
        </button>
      </div>

      {/* Tab 1: Pipeline Value & Forecast */}
      {activeTab === 'PIPELINE' && (
        <div className="bg-bg-card dark:bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
            Pipeline Value & Forecast
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <th className="px-6 py-3.5 text-left">Pipeline Stage</th>
                  <th className="px-6 py-3.5 text-center">Active Deals Volume</th>
                  <th className="px-6 py-3.5 text-right">Total Pipeline Value</th>
                  <th className="px-6 py-3.5 text-right">Weighted Forecast Value</th>
                  <th className="px-6 py-3.5 text-center">Avg Phase Aging</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pipelineData.map(row => (
                  <tr key={row.stage} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-bold text-text-primary">
                      <Badge variant="stage" color={STAGE_COLORS[row.stage as keyof typeof STAGE_COLORS]}>
                        {row.stage}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-text-secondary">{row.count}</td>
                    <td className="px-6 py-4 text-right font-bold text-text-primary">{formatCurrency(row.totalValue)}</td>
                    <td className="px-6 py-4 text-right font-bold text-accent">{formatCurrency(Math.round(row.weightedForecast))}</td>
                    <td className="px-6 py-4 text-center text-text-muted font-semibold">{row.avgAge.toFixed(1)} days</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-100 dark:bg-gray-800 font-extrabold text-xs border-t-2 border-border">
                  <td className="px-6 py-4 uppercase tracking-wider text-text-primary">Total Pipeline Active Assets</td>
                  <td className="px-6 py-4 text-center text-sm text-text-primary">{pipelineTotals.count} Deals</td>
                  <td className="px-6 py-4 text-right text-sm text-text-primary">{formatCurrency(pipelineTotals.totalValue)}</td>
                  <td className="px-6 py-4 text-right text-sm text-accent">{formatCurrency(Math.round(pipelineTotals.weightedForecast))}</td>
                  <td className="px-6 py-4 text-center text-text-secondary">{pipelineTotals.count > 0 ? (pipelineTotals.avgAge / PIPELINE_STAGES.length).toFixed(1) : '0'} days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Performance Summary */}
      {activeTab === 'PERFORMANCE' && (
        <div className="bg-bg-card dark:bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
            Performance Summary
          </div>

          {!performanceData.singleRep ? (
            // Manager View - Table
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    <th className="px-6 py-3.5 text-left">Sales Representative</th>
                    <th className="px-6 py-3.5 text-center">Total Closed Ops</th>
                    <th className="px-6 py-3.5 text-right">Won Amount ($)</th>
                    <th className="px-6 py-3.5 text-right">Lost Amount ($)</th>
                    <th className="px-6 py-3.5 text-center">Conversion Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {performanceData.reps?.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 font-bold text-text-primary flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                        {rep.name}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-text-secondary">{rep.closedCount}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-600">+{formatCurrency(rep.wonAmt)}</td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">-{formatCurrency(rep.lostAmt)}</td>
                      <td className="px-6 py-4 text-center font-bold text-text-primary">{rep.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Rep View - Card
            <div className="p-6">
              <div className="max-w-xl mx-auto border border-border rounded-xl shadow-inner bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-border text-accent font-bold text-xs uppercase tracking-wide text-center">
                  {performanceData.name} — Personal Performance Summary
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Total Closed Opportunities</td>
                      <td className="px-6 py-3.5 text-right font-bold text-text-primary text-sm">{performanceData.closedCount} Deals</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Total Won Amount ($)</td>
                      <td className="px-6 py-3.5 text-right font-bold text-green-600 text-sm">+{formatCurrency(performanceData.wonAmt)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Total Lost Amount ($)</td>
                      <td className="px-6 py-3.5 text-right font-bold text-red-600 text-sm">-{formatCurrency(performanceData.lostAmt)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Conversion Win Rate (%)</td>
                      <td className="px-6 py-3.5 text-right font-bold text-accent text-sm">{performanceData.rate}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Lead Source ROI Attribution */}
      {activeTab === 'SOURCING' && (
        <div className="bg-bg-card dark:bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
            Lead Source ROI Attribution
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <th className="px-6 py-3.5 text-left">Source Channel Origin</th>
                  <th className="px-6 py-3.5 text-center">Total Ingested Leads</th>
                  <th className="px-6 py-3.5 text-center">Pipeline Conversion Rate</th>
                  <th className="px-6 py-3.5 text-right">Attributed Won Revenue</th>
                  <th className="px-6 py-3.5 text-right">Average Deal Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sourcingData.map(row => (
                  <tr key={row.source} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-bold text-text-primary">{row.source}</td>
                    <td className="px-6 py-4 text-center font-bold text-text-secondary">{row.benchmarkLeads}</td>
                    <td className="px-6 py-4 text-center font-bold text-accent">{row.conversionRate}%</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(row.attributedRevenue)}</td>
                    <td className="px-6 py-4 text-right font-bold text-accent">{formatCurrency(row.avgDealSize)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
