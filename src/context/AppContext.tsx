import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Lead, Activity, User, Toast } from '../types';

interface AppState {
  currentUser: User | null;
  currentPage: string;
  leads: Lead[];
  activities: Activity[];
  notifications: string[];
  toast: Toast | null;
  selectedLead: Lead | null;
  selectedActivity: Activity | null;
  darkMode: boolean;
  showAddLeadModal: boolean;
  showAddActivityModal: boolean;
  showProfileModal: boolean;
  showSettingsModal: boolean;
  showNotificationsModal: boolean;
  showLeadRulesModal: boolean;
  showAddDealModal: boolean;
  activityLogMode: 'log' | 'schedule';
  dealViewMode: 'kanban' | 'list';
  leadViewMode: 'kanban' | 'list';
}

type AppContextType = AppState & {
  setCurrentUser: (user: User | null) => void;
  setCurrentPage: (page: string) => void;
  setLeads: (leads: Lead[]) => void;
  setActivities: (activities: Activity[]) => void;
  setNotifications: (notifications: string[]) => void;
  setToast: (toast: Toast | null) => void;
  setSelectedLead: (lead: Lead | null) => void;
  setSelectedActivity: (activity: Activity | null) => void;
  setDarkMode: (dark: boolean) => void;
  setShowAddLeadModal: (show: boolean) => void;
  setShowAddActivityModal: (show: boolean) => void;
  setShowProfileModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowNotificationsModal: (show: boolean) => void;
  setShowLeadRulesModal: (show: boolean) => void;
  setShowAddDealModal: (show: boolean) => void;
  setActivityLogMode: (mode: 'log' | 'schedule') => void;
  setDealViewMode: (mode: 'kanban' | 'list') => void;
  setLeadViewMode: (mode: 'kanban' | 'list') => void;
  addLead: (lead: Lead) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (id: string) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activity: Activity) => void;
  deleteActivity: (id: string) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  hideToast: () => void;
  logout: () => void;
  login: (user: User) => void;
  getFilteredLeads: () => Lead[];
  getFilteredActivities: () => Activity[];
  getLeadById: (id: string) => Lead | undefined;
  getActivitiesForLead: (leadId: string) => Activity[];
  getTeamPerformance: () => { name: string; deals: number; revenue: number; winRate: number }[];
  getPipelineData: () => { stage: string; count: number; value: number }[];
  getRevenueByMonth: () => { month: string; value: number }[];
  getLeadSourceDistribution: () => { source: string; count: number }[];
  getTemperatureMatrix: () => { temperature: string; count: number; value: number }[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LEADS: 'salestrack_leads',
  ACTS: 'salestrack_activities',
  USER: 'salestrack_user',
  DARK_MODE: 'salestrack_dark_mode',
  NOTIFICATIONS: 'salestrack_notifications',
};

// Defensive localStorage read - returns null if anything fails
function safeStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Defensive localStorage write
function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// Defensive localStorage remove
function safeStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Silently fail
  }
}

