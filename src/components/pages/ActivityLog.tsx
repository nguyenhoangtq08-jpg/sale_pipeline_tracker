import { useState, useMemo } from 'react';
import { useApp, useFilteredData } from '../../context/AppContext';
import { Drawer } from '../shared/Drawer';
import { AddActivityModal } from '../modals/AddActivityModal';
import { ACTIVITY_TYPES, ACTIVITY_COLORS, STAGE_COLORS, type ActivityType, type TimeFilter, type ActivityMode, type Activity, type ScheduledTodo, type Lead } from '../../types';

interface LeadWithStatus extends Lead {
  temp: 'warm' | 'cooling' | 'cold';
  days: number;
  actCount: number;
  lastAct: Activity | null;
}

function formatDateFull(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysSinceLastActivity(leadId: string, activities: Activity[]): number {
  const leadActs = activities.filter(a => a.lead_id === leadId);
  if (!leadActs.length) return 9999;
  const last = Math.max(...leadActs.map(a => new Date(a.created_at).getTime()));
  return Math.floor((Date.now() - last) / 86400000);
}

function getLeadTemp(leadId: string, activities: Activity[], warmDays: number, coldDays: number): 'warm' | 'cooling' | 'cold' {
  const days = daysSinceLastActivity(leadId, activities);
  if (days >= coldDays) return 'cold';
  if (days >= warmDays) return 'cooling';
  return 'warm';
}

const TYPE_CONFIG: Record<ActivityType, { icon: string; color: string; bg: string }> = {
  'Call':    { icon: 'fa-phone',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  'Email':   { icon: 'fa-envelope',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  'Meeting': { icon: 'fa-handshake',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  'Note':    { icon: 'fa-note-sticky', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const TEMP_CONFIG = {
  warm:    { icon: 'fa-fire',             color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Warm'    },
  cooling: { icon: 'fa-temperature-half', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Cooling' },
  cold:    { icon: 'fa-snowflake',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Cold'    },
};

export function ActivityLog() {
  const { currentUser, deleteActivity, toggleTodoDone, deleteScheduledTodo, leadRules, setShowLeadRulesModal } = useApp();
  const { getFilteredActivities, getFilteredScheduledTodos, getFilteredLeads } = useFilteredData();

  const [showLogModal, setShowLogModal] = useState(false);
  const [modalMode, setModalMode] = useState<ActivityMode>('log');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('newest');

  const filteredActivities = getFilteredActivities();
  const filteredScheduledTodos = getFilteredScheduledTodos();
  const filteredLeads = getFilteredLeads();
  const isManager = currentUser?.role === 'manager';
  const teamMembers = isManager ? [
    { id: '1', name: 'Duy Tran', initials: 'DT', color: '#6366f1' },
    { id: '2', name: 'Mai Le', initials: 'ML', color: '#10b981' },
    { id: '3', name: 'Hung Vo', initials: 'HV', color: '#8b5cf6' },
  ] : [];

  // Active todos for today
  const today = new Date().toDateString();
  const memberFilteredTodos = useMemo(() => {
    if (!isManager || !memberFilter) return filteredScheduledTodos;
    return filteredScheduledTodos.filter(s => s.assigned_to === memberFilter || s.owner_id === memberFilter);
  }, [filteredScheduledTodos, isManager, memberFilter]);

  const todayTodos = memberFilteredTodos.filter(s => new Date(s.scheduled_date).toDateString() === today);
  const upcomingTodos = memberFilteredTodos
    .filter(s => new Date(s.scheduled_date) > new Date() && new Date(s.scheduled_date).toDateString() !== today)
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 3);

  // KPIs
  const kpiCalls = filteredActivities.filter(a => a.type === 'Call').length;
  const kpiEmails = filteredActivities.filter(a => a.type === 'Email').length;
  const kpiMeetings = filteredActivities.filter(a => a.type === 'Meeting').length;
  const kpiTodayTasks = memberFilteredTodos.filter(s => new Date(s.scheduled_date).toDateString() === today && !s.done).length;
  const coldLeads = filteredLeads.filter(l =>
    !['Closed Won', 'Closed Lost'].includes(l.stage) &&
    getLeadTemp(l.id, filteredActivities, leadRules.warm_days, leadRules.cold_days) === 'cold'
  ).length;

  // Type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredActivities.length };
    ACTIVITY_TYPES.forEach(type => {
      counts[type] = filteredActivities.filter(a => a.type === type).length;
    });
    return counts;
  }, [filteredActivities]);

  // Apply filters
  const displayActivities = useMemo(() => {
    let result = [...filteredActivities];
    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      result = result.filter(a => {
        const d = new Date(a.date || a.created_at);
        if (timeFilter === 'today') return d.toDateString() === now.toDateString();
        if (timeFilter === 'week') {
          const w = new Date(now); w.setDate(now.getDate() - 7);
          return d >= w;
        }
        if (timeFilter === 'month') {
          const m = new Date(now); m.setDate(now.getDate() - 30);
          return d >= m;
        }
        return true;
      });
    }
    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(a => a.type === typeFilter);
    }
    // Member filter (manager only) - filter by lead ownership
    if (isManager && memberFilter) {
      const memberLeadIds = new Set(filteredLeads.filter(l => l.owner_id === memberFilter).map(l => l.id));
      result = result.filter(a => memberLeadIds.has(a.lead_id || ''));
    }
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.lead_name.toLowerCase().includes(q) ||
        (a.company && a.company.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q))
      );
    }
    // Sort
    if (sortOrder === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortOrder === 'oldest') result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortOrder === 'lead') result.sort((a, b) => a.lead_name.localeCompare(b.lead_name));
    else if (sortOrder === 'type') result.sort((a, b) => a.type.localeCompare(b.type));
    return result;
  }, [filteredActivities, timeFilter, typeFilter, memberFilter, searchQuery, sortOrder, isManager, filteredLeads]);

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    displayActivities.forEach(a => {
      const d = new Date(a.date || a.created_at).toDateString();
      if (!groups[d]) groups[d] = [];
      groups[d].push(a);
    });
    return groups;
  }, [displayActivities]);

  // Lead status list
  const leadStatusList = useMemo(() => {
    const leads: LeadWithStatus[] = filteredLeads
      .filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage))
      .map(l => ({
        ...l,
        temp: getLeadTemp(l.id, filteredActivities, leadRules.warm_days, leadRules.cold_days),
        days: daysSinceLastActivity(l.id, filteredActivities),
        actCount: filteredActivities.filter(a => a.lead_id === l.id).length,
        lastAct: [...filteredActivities.filter(a => a.lead_id === l.id)].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] || null,
      }));
    const filtered = leadStatusFilter === 'all' ? leads : leads.filter(l => l.temp === leadStatusFilter);
    return filtered.sort((a, b) => b.days - a.days);
  }, [filteredLeads, filteredActivities, leadRules, leadStatusFilter]);

  // Cold alerts
  const coldAlerts = useMemo(() => {
    const leads: LeadWithStatus[] = filteredLeads
      .filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage))
      .map(l => ({
        ...l,
        temp: getLeadTemp(l.id, filteredActivities, leadRules.warm_days, leadRules.cold_days),
        days: daysSinceLastActivity(l.id, filteredActivities),
        actCount: filteredActivities.filter(a => a.lead_id === l.id).length,
        lastAct: null,
      }));
    return leads.filter(l => l.temp !== 'warm').sort((a, b) => b.days - a.days);
  }, [filteredLeads, filteredActivities, leadRules]);

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

  const handleToggleTodo = async (todo: ScheduledTodo) => {
    await toggleTodoDone(todo.id);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteScheduledTodo(id);
  };

  return (
    <div className="page-enter space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white">Activity Log</h1>
          <p className="text-sm text-text-muted mt-1">
            {isManager ? 'Full team view — all members, all leads' : 'Your personal activity log & schedule'}
          </p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <button
              onClick={() => setShowLeadRulesModal(true)}
              className="px-3 py-2 text-sm font-semibold rounded-lg border border-border dark:border-border bg-bg-card dark:bg-bg-card text-text-secondary dark:text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-sliders"></i> Lead Rules
            </button>
          )}
          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-indigo-600 transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> Log / Schedule
          </button>
        </div>
      </div>

      {/* ROLE BANNER */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg"
        style={{
          background: isManager ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
          border: `1px solid ${isManager ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)'}`,
          color: isManager ? '#92400e' : 'var(--accent-text)',
        }}
      >
        <i className={`fa-solid ${isManager ? 'fa-crown' : 'fa-user'}`}></i>
        <span className="text-sm font-semibold">
          {isManager
            ? 'Manager view — you can see all team activities, configure lead rules, and monitor the full pipeline.'
            : 'Your view — showing only your activities and leads.'}
        </span>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-bg-card dark:bg-bg-card rounded-lg p-4 border border-border dark:border-border" style={{ borderLeft: '3px solid #10b981' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">📞 Calls</p>
          <p className="text-2xl font-bold text-green-500">{kpiCalls}</p>
          <p className="text-xs text-text-muted">{isManager ? 'team total' : 'my total'}</p>
        </div>
        <div className="bg-bg-card dark:bg-bg-card rounded-lg p-4 border border-border dark:border-border" style={{ borderLeft: '3px solid #3b82f6' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">📧 Emails</p>
          <p className="text-2xl font-bold text-blue-500">{kpiEmails}</p>
          <p className="text-xs text-text-muted">logged</p>
        </div>
        <div className="bg-bg-card dark:bg-bg-card rounded-lg p-4 border border-border dark:border-border" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">🤝 Meetings</p>
          <p className="text-2xl font-bold text-purple-500">{kpiMeetings}</p>
          <p className="text-xs text-text-muted">held</p>
        </div>
        <div className="bg-bg-card dark:bg-bg-card rounded-lg p-4 border border-border dark:border-border" style={{ borderLeft: '3px solid #6366f1' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">📅 Today's Tasks</p>
          <p className="text-2xl font-bold text-accent">{kpiTodayTasks}</p>
          <p className="text-xs text-text-muted">pending</p>
        </div>
        <div className="bg-bg-card dark:bg-bg-card rounded-lg p-4 border border-border dark:border-border" style={{ borderLeft: '3px solid #ef4444' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">🧊 Cold Leads</p>
          <p className="text-2xl font-bold text-red-500">{coldLeads}</p>
          <p className="text-xs text-text-muted">need attention</p>
        </div>
      </div>

      {/* TODAY'S TO-DO + COLD ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TODAY'S TO-DO */}
        <div className="bg-bg-card dark:bg-bg-card rounded-lg border border-border dark:border-border overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-list-check text-accent"></i>
                {isManager ? "Team To-Do" : "My To-Do"}
                {kpiTodayTasks > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{kpiTodayTasks}</span>
                )}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">{formatDateFull(new Date().toISOString())}</p>
            </div>
            {isManager && (
              <div className="flex items-center gap-2">
                {teamMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMemberFilter(memberFilter === m.id ? '' : m.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      memberFilter === m.id
                        ? 'ring-2 ring-accent ring-offset-2'
                        : ''
                    }`}
                    style={{ background: m.color, color: 'white' }}
                    title={m.name}
                  >
                    {m.initials}
                  </button>
                ))}
                {memberFilter && (
                  <button
                    onClick={() => setMemberFilter('')}
                    className="text-[10px] text-text-muted hover:text-text-primary"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="px-4 pb-4 max-h-[280px] overflow-y-auto">
            {todayTodos.length === 0 && upcomingTodos.length === 0 ? (
              <div className="text-center py-6 text-text-muted">
                <i className="fa-solid fa-circle-check text-xl text-green-500 mb-2 block"></i>
                <p className="text-xs">Nothing scheduled today!</p>
              </div>
            ) : (
              <>
                {todayTodos.map(todo => {
                  const typeCfg = TYPE_CONFIG[todo.type as ActivityType] || TYPE_CONFIG['Call'];
                  const isAssigned = todo.assigned_to && todo.assigned_to !== todo.owner_id;
                  const assignee = isAssigned ? teamMembers.find(m => m.id === todo.assigned_to) : null;
                  return (
                  <div
                    key={todo.id}
                    className={`flex items-start gap-3 p-3 rounded-lg mb-2 border transition-all ${
                      todo.done
                        ? 'bg-gray-50 dark:bg-gray-900/50 border-border opacity-60'
                        : 'bg-gray-50 dark:bg-gray-900/30 border-border'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                        todo.done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {todo.done && <i className="fa-solid fa-check text-white text-xs"></i>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: typeCfg.bg, color: typeCfg.color }}
                        >
                          {todo.type}
                        </span>
                        <span className={`text-xs font-semibold ${todo.done ? 'line-through' : ''}`}>{todo.lead_name}</span>
                        <span className="text-[10px] text-text-muted ml-auto">{todo.scheduled_time}</span>
                      </div>
                      <p className="text-xs text-text-secondary truncate">{todo.agenda}</p>
                      {isAssigned && assignee && (
                        <p className="text-[10px] text-amber-600 mt-1">
                          <i className="fa-solid fa-user-plus mr-1"></i>
                          Assigned by {teamMembers.find(m => m.id === todo.owner_id)?.name.split(' ')[0] || 'Manager'} to {assignee.name.split(' ')[0]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-text-muted hover:text-red-500 transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  </div>
                );})}
                {upcomingTodos.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider my-3">Upcoming</p>
                    {upcomingTodos.map(todo => {
                      const typeCfg = TYPE_CONFIG[todo.type as ActivityType] || TYPE_CONFIG['Call'];
                      const isAssigned = todo.assigned_to && todo.assigned_to !== todo.owner_id;
                      const assignee = isAssigned ? teamMembers.find(m => m.id === todo.assigned_to) : null;
                      return (
                      <div
                        key={todo.id}
                        className="flex items-start gap-3 p-3 rounded-lg mb-2 border border-border bg-gray-50 dark:bg-gray-900/30"
                      >
                        <button
                          onClick={() => handleToggleTodo(todo)}
                          className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: typeCfg.bg, color: typeCfg.color }}
                            >
                              {todo.type}
                            </span>
                            <span className="text-xs font-semibold">{todo.lead_name}</span>
                            <span className="text-[10px] text-text-muted ml-auto">{formatDate(todo.scheduled_date)}</span>
                          </div>
                          <p className="text-xs text-text-secondary truncate">{todo.agenda}</p>
                          {isAssigned && assignee && (
                            <p className="text-[10px] text-amber-600 mt-1">
                              <i className="fa-solid fa-user-plus mr-1"></i>
                              Assigned to {assignee.name.split(' ')[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    );})}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* WARM/COLD ALERTS */}
        <div className="bg-bg-card dark:bg-bg-card rounded-lg border border-border dark:border-border overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-temperature-half text-amber-500"></i> Lead Temperature Alerts
                {coldAlerts.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{coldAlerts.length}</span>
                )}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Warm: &gt;{leadRules.warm_days}d · Cold: &gt;{leadRules.cold_days}d inactive
              </p>
            </div>
            {isManager && (
              <button
                onClick={() => setShowLeadRulesModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border dark:border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <i className="fa-solid fa-gear"></i>
              </button>
            )}
          </div>
          <div className="px-4 pb-4 max-h-[280px] overflow-y-auto">
            {coldAlerts.length === 0 ? (
              <div className="text-center py-6 text-text-muted">
                <i className="fa-solid fa-fire text-xl text-green-500 mb-2 block"></i>
                <p className="text-xs">All leads are warm! Great work.</p>
              </div>
            ) : (
              coldAlerts.map(lead => {
                const cfg = TEMP_CONFIG[lead.temp];
                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 p-3 rounded-lg mb-2 border"
                    style={{ background: cfg.bg, borderColor: cfg.color + '40' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}
                    >
                      <i className={`fa-solid ${cfg.icon} text-sm`} style={{ color: cfg.color }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-text-primary dark:text-white">{lead.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] + '20', color: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] }}>
                          {lead.stage}
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: cfg.color }}>
                        {lead.days === 9999 ? 'No activity yet' : `${lead.days}d without activity`}
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowLogModal(true); }}
                      className="px-2 py-1 text-[10px] font-semibold rounded border border-border dark:border-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <i className="fa-solid fa-plus"></i> Log
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ACTIVITY HISTORY */}
      <div className="bg-bg-card dark:bg-bg-card rounded-lg border border-border dark:border-border overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-accent"></i>
            {isManager ? 'Team Activity History' : 'My Activity History'}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {/* Time chips */}
            {['all', 'today', 'week', 'month'].map(range => (
              <button
                key={range}
                onClick={() => setTimeFilter(range as TimeFilter)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all ${
                  timeFilter === range
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {range === 'all' ? 'All time' : range === 'today' ? 'Today' : range === 'week' ? 'This week' : 'This month'}
              </button>
            ))}
            <input
              type="text"
              placeholder="🔍 Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-40 px-3 py-1.5 text-xs rounded-lg border border-border dark:border-border bg-transparent"
            />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border dark:border-border bg-transparent"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="lead">By lead</option>
              <option value="type">By type</option>
            </select>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex items-center border-b border-border dark:border-border px-4 gap-0 overflow-x-auto">
          {['all', ...ACTIVITY_TYPES].map(type => {
            const isActive = typeFilter === type;
            const color = type === 'all' ? '#6366f1' : type === 'Call' ? '#10b981' : type === 'Email' ? '#3b82f6' : type === 'Meeting' ? '#8b5cf6' : '#f59e0b';
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="px-4 py-3 text-[13px] font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                style={{
                  color: isActive ? color : 'var(--text-secondary)',
                  borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                }}
              >
                {type !== 'all' && (
                  <i className={`fa-solid ${TYPE_CONFIG[type as ActivityType]?.icon}`} style={{ color: TYPE_CONFIG[type as ActivityType]?.color }}></i>
                )}
                {type === 'all' ? 'All' : type + 's'}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: isActive ? color + '20' : 'var(--bg-input)',
                    color: isActive ? color : 'var(--text-muted)',
                  }}
                >
                  {typeCounts[type]}
                </span>
              </button>
            );
          })}
          {/* Member filter for manager */}
          {isManager && (
            <select
              value={memberFilter}
              onChange={e => setMemberFilter(e.target.value)}
              className="ml-auto px-3 py-1.5 text-xs rounded-lg border border-border dark:border-border bg-transparent"
            >
              <option value="">All members</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Activity list */}
        <div className="p-4">
          {Object.keys(groupedActivities).length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <i className="fa-solid fa-clock-rotate-left text-3xl opacity-30 mb-3 block"></i>
              <p className="text-sm font-semibold text-text-secondary mb-1">No activities found</p>
              <p className="text-xs">Try adjusting filters or log a new activity.</p>
            </div>
          ) : (
            Object.entries(groupedActivities).map(([date, acts]) => (
              <div key={date} className="mb-5">
                {/* Date separator */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border dark:bg-border"></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {formatDate(new Date(date).toISOString())}
                  </span>
                  <div className="h-px flex-1 bg-border dark:bg-border"></div>
                  <span className="text-[10px] text-text-muted bg-gray-50 dark:bg-gray-900/50 border border-border dark:border-border px-2 py-0.5 rounded">
                    {acts.length} item{acts.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Activity cards */}
                <div className="space-y-2">
                  {acts.map(activity => {
                    const cfg = TYPE_CONFIG[activity.type as ActivityType];
                    const owner = teamMembers.find(m => m.id === activity.owner_id);
                    return (
                      <div
                        key={activity.id}
                        onClick={() => openDrawer(activity)}
                        className="flex border border-border dark:border-border rounded-lg overflow-hidden cursor-pointer bg-bg-card dark:bg-bg-card hover:shadow-md hover:border-accent transition-all"
                      >
                        <div className="w-1 flex-shrink-0" style={{ background: cfg?.color }}></div>
                        <div className="flex-1 p-3 flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg?.bg }}
                          >
                            <i className={`fa-solid ${cfg?.icon}`} style={{ color: cfg?.color }}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                                style={{ background: cfg?.bg, color: cfg?.color }}
                              >
                                {activity.type}
                              </span>
                              <span className="text-[13px] font-bold text-text-primary dark:text-white">{activity.lead_name}</span>
                              <span className="text-[11px] text-text-muted">{activity.company}</span>
                              <span
                                className="ml-auto text-[10px] px-2 py-0.5 rounded"
                                style={{ background: STAGE_COLORS[activity.stage as keyof typeof STAGE_COLORS] + '20', color: STAGE_COLORS[activity.stage as keyof typeof STAGE_COLORS] }}
                              >
                                {activity.stage}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-2 mb-1">
                              {activity.notes || <em className="text-text-muted">No notes.</em>}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {activity.duration > 0 && (
                                <span className="text-[11px] text-text-muted">
                                  <i className="fa-regular fa-clock mr-1"></i>{activity.duration}m
                                </span>
                              )}
                              {activity.next_action && (
                                <span className="text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded">
                                  <i className="fa-solid fa-arrow-right mr-1"></i>{activity.next_action}
                                </span>
                              )}
                              {owner && (
                                <span className="flex items-center gap-1.5 text-[11px] text-text-muted ml-auto">
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                    style={{ background: owner.color }}
                                  >
                                    {owner.initials}
                                  </span>
                                  {owner.name.split(' ')[0]}
                                </span>
                              )}
                              <span className="text-[10px] text-text-muted">{timeAgo(activity.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* LEAD STATUS LIST */}
      <div className="bg-bg-card dark:bg-bg-card rounded-lg border border-border dark:border-border overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-border dark:border-border">
          <h3 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-users text-accent"></i>
            {isManager ? 'All Leads Activity Status' : 'My Leads Activity Status'}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {['all', 'warm', 'cooling', 'cold'].map(f => (
              <button
                key={f}
                onClick={() => setLeadStatusFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-all ${
                  leadStatusFilter === f
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-text-secondary hover:border-accent hover:text-accent'
                }`}
              >
                {f === 'warm' && <i className="fa-solid fa-fire text-green-500"></i>}
                {f === 'cooling' && <i className="fa-solid fa-temperature-half text-amber-500"></i>}
                {f === 'cold' && <i className="fa-solid fa-snowflake text-blue-500"></i>}
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-border dark:border-border">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Lead / Company</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Stage</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Temperature</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Activity</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Days Inactive</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Activity Count</th>
                {isManager && <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Owner</th>}
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leadStatusList.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="text-center py-8 text-text-muted text-sm">
                    No leads match this filter.
                  </td>
                </tr>
              ) : (
                leadStatusList.map(lead => {
                  const cfg = TEMP_CONFIG[lead.temp];
                  const daysColor = lead.days >= leadRules.cold_days ? '#991b1b' : lead.days >= leadRules.warm_days ? '#92400e' : '#065f46';
                  const owner = teamMembers.find(m => m.id === lead.owner_id);
                  const sparkPct = Math.min(lead.actCount * 20, 100);
                  return (
                    <tr key={lead.id} className="border-b border-border dark:border-border hover:bg-accent/5 cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-bold text-text-primary dark:text-white">{lead.name}</p>
                        <p className="text-[11px] text-text-muted">{lead.company}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] + '20', color: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] }}
                        >
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: cfg.bg }}
                          >
                            <i className={`fa-solid ${cfg.icon} text-[11px]`} style={{ color: cfg.color }}></i>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.lastAct ? (
                          <>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded block mb-0.5"
                              style={{ background: TYPE_CONFIG[lead.lastAct.type as ActivityType]?.bg, color: TYPE_CONFIG[lead.lastAct.type as ActivityType]?.color }}
                            >
                              {lead.lastAct.type}
                            </span>
                            <span className="text-[10px] text-text-muted">{timeAgo(lead.lastAct.created_at)}</span>
                          </>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: daysColor }}>
                        {lead.days === 9999 ? 'Never' : lead.days + 'd'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{lead.actCount}</span>
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-1">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${sparkPct}%`, background: '#6366f1' }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          {owner ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ background: owner.color }}
                              >
                                {owner.initials}
                              </span>
                              <span className="text-xs text-text-secondary">{owner.name.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowLogModal(true)}
                            className="w-8 h-8 rounded flex items-center justify-center border border-border dark:border-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <i className="fa-solid fa-plus text-xs text-text-muted"></i>
                          </button>
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

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        mode={modalMode}
        onModeChange={setModalMode}
      />

      {/* Activity Detail Drawer */}
      <Drawer
        isOpen={showDrawer && !!selectedActivity}
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
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ background: TYPE_CONFIG[selectedActivity.type as ActivityType]?.bg }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                style={{ background: TYPE_CONFIG[selectedActivity.type as ActivityType]?.color }}
              >
                <i className={`fa-solid ${TYPE_CONFIG[selectedActivity.type as ActivityType]?.icon}`}></i>
              </div>
              <div>
                <p className="font-bold text-text-primary dark:text-white">{selectedActivity.type} with {selectedActivity.lead_name}</p>
                <p className="text-xs text-text-secondary">{formatDateTime(selectedActivity.date)} {selectedActivity.duration > 0 ? `· ${selectedActivity.duration} min` : ''}</p>
              </div>
            </div>

            <div className="border border-border dark:border-border rounded-lg overflow-hidden text-xs">
              <div className="flex justify-between px-4 py-2 border-b border-border dark:border-border bg-gray-50 dark:bg-gray-900/50">
                <span className="text-text-muted">Lead</span>
                <span className="font-semibold">{selectedActivity.lead_name}</span>
              </div>
              <div className="flex justify-between px-4 py-2 border-b border-border dark:border-border">
                <span className="text-text-muted">Company</span>
                <span>{selectedActivity.company}</span>
              </div>
              <div className="flex justify-between px-4 py-2 border-b border-border dark:border-border bg-gray-50 dark:bg-gray-900/50">
                <span className="text-text-muted">Stage</span>
                <span
                  className="px-2 py-0.5 rounded font-semibold"
                  style={{ background: STAGE_COLORS[selectedActivity.stage as keyof typeof STAGE_COLORS] + '20', color: STAGE_COLORS[selectedActivity.stage as keyof typeof STAGE_COLORS] }}
                >
                  {selectedActivity.stage}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2 border-b border-border dark:border-border">
                <span className="text-text-muted">Date</span>
                <span>{formatDate(selectedActivity.date)}</span>
              </div>
              {selectedActivity.duration > 0 && (
                <div className="flex justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-text-muted">Duration</span>
                  <span>{selectedActivity.duration} minutes</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Notes</p>
              <p className="text-sm text-text-secondary bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-border dark:border-border">
                {selectedActivity.notes || <em className="text-text-muted">No notes recorded.</em>}
              </p>
            </div>

            {selectedActivity.next_action && (
              <div className="p-3 bg-accent/10 border-l-[3px] border-accent rounded-lg">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1">Next Action</p>
                <p className="text-sm text-accent">{selectedActivity.next_action}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
