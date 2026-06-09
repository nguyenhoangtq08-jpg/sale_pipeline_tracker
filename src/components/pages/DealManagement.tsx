import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Drawer } from '../shared/Drawer';
import { Modal } from '../shared/Modal';
import { STAGES, STAGE_COLORS, SOURCES, ACTIVITY_TYPES, type Lead, type Stage, type Source, type ActivityType } from '../../types';

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function fmtCurrency(n: number): string {
  if (!n && n !== 0) return '$0';
  return '$' + Number(n).toLocaleString('en-US');
}

function fmtCompact(n: number): string {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(ds: string | null | undefined): string {
  if (!ds) return '—';
  return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function closeDateStatus(ds: string | null): 'overdue' | 'soon' | 'ok' {
  if (!ds) return 'ok';
  const days = Math.floor((new Date(ds).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'ok';
}

function probColor(p: number): string {
  if (p >= 75) return '#10b981';
  if (p >= 50) return '#f59e0b';
  if (p >= 25) return '#3b82f6';
  return '#94a3b8';
}

function stagePillClass(s: string): string {
  const map: Record<string, string> = {
    'Prospecting': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    'Qualification': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'Proposal': 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    'Negotiation': 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    'Closed Won': 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    'Closed Lost': 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[s] || 'bg-gray-100 text-gray-600';
}


const DEFAULT_PROB: Record<string, number> = {
  'Prospecting': 10,
  'Qualification': 25,
  'Proposal': 50,
  'Negotiation': 75,
  'Closed Won': 100,
  'Closed Lost': 0,
};

const ACTIVITY_ICONS: Record<string, string> = {
  'Call': 'fa-phone',
  'Email': 'fa-envelope',
  'Meeting': 'fa-calendar-check',
  'Note': 'fa-note-sticky',
};

const ACTIVITY_BGS: Record<string, string> = {
  'Call': 'bg-green-100 dark:bg-green-900/30 text-green-600',
  'Email': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  'Meeting': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  'Note': 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
};

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

type ViewMode = 'table' | 'kanban';
type DetailTab = 'overview' | 'edit' | 'log';

export function DealManagement() {
  const { leads, updateLead, deleteLead, activities, currentUser, showToast, addActivity, setSelectedLead, addLead } = useApp();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortMode, setSortMode] = useState('default');

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    deal_size: '',
    stage: 'Prospecting' as Stage,
    probability: 10,
    close_date: '',
    source: '' as Source,
    last_activity: 'Call' as ActivityType,
    notes: '',
  });

  // Drag state
  const [draggedDeal, setDraggedDeal] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Log activity state
  const [logType, setLogType] = useState<ActivityType>('Call');
  const [logNote, setLogNote] = useState('');

  // ═══════════════════════════════════════════════════════════
  // COMPUTED DATA
  // ═══════════════════════════════════════════════════════════

  const activeDeals = useMemo(() => {
    return leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage));
  }, [leads]);

  const filteredDeals = useMemo(() => {
    let result = [...activeDeals];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    }

    // Stage filter
    if (stageFilter) {
      result = result.filter(l => l.stage === stageFilter);
    }

    // Sort
    switch (sortMode) {
      case 'value-desc':
        result.sort((a, b) => b.deal_size - a.deal_size);
        break;
      case 'ev-desc':
        result.sort((a, b) => (b.deal_size * b.probability) - (a.deal_size * a.probability));
        break;
      case 'prob-desc':
        result.sort((a, b) => b.probability - a.probability);
        break;
      case 'close-asc':
        result.sort((a, b) => {
          const aDate = a.close_date ? new Date(a.close_date).getTime() : Infinity;
          const bDate = b.close_date ? new Date(b.close_date).getTime() : Infinity;
          return aDate - bDate;
        });
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'stale':
        result.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        break;
    }

    return result;
  }, [activeDeals, searchQuery, stageFilter, sortMode]);

  // Summary metrics
  const totalDeals = activeDeals.length;
  const totalRevenue = activeDeals.reduce((s, l) => s + l.deal_size, 0);
  const totalEV = activeDeals.reduce((s, l) => s + Math.round(l.deal_size * l.probability / 100), 0);
  const wonDeals = leads.filter(l => l.stage === 'Closed Won');
  const lostDeals = leads.filter(l => l.stage === 'Closed Lost');
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;

  const dealsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    STAGES.forEach(s => map[s] = []);
    filteredDeals.forEach(d => {
      if (map[d.stage]) map[d.stage].push(d);
    });
    return map;
  }, [filteredDeals]);

  const dealActivities = useMemo(() => {
    if (!selectedDeal) return [];
    return activities.filter(a =>
      a.lead_id === selectedDeal.id || a.lead_name === selectedDeal.name
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [selectedDeal, activities]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const openDetailDrawer = useCallback((deal: Lead, tab: DetailTab = 'overview') => {
    setSelectedDeal(deal);
    setDetailTab(tab);
    setShowDrawer(true);
    setSelectedLead(deal);
  }, [setSelectedLead]);

  const closeDetailDrawer = useCallback(() => {
    setShowDrawer(false);
    setSelectedDeal(null);
  }, []);

  const handleQuickStage = useCallback(async (dealId: string, direction: -1 | 1) => {
    const deal = leads.find(l => l.id === dealId);
    if (!deal) return;
    const currentIdx = STAGES.indexOf(deal.stage as any);
    const newIdx = currentIdx + direction;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    const newStage = STAGES[newIdx];
    await updateLead(dealId, {
      stage: newStage,
      probability: DEFAULT_PROB[newStage],
    });
    showToast('success', `Moved to ${newStage}`);
  }, [leads, updateLead, showToast]);

  // Drag handlers
  const handleDragStart = useCallback((deal: Lead) => {
    setDraggedDeal(deal);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(async (stage: string) => {
    if (!draggedDeal || draggedDeal.stage === stage) {
      setDraggedDeal(null);
      setDragOverStage(null);
      return;
    }
    await updateLead(draggedDeal.id, {
      stage,
      probability: DEFAULT_PROB[stage],
    });
    showToast('success', `Moved to ${stage}`);
    setDraggedDeal(null);
    setDragOverStage(null);
  }, [draggedDeal, updateLead, showToast]);

  // Add deal
  const handleAddDeal = useCallback(async () => {
    if (!addFormData.name.trim()) {
      showToast('error', 'Please enter a deal name');
      return;
    }
    await addLead({
      name: addFormData.name.trim(),
      company: addFormData.company.trim() || null,
      email: addFormData.email.trim() || null,
      phone: addFormData.phone.trim() || null,
      deal_size: parseFloat(addFormData.deal_size) || 0,
      source: addFormData.source || 'Other',
      stage: addFormData.stage,
      probability: addFormData.probability,
      notes: addFormData.notes.trim() || null,
      owner_id: currentUser?.id || '0',
      close_date: addFormData.close_date || null,
      last_activity: addFormData.last_activity,
    });
    showToast('success', 'Deal created successfully');
    setShowAddModal(false);
    setAddFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      deal_size: '',
      stage: 'Prospecting',
      probability: 10,
      close_date: '',
      source: '' as Source,
      last_activity: 'Call',
      notes: '',
    });
  }, [addFormData, currentUser, showToast, addLead]);

  // Update deal from drawer
  const handleUpdateDeal = useCallback(async (updates: Partial<Lead>) => {
    if (!selectedDeal) return;
    await updateLead(selectedDeal.id, updates);
    showToast('success', 'Deal updated');
    setSelectedDeal(prev => prev ? { ...prev, ...updates } : null);
  }, [selectedDeal, updateLead, showToast]);

  // Log activity
  const handleLogActivity = useCallback(async () => {
    if (!selectedDeal || !logNote.trim()) {
      showToast('error', 'Please enter activity notes');
      return;
    }
    await addActivity({
      type: logType,
      lead_id: selectedDeal.id,
      lead_name: selectedDeal.name,
      company: selectedDeal.company,
      stage: selectedDeal.stage,
      date: new Date().toISOString().split('T')[0],
      duration: 0,
      notes: logNote.trim(),
      next_action: null,
      owner_id: currentUser?.id || '0',
    });
    showToast('success', `${logType} logged`);
    setLogNote('');
  }, [selectedDeal, logType, logNote, addActivity, currentUser, showToast]);

  // Delete deal
  const handleDeleteDeal = useCallback(async () => {
    if (!selectedDeal) return;
    if (!confirm(`Delete "${selectedDeal.name}"? This cannot be undone.`)) return;
    await deleteLead(selectedDeal.id);
    showToast('info', 'Deal deleted');
    closeDetailDrawer();
  }, [selectedDeal, deleteLead, showToast, closeDetailDrawer]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-3">
            Commercial Deals Pipeline
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
              <i className="fa-solid fa-trophy text-[10px]"></i>
              {winRate}% Win Rate
            </span>
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track pipeline stages, manage deal values, and log activities in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <i className="fa-solid fa-table-columns mr-1.5"></i>Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <i className="fa-solid fa-table-list mr-1.5"></i>Table
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg font-semibold hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>Add Deal
          </button>
        </div>
      </div>

      {/* ═══ SUMMARY BAR ═══ */}
      <div className="bg-gradient-to-r from-accent to-indigo-600 rounded-xl overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
          <div className="p-5 text-center">
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">Opportunities</div>
            <div className="text-3xl font-extrabold text-white mt-1">{totalDeals}</div>
            <div className="text-xs text-white/50 mt-1">active deals</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">Revenue</div>
            <div className="text-3xl font-extrabold text-white mt-1">{fmtCompact(totalRevenue)}</div>
            <div className="text-xs text-white/50 mt-1">total deal value</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">Expected Revenue</div>
            <div className="text-3xl font-extrabold text-white mt-1">{fmtCompact(totalEV)}</div>
            <div className="text-xs text-white/50 mt-1">expected value (EV)</div>
          </div>
        </div>
      </div>

      {/* ═══ FILTERS BAR ═══ */}
      <div className="bg-bg-card dark:bg-bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search deal or company..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-bg-page dark:bg-bg-page text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-card text-sm"
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-card text-sm"
        >
          <option value="default">Default Sort</option>
          <option value="value-desc">Value: High → Low</option>
          <option value="ev-desc">EV: High → Low</option>
          <option value="prob-desc">Confidence: High → Low</option>
          <option value="close-asc">Target Close: Soonest</option>
          <option value="recent">Last Updated</option>
          <option value="stale">Stalest First</option>
        </select>
        <div className="flex-1"></div>
        <span className="text-xs text-text-muted font-medium">
          {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ═══ KANBAN VIEW ═══ */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost').map(stage => {
              const stageDeals = dealsByStage[stage] || [];
              const totalValue = stageDeals.reduce((s, d) => s + d.deal_size, 0);
              const totalEV = stageDeals.reduce((s, d) => s + Math.round(d.deal_size * d.probability / 100), 0);
              const sc = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
              const isDragOver = dragOverStage === stage;

              return (
                <div
                  key={stage}
                  className="w-[270px] flex-shrink-0 flex flex-col"
                  onDragOver={e => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(stage)}
                >
                  {/* Column Header */}
                  <div
                    className="px-4 py-3 rounded-t-xl border-b-4 bg-white dark:bg-gray-800"
                    style={{ borderColor: sc }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: sc }}></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{stage}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-text-muted">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-text-primary dark:text-white">{fmtCurrency(totalValue)}</div>
                    <div className="text-xs text-text-muted">EV: {fmtCurrency(totalEV)}</div>
                  </div>

                  {/* Cards Container */}
                  <div
                    className={`flex-1 p-2 rounded-b-xl min-h-[200px] space-y-2 transition-colors ${
                      isDragOver
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-accent'
                        : 'bg-gray-50 dark:bg-gray-900/30'
                    }`}
                  >
                    {stageDeals.map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        stageColor={sc}
                        onDragStart={() => handleDragStart(deal)}
                        onClick={() => openDetailDrawer(deal)}
                      />
                    ))}
                    {stageDeals.length === 0 && !isDragOver && (
                      <div className="flex flex-col items-center justify-center py-8 text-text-muted border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <i className="fa-regular fa-folder-open text-lg mb-1"></i>
                        <span className="text-xs">Drop here</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setAddFormData(prev => ({ ...prev, stage: stage as Stage }));
                        setShowAddModal(true);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-text-muted hover:text-accent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-dashed border-transparent hover:border-accent/30 transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>Add deal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === 'table' && (
        <div className="bg-bg-card dark:bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Deal / Account</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Revenue</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Stage</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Exp. Value (EV)
                    <i className="fa-regular fa-circle-question ml-1 text-gray-300 cursor-help" title="Expected Value = Revenue × Confidence"></i>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Target Close</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Activity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Contact</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeals.map(deal => {
                  const ev = Math.round(deal.deal_size * deal.probability / 100);
                  const sc = STAGE_COLORS[deal.stage as keyof typeof STAGE_COLORS];
                  const stageIdx = STAGES.indexOf(deal.stage as any);
                  const canFwd = deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost';
                  const canBwd = stageIdx > 0;
                  const cds = closeDateStatus(deal.close_date || null);
                  const days = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86400000);
                  const lastAct = deal.last_activity || 'Note';

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => openDetailDrawer(deal)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                            style={{ background: sc }}
                          >
                            {deal.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary dark:text-white text-sm">{deal.name}</div>
                            <div className="text-[11px] text-text-muted flex items-center gap-1">
                              <i className="fa-regular fa-building text-[9px]"></i>{deal.company || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-text-primary dark:text-white">{fmtCurrency(deal.deal_size)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickStage(deal.id, -1)}
                            disabled={!canBwd}
                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${
                              canBwd ? 'border-border hover:border-accent hover:text-accent text-text-muted' : 'border-transparent text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <i className="fa-solid fa-chevron-left text-[10px]"></i>
                          </button>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stagePillClass(deal.stage)}`}>
                            <i className="fa-solid fa-circle text-[6px] mr-1"></i>{deal.stage}
                          </span>
                          <button
                            onClick={() => handleQuickStage(deal.id, 1)}
                            disabled={!canFwd}
                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${
                              canFwd ? 'border-border hover:border-accent hover:text-accent text-text-muted' : 'border-transparent text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <i className="fa-solid fa-chevron-right text-[10px]"></i>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-accent text-sm">{fmtCurrency(ev)}</div>
                        <div className="text-[11px] text-text-muted">{deal.probability}% confidence</div>
                      </td>
                      <td className="px-4 py-3">
                        {deal.close_date ? (
                          <span className={`text-xs font-medium ${
                            cds === 'overdue' ? 'text-red-600 font-bold' :
                            cds === 'soon' ? 'text-amber-600 font-bold' :
                            'text-text-secondary'
                          }`}>
                            {cds === 'overdue' && <i className="fa-solid fa-circle-exclamation mr-1"></i>}
                            {formatDate(deal.close_date)}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lastAct === 'Call' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                          lastAct === 'Email' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                          lastAct === 'Meeting' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-600'
                        }`}>
                          <i className={`fa-solid ${ACTIVITY_ICONS[lastAct] || 'fa-circle'} text-[9px]`}></i>
                          {lastAct}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          days === 0 ? 'text-green-600 font-bold' :
                          days < 4 ? 'text-text-secondary' :
                          days < 7 ? 'text-amber-600 font-bold' :
                          'text-red-500 font-bold'
                        }`}>
                          {timeAgo(deal.updated_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetailDrawer(deal)}
                            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-accent hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                            title="View"
                          >
                            <i className="fa-solid fa-eye text-xs"></i>
                          </button>
                          <button
                            onClick={() => openDetailDrawer(deal, 'log')}
                            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                            title="Log Activity"
                          >
                            <i className="fa-solid fa-plus text-xs"></i>
                          </button>
                          <button
                            onClick={() => { setSelectedDeal(deal); handleDeleteDeal(); }}
                            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="text-text-muted">
                        <i className="fa-solid fa-folder-open text-3xl mb-3 block opacity-30"></i>
                        <p className="text-sm font-medium text-text-secondary">No deals found</p>
                        <p className="text-xs mt-1">Adjust filters or add a new deal.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ DETAIL DRAWER ═══ */}
      <Drawer
        isOpen={showDrawer}
        onClose={closeDetailDrawer}
        title="Deal Details"
        footer={
          <div className="flex gap-2">
            <button
              onClick={handleDeleteDeal}
              className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
            >
              <i className="fa-solid fa-trash-can mr-1.5"></i>Delete
            </button>
            {detailTab === 'edit' && (
              <button
                onClick={() => {
                  showToast('success', 'Changes saved');
                  setDetailTab('overview');
                }}
                className="flex-1 px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all"
              >
                <i className="fa-solid fa-check mr-1.5"></i>Save Changes
              </button>
            )}
          </div>
        }
      >
        {selectedDeal && (
          <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['overview', 'edit', 'log'] as DetailTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                    detailTab === tab
                      ? 'bg-white dark:bg-gray-700 text-accent shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <i className={`fa-solid ${
                    tab === 'overview' ? 'fa-circle-info' :
                    tab === 'edit' ? 'fa-pen' :
                    'fa-clock-rotate-left'
                  } mr-1.5`}></i>
                  {tab === 'overview' ? 'Overview' : tab === 'edit' ? 'Edit' : 'Activity Log'}
                </button>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ background: STAGE_COLORS[selectedDeal.stage as keyof typeof STAGE_COLORS] }}
              >
                {selectedDeal.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-text-primary dark:text-white truncate">{selectedDeal.name}</h3>
                <p className="text-sm text-text-muted">{selectedDeal.company || '—'}</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold mt-2 ${stagePillClass(selectedDeal.stage)}`}>
                  <i className="fa-solid fa-circle text-[6px]"></i>
                  {selectedDeal.stage}
                </span>
              </div>
            </div>

            {detailTab === 'overview' && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Revenue</div>
                    <div className="text-xl font-bold text-text-primary dark:text-white mt-1">{fmtCurrency(selectedDeal.deal_size)}</div>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-wider">Expected Value</div>
                    <div className="text-xl font-bold text-accent mt-1">{fmtCurrency(Math.round(selectedDeal.deal_size * selectedDeal.probability / 100))}</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase">Target Close</span>
                      <p className="font-semibold text-text-primary dark:text-white mt-1">{formatDate(selectedDeal.close_date)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase">Lead Source</span>
                      <p className="font-semibold text-text-primary dark:text-white mt-1">{selectedDeal.source || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase">Last Contact</span>
                      <p className="font-semibold mt-1" style={{ color: probColor(100 - Math.min(Math.floor((Date.now() - new Date(selectedDeal.updated_at).getTime()) / 86400000) * 10, 100)) }}>
                        {timeAgo(selectedDeal.updated_at)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase">Email</span>
                      <p className="font-semibold text-accent mt-1">{selectedDeal.email || '—'}</p>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Confidence</span>
                      <span className="text-sm font-bold" style={{ color: probColor(selectedDeal.probability) }}>{selectedDeal.probability}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${selectedDeal.probability}%`, background: probColor(selectedDeal.probability) }}
                      ></div>
                    </div>
                  </div>

                  {/* Quick Stage Mover */}
                  <div>
                    <div className="text-[10px] font-bold text-text-muted uppercase mb-2">Quick Move To</div>
                    <div className="flex flex-wrap gap-1.5">
                      {STAGES.map(s => {
                        const isCurrent = s === selectedDeal.stage;
                        const idx = STAGES.indexOf(s as Stage);
                        const curIdx = STAGES.indexOf(selectedDeal.stage as Stage);
                        const isForward = idx === curIdx + 1;
                        return (
                          <button
                            key={s}
                            onClick={() => handleUpdateDeal({ stage: s as Stage, probability: DEFAULT_PROB[s as keyof typeof DEFAULT_PROB] })}
                            disabled={isCurrent}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                              isCurrent
                                ? 'bg-gray-100 dark:bg-gray-800 text-text-muted border-transparent cursor-default'
                                : isForward
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-accent border-accent/30 hover:border-accent'
                                : 'border-border hover:border-accent hover:text-accent'
                            }`}
                          >
                            {isCurrent ? <i className="fa-solid fa-check mr-1"></i> : null}{s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedDeal.notes && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-[10px] font-bold text-text-muted uppercase mb-2">Notes</div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{selectedDeal.notes}</p>
                    </div>
                  )}

                  {/* Recent Activities */}
                  <div>
                    <div className="text-[10px] font-bold text-text-muted uppercase mb-3">Recent Activities</div>
                    {dealActivities.length === 0 ? (
                      <div className="text-center py-6 text-text-muted text-sm">
                        No activities yet.{' '}
                        <button onClick={() => setDetailTab('log')} className="text-accent font-semibold hover:underline">Log one now</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dealActivities.slice(0, 3).map(act => (
                          <div key={act.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${ACTIVITY_BGS[act.type] || 'bg-gray-100'}`}>
                              <i className={`fa-solid ${ACTIVITY_ICONS[act.type] || 'fa-circle'} text-xs`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-text-primary dark:text-white">{act.type}</div>
                              <div className="text-[11px] text-text-muted line-clamp-2">{act.notes || '—'}</div>
                              <div className="text-[10px] text-text-muted mt-0.5">{timeAgo(act.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {detailTab === 'edit' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Deal Name *</label>
                  <input
                    type="text"
                    value={selectedDeal.name}
                    onChange={e => setSelectedDeal({ ...selectedDeal, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Revenue ($)</label>
                    <input
                      type="number"
                      value={selectedDeal.deal_size}
                      onChange={e => setSelectedDeal({ ...selectedDeal, deal_size: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Target Close</label>
                    <input
                      type="date"
                      value={selectedDeal.close_date || ''}
                      onChange={e => setSelectedDeal({ ...selectedDeal, close_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                    Confidence — <span className="text-accent">EV: {fmtCurrency(Math.round(selectedDeal.deal_size * selectedDeal.probability / 100))}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedDeal.probability}
                      onChange={e => setSelectedDeal({ ...selectedDeal, probability: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-sm font-bold w-12 text-right" style={{ color: probColor(selectedDeal.probability) }}>
                      {selectedDeal.probability}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Lead Source</label>
                    <select
                      value={selectedDeal.source}
                      onChange={e => setSelectedDeal({ ...selectedDeal, source: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page"
                    >
                      <option value="">— Select —</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Last Activity</label>
                    <select
                      value={selectedDeal.last_activity || 'Call'}
                      onChange={e => setSelectedDeal({ ...selectedDeal, last_activity: e.target.value as ActivityType })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page"
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Notes</label>
                  <textarea
                    value={selectedDeal.notes || ''}
                    onChange={e => setSelectedDeal({ ...selectedDeal, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page resize-none"
                  />
                </div>
              </div>
            )}

            {detailTab === 'log' && (
              <div className="space-y-4">
                {/* Log new activity */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-border">
                  <div className="text-xs font-bold text-text-secondary mb-3">
                    <i className="fa-solid fa-plus text-accent mr-1.5"></i>Log New Activity
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ACTIVITY_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setLogType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          logType === t
                            ? ACTIVITY_BGS[t] + ' border-current'
                            : 'border-border text-text-muted hover:border-accent hover:text-accent'
                        }`}
                      >
                        <i className={`fa-solid ${ACTIVITY_ICONS[t]} mr-1 text-[10px]`}></i>
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={logNote}
                    onChange={e => setLogNote(e.target.value)}
                    placeholder="Add notes about this activity..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-gray-800 text-sm resize-none mb-3"
                  />
                  <button
                    onClick={handleLogActivity}
                    className="w-full px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all"
                  >
                    <i className="fa-solid fa-check mr-1.5"></i>Save Activity
                  </button>
                </div>

                {/* Activity History */}
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase mb-3">Activity History</div>
                  {dealActivities.length === 0 ? (
                    <div className="text-center py-6 text-text-muted text-sm">No activities yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {dealActivities.map(act => (
                        <div key={act.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ACTIVITY_BGS[act.type] || 'bg-gray-100'}`}>
                            <i className={`fa-solid ${ACTIVITY_ICONS[act.type] || 'fa-circle'} text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-text-primary dark:text-white">{act.type}</span>
                              <span className="text-[10px] text-text-muted">{timeAgo(act.created_at)}</span>
                            </div>
                            <p className="text-sm text-text-secondary line-clamp-3">{act.notes || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ═══ ADD DEAL MODAL ═══ */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Sales Opportunity" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Opportunity Description *</label>
            <input
              type="text"
              value={addFormData.name}
              onChange={e => setAddFormData({ ...addFormData, name: e.target.value })}
              placeholder="e.g. Cloud Server Suite Renewal"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Company</label>
            <input
              type="text"
              value={addFormData.company}
              onChange={e => setAddFormData({ ...addFormData, company: e.target.value })}
              placeholder="Company name"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Stage</label>
              <select
                value={addFormData.stage}
                onChange={e => setAddFormData({ ...addFormData, stage: e.target.value as Stage, probability: DEFAULT_PROB[e.target.value] })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
              >
                {STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Expected Close Date</label>
              <input
                type="date"
                value={addFormData.close_date}
                onChange={e => setAddFormData({ ...addFormData, close_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Revenue ($)</label>
              <input
                type="number"
                value={addFormData.deal_size}
                onChange={e => setAddFormData({ ...addFormData, deal_size: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Confidence (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={addFormData.probability}
                  onChange={e => setAddFormData({ ...addFormData, probability: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-10 text-right" style={{ color: probColor(addFormData.probability) }}>
                  {addFormData.probability}%
                </span>
              </div>
            </div>
          </div>

          {/* EV Preview */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800">
            <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
              <i className="fa-solid fa-bolt"></i>Expected Value = Revenue × Confidence
            </span>
            <span className="text-lg font-extrabold text-accent">
              {fmtCurrency(Math.round((parseFloat(addFormData.deal_size) || 0) * addFormData.probability / 100))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Lead Source</label>
              <select
                value={addFormData.source}
                onChange={e => setAddFormData({ ...addFormData, source: e.target.value as Source })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
              >
                <option value="">— Select source —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Last Activity</label>
              <select
                value={addFormData.last_activity}
                onChange={e => setAddFormData({ ...addFormData, last_activity: e.target.value as ActivityType })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page"
              >
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>📞 {t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Notes (Optional)</label>
            <textarea
              value={addFormData.notes}
              onChange={e => setAddFormData({ ...addFormData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-bg-page resize-none"
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDeal}
              disabled={!addFormData.name.trim()}
              className="flex-1 px-4 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-check mr-1.5"></i>Create Deal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DEAL CARD COMPONENT
// ══════════════════════════════════════════════════════════════

function DealCard({
  deal,
  stageColor,
  onDragStart,
  onClick,
}: {
  deal: Lead;
  stageColor: string;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const ev = Math.round(deal.deal_size * deal.probability / 100);
  const pc = probColor(deal.probability);
  const lastAct = deal.last_activity || 'Note';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-accent/50 transition-all active:cursor-grabbing"
      style={{ borderLeftWidth: '3px', borderLeftColor: stageColor }}
    >
      <div className="font-semibold text-text-primary dark:text-white text-sm truncate">{deal.name}</div>
      <div className="text-[11px] text-text-muted mt-0.5 truncate">{deal.company}</div>

      <div className="mt-2">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: pc + '20', color: pc }}
        >
          {deal.probability}%
        </span>
      </div>

      <div className="flex items-end justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-sm font-extrabold text-text-primary dark:text-white">{fmtCompact(deal.deal_size)}</span>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <i className={`fa-solid ${ACTIVITY_ICONS[lastAct] || 'fa-circle'} text-[9px]`}></i>
            {lastAct}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">EV: {fmtCompact(ev)}</div>
        </div>
      </div>
    </div>
  );
}
