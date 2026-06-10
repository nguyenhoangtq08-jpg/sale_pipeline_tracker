import { useState, useMemo, useRef } from 'react';
import { useApp, useFilteredData } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { STAGE_COLORS, ACCOUNTS, type Stage } from '../../types';

type ReportTab = 'PIPELINE' | 'PERFORMANCE' | 'SOURCING';

const PIPELINE_STAGES: Stage[] = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];

const SOURCE_CHANNELS = [
  { title: 'Cold Call', benchmarkLeads: 600 },
  { title: 'Event', benchmarkLeads: 40 },
  { title: 'LinkedIn', benchmarkLeads: 280 },
  { title: 'Referral', benchmarkLeads: 35 },
  { title: 'Website', benchmarkLeads: 150 },
  { title: 'Other', benchmarkLeads: 85 },
];

const TEAM_MEMBERS = [
  { id: '101', name: 'Duy Nguyen' },
  { id: '102', name: 'Minh Tran' },
  { id: '103', name: 'Thu Nguyen' },
];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export function Reports() {
  const { currentUser, showToast } = useApp();
  const { getFilteredLeads } = useFilteredData();

  const [activeTab, setActiveTab] = useState<ReportTab>('PIPELINE');
  const [selectedRep, setSelectedRep] = useState<string>(currentUser?.role === 'manager' ? 'ALL' : '101');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  const isManager = currentUser?.role === 'manager';

  const pipelineTableRef = useRef<HTMLTableElement>(null);
  const performanceMgrTableRef = useRef<HTMLTableElement>(null);
  const performanceRepTableRef = useRef<HTMLTableElement>(null);
  const sourcingTableRef = useRef<HTMLTableElement>(null);

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
      const totalAge = stageLeads.reduce((sum, l) => {
        const created = new Date(l.created_at).getTime();
        const diff = Math.floor((Date.now() - created) / 86400000);
        return sum + diff;
      }, 0);

      return {
        stage,
        count: stageLeads.length,
        totalValue,
        weightedForecast,
        avgAge: stageLeads.length > 0 ? totalAge / stageLeads.length : 0,
      };
    }).filter(row => row.count > 0);
  }, [filteredLeads]);

  const pipelineTotals = useMemo(() => {
    let totalCount = 0;
    let totalValue = 0;
    let totalForecast = 0;
    let totalAge = 0;

    pipelineData.forEach(row => {
      totalCount += row.count;
      totalValue += row.totalValue;
      totalForecast += row.weightedForecast;
      totalAge += row.avgAge * row.count;
    });

    return {
      count: totalCount,
      totalValue,
      weightedForecast: totalForecast,
      avgAge: totalCount > 0 ? totalAge / totalCount : 0,
    };
  }, [pipelineData]);

  // Tab 2: Performance Summary
  const performanceData = useMemo(() => {
    // Determine if showing single rep view
    const showSingleRep = !isManager || selectedRep !== 'ALL';

    if (showSingleRep) {
      const repId = selectedRep === 'ALL' ? '101' : selectedRep;
      const repLeads = filteredLeads.filter(l => l.owner_id === repId);
      const won = repLeads.filter(l => l.stage === 'Closed Won');
      const lost = repLeads.filter(l => l.stage === 'Closed Lost');
      const closedCount = won.length + lost.length;
      const wonAmt = won.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const lostAmt = lost.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const rate = closedCount > 0 ? ((won.length / closedCount) * 100).toFixed(1) : '0';

      const repName = TEAM_MEMBERS.find(m => m.id === repId)?.name ||
                      ACCOUNTS.find(a => a.id === repId)?.name ||
                      currentUser?.name ||
                      'Sales Rep';

      return {
        singleRep: true,
        name: repName,
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
  }, [filteredLeads, selectedRep, currentUser, isManager]);

  // Tab 3: Lead Source ROI Attribution
  const sourcingData = useMemo(() => {
    return SOURCE_CHANNELS.map(channel => {
      const sourceLeads = filteredLeads.filter(l => l.source === channel.title);
      const wonLeads = sourceLeads.filter(l => l.stage === 'Closed Won');
      const attributedRevenue = wonLeads.reduce((sum, l) => sum + Number(l.deal_size), 0);
      const conversionRate = ((sourceLeads.length / channel.benchmarkLeads) * 100).toFixed(1);
      const avgDealSize = wonLeads.length > 0 ? Math.round(attributedRevenue / wonLeads.length) : 0;

      return {
        source: channel.title,
        benchmarkLeads: channel.benchmarkLeads,
        actualLeads: sourceLeads.length,
        conversionRate,
        attributedRevenue,
        avgDealSize,
      };
    });
  }, [filteredLeads]);

  const handleExport = () => {
    let tableElement: HTMLTableElement | null = null;
    let fileName = '';

    switch (activeTab) {
      case 'PIPELINE':
        tableElement = pipelineTableRef.current;
        fileName = 'SalesTrack_PIPELINE_Report.xls';
        break;
      case 'PERFORMANCE':
        tableElement = performanceData.singleRep ? performanceRepTableRef.current : performanceMgrTableRef.current;
        fileName = 'SalesTrack_PERFORMANCE_Report.xls';
        break;
      case 'SOURCING':
        tableElement = sourcingTableRef.current;
        fileName = 'SalesTrack_SOURCING_Report.xls';
        break;
    }

    if (!tableElement) {
      showToast('error', 'Unable to export: table not found');
      return;
    }

    const dataBlobString = tableElement.outerHTML;
    const baseUriLink = 'data:application/vnd.ms-excel,' + encodeURIComponent(dataBlobString);
    const virtualAnchor = document.createElement('a');
    virtualAnchor.href = baseUriLink;
    virtualAnchor.download = fileName;
    document.body.appendChild(virtualAnchor);
    virtualAnchor.click();
    document.body.removeChild(virtualAnchor);

    showToast('success', 'Report exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">Analytics Reports</h1>
      </div>

      {/* Filters */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 border border-border shadow-sm print:hidden">
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
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 cursor-pointer"
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
                  className="px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
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
                  className="px-3 py-2 rounded-lg border border-border bg-bg-page text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end print:hidden">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <i className="fa-solid fa-file-excel"></i>
              <span>Export</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
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
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === 'PIPELINE'
              ? 'text-accent border-accent'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Tab 1: Pipeline Value & Forecast
        </button>
        <button
          onClick={() => setActiveTab('PERFORMANCE')}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === 'PERFORMANCE'
              ? 'text-accent border-accent'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Tab 2: Performance Summary
        </button>
        <button
          onClick={() => setActiveTab('SOURCING')}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all ${
            activeTab === 'SOURCING'
              ? 'text-accent border-accent'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
        >
          Tab 3: Lead Source ROI Attribution
        </button>
      </div>

      {/* Tab 1: Pipeline Value & Forecast */}
      <div className={`bg-bg-card dark:bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden ${activeTab === 'PIPELINE' ? 'block' : 'hidden'}`}>
        <div className="px-4 py-3 bg-gray-50/60 dark:bg-gray-900/50 border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
          Pipeline Value & Forecast
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" ref={pipelineTableRef} id="table-target-PIPELINE">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="px-6 py-3.5 text-left">Pipeline Stage</th>
                <th className="px-6 py-3.5 text-center">Active Deals Volume</th>
                <th className="px-6 py-3.5 text-right">Total Pipeline Value</th>
                <th className="px-6 py-3.5 text-right">Weighted Forecast Value</th>
                <th className="px-6 py-3.5 text-center">Avg Phase Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pipelineData.map(row => (
                <tr key={row.stage} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer">
                  <td className="px-6 py-4 font-bold text-text-primary dark:text-white">{row.stage}</td>
                  <td className="px-6 py-4 text-center font-bold text-text-secondary">{row.count}</td>
                  <td className="px-6 py-4 text-right font-bold text-text-primary dark:text-white">{formatCurrency(row.totalValue)}</td>
                  <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(Math.round(row.weightedForecast))}</td>
                  <td className="px-6 py-4 text-center text-text-muted font-semibold">{row.avgAge.toFixed(1)} days</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-extrabold text-xs border-t border-b border-gray-300 dark:border-gray-700 shadow-sm">
                <td className="px-6 py-4 uppercase tracking-wider text-text-primary dark:text-white">Total Pipeline Active Assets</td>
                <td className="px-6 py-4 text-center text-sm text-text-secondary">{pipelineTotals.count} Deals</td>
                <td className="px-6 py-4 text-right text-sm text-text-primary dark:text-white">{formatCurrency(pipelineTotals.totalValue)}</td>
                <td className="px-6 py-4 text-right text-sm text-indigo-800 dark:text-indigo-300">{formatCurrency(Math.round(pipelineTotals.weightedForecast))}</td>
                <td className="px-6 py-4 text-center text-text-secondary font-extrabold">{pipelineTotals.avgAge.toFixed(1)} days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tab 2: Performance Summary */}
      <div className={`bg-bg-card dark:bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden ${activeTab === 'PERFORMANCE' ? 'block' : 'hidden'}`}>
        <div className="px-4 py-3 bg-gray-50/60 dark:bg-gray-900/50 border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
          Performance Summary
        </div>

        {!performanceData.singleRep ? (
          // Manager View - Table
          <div className="overflow-x-auto" id="container-perf-MANAGER">
            <table className="w-full" ref={performanceMgrTableRef} id="table-target-PERFORMANCE-MGR">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <th className="px-6 py-3.5 text-left">Sales Representative</th>
                  <th className="px-6 py-3.5 text-center">Total Closed Ops</th>
                  <th className="px-6 py-3.5 text-right">Won Amount ($)</th>
                  <th className="px-6 py-3.5 text-right">Lost Amount ($)</th>
                  <th className="px-6 py-3.5 text-center">Conversion Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {performanceData.reps?.map((rep, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer">
                    <td className="px-6 py-4 font-bold text-text-primary dark:text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                      <span>{rep.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-text-secondary">{rep.closedCount}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(rep.wonAmt)}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(rep.lostAmt)}</td>
                    <td className="px-6 py-4 text-center font-bold text-text-primary dark:text-white">{rep.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Rep View - Card
          <div className="p-6" id="container-perf-REP">
            <div className="max-w-xl mx-auto border border-border rounded-xl shadow-inner bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden" id="table-target-PERFORMANCE-REP">
              <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-border text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wide text-center" id="rep-card-profile-header">
                {performanceData.name} — Personal Performance Summary
              </div>
              <table className="w-full text-xs text-left border-collapse" ref={performanceRepTableRef}>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-medium text-text-primary dark:text-white">
                  <tr>
                    <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Total Closed Opportunities</td>
                    <td className="px-6 py-3.5 text-right font-bold text-text-primary dark:text-white text-sm" id="rep-card-closed-count">{performanceData.closedCount} Deals</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Total Won Amount ($)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm" id="rep-card-won-amt">+{formatCurrency(performanceData.wonAmt)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Total Lost Amount ($)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-sm" id="rep-card-lost-amt">-{formatCurrency(performanceData.lostAmt)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 text-text-muted uppercase font-bold tracking-wider text-[10px]">Conversion Win Rate (%)</td>
                    <td className="px-6 py-3.5 text-right font-bold text-indigo-700 dark:text-indigo-400 text-sm" id="rep-card-win-rate">{performanceData.rate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tab 3: Lead Source ROI Attribution */}
      <div className={`bg-bg-card dark:bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden ${activeTab === 'SOURCING' ? 'block' : 'hidden'}`}>
        <div className="px-4 py-3 bg-gray-50/60 dark:bg-gray-900/50 border-b border-border text-xs font-bold uppercase tracking-wide text-text-muted">
          Lead Source ROI Attribution
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" ref={sourcingTableRef} id="table-target-SOURCING">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="px-6 py-3.5 text-left">Source Channel Origin</th>
                <th className="px-6 py-3.5 text-center">Total Ingested Leads</th>
                <th className="px-6 py-3.5 text-center">Pipeline Conversion Rate</th>
                <th className="px-6 py-3.5 text-right">Attributed Won Revenue</th>
                <th className="px-6 py-3.5 text-right">Average Deal Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sourcingData.map(row => (
                <tr key={row.source} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer">
                  <td className="px-6 py-4 font-bold text-text-primary dark:text-white">{row.source}</td>
                  <td className="px-6 py-4 text-center font-bold text-text-secondary">{row.benchmarkLeads}</td>
                  <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.conversionRate}%</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.attributedRevenue)}</td>
                  <td className="px-6 py-4 text-right font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(row.avgDealSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
