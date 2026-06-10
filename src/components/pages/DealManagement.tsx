import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Drawer } from '../shared/Drawer';
import { Modal } from '../shared/Modal';
import { STAGES, STAGE_COLORS, SOURCES, ACTIVITY_TYPES, ACCOUNTS, type Lead, type Stage, type Source, type ActivityType, type Account } from '../../types';

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
// CUSTOMER TYPE
// ══════════════════════════════════════════════════════════════

interface Customer {
  name: string;
  company: string;
  email: string;
  phone: string;
  wonCount: number;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

type ViewMode = 'table' | 'kanban';
type DetailTab = 'overview' | 'edit' | 'log';

export function DealManagement() {
  const { leads, updateLead, deleteLead, activities, currentUser, showToast, addActivity, setSelectedLead, addLead, selectedMemberId } = useApp();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [sortMode, setSortMode] = useState('default');

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    customer: null as Customer | null,
    deal_name: '',
    deal_size: '',
    stage: 'Prospecting' as Stage,
    source: '' as Source,
    assigned_to: '',
  });
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Lead | null>(null);

  // Drag state
  const [draggedDeal, setDraggedDeal] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Log activity state
  const [logType, setLogType] = useState<ActivityType>('Call');
  const [logNote, setLogNote] = useState('');

  // ═══════════════════════════════════════════════════════════
  // COMPUTED DATA
  // ═══════════════════════════════════════════════════════════

  // Team: manager sees all, member sees only self
  const assignableTeam = useMemo(() => {
    if (currentUser?.role === 'manager') {
      return ACCOUNTS;
    }
    return currentUser ? [currentUser] : [];
  }, [currentUser]);

  // Salespeople for filter (manager only)
  const salespeople = useMemo(() => {
    return ACCOUNTS.map(a => a.name);
  }, []);

  // Customer list from leads (unique by name + company)
  const customers = useMemo(() => {
    const map: Record<string, Customer> = {};
    leads.forEach(l => {
      const key = (l.name || '') + '|' + (l.company || '');
      if (!map[key]) {
        map[key] = {
          name: l.name || '',
          company: l.company || '',
          email: l.email || '',
          phone: l.phone || '',
          wonCount: 0,
        };
      }
    });
    // Count won deals per customer
    Object.values(map).forEach(c => {
      c.wonCount = leads.filter(l => l.name === c.name && l.company === c.company && l.stage === 'Closed Won').length;
    });
    return Object.values(map).sort((a, b) => b.wonCount - a.wonCount || a.name.localeCompare(b.name));
  }, [leads]);

  // Filtered customers for dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  // Get latest activity type for a lead
  const getLatestActivityType = useCallback((leadId: string): string => {
    const leadActs = activities
      .filter(a => a.lead_id === leadId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return leadActs.length ? leadActs[0].type : '';
  }, [activities]);

  // Filtered leads based on role and manager's selected member filter
  const visibleLeads = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === 'member') {
      // Member sees only their own leads
      return leads.filter(l => l.owner_id === currentUser.id);
    }

    // Manager: check selectedMemberId from context
    if (selectedMemberId === null) {
      return leads;
    }
    return leads.filter(l => l.owner_id === selectedMemberId);
  }, [leads, currentUser, selectedMemberId]);

  // Active deals (not won/lost)
  const activeDeals = useMemo(() => {
    return visibleLeads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage));
  }, [visibleLeads]);

  // All deals for Kanban (including closed)
  const allDealsForKanban = useMemo(() => {
    return visibleLeads;
  }, [visibleLeads]);

  // Filtered deals
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

    // Salesperson filter (manager only)
    if (salespersonFilter && currentUser?.role === 'manager') {
      const account = ACCOUNTS.find(a => a.name === salespersonFilter);
      if (account) {
        result = result.filter(l => l.owner_id === account.id);
      }
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
  }, [activeDeals, searchQuery, stageFilter, salespersonFilter, sortMode, currentUser]);

  // Summary metrics
  const totalDeals = activeDeals.length;
  const totalRevenue = activeDeals.reduce((s, l) => s + l.deal_size, 0);
  const totalEV = activeDeals.reduce((s, l) => s + Math.round(l.deal_size * l.probability / 100), 0);
  const wonDeals = visibleLeads.filter(l => l.stage === 'Closed Won');
  const lostDeals = visibleLeads.filter(l => l.stage === 'Closed Lost');
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;

  // Deals by stage for Kanban
  const dealsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    STAGES.forEach(s => map[s] = []);
    allDealsForKanban.forEach(d => {
      if (map[d.stage]) map[d.stage].push(d);
    });
    return map;
  }, [allDealsForKanban]);

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
    const currentIdx = STAGES.indexOf(deal.stage as Stage);
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

  // Customer selection
  const handleSelectCustomer = useCallback((customer: Customer) => {
    setAddFormData(prev => ({
      ...prev,
      customer,
      deal_name: prev.deal_name || `${customer.company} - Enterprise Package`,
    }));
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  }, []);

  // Add deal
  const handleAddDeal = useCallback(async () => {
    if (!addFormData.customer) {
      showToast('error', 'Please select a customer');
      return;
    }
    if (!addFormData.deal_size || parseFloat(addFormData.deal_size) <= 0) {
      showToast('error', 'Please enter a valid revenue value');
      return;
    }

    const customer = addFormData.customer;
    const assignedTo = addFormData.assigned_to || currentUser?.id || '0';

    await addLead({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      deal_size: parseFloat(addFormData.deal_size),
      source: addFormData.source || 'Other',
      stage: addFormData.stage,
      probability: DEFAULT_PROB[addFormData.stage] || 0,
      notes: addFormData.deal_name || null,
      owner_id: assignedTo,
      close_date: null,
      last_activity: 'Note',
    });

    const assignedAccount = ACCOUNTS.find(a => a.id === assignedTo);
    showToast('success', `Deal created for ${customer.name}${currentUser?.role === 'manager' && assignedAccount ? ' · assigned to ' + assignedAccount.name : ''}`);
    setShowAddModal(false);
    setAddFormData({
      customer: null,
      deal_name: '',
      deal_size: '',
      stage: 'Prospecting',
      source: '' as Source,
      assigned_to: '',
    });
  }, [addFormData, currentUser, showToast, addLead]);

  // Update deal from edit modal
  const handleUpdateDeal = useCallback(async () => {
    if (!editFormData) return;
    await updateLead(editFormData.id, {
      name: editFormData.name,
      company: editFormData.company,
      deal_size: editFormData.deal_size,
      probability: editFormData.probability,
      stage: editFormData.stage,
      source: editFormData.source,
      owner_id: editFormData.owner_id,
    });
    showToast('success', 'Deal updated successfully');
    setShowEditModal(false);
    setEditFormData(null);
  }, [editFormData, updateLead, showToast]);

  // Open edit modal
  const openEditModal = useCallback((deal: Lead) => {
    setEditFormData(deal);
    setShowEditModal(true);
  }, []);

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
  const handleDeleteDeal = useCallback(async (deal: Lead) => {
    if (!confirm(`Delete "${deal.name}"? This cannot be undone.`)) return;
    await deleteLead(deal.id);
    showToast('info', 'Deal deleted');
    closeDetailDrawer();
    setShowEditModal(false);
  }, [deleteLead, showToast, closeDetailDrawer]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (!visibleLeads.length) {
      showToast('warning', 'No deals to export');
      return;
    }
    const headers = ['Deal/Contact', 'Company', 'Email', 'Phone', 'Stage', 'Revenue (USD)', 'Probability (%)', 'Expected Value (USD)', 'Source', 'Assigned To', 'Latest Activity', 'Created', 'Last Updated'];
    const esc = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const day = (d: string) => d ? new Date(d).toISOString().slice(0, 10) : '';
    const rows = visibleLeads.map(d => {
      const ev = Math.round((d.deal_size * d.probability) / 100);
      const account = ACCOUNTS.find(a => a.id === d.owner_id);
      return [d.name, d.company, d.email, d.phone, d.stage, d.deal_size || 0, d.probability || 0, ev, d.source, account?.name || '', getLatestActivityType(d.id) || '', day(d.created_at), day(d.updated_at)].map(esc).join(',');
    });
    const csv = '\ufeff' + headers.map(esc).join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'salestrack_deals.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${visibleLeads.length} deals to CSV`);
  }, [visibleLeads, getLatestActivityType, showToast]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-picker-container')) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
            Track stages, adjust confidence multipliers, and manage deal parameters.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <i className="fa-solid fa-table-columns mr-1.5"></i>Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <i className="fa-solid fa-table-list mr-1.5"></i>Table
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-border rounded-lg font-semibold text-sm text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-file-csv"></i>Export CSV
          </button>
          <button
            onClick={() => {
              setAddFormData({
                customer: null,
                deal_name: '',
                deal_size: '',
                stage: 'Prospecting',
                source: '' as Source,
                assigned_to: currentUser?.id || '',
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>Add Deal
          </button>
        </div>
      </div>

      {/* ═══ SUMMARY BAR ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider text-text-muted">Opportunities</div>
          <div className="text-2xl font-extrabold text-text-primary dark:text-white">{totalDeals}</div>
          <div className="text-[10px] text-text-muted mt-1">active pipeline deals</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider text-text-muted">Revenue Values</div>
          <div className="text-2xl font-extrabold text-indigo-600">{fmtCompact(totalRevenue)}</div>
          <div className="text-[10px] text-text-muted mt-1">unweighted deal total</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider text-text-muted">Expected Revenue (EV)</div>
          <div className="text-2xl font-extrabold text-emerald-600">{fmtCompact(totalEV)}</div>
          <div className="text-[10px] text-text-muted mt-1">weighted by probability</div>
        </div>
      </div>

      {/* ═══ FILTERS BAR ═══ */}
      <div className="bg-bg-card dark:bg-bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search opportunity or company..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-bg-page dark:bg-bg-page text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-bg-card text-xs font-bold"
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {currentUser?.role === 'manager' && (
          <select
            value={salespersonFilter}
            onChange={e => setSalespersonFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-xs font-bold text-amber-600"
          >
            <option value="">All Salespeople</option>
            {salespeople.map(sp => <option key={sp} value={sp}>👤 {sp}</option>)}
          </select>
        )}
        <div className="flex-1"></div>
        <span className="text-xs text-text-muted font-medium">
          {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ═══ KANBAN VIEW ═══ */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => {
              const stageDeals = dealsByStage[stage] || [];
              const totalValue = stageDeals.reduce((s, d) => s + d.deal_size, 0);
              const totalEV = stageDeals.reduce((s, d) => s + Math.round(d.deal_size * d.probability / 100), 0);
              const sc = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
              const isDragOver = dragOverStage === stage;
              const isClosedWon = stage === 'Closed Won';
              const isClosedLost = stage === 'Closed Lost';

              return (
                <div
                  key={stage}
                  className="w-[280px] flex-shrink-0 flex flex-col"
                  onDragOver={e => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(stage)}
                >
                  {/* Column Header */}
                  <div
                    className={`px-3 py-2 rounded-t-xl border-b-4 ${
                      isClosedWon ? 'bg-green-50 dark:bg-green-900/20' :
                      isClosedLost ? 'bg-red-50 dark:bg-red-900/20' :
                      'bg-white dark:bg-gray-800'
                    }`}
                    style={{ borderColor: sc }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: sc }}></div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">{stage}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isClosedWon ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' :
                        isClosedLost ? 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300' :
                        'bg-gray-100 dark:bg-gray-700 text-text-muted'
                      }`}>
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
                        : isClosedWon ? 'bg-green-50/50 dark:bg-green-900/10' :
                        isClosedLost ? 'bg-red-50/50 dark:bg-red-900/10' :
                        'bg-gray-50 dark:bg-gray-900/30'
                    }`}
                  >
                    {stageDeals.map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        stageColor={sc}
                        assignedTo={ACCOUNTS.find(a => a.id === deal.owner_id)?.name}
                        latestActivity={getLatestActivityType(deal.id)}
                        onDragStart={() => handleDragStart(deal)}
                        onClick={() => openDetailDrawer(deal)}
                      />
                    ))}
                    {stageDeals.length === 0 && !isDragOver && !isClosedWon && !isClosedLost && (
                      <div className="flex flex-col items-center justify-center py-8 text-text-muted border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <i className="fa-regular fa-folder-open text-lg mb-1"></i>
                        <span className="text-xs">Drop here</span>
                      </div>
                    )}
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
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Deal / Account</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Revenue</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Stage</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Exp. Value (EV)
                    <i className="fa-regular fa-circle-question ml-1 text-gray-300 cursor-help" title="Expected Value = Revenue × Confidence"></i>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Activity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Updated</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeals.map(deal => {
                  const ev = Math.round(deal.deal_size * deal.probability / 100);
                  const sc = STAGE_COLORS[deal.stage as keyof typeof STAGE_COLORS];
                  const stageIdx = STAGES.indexOf(deal.stage as Stage);
                  const canFwd = deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost';
                  const canBwd = stageIdx > 0;
                  const latestAct = getLatestActivityType(deal.id);
                  const assignedAccount = ACCOUNTS.find(a => a.id === deal.owner_id);

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
                            <div className="font-bold text-text-primary dark:text-white text-sm">{deal.name}</div>
                            <div className="text-[10px] text-text-muted flex items-center gap-1">
                              <i className="fa-regular fa-building text-[9px]"></i>{deal.company || '—'}
                            </div>
                            {assignedAccount && (
                              <div className="text-[10px] text-text-muted mt-0.5">
                                <i className="fa-solid fa-user-tie text-[9px]"></i> {assignedAccount.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-text-primary dark:text-white">{fmtCurrency(deal.deal_size)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuickStage(deal.id, -1)}
                            disabled={!canBwd}
                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${
                              canBwd ? 'border-border hover:border-accent hover:text-accent text-text-muted' : 'border-transparent text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <i className="fa-solid fa-chevron-left text-[8px]"></i>
                          </button>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${stagePillClass(deal.stage)}`}>
                            {deal.stage}
                          </span>
                          <button
                            onClick={() => handleQuickStage(deal.id, 1)}
                            disabled={!canFwd}
                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${
                              canFwd ? 'border-border hover:border-accent hover:text-accent text-text-muted' : 'border-transparent text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <i className="fa-solid fa-chevron-right text-[8px]"></i>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-indigo-600 text-sm">{fmtCurrency(ev)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {latestAct ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            latestAct === 'Call' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                            latestAct === 'Email' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                            latestAct === 'Meeting' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-600'
                          }`}>
                            <i className={`fa-solid ${ACTIVITY_ICONS[latestAct] || 'fa-circle'} text-[9px]`}></i>
                            {latestAct}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-muted whitespace-nowrap">{timeAgo(deal.updated_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetailDrawer(deal)}
                            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                            title="View"
                          >
                            <i className="fa-solid fa-eye text-xs"></i>
                          </button>
                          <button
                            onClick={() => openEditModal(deal)}
                            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteDeal(deal)}
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
                    <td colSpan={7} className="px-4 py-12 text-center">
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
              onClick={() => selectedDeal && handleDeleteDeal(selectedDeal)}
              className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
            >
              <i className="fa-solid fa-trash-can mr-1.5"></i>Delete
            </button>
            <button
              onClick={() => selectedDeal && openEditModal(selectedDeal)}
              className="flex-1 px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all"
            >
              <i className="fa-solid fa-pen mr-1.5"></i>Edit Deal
            </button>
          </div>
        }
      >
        {selectedDeal && (
          <div className="space-y-6">
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
                  <span className="text-[10px] font-bold text-text-muted uppercase">Lead Source</span>
                  <p className="font-semibold text-text-primary dark:text-white mt-1">{selectedDeal.source || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase">Assigned To</span>
                  <p className="font-semibold text-text-primary dark:text-white mt-1">{ACCOUNTS.find(a => a.id === selectedDeal.owner_id)?.name || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase">Email</span>
                  <p className="font-semibold text-accent mt-1">{selectedDeal.email || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase">Phone</span>
                  <p className="font-semibold text-text-primary dark:text-white mt-1">{selectedDeal.phone || '—'}</p>
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
                  <div className="text-center py-6 text-text-muted text-sm">No activities yet.</div>
                ) : (
                  <div className="space-y-2">
                    {dealActivities.slice(0, 5).map(act => (
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
          </div>
        )}
      </Drawer>

      {/* ═══ ADD DEAL MODAL ═══ */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Deal" size="lg">
        <div className="space-y-4">
          {/* Customer Picker */}
          <div className="customer-picker-container relative">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
              Customer <span className="text-text-muted font-normal">(from Lead Management)</span>
            </label>
            <div
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                showCustomerDropdown ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-accent'
              }`}
            >
              {addFormData.customer ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs">
                    {addFormData.customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary text-sm">{addFormData.customer.name}</div>
                    <div className="text-[11px] text-text-muted">{addFormData.customer.company}</div>
                  </div>
                  {addFormData.customer.wonCount > 0 && (
                    <span className="text-[11px] font-bold text-red-500">({addFormData.customer.wonCount} deal)</span>
                  )}
                </>
              ) : (
                <span className="text-text-muted text-sm">Select a customer...</span>
              )}
              <i className="fa-solid fa-chevron-down text-[10px] text-text-muted ml-auto"></i>
            </div>

            {/* Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-accent rounded-lg shadow-lg max-h-60 overflow-hidden">
                <input
                  ref={customerInputRef}
                  type="text"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="Search customers..."
                  className="w-full px-3 py-2 border-b border-border text-sm focus:outline-none"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="px-3 py-4 text-center text-text-muted text-sm">No customers found</div>
                  ) : (
                    filteredCustomers.map((c, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectCustomer(c)}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer border-b border-border-light last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs">
                          {c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-text-primary text-sm">{c.name}</div>
                          <div className="text-[11px] text-text-muted">{c.company}</div>
                        </div>
                        {c.wonCount > 0 && (
                          <span className="text-[11px] font-bold text-red-500">({c.wonCount} deal)</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Opportunity / Deal Name */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Opportunity / Deal Name</label>
            <input
              type="text"
              value={addFormData.deal_name}
              onChange={e => setAddFormData({ ...addFormData, deal_name: e.target.value })}
              placeholder="e.g. Enterprise package Q3"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
            />
          </div>

          {/* Revenue & Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Revenue (USD)</label>
              <input
                type="number"
                value={addFormData.deal_size}
                onChange={e => setAddFormData({ ...addFormData, deal_size: e.target.value })}
                placeholder="30000"
                min="0"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Stage</label>
              <select
                value={addFormData.stage}
                onChange={e => setAddFormData({ ...addFormData, stage: e.target.value as Stage })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
              >
                {STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source & Assign To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Source</label>
              <select
                value={addFormData.source}
                onChange={e => setAddFormData({ ...addFormData, source: e.target.value as Source })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
              >
                <option value="">— Select source —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                {currentUser?.role === 'manager' ? 'Assign To' : 'Assigned To'}
              </label>
              <select
                value={addFormData.assigned_to || currentUser?.id || ''}
                onChange={e => setAddFormData({ ...addFormData, assigned_to: e.target.value })}
                disabled={currentUser?.role !== 'manager'}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm disabled:opacity-70"
              >
                {assignableTeam.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.role === 'manager' ? ' (Manager)' : ''}{a.id === currentUser?.id ? ' (you)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assign hint */}
          {currentUser?.role === 'manager' ? (
            <p className="text-[11px] text-text-muted">
              As a Manager, you can assign this deal to any team member — or manage it yourself.
            </p>
          ) : (
            <p className="text-[11px] text-text-muted">
              This deal will be automatically assigned to you ({currentUser?.name}).
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDeal}
              disabled={!addFormData.customer}
              className="flex-1 px-4 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-check mr-1.5"></i>Create Deal
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ EDIT DEAL MODAL ═══ */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Deal" size="lg">
        {editFormData && (
          <div className="space-y-4">
            {/* Contact Name & Company */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Contact Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Company</label>
                <input
                  type="text"
                  value={editFormData.company || ''}
                  onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
                />
              </div>
            </div>

            {/* Revenue & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Revenue (USD)</label>
                <input
                  type="number"
                  value={editFormData.deal_size}
                  onChange={e => setEditFormData({ ...editFormData, deal_size: parseFloat(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Probability (%)</label>
                <input
                  type="number"
                  value={editFormData.probability}
                  onChange={e => setEditFormData({ ...editFormData, probability: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
                />
              </div>
            </div>

            {/* Stage & Source */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Stage</label>
                <select
                  value={editFormData.stage}
                  onChange={e => {
                    const newStage = e.target.value;
                    setEditFormData({
                      ...editFormData,
                      stage: newStage,
                      probability: DEFAULT_PROB[newStage] ?? editFormData.probability,
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Source</label>
                <select
                  value={editFormData.source}
                  onChange={e => setEditFormData({ ...editFormData, source: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                {currentUser?.role === 'manager' ? 'Assign To' : 'Assigned To'}
              </label>
              <select
                value={editFormData.owner_id}
                onChange={e => setEditFormData({ ...editFormData, owner_id: e.target.value })}
                disabled={currentUser?.role !== 'manager'}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm disabled:opacity-70"
              >
                {assignableTeam.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.role === 'manager' ? ' (Manager)' : ''}{a.id === currentUser?.id ? ' (you)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Value Preview */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <span className="text-xs font-semibold text-accent">Expected Value (EV)</span>
              <span className="text-lg font-extrabold text-accent">
                {fmtCurrency(Math.round(editFormData.deal_size * editFormData.probability / 100))}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDeal}
                className="flex-1 px-4 py-2.5 bg-accent text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all"
              >
                <i className="fa-solid fa-check mr-1.5"></i>Save Changes
              </button>
            </div>
          </div>
        )}
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
  assignedTo,
  latestActivity,
  onDragStart,
  onClick,
}: {
  deal: Lead;
  stageColor: string;
  assignedTo?: string;
  latestActivity?: string;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const ev = Math.round(deal.deal_size * deal.probability / 100);
  const pc = probColor(deal.probability);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-accent/50 transition-all active:cursor-grabbing"
      style={{ borderLeftWidth: '3px', borderLeftColor: stageColor }}
    >
      <div className="font-semibold text-text-primary dark:text-white text-xs truncate">{deal.name}</div>
      <div className="text-[10px] text-text-muted mt-0.5 truncate">{deal.company}</div>
      {assignedTo && (
        <div className="text-[9px] text-text-muted mt-1">
          <i className="fa-solid fa-user-tie"></i> {assignedTo}
        </div>
      )}

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
          {latestActivity && (
            <div className="flex items-center gap-1 text-[10px] text-text-muted">
              <i className={`fa-solid ${ACTIVITY_ICONS[latestActivity] || 'fa-circle'} text-[9px]`}></i>
              {latestActivity}
            </div>
          )}
          <div className="text-[10px] text-text-muted mt-0.5">EV: {fmtCompact(ev)}</div>
        </div>
      </div>
    </div>
  );
}
