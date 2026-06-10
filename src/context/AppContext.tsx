import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Lead, Activity, User, Toast, ScheduledTodo, LeadRules, Notification } from '../types';
import { ACCOUNTS } from '../types';

interface AppState {
  currentUser: User | null;
  currentPage: string;
  leads: Lead[];
  activities: Activity[];
  scheduledTodos: ScheduledTodo[];
  leadRules: LeadRules;
  notifications: Notification[];
  toasts: Toast[];
  selectedLead: Lead | null;
  selectedActivity: Activity | null;
  selectedMemberId: string | null;
  darkMode: boolean;
  sidebarCollapsed: boolean;
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
  teamMembers: typeof ACCOUNTS;
  isAuthLoading: boolean;
}

type AppContextType = AppState & {
  setCurrentUser: (user: User | null) => void;
  setCurrentPage: (page: string) => void;
  setLeads: (leads: Lead[]) => void;
  setActivities: (activities: Activity[]) => void;
  setNotifications: (notifications: Notification[]) => void;
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
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedMemberId: (id: string | null) => void;
  addLead: (lead: Lead) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (id: string) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activity: Activity) => void;
  deleteActivity: (id: string) => void;
  addScheduledTodo: (todo: ScheduledTodo) => void;
  updateScheduledTodo: (todo: ScheduledTodo) => void;
  deleteScheduledTodo: (id: string) => void;
  toggleTodoDone: (id: string) => void;
  updateLeadRules: (rules: Partial<LeadRules>) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  showToastWithType: (type: Toast['type'], message: string) => void;
  hideToast: () => void;
  dismissToast: (id: string) => void;
  logout: () => void;
  login: (user: User) => void;
  signIn: (account: typeof ACCOUNTS[number]) => void;
  signOut: () => void;
  toggleDarkMode: () => void;
  getFilteredLeads: () => Lead[];
  getFilteredActivities: () => Activity[];
  getFilteredScheduledTodos: () => ScheduledTodo[];
  getLeadById: (id: string) => Lead | undefined;
  getActivitiesForLead: (leadId: string) => Activity[];
  getTeamPerformance: () => { name: string; deals: number; revenue: number; winRate: number }[];
  getPipelineData: () => { stage: string; count: number; value: number }[];
  getRevenueByMonth: () => { month: string; value: number }[];
  getLeadSourceDistribution: () => { source: string; count: number }[];
  getLeadStatusDistribution: () => { status: string; count: number; value: number }[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LEADS: 'salestrack_leads',
  ACTS: 'salestrack_activities',
  USER: 'salestrack_user',
  DARK_MODE: 'salestrack_dark_mode',
  NOTIFICATIONS: 'salestrack_notifications',
  SCHEDULED: 'st_scheduled',
  LEAD_RULES: 'st_lead_rules',
};

function safeStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

function safeStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function getSeedLeads(): Lead[] {
  return [
    {
      id: 'LD-20260610-0001', name: 'Nguyen Van Minh', company: 'TechCorp Vietnam',
      email: 'minh.nguyen@techcorp.vn', phone: '+84-28-1234-5678',
      website: 'https://techcorp.vn', city: 'Ho Chi Minh', industry: 'Technology',
      source: 'Website', stage: 'Prospecting',
      deal_size: 150000, probability: 25, owner_id: '1', assigned_to: 'Duy Tran',
      lead_status: 'New', notes: 'Interested in enterprise package',
      created_at: '2024-03-10T08:00:00Z', updated_at: '2024-03-15T14:30:00Z',
      last_activity: '2024-03-15',
    },
    {
      id: 'LD-20260610-0002', name: 'Tran Thi Mai', company: 'Global Solutions Ltd',
      email: 'mai.tran@globalsolutions.com', phone: '+1-555-0123',
      website: 'https://globalsolutions.com', city: 'Ha Noi', industry: 'Consulting',
      source: 'Referral', stage: 'Qualification',
      deal_size: 75000, probability: 40, owner_id: '2', assigned_to: 'Mai Le',
      lead_status: 'New', notes: 'Multi-location deployment needed',
      created_at: '2024-03-08T10:00:00Z', updated_at: '2024-03-14T16:00:00Z',
      last_activity: '2024-03-14',
    },
    {
      id: 'LD-20260610-0003', name: 'Le Van Tuan', company: 'Innovation Hub',
      email: 'tuan.le@innovationhub.io', phone: '+44-20-7946-0958',
      website: 'https://innovationhub.io', city: 'Da Nang', industry: 'Technology',
      source: 'Event', stage: 'Proposal',
      deal_size: 200000, probability: 60, owner_id: '1', assigned_to: 'Duy Tran',
      lead_status: 'Converted', notes: 'Custom integration requirements',
      created_at: '2024-03-05T09:00:00Z', updated_at: '2024-03-13T11:00:00Z',
      last_activity: '2024-03-13',
    },
    {
      id: 'LD-20260610-0004', name: 'Pham Thi Hong', company: 'DataFlow Systems',
      email: 'hong.pham@dataflow.sys', phone: '+49-30-1234-5678',
      website: 'https://dataflow.sys', city: 'Ho Chi Minh', industry: 'Technology',
      source: 'LinkedIn', stage: 'Negotiation',
      deal_size: 120000, probability: 80, owner_id: '3', assigned_to: 'Hung Vo',
      lead_status: 'Converted', notes: 'Pricing negotiation in progress',
      created_at: '2024-03-01T08:00:00Z', updated_at: '2024-03-12T15:00:00Z',
      last_activity: '2024-03-12',
    },
    {
      id: 'LD-20260610-0005', name: 'Hoang Van Duc', company: 'Cloud Nine Inc',
      email: 'duc.hoang@cloudnine.com', phone: '+1-555-0456',
      website: 'https://cloudnine.com', city: 'Ha Noi', industry: 'Retail',
      source: 'Cold Call', stage: 'Closed Won',
      deal_size: 95000, probability: 100, owner_id: '2', assigned_to: 'Mai Le',
      lead_status: 'Converted', notes: 'Contract signed, implementation started',
      created_at: '2024-02-20T10:00:00Z', updated_at: '2024-03-11T09:00:00Z',
      last_activity: '2024-03-11',
    },
    {
      id: 'LD-20260610-0006', name: 'Bui Thi Lan', company: 'MegaCorp Industries',
      email: 'lan.bui@megacorp.com', phone: '+81-3-1234-5678',
      website: 'https://megacorp.com', city: 'Ho Chi Minh', industry: 'Finance',
      source: 'Website', stage: 'Closed Lost',
      deal_size: 300000, probability: 0, owner_id: '1', assigned_to: 'Duy Tran',
      lead_status: 'Rejected', notes: 'Budget cut, postponed to Q3',
      created_at: '2024-02-15T08:00:00Z', updated_at: '2024-03-10T14:00:00Z',
      last_activity: '2024-03-10',
    },
    {
      id: 'LD-20260610-0007', name: 'Vu Van Khoa', company: 'StartupXYZ',
      email: 'khoa.vu@startupxyz.io', phone: '+1-555-0789',
      website: 'https://startupxyz.io', city: 'Da Nang', industry: 'Technology',
      source: 'Referral', stage: 'Prospecting',
      deal_size: 45000, probability: 15, owner_id: '3', assigned_to: 'Hung Vo',
      lead_status: 'New', notes: 'Early stage, needs nurturing',
      created_at: '2024-03-08T11:00:00Z', updated_at: '2024-03-09T10:00:00Z',
      last_activity: '2024-03-09',
    },
    {
      id: 'LD-20260610-0008', name: 'Doan Thi Ngoc', company: 'Enterprise Solutions',
      email: 'ngoc.doan@enterprise.sol', phone: '+33-1-23-45-67-89',
      website: 'https://enterprise.sol', city: 'Ha Noi', industry: 'Consulting',
      source: 'Event', stage: 'Qualification',
      deal_size: 180000, probability: 30, owner_id: '2', assigned_to: 'Mai Le',
      lead_status: 'New', notes: 'Evaluating multiple vendors',
      created_at: '2024-03-01T09:00:00Z', updated_at: '2024-03-08T16:00:00Z',
      last_activity: '2024-03-08',
    },
  ];
}

