import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, Activity, Account, Toast, Notification, Page } from '../types';

interface AppContextType {
  // Auth
  currentUser: Account | null;
  signIn: (account: Account) => Promise<void>;
  signOut: () => void;
  isAuthLoading: boolean;

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
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  selectedActivity: Activity | null;
  setSelectedActivity: (activity: Activity | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'New Lead Added', message: 'Nguyen Thi Linh was added as a new lead', time: '5 minutes ago', read: false, type: 'lead' },
    { id: '2', title: 'Deal Moved', message: 'TechCorp Vietnam moved to Proposal stage', time: '1 hour ago', read: false, type: 'deal' },
    { id: '3', title: 'Meeting Scheduled', message: 'Meeting with ABC Manufacturing confirmed', time: '2 hours ago', read: true, type: 'activity' },
    { id: '4', title: 'Weekly Report Ready', message: 'Your weekly sales report is ready to view', time: '1 day ago', read: true, type: 'system' },
  ]);

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
    showToast('success', `Welcome back, ${account.name}!`);
  }, []);

  const signOut = useCallback(() => {
    setCurrentUser(null);
    setLeads([]);
    setActivities([]);
    setCurrentPage('dashboard');
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
    }
  }, [currentUser, loadLeads, loadActivities]);

  return (
    <AppContext.Provider value={{
      currentUser,
      signIn,
      signOut,
      isAuthLoading,
      leads,
      loadLeads,
      addLead,
      updateLead,
      deleteLead,
      activities,
      loadActivities,
      addActivity,
      deleteActivity,
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
