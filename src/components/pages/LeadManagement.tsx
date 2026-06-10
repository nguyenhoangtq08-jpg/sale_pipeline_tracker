import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { Drawer } from '../shared/Drawer';
import { Badge } from '../shared/Badge';
import {
  STAGES, SOURCES, STAGE_COLORS, INDUSTRIES, LEAD_STATUSES, ACCOUNTS,
  type Lead, type Stage, type Source, type ActivityType
} from '../../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getLastActivityIcon(type: string): string {
  switch (type) {
    case 'Call': return '📞';
    case 'Email': return '📧';
    case 'Meeting': return '🤝';
    default: return '📝';
  }
}

interface LeadFormData {
  name: string;
  company: string;
  industry: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  deal_size: string;
  source: Source;
  notes: string;
  assigned_to: string;
}

interface ActivityLogRow {
  type: ActivityType;
  notes: string;
  date: string;
}

const initialFormData: LeadFormData = {
  name: '',
  company: '',
  industry: '',
  email: '',
  phone: '',
  website: '',
  city: '',
  deal_size: '',
  source: 'Website',
  notes: '',
  assigned_to: '0',
};

interface ConvertFormData {
  deal_name: string;
  deal_value: string;
  close_date: string;
  stage: Stage;
}

const initialConvertData: ConvertFormData = {
  deal_name: '',
  deal_value: '',
  close_date: '',
  stage: 'Qualification',
};