// Safe JSON parse with fallback
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Seed data for initial load
function getSeedLeads(): Lead[] {
  return [
    {
      id: '1', name: 'TechCorp Vietnam', company: 'TechCorp Vietnam',
      email: 'contact@techcorp.vn', phone: '+84-28-1234-5678',
      source: 'Website', stage: 'Prospecting', temperature: 'Hot',
      deal_size: 150000, probability: 25, assigned_to: '1',
      last_contact: '2024-03-15', notes: 'Interested in enterprise package',
      created_at: '2024-03-10T08:00:00Z', updated_at: '2024-03-15T14:30:00Z',
    },
    {
      id: '2', name: 'Global Solutions Ltd', company: 'Global Solutions Ltd',
      email: 'sales@globalsolutions.com', phone: '+1-555-0123',
      source: 'Referral', stage: 'Qualification', temperature: 'Warm',
      deal_size: 75000, probability: 40, assigned_to: '2',
      last_contact: '2024-03-14', notes: 'Multi-location deployment needed',
      created_at: '2024-03-08T10:00:00Z', updated_at: '2024-03-14T16:00:00Z',
    },
    {
      id: '3', name: 'Innovation Hub', company: 'Innovation Hub',
      email: 'procurement@innovationhub.io', phone: '+44-20-7946-0958',
      source: 'Trade Show', stage: 'Proposal', temperature: 'Hot',
      deal_size: 200000, probability: 60, assigned_to: '1',
      last_contact: '2024-03-13', notes: 'Custom integration requirements',
      created_at: '2024-03-05T09:00:00Z', updated_at: '2024-03-13T11:00:00Z',
    },
    {
      id: '4', name: 'DataFlow Systems', company: 'DataFlow Systems',
      email: 'info@dataflow.sys', phone: '+49-30-1234-5678',
      source: 'LinkedIn', stage: 'Negotiation', temperature: 'Hot',
      deal_size: 120000, probability: 80, assigned_to: '3',
      last_contact: '2024-03-12', notes: 'Pricing negotiation in progress',
      created_at: '2024-03-01T08:00:00Z', updated_at: '2024-03-12T15:00:00Z',
    },
    {
      id: '5', name: 'Cloud Nine Inc', company: 'Cloud Nine Inc',
      email: 'hello@cloudnine.com', phone: '+1-555-0456',
      source: 'Cold Call', stage: 'Closed Won', temperature: 'Hot',
      deal_size: 95000, probability: 100, assigned_to: '2',
      last_contact: '2024-03-11', notes: 'Contract signed, implementation started',
      created_at: '2024-02-20T10:00:00Z', updated_at: '2024-03-11T09:00:00Z',
    },
    {
      id: '6', name: 'MegaCorp Industries', company: 'MegaCorp Industries',
      email: 'business@megacorp.com', phone: '+81-3-1234-5678',
      source: 'Website', stage: 'Closed Lost', temperature: 'Cold',
      deal_size: 300000, probability: 0, assigned_to: '1',
      last_contact: '2024-03-10', notes: 'Budget cut, postponed to Q3',
      created_at: '2024-02-15T08:00:00Z', updated_at: '2024-03-10T14:00:00Z',
    },
    {
      id: '7', name: 'StartupXYZ', company: 'StartupXYZ',
      email: 'founders@startupxyz.io', phone: '+1-555-0789',
      source: 'Referral', stage: 'Prospecting', temperature: 'Warm',
      deal_size: 45000, probability: 15, assigned_to: '3',
      last_contact: '2024-03-09', notes: 'Early stage, needs nurturing',
      created_at: '2024-03-08T11:00:00Z', updated_at: '2024-03-09T10:00:00Z',
    },
    {
      id: '8', name: 'Enterprise Solutions', company: 'Enterprise Solutions',
      email: 'sales@enterprise.sol', phone: '+33-1-23-45-67-89',
      source: 'Trade Show', stage: 'Qualification', temperature: 'Cold',
      deal_size: 180000, probability: 30, assigned_to: '2',
      last_contact: '2024-03-08', notes: 'Evaluating multiple vendors',
      created_at: '2024-03-01T09:00:00Z', updated_at: '2024-03-08T16:00:00Z',
    },
  ];
}