function getSeedActivities(): Activity[] {
  return [
    { id: 'act_1', type: 'Call', lead_id: 'lead_1', lead_name: 'Nguyễn Thị Linh', company: 'TechCorp Vietnam', stage: 'Proposal', date: '2026-05-20T10:00:00Z', duration: 30, notes: 'Discussed enterprise pricing. Client comparing with 2 competitors.', next_action: 'Send comparison doc by Friday', owner_id: '1', created_at: '2026-05-20T10:30:00Z' },
    { id: 'act_2', type: 'Email', lead_id: 'lead_2', lead_name: 'Trần Minh Đức', company: 'ABC Manufacturing', stage: 'Negotiation', date: '2026-05-25T14:00:00Z', duration: 0, notes: 'Sent revised proposal with 5% discount. Awaiting response.', next_action: 'Follow up if no reply by Wed', owner_id: '1', created_at: '2026-05-25T14:15:00Z' },
    { id: 'act_3', type: 'Meeting', lead_id: 'lead_3', lead_name: 'Phạm Thị Hoa', company: 'XYZ Retail Group', stage: 'Qualification', date: '2026-05-10T09:00:00Z', duration: 60, notes: 'Product demo. Very positive. Needs CFO approval.', next_action: 'Schedule CFO intro call', owner_id: '2', created_at: '2026-05-10T10:05:00Z' },
    { id: 'act_4', type: 'Call', lead_id: 'lead_4', lead_name: 'Lê Văn Nam', company: 'StartupVN', stage: 'Prospecting', date: '2026-05-01T11:00:00Z', duration: 15, notes: 'Brief intro. Interested but busy. Follow up next month.', next_action: 'Call again June 15', owner_id: '3', created_at: '2026-05-01T11:20:00Z' },
    { id: 'act_5', type: 'Meeting', lead_id: 'lead_7', lead_name: 'Bùi Thị Lan', company: 'MedTech Solutions', stage: 'Proposal', date: '2026-05-28T13:00:00Z', duration: 90, notes: 'Presented full solution to management. Strong interest from IT.', next_action: 'Send board deck', owner_id: '1', created_at: '2026-05-28T14:35:00Z' },
    { id: 'act_6', type: 'Email', lead_id: 'lead_1', lead_name: 'Nguyễn Thị Linh', company: 'TechCorp Vietnam', stage: 'Proposal', date: '2026-05-22T09:00:00Z', duration: 0, notes: 'Sent comparison document highlighting key advantages.', next_action: null, owner_id: '1', created_at: '2026-05-22T09:10:00Z' },
    { id: 'act_7', type: 'Note', lead_id: 'lead_2', lead_name: 'Trần Minh Đức', company: 'ABC Manufacturing', stage: 'Negotiation', date: '2026-05-26T16:00:00Z', duration: 0, notes: 'Legal reviewing contract. Competitor also submitted proposal.', next_action: 'Check status Monday', owner_id: '1', created_at: '2026-05-26T16:05:00Z' },
    { id: 'act_8', type: 'Call', lead_id: 'lead_5', lead_name: 'Võ Thị Mai', company: 'Global Logistics Co', stage: 'Closed Won', date: '2026-04-28T10:00:00Z', duration: 20, notes: 'Final confirmation call. All terms agreed.', next_action: null, owner_id: '2', created_at: '2026-04-28T10:25:00Z' },
    { id: 'act_9', type: 'Email', lead_id: 'lead_7', lead_name: 'Bùi Thị Lan', company: 'MedTech Solutions', stage: 'Proposal', date: '2026-05-30T08:00:00Z', duration: 0, notes: 'Sent 12-slide board deck with ROI analysis.', next_action: 'Follow up after board meeting', owner_id: '1', created_at: '2026-05-30T08:15:00Z' },
    { id: 'act_10', type: 'Meeting', lead_id: 'lead_6', lead_name: 'Đặng Quốc Hùng', company: 'Saigon Food JSC', stage: 'Closed Won', date: '2026-05-15T11:00:00Z', duration: 45, notes: 'Post-sale check-in. Very satisfied. Discussed Q3 upsell.', next_action: 'Prepare Q3 upsell proposal', owner_id: '3', created_at: '2026-05-15T11:50:00Z' }
  ];
}

