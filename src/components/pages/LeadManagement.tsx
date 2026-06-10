import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { Drawer } from '../shared/Drawer';
import { Badge } from '../shared/Badge';
import { STAGES, SOURCES, STAGE_COLORS, type Lead, type Stage, type Source } from '../../types';

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

interface LeadFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  deal_size: string;
  source: Source;
  stage: Stage;
  probability: string;
  notes: string;
}

const initialFormData: LeadFormData = {
  name: '',
  company: '',
  email: '',
  phone: '',
  deal_size: '',
  source: 'Website',
  stage: 'Prospecting',
  probability: '20',
  notes: '',
};

export function LeadManagement() {
  const { leads, activities, addLead, updateLead, deleteLead, currentUser, setSelectedLead, selectedLead } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('updated_desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(query) ||
        (l.company && l.company.toLowerCase().includes(query)) ||
        (l.email && l.email.toLowerCase().includes(query))
      );
    }

    if (stageFilter !== 'all') {
      result = result.filter(l => l.stage === stageFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter(l => l.source === sourceFilter);
    }

    switch (sortOrder) {
      case 'updated_desc':
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'updated_asc':
        result.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        break;
      case 'deal_desc':
        result.sort((a, b) => Number(b.deal_size) - Number(a.deal_size));
        break;
      case 'deal_asc':
        result.sort((a, b) => Number(a.deal_size) - Number(b.deal_size));
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [leads, searchQuery, stageFilter, sourceFilter, sortOrder]);

  const handleAddLead = async () => {
    if (!formData.name.trim()) return;

    await addLead({
      name: formData.name.trim(),
      company: formData.company.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      deal_size: parseFloat(formData.deal_size) || 0,
      source: formData.source,
      stage: formData.stage,
      probability: parseInt(formData.probability) || 0,
      notes: formData.notes.trim() || null,
      owner_id: currentUser?.id || '0',
    });

    setFormData(initialFormData);
    setShowAddModal(false);
  };

  const handleEditLead = async () => {
    if (!editingLead || !formData.name.trim()) return;

    await updateLead(editingLead.id, {
      name: formData.name.trim(),
      company: formData.company.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      deal_size: parseFloat(formData.deal_size) || 0,
      source: formData.source,
      stage: formData.stage,
      probability: parseInt(formData.probability) || 0,
      notes: formData.notes.trim() || null,
    });

    setEditingLead(null);
    setFormData(initialFormData);
    setShowEditModal(false);
  };

  const handleDeleteLead = async () => {
    if (!editingLead) return;
    await deleteLead(editingLead.id);
    setEditingLead(null);
    setShowDeleteConfirm(false);
    setShowEditModal(false);
    setShowDrawer(false);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      deal_size: lead.deal_size.toString(),
      source: lead.source as Source,
      stage: lead.stage as Stage,
      probability: lead.probability.toString(),
      notes: lead.notes || '',
    });
    setShowEditModal(true);
  };

  const openDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDrawer(true);
  };

  const leadActivities = selectedLead
    ? activities.filter(a => a.lead_id === selectedLead.id || a.lead_name === selectedLead.name)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Lead Management</h1>
          <p className="text-text-secondary dark:text-text-muted">Manage your sales leads and prospects</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2 w-fit"
        >
          <i className="fa-solid fa-plus"></i>
          Add Lead
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
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="updated_asc">Oldest Updated</option>
            <option value="deal_desc">Deal Size (High)</option>
            <option value="deal_asc">Deal Size (Low)</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Name / Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Deal Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Probability</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <i className="fa-solid fa-users text-4xl text-text-muted mb-3 block"></i>
                    <p className="text-text-secondary dark:text-text-muted">No leads found</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => openDrawer(lead)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-text-primary dark:text-white">{lead.name}</p>
                        <p className="text-sm text-text-secondary dark:text-text-muted">{lead.company || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="stage" color={STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS]}>
                        {lead.stage}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-text-primary dark:text-white">
                      {formatCurrency(lead.deal_size)}
                    </td>
                    <td className="px-6 py-4 text-text-secondary dark:text-text-muted">{lead.source}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${lead.probability}%`, backgroundColor: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] }}
                          ></div>
                        </div>
                        <span className="text-sm text-text-secondary dark:text-text-muted">{lead.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">{timeAgo(lead.updated_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-muted hover:text-accent"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingLead(lead); setShowDeleteConfirm(true); }}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-text-muted hover:text-red-500"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Lead" size="lg">
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddLead}
          submitLabel="Add Lead"
        />
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Lead" size="lg">
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEditLead}
          submitLabel="Save Changes"
          showDelete
          onDelete={() => setShowDeleteConfirm(true)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Lead" size="sm">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <i className="fa-solid fa-trash text-2xl text-red-500"></i>
          </div>
          <p className="text-text-primary dark:text-white mb-2">Are you sure you want to delete this lead?</p>
          <p className="text-sm text-text-muted mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2 border border-border dark:border-border rounded-lg text-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteLead}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Lead Detail Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedLead(null); }}
        title="Lead Details"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => { setShowDrawer(false); openEditModal(selectedLead!); }}
              className="flex-1 px-4 py-2 border border-border dark:border-border rounded-lg text-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit Lead
            </button>
          </div>
        }
      >
        {selectedLead && (
          <div className="space-y-6">
            {/* Lead Info */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS] }}
              >
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary dark:text-white">{selectedLead.name}</h3>
                <p className="text-text-secondary dark:text-text-muted">{selectedLead.company || 'No company'}</p>
                <Badge variant="stage" color={STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS]} size="md">
                  {selectedLead.stage}
                </Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Deal Size</p>
                <p className="text-lg font-bold text-accent">{formatCurrency(selectedLead.deal_size)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Probability</p>
                <p className="text-lg font-bold text-text-primary dark:text-white">{selectedLead.probability}%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Source</p>
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

            {/* Activity Timeline */}
            <div>
              <p className="text-xs text-text-muted uppercase font-semibold mb-3">Activity Timeline</p>
              {leadActivities.length === 0 ? (
                <p className="text-text-muted text-sm">No activities recorded</p>
              ) : (
                <div className="space-y-3">
                  {leadActivities.slice(0, 5).map((activity) => (
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
                        <p className="text-sm text-text-primary dark:text-white">{activity.notes || activity.type}</p>
                        <p className="text-xs text-text-muted">{timeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function LeadForm({
  formData,
  setFormData,
  onSubmit,
  submitLabel,
  showDelete = false,
  onDelete,
}: {
  formData: LeadFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onSubmit: () => void;
  submitLabel: string;
  showDelete?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Full Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Enter name"
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
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Deal Size ($)</label>
          <input
            type="number"
            value={formData.deal_size}
            onChange={(e) => setFormData({ ...formData, deal_size: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Source</label>
          <select
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value as Source })}
            className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Stage</label>
          <select
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value as Stage })}
            className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Probability (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.probability}
            onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
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

      <div className="flex gap-3 pt-2">
        {showDelete && onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <i className="fa-solid fa-trash mr-2"></i>Delete
          </button>
        )}
        <button
          onClick={onSubmit}
          disabled={!formData.name.trim()}
          className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
