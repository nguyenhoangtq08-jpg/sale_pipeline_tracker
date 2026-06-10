export interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
  city?: string | null;
  industry?: string | null;
  deal_size: number;
  source: string;
  stage: string;
  probability: number;
  notes: string | null;
  owner_id: string;
  assigned_to?: string | null;  // Name of assigned sales member
  lead_status?: 'New' | 'Converted' | 'Rejected';
  created_at: string;
  updated_at: string;
  // Deal-specific fields
  close_date?: string | null;
  last_activity?: string;
  activities?: DealActivity[];
}

export interface DealActivity {
  type: string;
  note: string;
  date: string;
}

export interface Activity {
  id: string;
  type: string;
  lead_id: string | null;
  lead_name: string;
  company: string | null;
  stage: string | null;
  date: string;
  duration: number;
  notes: string | null;
  next_action: string | null;
  owner_id: string;
  created_at: string;
}

export interface ScheduledTodo {
  id: string;
  type: string;
  lead_id: string | null;
  lead_name: string;
  company: string | null;
  stage: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  agenda: string;
  done: boolean;
  owner_id: string;
  assigned_to?: string;
  created_at: string;
}

export interface LeadRules {
  id: string;
  warm_days: number;
  cold_days: number;
  updated_at: string;
  updated_by: string | null;
}

export interface Account {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: 'manager' | 'member';
  color: string;
  roleLabel: string;
}

export type Stage = 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
export type Source = 'Website' | 'Referral' | 'Event' | 'Cold Call' | 'Other';
export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Note';
export type ActivityMode = 'log' | 'schedule';
export type TimeFilter = 'all' | 'today' | 'week' | 'month';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'lead' | 'deal' | 'activity' | 'system';
}

export type Page = 'dashboard' | 'leads' | 'deals' | 'activities' | 'ai-email' | 'reports';

export const STAGES: Stage[] = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
export const SOURCES: Source[] = ['Website', 'Referral', 'Event', 'Cold Call', 'LinkedIn', 'Other'];
export const INDUSTRIES = ['Consulting', 'Education', 'FMCG', 'Finance', 'Healthcare', 'Logistics', 'Retail', 'Technology', 'Other'] as const;
export const LEAD_STATUSES = ['New', 'Converted', 'Rejected'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  'New': '#3b82f6',
  'Converted': '#10b981',
  'Rejected': '#ef4444',
};
export const ACTIVITY_TYPES: ActivityType[] = ['Call', 'Email', 'Meeting', 'Note'];

export const STAGE_COLORS: Record<Stage, string> = {
  'Prospecting': '#6366f1',
  'Qualification': '#3b82f6',
  'Proposal': '#8b5cf6',
  'Negotiation': '#f59e0b',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  'Call': '#10b981',
  'Email': '#3b82f6',
  'Meeting': '#8b5cf6',
  'Note': '#64748b',
};

export const TEMPERATURE_COLORS = {
  warm: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  cooling: { bg: '#fffbeb', text: '#92400e', border: '#f59e0b' },
  cold: { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
};

export const ACCOUNTS: Account[] = [
  { id: '0', name: 'Anna Nguyen', initials: 'AN', email: 'anna.nguyen@salestrack.vn', role: 'manager', color: '#d97706', roleLabel: 'Account Manager' },
  { id: '1', name: 'Duy Tran', initials: 'DT', email: 'duy.tran@salestrack.vn', role: 'member', color: '#6366f1', roleLabel: 'Account Sales' },
  { id: '2', name: 'Mai Le', initials: 'ML', email: 'mai.le@salestrack.vn', role: 'member', color: '#10b981', roleLabel: 'Account Sales' },
  { id: '3', name: 'Hung Vo', initials: 'HV', email: 'hung.vo@salestrack.vn', role: 'member', color: '#8b5cf6', roleLabel: 'Account Sales' },
];

export const EMAIL_TYPES = ['First Outreach', 'Follow-up', 'Proposal', 'Thank You', 'Re-engagement'] as const;
export const EMAIL_TONES = ['Professional', 'Friendly', 'Formal', 'Urgent'] as const;