function getSeedScheduledTodos(): ScheduledTodo[] {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter3 = new Date(); dayAfter3.setDate(dayAfter3.getDate() + 3);
  return [
    { id: 'sched_1', type: 'Call', lead_id: 'lead_1', lead_name: 'Nguyễn Thị Linh', company: 'TechCorp Vietnam', stage: 'Proposal', scheduled_date: today, scheduled_time: '10:00', agenda: 'Follow up on enterprise pricing comparison doc. Ask about timeline.', done: false, owner_id: '1', assigned_to: '1', created_at: new Date().toISOString() },
    { id: 'sched_2', type: 'Meeting', lead_id: 'lead_3', lead_name: 'Phạm Thị Hoa', company: 'XYZ Retail Group', stage: 'Qualification', scheduled_date: today, scheduled_time: '14:30', agenda: 'CFO intro call. Present ROI numbers. Keep under 30 mins.', done: true, owner_id: '2', assigned_to: '2', created_at: new Date().toISOString() },
    { id: 'sched_3', type: 'Email', lead_id: 'lead_2', lead_name: 'Trần Minh Đức', company: 'ABC Manufacturing', stage: 'Negotiation', scheduled_date: tomorrow.toISOString().split('T')[0], scheduled_time: '09:00', agenda: 'Check on contract review status. Offer to address any legal concerns.', done: false, owner_id: '1', assigned_to: '1', created_at: new Date().toISOString() },
    { id: 'sched_4', type: 'Call', lead_id: 'lead_4', lead_name: 'Lê Văn Nam', company: 'StartupVN', stage: 'Prospecting', scheduled_date: tomorrow.toISOString().split('T')[0], scheduled_time: '11:00', agenda: 'June 15 follow-up call. Pitch enterprise tier. [Assigned by Anna]', done: false, owner_id: '0', assigned_to: '3', created_at: new Date().toISOString() },
    { id: 'sched_5', type: 'Meeting', lead_id: 'lead_7', lead_name: 'Bùi Thị Lan', company: 'MedTech Solutions', stage: 'Proposal', scheduled_date: dayAfter3.toISOString().split('T')[0], scheduled_time: '15:00', agenda: 'Board deck debrief. Find out feedback. [Assigned by Anna]', done: false, owner_id: '0', assigned_to: '1', created_at: new Date().toISOString() }
  ];
}

function getSeedLeadRules(): LeadRules {
  return { id: '1', warm_days: 7, cold_days: 14, updated_at: new Date().toISOString(), updated_by: null };
}

function getSeedNotifications(): Notification[] {
  return [
    { id: '1', title: 'New lead assigned', message: 'Nguyễn Thị Linh from TechCorp has been assigned to you', time: '2 hours ago', read: false, type: 'lead' },
    { id: '2', title: 'Deal stage updated', message: 'ABC Manufacturing moved to Negotiation stage', time: '5 hours ago', read: false, type: 'deal' },
    { id: '3', title: 'Weekly report ready', message: 'Your weekly pipeline report for May 26–June 1 is available', time: '1 day ago', read: true, type: 'system' },
    { id: '4', title: 'Follow-up reminder', message: 'Scheduled call with Lê Văn Nam tomorrow at 10:00 AM', time: '2 days ago', read: true, type: 'activity' }
  ];
}

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

