import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { Badge } from '../shared/Badge';
import { ACTIVITY_TYPES, STAGE_COLORS, type ActivityType, type ActivityMode, type Lead } from '../../types';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ActivityMode;
  onModeChange: (mode: ActivityMode) => void;
  preselectedLead?: Lead | null;
}

export function AddActivityModal({ isOpen, onClose, mode, onModeChange, preselectedLead }: AddActivityModalProps) {
  const { leads, currentUser, addActivity, addScheduledTodo, showToast } = useApp();

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
    lead_id: preselectedLead?.id || '',
    lead_name: preselectedLead?.name || '',
    company: preselectedLead?.company || '',
    stage: preselectedLead?.stage || '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00',
    agenda: '',
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
      lead_id: '',
      lead_name: '',
      company: '',
      stage: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '09:00',
      agenda: '',
    });
  };

  const selectedLead = leads.find(l => l.id === logForm.lead_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { resetForms(); onClose(); }}
      title={mode === 'log' ? 'Log Activity' : 'Schedule To-Do'}
      size="lg"
    >
      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
        <button
          onClick={() => onModeChange('log')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'log'
              ? 'bg-bg-card dark:bg-bg-card text-text-primary dark:text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-check-circle mr-2"></i>
          Log Done
        </button>
        <button
          onClick={() => onModeChange('schedule')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'schedule'
              ? 'bg-bg-card dark:bg-bg-card text-text-primary dark:text-white shadow-sm'
              : 'text-text-muted hover:text-text-primary dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-calendar-plus mr-2"></i>
          Schedule To-Do
        </button>
      </div>

      {/* Lead Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Select Lead</label>
        <select
          value={logForm.lead_id}
          onChange={(e) => handleSelectLead(leads.find(l => l.id === e.target.value))}
          className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
        >
          <option value="">Choose a lead...</option>
          {leads.map(l => (
            <option key={l.id} value={l.id}>{l.name} {l.company ? `- ${l.company}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Selected Lead Info */}
      {selectedLead && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
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
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Type</label>
              <select
                value={logForm.type}
                onChange={(e) => setLogForm({ ...logForm, type: e.target.value as ActivityType })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              >
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Activity Date</label>
              <input
                type="date"
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Duration (min)</label>
              <input
                type="number"
                value={logForm.duration}
                onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Next Action</label>
              <input
                type="text"
                value={logForm.next_action}
                onChange={(e) => setLogForm({ ...logForm, next_action: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                placeholder="Follow-up, Send proposal..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Notes</label>
            <textarea
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
              placeholder="Activity details..."
            />
          </div>
          <button
            onClick={handleLogActivity}
            disabled={!logForm.lead_name.trim()}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
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
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Scheduled Date</label>
              <input
                type="date"
                value={scheduleForm.scheduled_date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Scheduled Time</label>
              <input
                type="time"
                value={scheduleForm.scheduled_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Agenda</label>
            <textarea
              value={scheduleForm.agenda}
              onChange={(e) => setScheduleForm({ ...scheduleForm, agenda: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
              placeholder="What needs to be done..."
            />
          </div>
          <button
            onClick={handleScheduleTodo}
            disabled={!scheduleForm.lead_name.trim() || !scheduleForm.agenda.trim()}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <i className="fa-solid fa-calendar-plus mr-2"></i>
            Schedule To-Do
          </button>
        </div>
      )}
    </Modal>
  );
}
