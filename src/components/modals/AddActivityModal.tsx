import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { Badge } from '../shared/Badge';
import { ACTIVITY_TYPES, STAGE_COLORS, ACCOUNTS, type ActivityType, type ActivityMode, type Lead } from '../../types';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ActivityMode;
  onModeChange: (mode: ActivityMode) => void;
  preselectedLead?: Lead | null;
}

export function AddActivityModal({ isOpen, onClose, mode, onModeChange, preselectedLead }: AddActivityModalProps) {
  const { leads, currentUser, addActivity, addScheduledTodo, showToast } = useApp();
  const isManager = currentUser?.role === 'manager';

  const [logForm, setLogForm] = useState({
    type: 'Call' as ActivityType,
    lead_id: preselectedLead?.id || '',
    lead_name: preselectedLead?.name || '',
    company: preselectedLead?.company || '',
    stage: preselectedLead?.stage || '',
    date: new Date().toISOString().split('T')[0],
    duration: '30',
    notes: '',
    next_action: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    type: 'Call' as ActivityType,
    lead_id: preselectedLead?.id || '',
    lead_name: preselectedLead?.name || '',
    company: preselectedLead?.company || '',
    stage: preselectedLead?.stage || '',
    scheduled_date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })(),
    scheduled_time: '09:00',
    agenda: '',
    assigned_to: currentUser?.id || '0',
  });

  const handleSelectLead = (lead: Lead | undefined) => {
    if (!lead) {
      setLogForm(prev => ({ ...prev, lead_id: '', lead_name: '', company: '', stage: '' }));
      setScheduleForm(prev => ({ ...prev, lead_id: '', lead_name: '', company: '', stage: '' }));
      return;
    }
    setLogForm(prev => ({
      ...prev,
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company || '',
      stage: lead.stage,
    }));
    setScheduleForm(prev => ({
      ...prev,
      lead_id: lead.id,
      lead_name: lead.name,
      company: lead.company || '',
      stage: lead.stage,
    }));
  };

  const handleLogActivity = async () => {
    if (!logForm.lead_name.trim()) {
      showToast('error', 'Please select a lead');
      return;
    }

    await addActivity({
      type: logForm.type,
      lead_id: logForm.lead_id || null,
      lead_name: logForm.lead_name,
      company: logForm.company || null,
      stage: logForm.stage || null,
      date: logForm.date,
      duration: parseInt(logForm.duration) || 0,
      notes: logForm.notes || null,
      next_action: logForm.next_action || null,
      owner_id: currentUser?.id || '0',
    });

    resetForms();
    onClose();
  };

  const handleScheduleTodo = async () => {
    if (!scheduleForm.lead_name.trim()) {
      showToast('error', 'Please select a lead');
      return;
    }
    if (!scheduleForm.agenda.trim()) {
      showToast('error', 'Please enter an agenda');
      return;
    }

    const assignedTo = isManager ? scheduleForm.assigned_to : currentUser?.id || '0';

    await addScheduledTodo({
      lead_id: scheduleForm.lead_id || null,
      lead_name: scheduleForm.lead_name,
      company: scheduleForm.company || null,
      stage: scheduleForm.stage || null,
      scheduled_date: scheduleForm.scheduled_date,
      scheduled_time: scheduleForm.scheduled_time || null,
      agenda: scheduleForm.agenda,
      done: false,
      owner_id: currentUser?.id || '0',
      assigned_to: assignedTo,
    });

    resetForms();
    onClose();
  };

  const resetForms = () => {
    setLogForm({
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
    setScheduleForm({
      type: 'Call',
      lead_id: '',
      lead_name: '',
      company: '',
      stage: '',
      scheduled_date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })(),
      scheduled_time: '09:00',
      agenda: '',
      assigned_to: currentUser?.id || '0',
    });
  };

  const selectedLead = leads.find(l => l.id === logForm.lead_id);
  const selectedAssignee = ACCOUNTS.find(a => a.id === scheduleForm.assigned_to);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { resetForms(); onClose(); }}
      title="Log / Schedule"
      size="lg"
    >
      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
        <button
          onClick={() => onModeChange('log')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            mode === 'log'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-check-circle"></i>
          Log (Done)
        </button>
        <button
          onClick={() => onModeChange('schedule')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            mode === 'schedule'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-calendar-plus"></i>
          Schedule (To-Do)
        </button>
      </div>

      {/* Activity Type */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Activity Type</label>
        <select
          value={mode === 'log' ? logForm.type : scheduleForm.type}
          onChange={(e) => {
            const val = e.target.value as ActivityType;
            if (mode === 'log') {
              setLogForm({ ...logForm, type: val });
            } else {
              setScheduleForm({ ...scheduleForm, type: val });
            }
          }}
          className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
        >
          <option value="Call">📞 Call</option>
          <option value="Email">📧 Email</option>
          <option value="Meeting">🤝 Meeting</option>
          <option value="Note">📝 Note</option>
        </select>
      </div>

      {/* Lead Selection */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Lead</label>
        <select
          value={logForm.lead_id}
          onChange={(e) => handleSelectLead(leads.find(l => l.id === e.target.value))}
          className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
        >
          <option value="">Select a lead...</option>
          {leads.map(l => (
            <option key={l.id} value={l.id}>{l.name} {l.company ? `- ${l.company}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Selected Lead Info */}
      {selectedLead && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-border dark:border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS] }}
            >
              {selectedLead.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-text-primary dark:text-white">{selectedLead.name}</p>
              <p className="text-sm text-text-secondary dark:text-text-muted">{selectedLead.company}</p>
            </div>
            <Badge variant="stage" color={STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS]}>
              {selectedLead.stage}
            </Badge>
          </div>
        </div>
      )}

      {/* Log Mode Form */}
      {mode === 'log' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Activity Date</label>
              <input
                type="date"
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Duration (min)</label>
              <input
                type="number"
                value={logForm.duration}
                onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                placeholder="30"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Notes / What happened</label>
            <textarea
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
              placeholder="Key points, agenda, or what happened..."
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Next Action</label>
            <input
              type="text"
              value={logForm.next_action}
              onChange={(e) => setLogForm({ ...logForm, next_action: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              placeholder="e.g. Send proposal by Friday"
            />
          </div>
          <button
            onClick={handleLogActivity}
            disabled={!logForm.lead_name.trim()}
            className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 font-semibold"
          >
            <i className="fa-solid fa-check mr-2"></i>
            Log Activity
          </button>
        </div>
      )}

      {/* Schedule Mode Form */}
      {mode === 'schedule' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Scheduled Date</label>
              <input
                type="date"
                value={scheduleForm.scheduled_date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Scheduled Time</label>
              <input
                type="time"
                value={scheduleForm.scheduled_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
          </div>

          {/* Assign To - Manager only */}
          {isManager && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-accent"></i>
                Assign To
                <span className="font-normal text-[10px]">— who is responsible for this task</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNTS.map(a => {
                  const isSelected = scheduleForm.assigned_to === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setScheduleForm({ ...scheduleForm, assigned_to: a.id })}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50 bg-gray-50 dark:bg-gray-900/50'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: a.color }}
                      >
                        {a.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-text-primary dark:text-white truncate">
                          {a.name.split(' ').slice(-1)[0]}
                          {a.id === currentUser?.id && <span className="font-normal text-text-muted ml-1">(me)</span>}
                        </p>
                        <p className="text-[10px] text-text-muted">{a.roleLabel}</p>
                      </div>
                      {isSelected && (
                        <i className="fa-solid fa-circle-check text-accent text-sm"></i>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Agenda / What to discuss</label>
            <textarea
              value={scheduleForm.agenda}
              onChange={(e) => setScheduleForm({ ...scheduleForm, agenda: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
              placeholder="What needs to be discussed or accomplished..."
            />
          </div>
          <button
            onClick={handleScheduleTodo}
            disabled={!scheduleForm.lead_name.trim() || !scheduleForm.agenda.trim()}
            className="w-full px-4 py-3 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-calendar-plus"></i>
            Schedule
          </button>
        </div>
      )}
    </Modal>
  );
}
