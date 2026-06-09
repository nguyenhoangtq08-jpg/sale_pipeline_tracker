import { useState, useMemo } from 'react';
import { useApp, useFilteredData } from '../../context/AppContext';
import { Drawer } from '../shared/Drawer';
import { Badge } from '../shared/Badge';
import { MetricCard } from '../shared/MetricCard';
import { LeadTemperatureMatrix } from '../shared/LeadTemperatureMatrix';
import { AddActivityModal } from '../modals/AddActivityModal';
import { ACTIVITY_TYPES, ACTIVITY_COLORS, STAGE_COLORS, type ActivityType, type TimeFilter, type ActivityMode, type Activity, type ScheduledTodo } from '../../types';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function groupByDate(items: Activity[]): Record<string, Activity[]> {
  const grouped: Record<string, Activity[]> = {};
  items.forEach(item => {
    const dateKey = new Date(item.created_at).toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });
  return grouped;
}

function isWithinTimeFilter(date: string, filter: TimeFilter): boolean {
  if (filter === 'all') return true;

  const now = new Date();
  const itemDate = new Date(date);

  if (filter === 'today') {
    return itemDate.toDateString() === now.toDateString();
  }

  if (filter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return itemDate >= weekAgo;
  }

  if (filter === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return itemDate >= monthAgo;
  }

  return true;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  'Call': 'fa-phone',
  'Email': 'fa-envelope',
  'Meeting': 'fa-users',
  'Note': 'fa-note-sticky',
};

const ACTIVITY_EMOJIS: Record<ActivityType, string> = {
  'Call': '📞',
  'Email': '📧',
  'Meeting': '🤝',
  'Note': '📝',
};

export function ActivityLog() {
  const { currentUser, deleteActivity, toggleTodoDone, deleteScheduledTodo } = useApp();
  const { getFilteredActivities, getFilteredScheduledTodos } = useFilteredData();

  const [showLogModal, setShowLogModal] = useState(false);
  const [modalMode, setModalMode] = useState<ActivityMode>('log');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<ScheduledTodo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const filteredActivities = getFilteredActivities();
  const filteredScheduledTodos = getFilteredScheduledTodos();

  // Active todos (not done)
  const activeTodos = filteredScheduledTodos.filter(t => !t.done);

  // Calculate counts per type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredActivities.length };
    ACTIVITY_TYPES.forEach(type => {
      counts[type] = filteredActivities.filter(a => a.type === type).length;
    });
    return counts;
  }, [filteredActivities]);

  // Total KPIs - based on filtered data for managers
  const totalCalls = filteredActivities.filter(a => a.type === 'Call').length;
  const totalEmails = filteredActivities.filter(a => a.type === 'Email').length;
  const totalMeetings = filteredActivities.filter(a => a.type === 'Meeting').length;
  const totalHours = Math.round(filteredActivities.reduce((sum, a) => sum + a.duration, 0) / 60);

  // Filter activities
  const displayActivities = useMemo(() => {
    let result = [...filteredActivities];

    // Time filter
    result = result.filter(a => isWithinTimeFilter(a.created_at, timeFilter));

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.lead_name.toLowerCase().includes(query) ||
        (a.company && a.company.toLowerCase().includes(query)) ||
        (a.notes && a.notes.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(a => a.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [filteredActivities, timeFilter, searchQuery, typeFilter, sortOrder]);

  const groupedActivities = groupByDate(displayActivities);

  const openDrawer = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDrawer(true);
  };

  const handleToggleTodo = async (todo: ScheduledTodo) => {
    await toggleTodoDone(todo.id);
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;
    await deleteActivity(selectedActivity.id);
    setShowDrawer(false);
    setSelectedActivity(null);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteScheduledTodo(id);
    if (selectedTodo?.id === id) {
      setSelectedTodo(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Activity Log</h1>
          <p className="text-text-secondary dark:text-text-muted">
            {currentUser?.role === 'manager'
              ? 'Track team activities and lead engagement'
              : 'Track your sales activities and interactions'}
          </p>
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

      {/* Scheduled To-Dos Section */}
      {activeTodos.length > 0 && (
        <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border dark:border-border bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-calendar-check text-green-500"></i>
                Scheduled To-Dos
                <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-medium">{activeTodos.length}</span>
              </h3>
            </div>
          </div>
          <div className="divide-y divide-border dark:divide-border max-h-[300px] overflow-y-auto">
            {activeTodos.map((todo) => (
              <div key={todo.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleTodo(todo)}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <i className="fa-solid fa-check text-green-500 opacity-0 hover:opacity-50"></i>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-text-primary dark:text-white">{todo.lead_name}</span>
                    {todo.company && (
                      <span className="text-text-secondary dark:text-text-muted text-sm">{todo.company}</span>
                    )}
                    {todo.stage && (
                      <Badge variant="stage" color={STAGE_COLORS[todo.stage as keyof typeof STAGE_COLORS]} size="sm">
                        {todo.stage}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-muted truncate">{todo.agenda}</p>
                </div>

                {/* Scheduled Time */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-text-primary dark:text-white">{formatDate(todo.scheduled_date)}</p>
                  {todo.scheduled_time && (
                    <p className="text-xs text-text-muted">{todo.scheduled_time}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleTodo(todo)}
                    className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500 transition-colors"
                    title="Mark as done"
                  >
                    <i className="fa-solid fa-check text-sm"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Temperature Matrix */}
      <LeadTemperatureMatrix />

      {/* Filters */}
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-4 shadow-sm border border-border dark:border-border">
        {/* Time Horizon Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeFilter(item.id as TimeFilter)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                timeFilter === item.id
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', ...ACTIVITY_TYPES].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                typeFilter === type
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {type === 'all' ? 'All' : (
                <>
                  <span>{ACTIVITY_EMOJIS[type as ActivityType]}</span>
                  <span>{type}</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs">{typeCounts[type] || 0}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Search and Sort */}
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
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
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
            <p className="text-text-secondary dark:text-text-muted">No activities found</p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border dark:bg-border"></div>
                <span className="text-sm font-medium text-text-muted px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                  {formatDate(dateActivities[0].created_at)}
                </span>
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
                        className={`fa-solid ${ACTIVITY_ICONS[activity.type as ActivityType]}`}
                        style={{ color: ACTIVITY_COLORS[activity.type as ActivityType] }}
                      ></i>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="stage" color={ACTIVITY_COLORS[activity.type as ActivityType]}>
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
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-text-muted block">{timeAgo(activity.created_at)}</span>
                      <span className="text-xs text-text-muted block">{formatTime(activity.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
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
            {/* Activity Type & Info */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${ACTIVITY_COLORS[selectedActivity.type as ActivityType]}20` }}
              >
                <i
                  className={`fa-solid text-2xl ${ACTIVITY_ICONS[selectedActivity.type as ActivityType]}`}
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
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Logged</p>
                <p className="text-text-primary dark:text-white">{timeAgo(selectedActivity.created_at)}</p>
              </div>
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
