export interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  deal_size: number;
  source: string;
  stage: string;
  probability: number;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
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
  user_id: string;
  created_at: string;
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
export const SOURCES: Source[] = ['Website', 'Referral', 'Event', 'Cold Call', 'Other'];
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

export const ACCOUNTS: Account[] = [
  { id: '0', name: 'Anna Nguyen', initials: 'AN', email: 'anna.nguyen@salestrack.vn', role: 'manager', color: '#d97706', roleLabel: 'Account Manager' },
  { id: '1', name: 'Duy Tran', initials: 'DT', email: 'duy.tran@salestrack.vn', role: 'member', color: '#6366f1', roleLabel: 'Account Sales' },
  { id: '2', name: 'Mai Le', initials: 'ML', email: 'mai.le@salestrack.vn', role: 'member', color: '#10b981', roleLabel: 'Account Sales' },
  { id: '3', name: 'Hung Vo', initials: 'HV', email: 'hung.vo@salestrack.vn', role: 'member', color: '#8b5cf6', roleLabel: 'Account Sales' },
];

export const EMAIL_TYPES = ['First Outreach', 'Follow-up', 'Proposal', 'Thank You', 'Re-engagement'] as const;
export const EMAIL_TONES = ['Professional', 'Friendly', 'Formal', 'Urgent'] as const;