function getSeedActivities(): Activity[] {
  return [
    {
      id: '1', lead_id: '1', lead_name: 'TechCorp Vietnam', type: 'Call',
      notes: 'Initial discovery call. They are interested in our enterprise package.',
      date: '2024-03-15T14:00:00Z', created_at: '2024-03-15T14:30:00Z',
      owner_id: '1', company: 'TechCorp Vietnam', stage: 'Prospecting',
    },
    {
      id: '2', lead_id: '2', lead_name: 'Global Solutions Ltd', type: 'Email',
      notes: 'Sent product brochure and pricing information.',
      date: '2024-03-14T10:00:00Z', created_at: '2024-03-14T10:30:00Z',
      owner_id: '2', company: 'Global Solutions Ltd', stage: 'Qualification',
    },
    {
      id: '3', lead_id: '3', lead_name: 'Innovation Hub', type: 'Meeting',
      notes: 'Technical demo went well. Custom integration discussion.',
      date: '2024-03-13T11:00:00Z', created_at: '2024-03-13T11:30:00Z',
      owner_id: '1', company: 'Innovation Hub', stage: 'Proposal',
    },
    {
      id: '4', lead_id: '4', lead_name: 'DataFlow Systems', type: 'Call',
      notes: 'Pricing negotiation. They want a 15% discount.',
      date: '2024-03-12T15:00:00Z', created_at: '2024-03-12T15:30:00Z',
      owner_id: '3', company: 'DataFlow Systems', stage: 'Negotiation',
    },
    {
      id: '5', lead_id: '5', lead_name: 'Cloud Nine Inc', type: 'Meeting',
      notes: 'Contract signing ceremony. Deal closed!',
      date: '2024-03-11T09:00:00Z', created_at: '2024-03-11T09:30:00Z',
      owner_id: '2', company: 'Cloud Nine Inc', stage: 'Closed Won',
    },
    {
      id: '6', lead_id: '1', lead_name: 'TechCorp Vietnam', type: 'Email',
      notes: 'Follow-up email with case studies.',
      date: '2024-03-16T09:00:00Z', created_at: '2024-03-15T16:00:00Z',
      owner_id: '1', company: 'TechCorp Vietnam', stage: 'Prospecting',
    },
    {
      id: '7', lead_id: '3', lead_name: 'Innovation Hub', type: 'Call',
      notes: 'Technical requirements clarification call.',
      date: '2024-03-17T14:00:00Z', created_at: '2024-03-13T12:00:00Z',
      owner_id: '1', company: 'Innovation Hub', stage: 'Proposal',
    },
    {
      id: '8', lead_id: '6', lead_name: 'MegaCorp Industries', type: 'Meeting',
      notes: 'Budget discussion - they had a budget cut.',
      date: '2024-03-10T14:00:00Z', created_at: '2024-03-10T14:30:00Z',
      owner_id: '1', company: 'MegaCorp Industries', stage: 'Closed Lost',
    },
  ];
}

function getSeedNotifications(): string[] {
  return [
    'New lead assigned: TechCorp Vietnam',
    'Deal won: Cloud Nine Inc - $95,000',
    'Meeting scheduled with Innovation Hub',
    'Follow-up required: Global Solutions Ltd',
    'Pipeline alert: 3 deals in negotiation',
  ];
}

