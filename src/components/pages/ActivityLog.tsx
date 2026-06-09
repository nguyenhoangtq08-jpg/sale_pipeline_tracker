import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { Drawer } from '../shared/Drawer';
import { Badge } from '../shared/Badge';
import { MetricCard } from '../shared/MetricCard';
import { ACTIVITY_TYPES, ACTIVITY_COLORS, STAGE_COLORS, type ActivityType, type Lead, type Activity } from '../../types';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function groupByDate(activities: Activity[]): Record<string, Activity[]> {
  const grouped: Record<string, Activity[]> = {};
  activities.forEach(a => {
    const dateKey = new Date(a.created_at).toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(a);
  });
  return grouped;
}

export function ActivityLog() {
  const { activities, leads, addActivity, deleteActivity, currentUser } = useApp();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [formData, setFormData] = useState({
    type: 'Call' as ActivityType,
    lead_id: '',
    lead_name: '',
    company: '',
    stage: '',
    date: new Date().toISOString().split('T')[0],
    duration: '30',
    notes: '',
    next_action: '',
  });

  const totalCalls = activities.filter(a => a.type === 'Call').length;
  const totalEmails = activities.filter(a => a.type === 'Email').length;
  const totalMeetings = activities.filter(a => a.type === 'Meeting').length;
  const totalHours = Math.round(activities.reduce((sum, a) => sum + a.duration, 0) / 60);

  const filteredActivities = useMemo(() => {
    let result = [...activities];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.lead_name.toLowerCase().includes(query) ||
        (a.company && a.company.toLowerCase().includes(query)) ||
        (a.notes && a.notes.toLowerCase().includes(query))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(a => a.type === typeFilter);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [activities, searchQuery, typeFilter, sortOrder]);

  const groupedActivities = groupByDate(filteredActivities);

  const handleLogActivity = async () => {
    if (!formData.lead_name.trim()) return;

    await addActivity({
      type: formData.type,
      lead_id: formData.lead_id || null,
      lead_name: formData.lead_name,
      company: formData.company || null,
      stage: formData.stage || null,
      date: formData.date,
      duration: parseInt(formData.duration) || 0,
      notes: formData.notes || null,
      next_action: formData.next_action || null,
      user_id: currentUser?.id || '0',
    });

    setFormData({
      type: 'Call',
      lead_id: '',
      lead_name: '',
      company: '',
      stage: '',
      date: new Date().toISOString().split('T')[0],
      duration: '30',
      notes: '',
      next_action: '',
    });
    setShowLogModal(false);
  };

  const handleSelectLead = (lead: Lead) => {
    setFormData({
      ...formData,
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company || '',
      stage: lead.stage,
    });
  };

  const openDrawer = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDrawer(true);
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;
    await deleteActivity(selectedActivity.id);
    setShowDrawer(false);
    setSelectedActivity(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Activity Log</h1>
          <p className="text-text-secondary dark:text-text-muted">Track your sales activities and interactions</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2 w-fit"
        >
          <i className="fa-solid fa-plus"></i>
          Log Activity
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Calls" value={totalCalls} icon="fa-phone" color="#10b981" />
        <MetricCard label="Emails" value={totalEmails} icon="fa-envelope" color="#3b82f6" />
        <MetricCard label="Meetings" value={totalMeetings} icon="fa-users" color="#8b5cf6" />
        <MetricCard label="Hours Logged" value={totalHours} icon="fa-clock" color="#f59e0b" />
      </div>

      {/* Filters */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 shadow-sm border border-border dark:border-border">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"></i>
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {['all', ...ACTIVITY_TYPES].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === type
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-bg-card dark:bg-bg-card rounded-xl p-12 text-center shadow-sm border border-border dark:border-border">
            <i className="fa-solid fa-clock-rotate-left text-4xl text-text-muted mb-3 block"></i>
            <p className="text-text-secondary dark:text-text-muted">No activities yet</p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border dark:bg-border"></div>
                <span className="text-sm font-medium text-text-muted">{formatDate(dateKey)}</span>
                <div className="h-px flex-1 bg-border dark:bg-border"></div>
              </div>

              {/* Activity Cards */}
              <div className="space-y-3">
                {dateActivities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => openDrawer(activity)}
                    className="w-full bg-bg-card dark:bg-bg-card rounded-xl p-4 shadow-sm border border-border dark:border-border hover:shadow-md transition-all text-left flex items-start gap-4"
                  >
                    {/* Type Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${ACTIVITY_COLORS[activity.type as ActivityType]}20` }}
                    >
                      <i
                        className={`fa-solid ${
                          activity.type === 'Call' ? 'fa-phone' :
                          activity.type === 'Email' ? 'fa-envelope' :
                          activity.type === 'Meeting' ? 'fa-users' :
                          'fa-note-sticky'
                        }`}
                        style={{ color: ACTIVITY_COLORS[activity.type as ActivityType] }}
                      ></i>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant="stage"
                          color={ACTIVITY_COLORS[activity.type as ActivityType]}
                        >
                          {activity.type}
                        </Badge>
                        <span className="font-medium text-text-primary dark:text-white">{activity.lead_name}</span>
                        {activity.company && (
                          <span className="text-text-secondary dark:text-text-muted">{activity.company}</span>
                        )}
                        {activity.stage && (
                          <Badge variant="stage" color={STAGE_COLORS[activity.stage as keyof typeof STAGE_COLORS]} size="sm">
                            {activity.stage}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary dark:text-text-muted line-clamp-2">{activity.notes || 'No notes'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {activity.duration > 0 && (
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <i className="fa-regular fa-clock"></i> {activity.duration} min
                          </span>
                        )}
                        {activity.next_action && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">
                            {activity.next_action}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <span className="text-xs text-text-muted flex-shrink-0">{timeAgo(activity.created_at)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Activity Modal */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Log Activity" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityType })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              >
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Lead *</label>
              <select
                value={formData.lead_id}
                onChange={(e) => {
                  const lead = leads.find(l => l.id === e.target.value);
                  if (lead) handleSelectLead(lead);
                  else setFormData({ ...formData, lead_id: '', lead_name: '' });
                }}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              >
                <option value="">Select Lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Duration (min)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
                placeholder="Activity details..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Next Action</label>
              <input
                type="text"
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                placeholder="Follow-up call, Send proposal..."
              />
            </div>
          </div>

          <button
            onClick={handleLogActivity}
            disabled={!formData.lead_name.trim()}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            Log Activity
          </button>
        </div>
      </Modal>

      {/* Activity Detail Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedActivity(null); }}
        title="Activity Details"
        footer={
          <button
            onClick={handleDeleteActivity}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <i className="fa-solid fa-trash mr-2"></i>Delete Activity
          </button>
        }
      >
        {selectedActivity && (
          <div className="space-y-6">
            {/* Activity Type & Info */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${ACTIVITY_COLORS[selectedActivity.type as ActivityType]}20` }}
              >
                <i
                  className={`fa-solid text-2xl ${
                    selectedActivity.type === 'Call' ? 'fa-phone' :
                    selectedActivity.type === 'Email' ? 'fa-envelope' :
                    selectedActivity.type === 'Meeting' ? 'fa-users' :
                    'fa-note-sticky'
                  }`}
                  style={{ color: ACTIVITY_COLORS[selectedActivity.type as ActivityType] }}
                ></i>
              </div>
              <div>
                <Badge variant="stage" color={ACTIVITY_COLORS[selectedActivity.type as ActivityType]} size="md">
                  {selectedActivity.type}
                </Badge>
                <h3 className="text-xl font-bold text-text-primary dark:text-white mt-1">{selectedActivity.lead_name}</h3>
                <p className="text-text-secondary dark:text-text-muted">{selectedActivity.company}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Date</p>
                <p className="text-text-primary dark:text-white">{formatDate(selectedActivity.date)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Duration</p>
                <p className="text-text-primary dark:text-white">{selectedActivity.duration} min</p>
              </div>
              {selectedActivity.stage && (
                <div>
                  <p className="text-xs text-text-muted uppercase font-semibold mb-1">Stage</p>
                  <Badge variant="stage" color={STAGE_COLORS[selectedActivity.stage as keyof typeof STAGE_COLORS]}>
                    {selectedActivity.stage}
                  </Badge>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedActivity.notes && (
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-2">Notes</p>
                <p className="text-text-secondary dark:text-text-muted bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">{selectedActivity.notes}</p>
              </div>
            )}

            {/* Next Action */}
            {selectedActivity.next_action && (
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-2">Next Action</p>
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg">
                  <i className="fa-solid fa-arrow-right text-accent"></i>
                  <span className="text-accent font-medium">{selectedActivity.next_action}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
