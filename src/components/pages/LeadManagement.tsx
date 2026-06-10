import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { Drawer } from '../shared/Drawer';
import {
  SOURCES, STAGE_COLORS, ACTIVITY_COLORS, ACTIVITY_TYPES,
  INDUSTRIES, LEAD_STATUS_COLORS, ACCOUNTS,
  type Lead, type Source, type Activity, type LeadStatus
} from '../../types';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (!value && value !== 0) return '$0';
  return '$' + Number(value || 0).toLocaleString('en-US');
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateLeadId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return 'LD-' + dateStr + '-' + rand;
}

function getLeadStatusBadgeClass(status: LeadStatus | undefined): string {
  switch (status) {
    case 'New': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    case 'Converted': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
    case 'Rejected': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  }
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    Call: 'fa-phone', Email: 'fa-envelope', Meeting: 'fa-handshake', Note: 'fa-note-sticky', System: 'fa-robot'
  };
  return icons[type] || 'fa-circle';
}

function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    Call: '#10b981', Email: '#3b82f6', Meeting: '#8b5cf6', Note: '#64748b', System: '#6366f1'
  };
  return colors[type] || '#64748b';
}

function getActivityBg(type: string): string {
  const bgs: Record<string, string> = {
    Call: 'bg-green-100 dark:bg-green-900/30',
    Email: 'bg-blue-100 dark:bg-blue-900/30',
    Meeting: 'bg-purple-100 dark:bg-purple-900/30',
    Note: 'bg-gray-100 dark:bg-gray-800',
    System: 'bg-indigo-100 dark:bg-indigo-900/30'
  };
  return bgs[type] || 'bg-gray-100';
}

function getMemberColor(name: string | null | undefined): string {
  const colors: Record<string, string> = {
    'Anna Nguyen': '#d97706', 'Duy Tran': '#6366f1', 'Duy Trần': '#6366f1',
    'Mai Le': '#10b981', 'Mai Lê': '#10b981', 'Hung Vo': '#8b5cf6', 'Hùng Võ': '#8b5cf6'
  };
  return colors[name || ''] || '#6366f1';
}

function getMemberInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────────────────────
// ADD LEAD FORM DATA
// ─────────────────────────────────────────────────────────────

interface NewLeadFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  industry: string;
  source: string;
  sourceOther: string;
  assignedTo: string;
  notes: string;
  activities: { id: string; type: string; date: string; description: string }[];
}