// Load leads with fallback to seed data
function loadLeads(): Lead[] {
  const stored = safeStorageGet(STORAGE_KEYS.LEADS);
  if (stored) {
    const parsed = safeJsonParse<Lead[]>(stored, []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  const seed = getSeedLeads();
  safeStorageSet(STORAGE_KEYS.LEADS, JSON.stringify(seed));
  return seed;
}

// Load activities with fallback to seed data
function loadActivities(): Activity[] {
  const stored = safeStorageGet(STORAGE_KEYS.ACTIVITYS);
  if (stored) {
    const parsed = safeJsonParse<Activity[]>(stored, []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  const seed = getSeedActivities();
  safeStorageSet(STORAGE_KEYS.ACTIVITYS, JSON.stringify(seed));
  return seed;
}

// Load user with fallback
function loadUser(): User | null {
  const stored = safeStorageGet(STORAGE_KEYS.USER);
  if (stored) {
    return safeJsonParse<User | null>(stored, null);
  }
  return null;
}

// Load dark mode
function loadDarkMode(): boolean {
  const stored = safeStorageGet(STORAGE_KEYS.DARK_MODE);
  if (stored) {
    return safeJsonParse<boolean>(stored, false);
  }
  return false;
}

// Load notifications
function loadNotifications(): string[] {
  const stored = safeStorageGet(STORAGE_KEYS.NOTIFICATIONS);
  if (stored) {
    const parsed = safeJsonParse<string[]>(stored, []);
    if (Array.isArray(parsed)) return parsed;
  }
  const seed = getSeedNotifications();
  safeStorageSet(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(seed));
  return seed;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(loadUser);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [leads, setLeadsState] = useState<Lead[]>(loadLeads);
  const [activities, setActivitiesState] = useState<Activity[]>(loadActivities);
  const [notifications, setNotificationsState] = useState<string[]>(loadNotifications);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [darkMode, setDarkModeState] = useState(loadDarkMode);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLeadRulesModal, setShowLeadRulesModal] = useState(false);
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [activityLogMode, setActivityLogMode] = useState<'log' | 'schedule'>('log');
  const [dealViewMode, setDealViewMode] = useState<'kanban' | 'list'>('kanban');
  const [leadViewMode, setLeadViewMode] = useState<'kanban' | 'list'>('kanban');

  // Persist leads
  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  }, [leads]);

  // Persist activities
  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.ACTIVITYS, JSON.stringify(activities));
  }, [activities]);

  // Persist user
  useEffect(() => {
    if (currentUser) {
      safeStorageSet(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      safeStorageRemove(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  // Persist dark mode
  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Persist notifications
  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  const showToastFn = useCallback((message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    safeStorageRemove(STORAGE_KEYS.USER);
  }, []);

  const login = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  // Defensive: always return array, never crash on empty/null
  const getFilteredLeads = useCallback((): Lead[] => {
    if (!Array.isArray(leads)) return [];
    if (!currentUser) return [];
    if (currentUser.role === 'manager') return leads;
    return leads.filter(l => l && l.assigned_to === currentUser.id);
  }, [leads, currentUser]);

  // Defensive: always return array
  const getFilteredActivities = useCallback((): Activity[] => {
    if (!Array.isArray(activities)) return [];
    if (!currentUser) return [];
    if (currentUser.role === 'manager') return activities;
    return activities.filter(a => a && a.owner_id === currentUser.id);
  }, [activities, currentUser]);

  const getLeadById = useCallback((id: string): Lead | undefined => {
    if (!Array.isArray(leads) || !id) return undefined;
    return leads.find(l => l && l.id === id);
  }, [leads]);

  const getActivitiesForLead = useCallback((leadId: string): Activity[] => {
    if (!Array.isArray(activities) || !leadId) return [];
    return activities.filter(a => a && a.lead_id === leadId);
  }, [activities]);

  const addLead = useCallback((lead: Lead) => {
    setLeadsState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, lead];
    });
  }, []);

  const updateLead = useCallback((updatedLead: Lead) => {
    setLeadsState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(l => (l && l.id === updatedLead.id ? updatedLead : l));
    });
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeadsState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.filter(l => l && l.id !== id);
    });
    setActivitiesState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.filter(a => a && a.lead_id !== id);
    });
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    setActivitiesState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, activity];
    });
  }, []);

  const updateActivity = useCallback((updatedActivity: Activity) => {
    setActivitiesState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(a => (a && a.id === updatedActivity.id ? updatedActivity : a));
    });
  }, []);

  const deleteActivity = useCallback((id: string) => {
    setActivitiesState(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.filter(a => a && a.id !== id);
    });
  }, []);

  // Defensive team performance
  const getTeamPerformance = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const teamMembers = [
      { id: '1', name: 'Duy Tran' },
      { id: '2', name: 'Mai Le' },
      { id: '3', name: 'Hung Vo' },
    ];
    return teamMembers.map(member => {
      const memberLeads = safeLeads.filter(l => l && l.assigned_to === member.id);
      const won = memberLeads.filter(l => l && l.stage === 'Closed Won');
      const total = memberLeads.filter(l => l && ['Closed Won', 'Closed Lost'].includes(l.stage));
      const revenue = won.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0);
      const winRate = total.length > 0 ? (won.length / total.length) * 100 : 0;
      return { name: member.name, deals: memberLeads.length, revenue, winRate };
    });
  }, [leads]);

  // Defensive pipeline data
  const getPipelineData = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    return stages.map(stage => {
      const stageLeads = safeLeads.filter(l => l && l.stage === stage);
      return {
        stage,
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0),
      };
    });
  }, [leads]);

  // Defensive revenue by month
  const getRevenueByMonth = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => {
      const monthLeads = safeLeads.filter(l => {
        if (!l || !l.updated_at) return false;
        try {
          return l.updated_at.includes(`2024-${months.indexOf(month) + 1}-`) && l.stage === 'Closed Won';
        } catch {
          return false;
        }
      });
      return { month, value: monthLeads.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0) };
    });
  }, [leads]);

  // Defensive lead source distribution
  const getLeadSourceDistribution = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const sources: Record<string, number> = {};
    safeLeads.forEach(l => {
      if (l && l.source) {
        sources[l.source] = (sources[l.source] || 0) + 1;
      }
    });
    return Object.entries(sources).map(([source, count]) => ({ source, count }));
  }, [leads]);

  // Defensive temperature matrix
  const getTemperatureMatrix = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const temps = ['Hot', 'Warm', 'Cold'];
    return temps.map(temperature => {
      const tempLeads = safeLeads.filter(l => l && l.temperature === temperature);
      return {
        temperature,
        count: tempLeads.length,
        value: tempLeads.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0),
      };
    });
  }, [leads]);

  const setLeads = useCallback((newLeads: Lead[]) => {
    setLeadsState(Array.isArray(newLeads) ? newLeads : []);
  }, []);

  const setActivities = useCallback((newActivities: Activity[]) => {
    setActivitiesState(Array.isArray(newActivities) ? newActivities : []);
  }, []);

  const setNotifications = useCallback((newNotifications: string[]) => {
    setNotificationsState(Array.isArray(newNotifications) ? newNotifications : []);
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setDarkModeState(dark);
  }, []);

  const value = useMemo(() => ({
    currentUser, currentPage, leads, activities, notifications, toast,
    selectedLead, selectedActivity, darkMode, showAddLeadModal, showAddActivityModal,
    showProfileModal, showSettingsModal, showNotificationsModal, showLeadRulesModal,
    showAddDealModal, activityLogMode, dealViewMode, leadViewMode,
    setCurrentUser, setCurrentPage, setLeads, setActivities, setNotifications,
    setToast, setSelectedLead, setSelectedActivity, setDarkMode,
    setShowAddLeadModal, setShowAddActivityModal, setShowProfileModal,
    setShowSettingsModal, setShowNotificationsModal, setShowLeadRulesModal,
    setShowAddDealModal, setActivityLogMode, setDealViewMode, setLeadViewMode,
    addLead, updateLead, deleteLead, addActivity, updateActivity, deleteActivity,
    showToast: showToastFn, hideToast, logout, login,
    getFilteredLeads, getFilteredActivities, getLeadById, getActivitiesForLead,
    getTeamPerformance, getPipelineData, getRevenueByMonth, getLeadSourceDistribution,
    getTemperatureMatrix,
  }), [
    currentUser, currentPage, leads, activities, notifications, toast,
    selectedLead, selectedActivity, darkMode, showAddLeadModal, showAddActivityModal,
    showProfileModal, showSettingsModal, showNotificationsModal, showLeadRulesModal,
    showAddDealModal, activityLogMode, dealViewMode, leadViewMode,
    showToastFn, hideToast, logout, login,
    addLead, updateLead, deleteLead, addActivity, updateActivity, deleteActivity,
    getFilteredLeads, getFilteredActivities, getLeadById, getActivitiesForLead,
    getTeamPerformance, getPipelineData, getRevenueByMonth, getLeadSourceDistribution,
    getTemperatureMatrix,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function useFilteredData() {
  const { getFilteredLeads, getFilteredActivities } = useApp();
  return useMemo(() => ({
    leads: getFilteredLeads(),
    activities: getFilteredActivities(),
  }), [getFilteredLeads, getFilteredActivities]);
}
