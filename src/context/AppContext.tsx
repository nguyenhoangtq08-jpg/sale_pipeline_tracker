import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, Activity, Account, Toast, Notification, Page, ScheduledTodo, LeadRules } from '../types';

interface AppContextType {
  // Auth
  currentUser: Account | null;
  signIn: (account: Account) => Promise<void>;
  signOut: () => void;
  isAuthLoading: boolean;

  // Team member filter (manager only)
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
  teamMembers: Account[];

  // Leads
  leads: Lead[];
  loadLeads: () => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<Lead | null>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;

  // Activities
  activities: Activity[];
  loadActivities: () => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'created_at'>) => Promise<Activity | null>;
  deleteActivity: (id: string) => Promise<void>;

  // Scheduled Todos
  scheduledTodos: ScheduledTodo[];
  loadScheduledTodos: () => Promise<void>;
  addScheduledTodo: (todo: Omit<ScheduledTodo, 'id' | 'created_at'>) => Promise<ScheduledTodo | null>;
  updateScheduledTodo: (id: string, updates: Partial<ScheduledTodo>) => Promise<void>;
  toggleTodoDone: (id: string) => Promise<void>;
  deleteScheduledTodo: (id: string) => Promise<void>;

  // Lead Rules
  leadRules: LeadRules;
  loadLeadRules: () => Promise<void>;
  updateLeadRules: (rules: Partial<LeadRules>) => Promise<void>;

  // Navigation
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Toasts
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string) => void;
  dismissToast: (id: string) => void;

  // Notifications
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Modal states
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  showNotificationsModal: boolean;
  setShowNotificationsModal: (show: boolean) => void;
  showLeadRulesModal: boolean;
  setShowLeadRulesModal: (show: boolean) => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  selectedActivity: Activity | null;
  setSelectedActivity: (activity: Activity | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_LEAD_RULES: LeadRules = {
  id: 'default',
  warm_days: 7,
  cold_days: 14,
  updated_at: new Date().toISOString(),
  updated_by: null,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [scheduledTodos, setScheduledTodos] = useState<ScheduledTodo[]>([]);
  const [leadRules, setLeadRules] = useState<LeadRules>(DEFAULT_LEAD_RULES);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLeadRulesModal, setShowLeadRulesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'New Lead Added', message: 'Nguyen Thi Linh was added as a new lead', time: '5 minutes ago', read: false, type: 'lead' },
    { id: '2', title: 'Deal Moved', message: 'TechCorp Vietnam moved to Proposal stage', time: '1 hour ago', read: false, type: 'deal' },
    { id: '3', title: 'Meeting Scheduled', message: 'Meeting with ABC Manufacturing confirmed', time: '2 hours ago', read: true, type: 'activity' },
    { id: '4', title: 'Weekly Report Ready', message: 'Your weekly sales report is ready to view', time: '1 day ago', read: true, type: 'system' },
  ]);

  // Team members - all for manager, only self for member
  const teamMembers: Account[] = currentUser?.role === 'manager'
    ? [
        { id: '0', name: 'Anna Nguyen', initials: 'AN', email: 'anna.nguyen@salestrack.vn', role: 'manager', color: '#d97706', roleLabel: 'Account Manager' },
        { id: '1', name: 'Duy Tran', initials: 'DT', email: 'duy.tran@salestrack.vn', role: 'member', color: '#6366f1', roleLabel: 'Account Sales' },
        { id: '2', name: 'Mai Le', initials: 'ML', email: 'mai.le@salestrack.vn', role: 'member', color: '#10b981', roleLabel: 'Account Sales' },
        { id: '3', name: 'Hung Vo', initials: 'HV', email: 'hung.vo@salestrack.vn', role: 'member', color: '#8b5cf6', roleLabel: 'Account Sales' },
      ]
    : currentUser ? [currentUser] : [];

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const signIn = useCallback(async (account: Account) => {
    setIsAuthLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setCurrentUser(account);
    setIsAuthLoading(false);
    // Reset member filter on sign in
    setSelectedMemberId(null);
    showToast('success', `Welcome back, ${account.name}!`);
  }, []);

  const signOut = useCallback(() => {
    setCurrentUser(null);
    setLeads([]);
    setActivities([]);
    setScheduledTodos([]);
    setCurrentPage('dashboard');
    setSelectedMemberId(null);
    showToast('info', 'You have been signed out');
  }, []);

  const loadLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) {
      setLeads(data as Lead[]);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setActivities(data as Activity[]);
    }
  }, []);

  const loadScheduledTodos = useCallback(async () => {
    const { data, error } = await supabase
      .from('scheduled_todos')
      .select('*')
      .order('scheduled_date', { ascending: true });
    if (!error && data) {
      setScheduledTodos(data as ScheduledTodo[]);
    }
  }, []);

  const loadLeadRules = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_rules')
      .select('*')
      .limit(1)
      .single();
    if (!error && data) {
      setLeadRules(data as LeadRules);
    }
  }, []);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select()
      .single();
    if (!error && data) {
      setLeads(prev => [data as Lead, ...prev]);
      showToast('success', 'Lead added successfully');
      return data as Lead;
    }
    showToast('error', 'Failed to add lead');
    return null;
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l));
      showToast('success', 'Lead updated successfully');
    } else {
      showToast('error', 'Failed to update lead');
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);
    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== id));
      showToast('success', 'Lead deleted successfully');
    } else {
      showToast('error', 'Failed to delete lead');
    }
  }, []);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('activities')
      .insert([activity])
      .select()
      .single();
    if (!error && data) {
      setActivities(prev => [data as Activity, ...prev]);
      showToast('success', 'Activity logged successfully');
      return data as Activity;
    }
    showToast('error', 'Failed to log activity');
    return null;
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id));
      showToast('success', 'Activity deleted successfully');
    } else {
      showToast('error', 'Failed to delete activity');
    }
  }, []);

  const addScheduledTodo = useCallback(async (todo: Omit<ScheduledTodo, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('scheduled_todos')
      .insert([todo])
      .select()
      .single();
    if (!error && data) {
      setScheduledTodos(prev => [...prev, data as ScheduledTodo].sort((a, b) =>
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      ));
      showToast('success', 'Task scheduled successfully');
      return data as ScheduledTodo;
    }
    showToast('error', 'Failed to schedule task');
    return null;
  }, []);

  const updateScheduledTodo = useCallback(async (id: string, updates: Partial<ScheduledTodo>) => {
    const { error } = await supabase
      .from('scheduled_todos')
      .update(updates)
      .eq('id', id);
    if (!error) {
      setScheduledTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, []);

  const toggleTodoDone = useCallback(async (id: string) => {
    const todo = scheduledTodos.find(t => t.id === id);
    if (!todo) return;

    const newDoneStatus = !todo.done;
    const { error } = await supabase
      .from('scheduled_todos')
      .update({ done: newDoneStatus })
      .eq('id', id);

    if (!error) {
      setScheduledTodos(prev => prev.map(t => t.id === id ? { ...t, done: newDoneStatus } : t));
      showToast('success', newDoneStatus ? 'Task marked as complete' : 'Task marked as incomplete');
    }
  }, [scheduledTodos]);

  const deleteScheduledTodo = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('scheduled_todos')
      .delete()
      .eq('id', id);
    if (!error) {
      setScheduledTodos(prev => prev.filter(t => t.id !== id));
      showToast('success', 'Scheduled task deleted');
    }
  }, []);

  const updateLeadRules = useCallback(async (rules: Partial<LeadRules>) => {
    const { error } = await supabase
      .from('lead_rules')
      .update({ ...rules, updated_at: new Date().toISOString(), updated_by: currentUser?.id || null })
      .eq('id', leadRules.id);
    if (!error) {
      setLeadRules(prev => ({ ...prev, ...rules, updated_at: new Date().toISOString() }));
      showToast('success', 'Lead rules updated');
    }
  }, [leadRules, currentUser]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev: Toast[]) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev: Toast[]) => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev: Toast[]) => prev.filter(t => t.id !== id));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev: boolean) => !prev);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev: Notification[]) => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev: Notification[]) => prev.map(n => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadLeads();
      loadActivities();
      loadScheduledTodos();
      loadLeadRules();
    }
  }, [currentUser, loadLeads, loadActivities, loadScheduledTodos, loadLeadRules]);

  return (
    <AppContext.Provider value={{
      currentUser,
      signIn,
      signOut,
      isAuthLoading,
      selectedMemberId,
      setSelectedMemberId,
      teamMembers,
      leads,
      loadLeads,
      addLead,
      updateLead,
      deleteLead,
      activities,
      loadActivities,
      addActivity,
      deleteActivity,
      scheduledTodos,
      loadScheduledTodos,
      addScheduledTodo,
      updateScheduledTodo,
      toggleTodoDone,
      deleteScheduledTodo,
      leadRules,
      loadLeadRules,
      updateLeadRules,
      currentPage,
      setCurrentPage,
      sidebarCollapsed,
      setSidebarCollapsed,
      darkMode,
      toggleDarkMode,
      toasts,
      showToast,
      dismissToast,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      showProfileModal,
      setShowProfileModal,
      showSettingsModal,
      setShowSettingsModal,
      showNotificationsModal,
      setShowNotificationsModal,
      showLeadRulesModal,
      setShowLeadRulesModal,
      selectedLead,
      setSelectedLead,
      selectedActivity,
      setSelectedActivity,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Helper hook to get filtered data based on role and selected member
export function useFilteredData() {
  const { currentUser, selectedMemberId, leads, activities, scheduledTodos } = useApp();

  const getFilteredLeads = useCallback(() => {
    if (!currentUser) return [];

    if (currentUser.role === 'member') {
      // Member sees only their own leads
      return leads.filter(l => l.owner_id === currentUser.id);
    }

    // Manager sees based on filter
    if (selectedMemberId === null) {
      return leads; // All members
    }
    return leads.filter(l => l.owner_id === selectedMemberId);
  }, [currentUser, selectedMemberId, leads]);

  const getFilteredActivities = useCallback(() => {
    if (!currentUser) return [];

    if (currentUser.role === 'member') {
      return activities.filter(a => a.owner_id === currentUser.id);
    }

    if (selectedMemberId === null) {
      return activities;
    }
    return activities.filter(a => a.owner_id === selectedMemberId);
  }, [currentUser, selectedMemberId, activities]);

  const getFilteredScheduledTodos = useCallback(() => {
    if (!currentUser) return [];

    if (currentUser.role === 'member') {
      // Member sees tasks they created OR tasks assigned to them
      return scheduledTodos.filter(t => t.owner_id === currentUser.id || t.assigned_to === currentUser.id);
    }

    if (selectedMemberId === null) {
      return scheduledTodos;
    }
    // Filter by assigned_to OR owner_id (if not assigned)
    return scheduledTodos.filter(t => t.assigned_to === selectedMemberId || (!t.assigned_to && t.owner_id === selectedMemberId));
  }, [currentUser, selectedMemberId, scheduledTodos]);

  return {
    getFilteredLeads,
    getFilteredActivities,
    getFilteredScheduledTodos,
  };
}