const initialNewLeadData: NewLeadFormData = {
  name: '', company: '', email: '', phone: '', website: '', city: '',
  industry: '', source: '', sourceOther: '', assignedTo: '', notes: '', activities: []
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export function LeadManagement() {
  const {
    leads, activities, addLead, updateLead, deleteLead, addActivity,
    currentUser, setSelectedLead, selectedLead, showToast
  } = useApp();

  const isManager = currentUser?.role === 'manager';

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);

  // Form data
  const [newLeadData, setNewLeadData] = useState<NewLeadFormData>(initialNewLeadData);
  const [newLeadId, setNewLeadId] = useState('');

  // Convert form
  const [convertDealName, setConvertDealName] = useState('');
  const [convertValue, setConvertValue] = useState('');
  const [convertCloseDate, setConvertCloseDate] = useState('');
  const [convertStage, setConvertStage] = useState('Prospecting (10%)');

  // Drawer activity logging
  const [drawerActType, setDrawerActType] = useState('Call');
  const [drawerActNotes, setDrawerActNotes] = useState('');
  const [drawerReassign, setDrawerReassign] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [interactedSort, setInteractedSort] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  // Get member names for filters
  const teamMembers = ACCOUNTS.filter(a => a.role === 'member').map(a => a.name);

  // ───────────────────────────────────────────────────────────
  // COMPUTED DATA
  // ───────────────────────────────────────────────────────────

  // Role-based visibility: member only sees their own leads
  const visibleLeads = useMemo(() => {
    if (isManager) return leads;
    return leads.filter(l => l.assigned_to === currentUser?.name);
  }, [leads, isManager, currentUser]);

  // Get last activity for a lead
  const getLastActivity = useCallback((lead: Lead) => {
    const leadActs = activities.filter(a => a.lead_id === lead.id);
    if (!leadActs.length) {
      return { icon: '—', label: '—', date: lead.created_at };
    }
    const last = leadActs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const icons: Record<string, string> = { Call: '📞', Email: '📧', Meeting: '🤝', Note: '📝', System: '🔔' };
    return { icon: icons[last.type] || '📝', label: last.type, date: last.created_at };
  }, [activities]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = [...visibleLeads];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company && l.company.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(l => (l.lead_status || 'New') === statusFilter);
    }

    // Assignee filter (manager only)
    if (isManager && assigneeFilter) {
      result = result.filter(l => l.assigned_to === assigneeFilter);
    }

    // Sort by last interacted
    if (interactedSort === 'newest' || interactedSort === 'oldest') {
      result = result.map(l => {
        const leadActs = activities.filter(a => a.lead_id === l.id);
        const lastDate = leadActs.length
          ? Math.max(...leadActs.map(a => new Date(a.created_at).getTime()))
          : new Date(l.created_at).getTime();
        return { ...l, _lastInteracted: lastDate };
      });
      result.sort((a, b) =>
        interactedSort === 'newest'
          ? (b._lastInteracted || 0) - (a._lastInteracted || 0)
          : (a._lastInteracted || 0) - (b._lastInteracted || 0)
      );
    }

    return result;
  }, [visibleLeads, searchQuery, statusFilter, assigneeFilter, interactedSort, isManager, activities]);

  // Lead activities for drawer
  const selectedLeadActivities = useMemo(() => {
    if (!selectedLead) return [];
    return activities
      .filter(a => a.lead_id === selectedLead.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [selectedLead, activities]);

  // Count of new leads for badge
  const newLeadsCount = useMemo(() => {
    return leads.filter(l => (l.lead_status || 'New') === 'New').length;
  }, [leads]);

  // ───────────────────────────────────────────────────────────
  // HANDLERS
  // ───────────────────────────────────────────────────────────

  const openAddLeadModal = () => {
    setNewLeadId(generateLeadId());
    setNewLeadData(initialNewLeadData);
    setShowAddModal(true);
  };

  const handleAddLeadActivityRow = () => {
    setNewLeadData(prev => ({
      ...prev,
      activities: [...prev.activities, { id: 'la_' + Date.now(), type: 'Call', date: '', description: '' }]
    }));
  };

  const handleRemoveLeadActivityRow = (id: string) => {
    setNewLeadData(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id)
    }));
  };

  const handleUpdateLeadActivity = (id: string, field: string, value: string) => {
    setNewLeadData(prev => ({
      ...prev,
      activities: prev.activities.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const handleSaveNewLead = () => {
    if (!newLeadData.name.trim()) { showToast('Full Name is required', 'error'); return; }
    if (!newLeadData.company.trim()) { showToast('Company is required', 'error'); return; }
    if (!newLeadData.industry) { showToast('Industry is required', 'error'); return; }
    if (!newLeadData.email.trim()) { showToast('Email is required', 'error'); return; }
    if (!newLeadData.source) { showToast('Lead Source is required', 'error'); return; }
    if (isManager && !newLeadData.assignedTo) { showToast('Assigned To is required', 'error'); return; }

    const now = new Date().toISOString();
    const lead: Lead = {
      id: newLeadId || 'lead_' + Date.now(),
      name: newLeadData.name.trim(),
      company: newLeadData.company.trim(),
      email: newLeadData.email.trim(),
      phone: newLeadData.phone.trim() || null,
      website: newLeadData.website.trim() || null,
      city: newLeadData.city.trim() || null,
      industry: newLeadData.industry,
      deal_size: 0,
      source: newLeadData.source === 'Other' ? newLeadData.sourceOther : newLeadData.source,
      stage: 'Prospecting',
      probability: 10,
      notes: newLeadData.notes.trim() || null,
      owner_id: currentUser?.id || '0',
      assigned_to: isManager ? newLeadData.assignedTo : currentUser?.name,
      lead_status: 'New',
      created_at: now,
      updated_at: now,
    };

    addLead(lead);

    // Save activities
    newLeadData.activities.forEach(a => {
      if (a.description.trim()) {
        addActivity({
          id: 'act_' + Date.now() + Math.random(),
          type: a.type,
          lead_id: lead.id,
          lead_name: lead.name,
          company: lead.company,
          stage: lead.stage,
          date: a.date || now,
          duration: 0,
          notes: a.description.trim(),
          next_action: null,
          owner_id: currentUser?.id || '0',
          created_at: now,
        });
      }
    });

    setShowAddModal(false);
    showToast('Lead ' + lead.name + ' created successfully!', 'success');
  };

  const openDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerActType('Call');
    setDrawerActNotes('');
    setDrawerReassign('');
    setShowDrawer(true);
  };

  const closeDrawerHandler = () => {
    setShowDrawer(false);
    setSelectedLead(null);
  };

  // Log activity from drawer
  const handleLogDrawerActivity = () => {
    if (!selectedLead) return;
    if (!drawerActNotes.trim()) { showToast('Please enter notes', 'error'); return; }

    const now = new Date().toISOString();
    addActivity({
      id: 'act_' + Date.now(),
      type: drawerActType,
      lead_id: selectedLead.id,
      lead_name: selectedLead.name,
      company: selectedLead.company,
      stage: selectedLead.stage,
      date: now,
      duration: 0,
      notes: drawerActNotes.trim(),
      next_action: null,
      owner_id: currentUser?.id || '0',
      created_at: now,
    });

    // Update lead updated_at
    updateLead({ ...selectedLead, updated_at: now });

    showToast(drawerActType + ' logged successfully', 'success');
    setDrawerActNotes('');
    // Refresh drawer
    setSelectedLead({ ...selectedLead, updated_at: now });
  };

  // Reassign lead (manager only)
  const handleReassignLead = () => {
    if (!selectedLead || !drawerReassign) return;
    const oldAssignee = selectedLead.assigned_to || '—';

    updateLead({
      ...selectedLead,
      assigned_to: drawerReassign,
      updated_at: new Date().toISOString(),
    });

    // Log system activity
    addActivity({
      id: 'act_' + Date.now(),
      type: 'System',
      lead_id: selectedLead.id,
      lead_name: selectedLead.name,
      company: selectedLead.company,
      stage: selectedLead.stage,
      date: new Date().toISOString(),
      duration: 0,
      notes: `Lead reassigned from ${oldAssignee} → ${drawerReassign} by ${currentUser?.name}.`,
      next_action: null,
      owner_id: currentUser?.id || '0',
      created_at: new Date().toISOString(),
    });

    showToast('Lead assigned to ' + drawerReassign, 'success');
    setDrawerReassign('');
    setSelectedLead({ ...selectedLead, assigned_to: drawerReassign });
  };

  // Convert lead
  const openConvertModalHandler = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    setConvertLeadId(leadId);
    setConvertDealName('Opportunity - ' + (lead.company || ''));
    setConvertValue(lead.deal_size?.toString() || '0');
    setConvertCloseDate('');
    setConvertStage('Prospecting (10%)');
    setShowConvertModal(true);
    setShowDrawer(false);
  };

  const handleConvertDeal = () => {
    if (!convertLeadId) return;
    if (!convertDealName.trim()) { showToast('Deal Name is required', 'error'); return; }
    if (!convertValue) { showToast('Deal Value is required', 'error'); return; }
    if (!convertCloseDate) { showToast('Expected Close Date is required', 'error'); return; }

    const lead = leads.find(l => l.id === convertLeadId);
    if (!lead) return;

    // Update lead status to Converted
    updateLead({
      ...lead,
      lead_status: 'Converted',
      updated_at: new Date().toISOString(),
    });

    // Log system activity
    addActivity({
      id: 'act_' + Date.now(),
      type: 'System',
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company,
      stage: lead.stage,
      date: new Date().toISOString(),
      duration: 0,
      notes: 'Lead converted into pipeline opportunity.',
      next_action: null,
      owner_id: currentUser?.id || '0',
      created_at: new Date().toISOString(),
    });

    setShowConvertModal(false);
    showToast('Lead converted to pipeline deal!', 'success');
  };

  // Reject lead
  const openRejectModalHandler = (leadId: string) => {
    setConvertLeadId(leadId);
    setShowRejectModal(true);
    setShowDrawer(false);
  };

  const handleRejectLead = () => {
    if (!convertLeadId) return;
    const lead = leads.find(l => l.id === convertLeadId);
    if (!lead) return;

    updateLead({
      ...lead,
      lead_status: 'Rejected',
      updated_at: new Date().toISOString(),
    });

    // Log system activity
    addActivity({
      id: 'act_' + Date.now(),
      type: 'System',
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company,
      stage: lead.stage,
      date: new Date().toISOString(),
      duration: 0,
      notes: 'Lead marked as Rejected.',
      next_action: null,
      owner_id: currentUser?.id || '0',
      created_at: new Date().toISOString(),
    });

    setShowRejectModal(false);
    showToast('Lead rejected.', 'info');
  };

  // Export to Excel (CSV)
  const handleExportExcel = () => {
    const headers = [
      'Lead Name', 'Company', 'Industry', 'Email', 'Phone', 'City',
      'Est. Value ($)', 'Probability (%)', 'Stage', 'Status', 'Lead Source',
      'Assigned To', 'Created Date', 'Updated Date'
    ];

    const rows = filteredLeads.map(l => [
      l.name,
      l.company || '',
      l.industry || '',
      l.email || '',
      l.phone || '',
      l.city || '',
      l.deal_size || 0,
      l.probability || 0,
      l.stage || '',
      l.lead_status || 'New',
      l.source || '',
      l.assigned_to || '',
      formatDate(l.created_at),
      formatDate(l.updated_at),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    a.download = `LeadManagement_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported to CSV successfully', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for meta rows in drawer
  const metaRow2 = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between items-center px-3 py-2 border-b border-border last:border-b-0">
      <span className="text-[11px] text-text-muted font-medium">{label}</span>
      <span className="text-[12px] font-semibold text-text-primary text-right max-w-[65%]">{value}</span>
    </div>
  );

  // ───────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white">My Leads Directory</h1>
          <p className="text-sm text-text-muted mt-1">
            Qualify incoming prospects, track communications timelines, and convert commercial accounts.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-border dark:border-border bg-bg-card text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-print"></i>
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-border dark:border-border bg-bg-card text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-file-excel"></i>
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={openAddLeadModal}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <i className="fa-solid fa-plus"></i>
            Create New Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 shadow-sm border border-border dark:border-border no-print">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] max-w-[220px]">
            <input
              type="text"
              placeholder="🔍 Search company or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border bg-bg-page text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border dark:border-border bg-bg-page text-sm min-w-[155px]"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Converted">Converted</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            value={interactedSort}
            onChange={(e) => setInteractedSort(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border dark:border-border bg-bg-page text-sm min-w-[195px]"
          >
            <option value="">Default</option>
            <option value="newest">Newest to Oldest Interacted</option>
            <option value="oldest">Oldest to Newest Interacted</option>
          </select>
          {isManager && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border dark:border-border bg-bg-page text-sm min-w-[160px]"
            >
              <option value="">All Sales Members</option>
              {teamMembers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          {!isManager && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-accent">
              <i className="fa-solid fa-user-tie"></i>
              <span>Showing: <strong>{currentUser?.name}</strong>'s leads</span>
            </div>
          )}
          <span className="text-sm text-text-muted ml-auto">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden" id="leads-print-area">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Lead</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Company</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Est. Value</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Status</th>
                {isManager && <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Assigned To</th>}
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Activity</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Day Interacted</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="px-6 py-12 text-center">
                    <i className="fa-solid fa-user-plus text-4xl text-text-muted mb-3 block opacity-30"></i>
                    <p className="text-text-secondary dark:text-text-muted font-medium">No leads found</p>
                    <p className="text-sm text-text-muted mt-1">
                      {!isManager ? 'No leads assigned to you yet.' : 'Add your first lead or adjust filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const status = lead.lead_status || 'New';
                  const isNew = status === 'New';
                  const lastAct = getLastActivity(lead);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openDrawer(lead)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-text-primary">{lead.name}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{lead.company || '—'}</td>
                      <td className="px-4 py-3 font-bold text-accent">{formatCurrency(lead.deal_size)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getLeadStatusBadgeClass(status as LeadStatus)}`}>
                          {status}
                        </span>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                              style={{ backgroundColor: getMemberColor(lead.assigned_to) }}
                            >
                              {getMemberInitials(lead.assigned_to)}
                            </div>
                            <span className="text-sm text-text-secondary">{lead.assigned_to || '—'}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{lastAct.icon}</span>
                          <span className="text-xs text-text-secondary">{lastAct.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{timeAgo(lastAct.date)}</td>
                      <td className="px-4 py-3 text-right no-print" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          {isNew ? (
                            <>
                              <button
                                onClick={() => openConvertModalHandler(lead.id)}
                                className="px-2 py-1 text-xs font-semibold rounded bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 dark:hover:bg-green-800/30 transition-colors"
                              >
                                <i className="fa-solid fa-check mr-1"></i>Convert
                              </button>
                              <button
                                onClick={() => openRejectModalHandler(lead.id)}
                                className="px-2 py-1 text-xs font-semibold rounded bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors"
                              >
                                <i className="fa-solid fa-xmark mr-1"></i>Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-text-muted italic">{status}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────
          ADD LEAD MODAL
          ───────────────────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Lead" size="xl">
        <div className="space-y-4">
          {/* Form grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Lead ID</label>
              <input
                type="text"
                value={newLeadId}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-muted text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Full Name *</label>
              <input
                type="text"
                value={newLeadData.name}
                onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Full name..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Company *</label>
              <input
                type="text"
                value={newLeadData.company}
                onChange={(e) => setNewLeadData({ ...newLeadData, company: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                placeholder="Company name..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Industry *</label>
              <select
                value={newLeadData.industry}
                onChange={(e) => setNewLeadData({ ...newLeadData, industry: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Email *</label>
              <input
                type="email"
                value={newLeadData.email}
                onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                placeholder="email@company.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Phone</label>
              <input
                type="tel"
                value={newLeadData.phone}
                onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                placeholder="+84 900 000 000"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Website</label>
              <input
                type="text"
                value={newLeadData.website}
                onChange={(e) => setNewLeadData({ ...newLeadData, website: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                placeholder="www.company.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">City</label>
              <input
                type="text"
                value={newLeadData.city}
                onChange={(e) => setNewLeadData({ ...newLeadData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                placeholder="City..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Lead Source *</label>
              <select
                value={newLeadData.source}
                onChange={(e) => setNewLeadData({ ...newLeadData, source: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
              >
                <option value="">Select source...</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {newLeadData.source === 'Other' && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Please specify source *</label>
                <input
                  type="text"
                  value={newLeadData.sourceOther}
                  onChange={(e) => setNewLeadData({ ...newLeadData, sourceOther: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                  placeholder="Specify source..."
                />
              </div>
            )}
            {isManager && (
              <div id="new-lead-assigned-wrap">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Assigned To *</label>
                <select
                  value={newLeadData.assignedTo}
                  onChange={(e) => setNewLeadData({ ...newLeadData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                >
                  <option value="">Select assignee...</option>
                  {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">
              Notes <span className="font-normal text-text-muted">({newLeadData.notes.length}/500)</span>
            </label>
            <textarea
              value={newLeadData.notes}
              onChange={(e) => {
                const val = e.target.value.slice(0, 500);
                setNewLeadData({ ...newLeadData, notes: val });
              }}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Activity log section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square"></i> Add Activity Log
              </span>
              <button
                type="button"
                onClick={handleAddLeadActivityRow}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <i className="fa-solid fa-plus mr-1"></i>Add More
              </button>
            </div>
            <div id="new-lead-activities-list" className="space-y-2">
              {newLeadData.activities.map((a) => (
                <div key={a.id} className="grid grid-cols-4 gap-2 items-start p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Type</label>
                    <select
                      value={a.type}
                      onChange={(e) => handleUpdateLeadActivity(a.id, 'type', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border bg-bg-page text-sm"
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Date</label>
                    <input
                      type="date"
                      value={a.date}
                      onChange={(e) => handleUpdateLeadActivity(a.id, 'date', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border bg-bg-page text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Description</label>
                    <input
                      type="text"
                      value={a.description}
                      onChange={(e) => handleUpdateLeadActivity(a.id, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-border bg-bg-page text-sm"
                      placeholder="Brief description..."
                    />
                  </div>
                  <div className="pt-6">
                    <button
                      onClick={() => handleRemoveLeadActivityRow(a.id)}
                      className="p-2 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNewLead}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-semibold hover:bg-indigo-600"
            >
              <i className="fa-solid fa-check mr-2"></i>Save Lead
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────
          LEAD DETAIL DRAWER
          ───────────────────────────────────────────────────── */}
      <Drawer
        isOpen={showDrawer}
        onClose={closeDrawerHandler}
        title={
          selectedLead ? (
            <div className="flex items-center gap-3">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getLeadStatusBadgeClass(selectedLead.lead_status as LeadStatus)}`}>
                {selectedLead.lead_status || 'New'}
              </span>
              <div>
                <div className="text-base font-bold text-text-primary">{selectedLead.name}</div>
                <div className="text-xs text-text-muted">{selectedLead.company}</div>
              </div>
            </div>
          ) : 'Lead Detail'
        }
        footer={
          <div className="flex gap-2">
            {selectedLead && (selectedLead.lead_status || 'New') === 'New' && (
              <>
                <button
                  onClick={() => selectedLead && openConvertModalHandler(selectedLead.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 flex items-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>Convert
                </button>
                <button
                  onClick={() => selectedLead && openRejectModalHandler(selectedLead.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 flex items-center gap-2"
                >
                  <i className="fa-solid fa-xmark"></i>Reject
                </button>
              </>
            )}
            <button
              onClick={closeDrawerHandler}
              className="flex-1 py-2 border border-border rounded-lg text-text-secondary text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <i className="fa-solid fa-xmark mr-1"></i>Close
            </button>
          </div>
        }
      >
        {selectedLead && (
          <div className="space-y-4">
            {/* Hero contact card */}
            <div
              className="rounded-xl p-4 text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {selectedLead.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] leading-tight truncate">{selectedLead.name}</div>
                  <div className="text-sm opacity-80 mt-0.5 truncate">{selectedLead.company}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-lg">{formatCurrency(selectedLead.deal_size)}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Est. Value</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {selectedLead.lead_status || 'New'}
                </span>
                {selectedLead.stage && (
                  <span className="bg-white/20 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    {selectedLead.stage}
                  </span>
                )}
                {selectedLead.industry && (
                  <span className="bg-white/15 rounded-full px-2 py-0.5 text-[11px]">
                    {selectedLead.industry}
                  </span>
                )}
              </div>
            </div>

            {/* Quick contact info row */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`mailto:${selectedLead.email || ''}`}
                className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-border hover:border-accent transition-colors no-underline"
              >
                <i className="fa-solid fa-envelope text-blue-500 text-sm w-4"></i>
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Email</div>
                  <div className="text-[11px] font-medium text-text-primary truncate">{selectedLead.email || '—'}</div>
                </div>
              </a>
              <a
                href={`tel:${selectedLead.phone || ''}`}
                className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-border hover:border-accent transition-colors no-underline"
              >
                <i className="fa-solid fa-phone text-green-500 text-sm w-4"></i>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Phone</div>
                  <div className="text-[11px] font-medium text-text-primary">{selectedLead.phone || '—'}</div>
                </div>
              </a>
            </div>

            {/* Section 1: Account Metadata */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-building text-[10px]"></i> Account Details
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-border rounded-lg overflow-hidden">
                {metaRow2('Website', selectedLead.website ? (
                  <a href={`https://${selectedLead.website}`} target="_blank" rel="noreferrer" className="text-accent no-underline hover:underline">
                    {selectedLead.website}
                  </a>
                ) : '—')}
                {metaRow2('Industry', selectedLead.industry || '—')}
                {metaRow2('City', selectedLead.city || '—')}
                {metaRow2('Lead Source', selectedLead.source || '—')}
                {metaRow2('Created', formatDate(selectedLead.created_at))}
              </div>
            </div>

            {/* Assigned To */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                  id="drawer-assign-avatar"
                  style={{ backgroundColor: getMemberColor(selectedLead.assigned_to) }}
                >
                  {getMemberInitials(selectedLead.assigned_to)}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Assigned To</div>
                  <div className="text-[13px] font-semibold text-text-primary" id="drawer-assign-name">
                    {selectedLead.assigned_to || '—'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-bold text-accent">
                  Sales Member
                </span>
              </div>
              {isManager && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                  <select
                    value={drawerReassign}
                    onChange={(e) => setDrawerReassign(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded border border-border bg-bg-page text-[12px]"
                    id="drawer-reassign-select"
                  >
                    <option value="">— Reassign to —</option>
                    {teamMembers.map(m => (
                      <option key={m} value={m} selected={selectedLead.assigned_to === m}>{m}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleReassignLead}
                    disabled={!drawerReassign}
                    className="px-3 py-1.5 bg-accent text-white rounded text-[12px] font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    <i className="fa-solid fa-user-check"></i>Assign
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedLead.notes && (
              <div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-note-sticky text-[10px]"></i> Notes
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-[12px] text-text-secondary leading-relaxed">
                  {selectedLead.notes}
                </div>
              </div>
            )}

            {/* Section 2: Log Interaction (only if New) */}
            {(selectedLead.lead_status || 'New') === 'New' && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <i className="fa-solid fa-pen-to-square text-[10px]"></i> Log Live Action Interaction
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Activity Type</label>
                    <select
                      value={drawerActType}
                      onChange={(e) => setDrawerActType(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border bg-bg-page text-[12px]"
                      id="drawer-act-type"
                    >
                      <option value="Call">📞 Call</option>
                      <option value="Email">📧 Email</option>
                      <option value="Meeting">🤝 Meeting</option>
                      <option value="Note">📝 Note</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">Notes</label>
                    <textarea
                      value={drawerActNotes}
                      onChange={(e) => setDrawerActNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded border border-border bg-bg-page text-[12px] resize-none"
                      id="drawer-act-notes"
                      placeholder="What happened?..."
                    />
                  </div>
                  <button
                    onClick={handleLogDrawerActivity}
                    className="w-full py-2 bg-accent text-white rounded text-[12px] font-semibold hover:bg-indigo-600 flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-check"></i>Log Activity
                  </button>
                </div>
              </div>
            )}

            {/* Section 3: Activity Timeline */}
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left text-[10px]"></i> Activity Timeline
                </span>
                <span className="bg-gray-100 dark:bg-gray-800 border border-border px-2 py-0.5 rounded text-[10px] font-bold text-text-secondary">
                  {selectedLeadActivities.length}
                </span>
              </div>
              {selectedLeadActivities.length > 0 ? (
                <div className="relative pl-6 timeline">
                  {/* Timeline line */}
                  <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-border" />
                  {selectedLeadActivities.map((a) => (
                    <div key={a.id} className="relative mb-4 last:mb-0 timeline-item">
                      {/* Dot */}
                      <div
                        className="absolute left-[-20px] top-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-bg-card"
                        style={{ backgroundColor: getActivityColor(a.type) }}
                      >
                        <i className={`fa-solid ${getActivityIcon(a.type)} text-[7px] text-white`} />
                      </div>
                      <div className={`${getActivityBg(a.type)} border border-border rounded-lg p-2`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: getActivityColor(a.type) }}>
                            {a.type} Log
                          </span>
                          <span className="text-[10px] text-text-muted">{formatDateTime(a.created_at)}</span>
                        </div>
                        <div className="text-[12px] text-text-secondary leading-relaxed">{a.notes || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-text-muted">
                  <i className="fa-solid fa-clock text-2xl opacity-30 mb-2 block"></i>
                  <p className="text-sm">No activities logged yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ─────────────────────────────────────────────────────
          CONVERT TO DEAL MODAL
          ───────────────────────────────────────────────────── */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Convert to Pipeline Deal" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Deal Name *</label>
            <input
              type="text"
              value={convertDealName}
              onChange={(e) => setConvertDealName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
              placeholder="Deal name..."
              id="convert-deal-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Account Company</label>
              <input
                type="text"
                value={leads.find(l => l.id === convertLeadId)?.company || ''}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-border bg-gray-100 text-text-muted text-sm cursor-not-allowed"
                id="convert-company"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Primary Contact</label>
              <input
                type="text"
                value={leads.find(l => l.id === convertLeadId)?.name || ''}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-border bg-gray-100 text-text-muted text-sm cursor-not-allowed"
                id="convert-contact"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Deal Value ($) *</label>
              <input
                type="number"
                value={convertValue}
                onChange={(e) => setConvertValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                placeholder="0"
                id="convert-value"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Expected Close Date *</label>
              <input
                type="date"
                value={convertCloseDate}
                onChange={(e) => setConvertCloseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
                id="convert-close-date"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">Initial Pipeline Stage *</label>
            <select
              value={convertStage}
              onChange={(e) => setConvertStage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-page text-sm"
              id="convert-stage"
            >
              <option>Prospecting (10%)</option>
              <option>Qualification (30%)</option>
              <option>Proposal (50%)</option>
              <option>Negotiation (80%)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowConvertModal(false)}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConvertDeal}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
            >
              <i className="fa-solid fa-check mr-2"></i>Save Deal
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────
          REJECT LEAD MODAL
          ───────────────────────────────────────────────────── */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Lead?" size="sm">
        <div className="text-center">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-500 mb-4" />
          <p className="text-text-secondary mb-2">Are you sure you want to reject this lead?</p>
          <p className="text-sm text-text-muted mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowRejectModal(false)}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectLead}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
            >
              <i className="fa-solid fa-xmark mr-2"></i>Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