export function LeadManagement() {
  const { leads, activities, addLead, updateLead, deleteLead, addActivity, currentUser, setSelectedLead, selectedLead } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [convertData, setConvertData] = useState<ConvertFormData>(initialConvertData);
  const [activityRows, setActivityRows] = useState<ActivityLogRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('interaction_desc');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [drawerActivityType, setDrawerActivityType] = useState<ActivityType>('Call');
  const [drawerActivityNotes, setDrawerActivityNotes] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  const isManager = currentUser?.role === 'manager';

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => l.lead_status !== 'Converted' && l.lead_status !== 'Rejected');

    if (!isManager) {
      result = result.filter(l => l.assigned_to === currentUser?.id || l.owner_id === currentUser?.id);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(query) ||
        (l.company && l.company.toLowerCase().includes(query)) ||
        (l.email && l.email.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.lead_status === statusFilter);
    }

    if (assigneeFilter !== 'all') {
      result = result.filter(l => l.assigned_to === assigneeFilter);
    }

    result.sort((a, b) => {
      const aDate = a.last_activity ? new Date(a.last_activity).getTime() : 0;
      const bDate = b.last_activity ? new Date(b.last_activity).getTime() : 0;
      return sortOrder === 'interaction_desc' ? bDate - aDate : aDate - bDate;
    });

    return result;
  }, [leads, searchQuery, statusFilter, sortOrder, assigneeFilter, isManager, currentUser]);

  const handleAddLead = async () => {
    if (!formData.name.trim()) return;

    await addLead({
      name: formData.name.trim(),
      company: formData.company.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      deal_size: parseFloat(formData.deal_size) || 0,
      source: formData.source,
      stage: 'Prospecting',
      probability: 20,
      notes: formData.notes.trim() || null,
      owner_id: currentUser?.id || '0',
      lead_status: 'New',
      industry: formData.industry.trim() || null,
      website: formData.website.trim() || null,
      city: formData.city.trim() || null,
      assigned_to: formData.assigned_to || currentUser?.id || '0',
    });

    for (const row of activityRows) {
      if (row.notes.trim()) {
        await addActivity({
          type: row.type,
          lead_id: null,
          lead_name: formData.name.trim(),
          company: formData.company.trim() || null,
          stage: 'Prospecting',
          date: row.date || new Date().toISOString().split('T')[0],
          duration: 0,
          notes: row.notes.trim(),
          next_action: null,
          owner_id: currentUser?.id || '0',
        });
      }
    }

    setFormData(initialFormData);
    setActivityRows([]);
    setShowAddModal(false);
  };

  const handleConvertLead = async () => {
    if (!selectedLeadForAction || !convertData.deal_name.trim()) return;

    await updateLead(selectedLeadForAction.id, {
      lead_status: 'Converted',
      stage: convertData.stage,
      deal_size: parseFloat(convertData.deal_value) || selectedLeadForAction.deal_size,
      close_date: convertData.close_date || null,
      probability: convertData.stage === 'Closed Won' ? 100 :
                  convertData.stage === 'Negotiation' ? 75 :
                  convertData.stage === 'Proposal' ? 50 : 25,
    });

    setSelectedLeadForAction(null);
    setConvertData(initialConvertData);
    setShowConvertModal(false);
  };

  const handleRejectLead = async () => {
    if (!selectedLeadForAction) return;

    await updateLead(selectedLeadForAction.id, {
      lead_status: 'Rejected',
    });

    setSelectedLeadForAction(null);
    setShowRejectModal(false);
  };

  const handleReassign = async () => {
    if (!selectedLead || !reassignTo) return;

    await updateLead(selectedLead.id, {
      assigned_to: reassignTo,
    });

    setReassignTo('');
  };

  const handleAddDrawerActivity = async () => {
    if (!selectedLead || !drawerActivityNotes.trim()) return;

    await addActivity({
      type: drawerActivityType,
      lead_id: selectedLead.id,
      lead_name: selectedLead.name,
      company: selectedLead.company,
      stage: selectedLead.stage,
      date: new Date().toISOString().split('T')[0],
      duration: 0,
      notes: drawerActivityNotes.trim(),
      next_action: null,
      owner_id: currentUser?.id || '0',
    });

    await updateLead(selectedLead.id, {
      last_activity: new Date().toISOString(),
    });

    setDrawerActivityNotes('');
  };

  const openDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setReassignTo(lead.assigned_to || '');
    setShowDrawer(true);
  };

  const openConvertModal = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadForAction(lead);
    setConvertData({
      deal_name: `${lead.name} - Deal`,
      deal_value: lead.deal_size.toString(),
      close_date: '',
      stage: 'Qualification',
    });
    setShowConvertModal(true);
  };

  const openRejectModal = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadForAction(lead);
    setShowRejectModal(true);
  };

  const addActivityRow = () => {
    setActivityRows([...activityRows, { type: 'Call', notes: '', date: new Date().toISOString().split('T')[0] }]);
  };

  const updateActivityRow = (index: number, field: keyof ActivityLogRow, value: string) => {
    const updated = [...activityRows];
    updated[index] = { ...updated[index], [field]: value };
    setActivityRows(updated);
  };

  const removeActivityRow = (index: number) => {
    setActivityRows(activityRows.filter((_, i) => i !== index));
  };

  const getLeadLastActivity = (lead: Lead): { type: string; date: string } | null => {
    const leadActivities = activities.filter(a => a.lead_id === lead.id || a.lead_name === lead.name);
    if (leadActivities.length === 0 && !lead.last_activity) return null;

    if (leadActivities.length > 0) {
      const sorted = leadActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { type: sorted[0].type, date: sorted[0].date };
    }

    return { type: 'Note', date: lead.last_activity || lead.updated_at };
  };

  const getAssignedAccount = (lead: Lead) => {
    const accountId = lead.assigned_to || lead.owner_id;
    return ACCOUNTS.find(a => a.id === accountId) || ACCOUNTS[0];
  };

  const leadActivities = selectedLead
    ? activities.filter(a => a.lead_id === selectedLead.id || a.lead_name === selectedLead.name)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Lead Management</h1>
          <p className="text-text-secondary dark:text-text-muted">Manage your sales leads and convert them to deals</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2 w-fit"
        >
          <i className="fa-solid fa-plus"></i>
          Create New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 shadow-sm border border-border dark:border-border">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"></i>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Status</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="interaction_desc">Last Interaction (Newest)</option>
            <option value="interaction_asc">Last Interaction (Oldest)</option>
          </select>
          {isManager && (
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Assignees</option>
              {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Lead</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Est. Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Last Interacted</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <i className="fa-solid fa-users text-4xl text-text-muted mb-3 block"></i>
                    <p className="text-text-secondary dark:text-text-muted">No leads found</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const lastActivity = getLeadLastActivity(lead);
                  const assignedAccount = getAssignedAccount(lead);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openDrawer(lead)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: assignedAccount.color }}
                          >
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary dark:text-white">{lead.name}</p>
                            <p className="text-xs text-text-muted">#{lead.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-primary dark:text-white">{lead.company || '-'}</td>
                      <td className="px-6 py-4 font-medium text-text-primary dark:text-white">
                        {formatCurrency(lead.deal_size)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          lead.lead_status === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          lead.lead_status === 'Converted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {lead.lead_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: assignedAccount.color }}
                          >
                            {assignedAccount.initials}
                          </div>
                          <span className="text-sm text-text-primary dark:text-white">{assignedAccount.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lastActivity ? (
                          <span className="text-lg" title={lastActivity.type}>
                            {getLastActivityIcon(lastActivity.type)}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {lastActivity ? formatDate(lastActivity.date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {lead.lead_status === 'New' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => openConvertModal(lead, e)}
                              className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Convert
                            </button>
                            <button
                              onClick={(e) => openRejectModal(lead, e)}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setActivityRows([]); }} title="Create New Lead" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Lead ID</label>
              <input
                type="text"
                value="Auto-generated"
                disabled
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-gray-100 dark:bg-gray-800 text-text-muted cursor-not-allowed"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Industry</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="+84..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as Source })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Est. Value ($)</label>
              <input
                type="number"
                value={formData.deal_size}
                onChange={(e) => setFormData({ ...formData, deal_size: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name} ({a.roleLabel})</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Activity Log Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-primary dark:text-white">Activity Log</label>
              <button
                type="button"
                onClick={addActivityRow}
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                Add Activity
              </button>
            </div>
            {activityRows.length > 0 && (
              <div className="space-y-2">
                {activityRows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <select
                      value={row.type}
                      onChange={(e) => updateActivityRow(index, 'type', e.target.value as ActivityType)}
                      className="px-2 py-1 text-sm rounded border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Note">Note</option>
                    </select>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateActivityRow(index, 'date', e.target.value)}
                      className="px-2 py-1 text-sm rounded border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                    />
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateActivityRow(index, 'notes', e.target.value)}
                      placeholder="Activity notes..."
                      className="flex-1 px-2 py-1 text-sm rounded border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeActivityRow(index)}
                      className="p-1 text-red-500 hover:text-red-600"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-border dark:border-border">
            <button
              onClick={() => { setShowAddModal(false); setActivityRows([]); }}
              className="flex-1 px-4 py-2 border border-border dark:border-border rounded-lg text-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLead}
              disabled={!formData.name.trim()}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Lead
            </button>
          </div>
        </div>
      </Modal>

      {/* Convert Lead Modal */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Convert Lead to Deal" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Deal Name *</label>
            <input
              type="text"
              value={convertData.deal_name}
              onChange={(e) => setConvertData({ ...convertData, deal_name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter deal name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Deal Value ($)</label>
            <input
              type="number"
              value={convertData.deal_value}
              onChange={(e) => setConvertData({ ...convertData, deal_value: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Expected Close Date</label>
            <input
              type="date"
              value={convertData.close_date}
              onChange={(e) => setConvertData({ ...convertData, close_date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Pipeline Stage</label>
            <select
              value={convertData.stage}
              onChange={(e) => setConvertData({ ...convertData, stage: e.target.value as Stage })}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowConvertModal(false)}
              className="flex-1 px-4 py-2 border border-border dark:border-border rounded-lg text-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConvertLead}
              disabled={!convertData.deal_name.trim()}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Convert to Deal
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Lead Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Lead" size="sm">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <i className="fa-solid fa-xmark text-2xl text-red-500"></i>
          </div>
          <p className="text-text-primary dark:text-white mb-2">Are you sure you want to reject this lead?</p>
          <p className="text-sm text-text-muted mb-6">Lead: {selectedLeadForAction?.name}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowRejectModal(false)}
              className="flex-1 px-4 py-2 border border-border dark:border-border rounded-lg text-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectLead}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>

      {/* Lead Detail Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedLead(null); }}
        title="Lead Details"
        width="lg"
      >
        {selectedLead && (
          <div className="space-y-6">
            {/* Lead Info */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: getAssignedAccount(selectedLead).color }}
              >
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text-primary dark:text-white">{selectedLead.name}</h3>
                <p className="text-text-secondary dark:text-text-muted">{selectedLead.company || 'No company'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedLead.lead_status === 'New' ? 'bg-blue-100 text-blue-700' :
                    selectedLead.lead_status === 'Converted' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedLead.lead_status}
                  </span>
                  {selectedLead.industry && (
                    <span className="text-xs text-text-muted">{selectedLead.industry}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text-primary dark:text-white">Assigned To</p>
                {isManager && selectedLead.lead_status === 'New' && (
                  <button
                    onClick={handleReassign}
                    disabled={!reassignTo || reassignTo === selectedLead.assigned_to}
                    className="text-xs text-accent hover:underline disabled:text-text-muted disabled:no-underline"
                  >
                    Save
                  </button>
                )}
              </div>
              {isManager && selectedLead.lead_status === 'New' ? (
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name} ({a.roleLabel})</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: getAssignedAccount(selectedLead).color }}
                  >
                    {getAssignedAccount(selectedLead).initials}
                  </div>
                  <span className="text-text-primary dark:text-white">{getAssignedAccount(selectedLead).name}</span>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Est. Value</p>
                <p className="text-lg font-bold text-accent">{formatCurrency(selectedLead.deal_size)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Lead Source</p>
                <p className="text-text-primary dark:text-white">{selectedLead.source}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Email</p>
                <p className="text-text-primary dark:text-white truncate">{selectedLead.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Phone</p>
                <p className="text-text-primary dark:text-white">{selectedLead.phone || '-'}</p>
              </div>
              {selectedLead.website && (
                <div className="col-span-2">
                  <p className="text-xs text-text-muted uppercase font-semibold mb-1">Website</p>
                  <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    {selectedLead.website}
                  </a>
                </div>
              )}
              {selectedLead.city && (
                <div>
                  <p className="text-xs text-text-muted uppercase font-semibold mb-1">City</p>
                  <p className="text-text-primary dark:text-white">{selectedLead.city}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Created</p>
                <p className="text-text-primary dark:text-white">{formatDate(selectedLead.created_at)}</p>
              </div>
            </div>

            {/* Notes */}
            {selectedLead.notes && (
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-2">Notes</p>
                <p className="text-text-secondary dark:text-text-muted bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">{selectedLead.notes}</p>
              </div>
            )}

            {/* Log Activity */}
            {selectedLead.lead_status === 'New' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm font-medium text-text-primary dark:text-white mb-3">Log Activity</p>
                <div className="flex gap-2 mb-3">
                  {(['Call', 'Email', 'Meeting', 'Note'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setDrawerActivityType(type)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        drawerActivityType === type
                          ? 'bg-accent text-white'
                          : 'border border-border dark:border-border text-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <textarea
                  value={drawerActivityNotes}
                  onChange={(e) => setDrawerActivityNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none mb-2"
                  placeholder="Activity notes..."
                />
                <button
                  onClick={handleAddDrawerActivity}
                  disabled={!drawerActivityNotes.trim()}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Log Activity
                </button>
              </div>
            )}

            {/* Activity Timeline */}
            <div>
              <p className="text-xs text-text-muted uppercase font-semibold mb-3">Activity Timeline</p>
              {leadActivities.length === 0 ? (
                <p className="text-text-muted text-sm">No activities recorded</p>
              ) : (
                <div className="space-y-3">
                  {leadActivities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'Call' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                        activity.type === 'Email' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                        activity.type === 'Meeting' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600'
                      }`}>
                        <i className={`fa-solid text-xs ${
                          activity.type === 'Call' ? 'fa-phone' :
                          activity.type === 'Email' ? 'fa-envelope' :
                          activity.type === 'Meeting' ? 'fa-users' :
                          'fa-note-sticky'
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary dark:text-white">{activity.type}</p>
                        <p className="text-sm text-text-secondary dark:text-text-muted">{activity.notes || 'No notes'}</p>
                        <p className="text-xs text-text-muted">{timeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedLead.lead_status === 'New' && (
              <div className="flex gap-3 pt-4 border-t border-border dark:border-border">
                <button
                  onClick={(e) => { setShowDrawer(false); openConvertModal(selectedLead, e as unknown as React.MouseEvent); }}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Convert to Deal
                </button>
                <button
                  onClick={(e) => { setShowDrawer(false); openRejectModal(selectedLead, e as unknown as React.MouseEvent); }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Reject Lead
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