function loadActivities(): Activity[] {
  const stored = safeStorageGet(STORAGE_KEYS.ACTS);
  if (stored) {
    const parsed = safeJsonParse<Activity[]>(stored, []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  const seed = getSeedActivities();
  safeStorageSet(STORAGE_KEYS.ACTS, JSON.stringify(seed));
  return seed;
}

function loadScheduledTodos(): ScheduledTodo[] {
  const stored = safeStorageGet(STORAGE_KEYS.SCHEDULED);
  if (stored) {
    const parsed = safeJsonParse<ScheduledTodo[]>(stored, []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  const seed = getSeedScheduledTodos();
  safeStorageSet(STORAGE_KEYS.SCHEDULED, JSON.stringify(seed));
  return seed;
}

function loadLeadRules(): LeadRules {
  const stored = safeStorageGet(STORAGE_KEYS.LEAD_RULES);
  if (stored) {
    return safeJsonParse<LeadRules>(stored, getSeedLeadRules());
  }
  const seed = getSeedLeadRules();
  safeStorageSet(STORAGE_KEYS.LEAD_RULES, JSON.stringify(seed));
  return seed;
}

function loadNotifications(): Notification[] {
  const stored = safeStorageGet(STORAGE_KEYS.NOTIFICATIONS);
  if (stored) {
    const parsed = safeJsonParse<Notification[]>(stored, []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  const seed = getSeedNotifications();
  safeStorageSet(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(seed));
  return seed;
}

function loadUser(): User | null {
  const stored = safeStorageGet(STORAGE_KEYS.USER);
  if (stored) {
    return safeJsonParse<User | null>(stored, null);
  }
  return null;
}

function loadDarkMode(): boolean {
  const stored = safeStorageGet(STORAGE_KEYS.DARK_MODE);
  if (stored) {
    return safeJsonParse<boolean>(stored, false);
  }
  return false;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(loadUser);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [leads, setLeadsState] = useState<Lead[]>(loadLeads);
  const [activities, setActivitiesState] = useState<Activity[]>(loadActivities);
  const [scheduledTodos, setScheduledTodosState] = useState<ScheduledTodo[]>(loadScheduledTodos);
  const [leadRules, setLeadRulesState] = useState<LeadRules>(loadLeadRules);
  const [notifications, setNotificationsState] = useState<Notification[]>(loadNotifications);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [darkMode, setDarkModeState] = useState(loadDarkMode);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => { safeStorageSet(STORAGE_KEYS.LEADS, JSON.stringify(leads)); }, [leads]);
  useEffect(() => { safeStorageSet(STORAGE_KEYS.ACTS, JSON.stringify(activities)); }, [activities]);
  useEffect(() => { safeStorageSet(STORAGE_KEYS.SCHEDULED, JSON.stringify(scheduledTodos)); }, [scheduledTodos]);
  useEffect(() => { safeStorageSet(STORAGE_KEYS.LEAD_RULES, JSON.stringify(leadRules)); }, [leadRules]);
  useEffect(() => { safeStorageSet(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => {
    if (currentUser) {
      safeStorageSet(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      safeStorageRemove(STORAGE_KEYS.USER);
    }
  }, [currentUser]);
  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const showToastWithType = useCallback((type: Toast['type'], message: string) => {
    showToast(message, type);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const hideToast = useCallback(() => {
    setToasts([]);
  }, []);

  const signIn = useCallback((account: typeof ACCOUNTS[number]) => {
    setIsAuthLoading(true);
    setTimeout(() => {
      const user: User = {
        id: account.id,
        name: account.name,
        initials: account.initials,
        email: account.email,
        role: account.role,
        color: account.color,
        roleLabel: account.roleLabel,
      };
      setCurrentUser(user);
      setIsAuthLoading(false);
    }, 500);
  }, []);

  const signOut = useCallback(() => {
    setCurrentUser(null);
    safeStorageRemove(STORAGE_KEYS.USER);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkModeState(prev => !prev);
  }, []);

  const isManager = useCallback(() => currentUser?.role === 'manager', [currentUser]);

  // Scope helpers - filter by current user if member
  const getFilteredLeads = useCallback((): Lead[] => {
    if (!Array.isArray(leads)) return [];
    if (!currentUser) return [];
    if (currentUser.role === 'manager') return leads;
    return leads.filter(l => l && l.assigned_to === currentUser.name);
  }, [leads, currentUser]);

  const getFilteredActivities = useCallback((): Activity[] => {
    if (!Array.isArray(activities)) return [];
    if (!currentUser) return [];
    if (isManager()) return activities;
    return activities.filter(a => a && a.owner_id === currentUser.id);
  }, [activities, currentUser]);

  const getFilteredScheduledTodos = useCallback((): ScheduledTodo[] => {
    if (!Array.isArray(scheduledTodos)) return [];
    if (!currentUser) return [];
    if (isManager()) return scheduledTodos;
    // Member sees: todos they created (owner_id) OR todos assigned to them (assigned_to)
    return scheduledTodos.filter(s => s.owner_id === currentUser.id || s.assigned_to === currentUser.id);
  }, [scheduledTodos, currentUser]);

  const getLeadById = useCallback((id: string): Lead | undefined => {
    if (!Array.isArray(leads) || !id) return undefined;
    return leads.find(l => l && l.id === id);
  }, [leads]);

  const getActivitiesForLead = useCallback((leadId: string): Activity[] => {
    if (!Array.isArray(activities) || !leadId) return [];
    return activities.filter(a => a && a.lead_id === leadId);
  }, [activities]);

  const addLead = useCallback((lead: Lead) => {
    setLeadsState(prev => [...(Array.isArray(prev) ? prev : []), lead]);
  }, []);

  const updateLead = useCallback((updatedLead: Lead) => {
    setLeadsState(prev => (Array.isArray(prev) ? prev : []).map(l => l?.id === updatedLead.id ? updatedLead : l));
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeadsState(prev => (Array.isArray(prev) ? prev : []).filter(l => l?.id !== id));
    setActivitiesState(prev => (Array.isArray(prev) ? prev : []).filter(a => a?.lead_id !== id));
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    setActivitiesState(prev => [...(Array.isArray(prev) ? prev : []), activity]);
  }, []);

  const updateActivity = useCallback((updatedActivity: Activity) => {
    setActivitiesState(prev => (Array.isArray(prev) ? prev : []).map(a => a?.id === updatedActivity.id ? updatedActivity : a));
  }, []);

  const deleteActivity = useCallback((id: string) => {
    setActivitiesState(prev => (Array.isArray(prev) ? prev : []).filter(a => a?.id !== id));
  }, []);

  const addScheduledTodo = useCallback((todo: ScheduledTodo) => {
    setScheduledTodosState(prev => [...(Array.isArray(prev) ? prev : []), todo]);
  }, []);

  const updateScheduledTodo = useCallback((updatedTodo: ScheduledTodo) => {
    setScheduledTodosState(prev => (Array.isArray(prev) ? prev : []).map(s => s?.id === updatedTodo.id ? updatedTodo : s));
  }, []);

  const deleteScheduledTodo = useCallback((id: string) => {
    setScheduledTodosState(prev => (Array.isArray(prev) ? prev : []).filter(s => s?.id !== id));
  }, []);

  const toggleTodoDone = useCallback((id: string) => {
    setScheduledTodosState(prev => (Array.isArray(prev) ? prev : []).map(s => s?.id === id ? { ...s, done: !s.done } : s));
  }, []);

  const updateLeadRules = useCallback((rules: Partial<LeadRules>) => {
    setLeadRulesState(prev => ({ ...prev, ...rules, updated_at: new Date().toISOString(), updated_by: currentUser?.id || null }));
  }, [currentUser]);

  const markNotificationRead = useCallback((id: string) => {
    setNotificationsState(prev => (Array.isArray(prev) ? prev : []).map(n => n?.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotificationsState(prev => (Array.isArray(prev) ? prev : []).map(n => ({ ...n, read: true })));
  }, []);

  const getTeamPerformance = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const teamMembers = [
      { id: '1', name: 'Duy Tran' },
      { id: '2', name: 'Mai Le' },
      { id: '3', name: 'Hung Vo' },
    ];
    return teamMembers.map(member => {
      const memberLeads = safeLeads.filter(l => l && l.assigned_to === member.name);
      const won = memberLeads.filter(l => l && l.stage === 'Closed Won');
      const total = memberLeads.filter(l => l && ['Closed Won', 'Closed Lost'].includes(l.stage));
      const revenue = won.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0);
      const winRate = total.length > 0 ? (won.length / total.length) * 100 : 0;
      return { name: member.name, deals: memberLeads.length, revenue, winRate };
    });
  }, [leads]);

  const getPipelineData = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    return stages.map(stage => {
      const stageLeads = safeLeads.filter(l => l?.stage === stage);
      return { stage, count: stageLeads.length, value: stageLeads.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0) };
    });
  }, [leads]);

  const getRevenueByMonth = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => {
      const monthLeads = safeLeads.filter(l => l?.updated_at && l.updated_at.includes(`2024-${idx + 1}-`) && l.stage === 'Closed Won');
      return { month, value: monthLeads.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0) };
    });
  }, [leads]);

  const getLeadSourceDistribution = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const sources: Record<string, number> = {};
    safeLeads.forEach(l => { if (l?.source) sources[l.source] = (sources[l.source] || 0) + 1; });
    return Object.entries(sources).map(([source, count]) => ({ source, count }));
  }, [leads]);

  // Defensive lead status distribution
  const getLeadStatusDistribution = useCallback(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const statuses = ['New', 'Converted', 'Rejected'];
    return statuses.map(status => {
      const statusLeads = safeLeads.filter(l => l && l.lead_status === status);
      return {
        status,
        count: statusLeads.length,
        value: statusLeads.reduce((sum, l) => sum + (Number(l.deal_size) || 0), 0),
      };
    });
  }, [leads]);

  const setLeads = useCallback((newLeads: Lead[]) => {
    setLeadsState(Array.isArray(newLeads) ? newLeads : []);
  }, []);

  const setActivities = useCallback((newActivities: Activity[]) => {
    setActivitiesState(Array.isArray(newActivities) ? newActivities : []);
  }, []);

  const setNotifications = useCallback((newNotifications: Notification[]) => {
    setNotificationsState(Array.isArray(newNotifications) ? newNotifications : []);
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setDarkModeState(dark);
  }, []);

  const value = useMemo(() => ({
    currentUser, currentPage, leads, activities, scheduledTodos, leadRules, notifications, toasts,
    selectedLead, selectedActivity, selectedMemberId, darkMode, sidebarCollapsed,
    showAddLeadModal, showAddActivityModal, showProfileModal, showSettingsModal,
    showNotificationsModal, showLeadRulesModal, showAddDealModal,
    activityLogMode, dealViewMode, leadViewMode, teamMembers: ACCOUNTS, isAuthLoading,
    setCurrentUser, setCurrentPage, setLeads, setActivities, setNotifications,
    setToast: () => {}, setSelectedLead, setSelectedActivity, setDarkMode,
    setShowAddLeadModal, setShowAddActivityModal, setShowProfileModal,
    setShowSettingsModal, setShowNotificationsModal, setShowLeadRulesModal,
    setShowAddDealModal, setActivityLogMode, setDealViewMode, setLeadViewMode,
    setSidebarCollapsed, setSelectedMemberId,
    addLead, updateLead, deleteLead, addActivity, updateActivity, deleteActivity,
    showToast: showToastFn, hideToast, logout, login,
    getFilteredLeads, getFilteredActivities, getLeadById, getActivitiesForLead,
    getTeamPerformance, getPipelineData, getRevenueByMonth, getLeadSourceDistribution,
    getLeadStatusDistribution,
  }), [
    currentUser, currentPage, leads, activities, scheduledTodos, leadRules, notifications, toasts,
    selectedLead, selectedActivity, selectedMemberId, darkMode, sidebarCollapsed,
    showAddLeadModal, showAddActivityModal, showProfileModal, showSettingsModal,
    showNotificationsModal, showLeadRulesModal, showAddDealModal,
    activityLogMode, dealViewMode, leadViewMode, isAuthLoading,
    addLead, updateLead, deleteLead, addActivity, updateActivity, deleteActivity,
    getFilteredLeads, getFilteredActivities, getLeadById, getActivitiesForLead,
    getTeamPerformance, getPipelineData, getRevenueByMonth, getLeadSourceDistribution,
    getLeadStatusDistribution,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function useFilteredData() {
  const { getFilteredLeads, getFilteredActivities, getFilteredScheduledTodos } = useApp();
  return useMemo(() => ({
    leads: getFilteredLeads(),
    activities: getFilteredActivities(),
    scheduledTodos: getFilteredScheduledTodos(),
  }), [getFilteredLeads, getFilteredActivities, getFilteredScheduledTodos]);
}
