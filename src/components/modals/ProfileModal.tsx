import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';

export function ProfileModal() {
  const { showProfileModal, setShowProfileModal, currentUser, leads, activities, showToast } = useApp();
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '+84 123 456 789',
    department: currentUser?.role === 'manager' ? 'Sales Management' : 'Sales',
    bio: currentUser?.role === 'manager'
      ? 'Experienced sales manager with 10+ years in enterprise solutions.'
      : 'Dedicated sales professional focused on customer success.',
  });

  const wonLeads = leads.filter(l => l.stage === 'Closed Won').length;
  const totalActivities = activities.length;

  const handleSave = () => {
    showToast('success', 'Profile updated successfully');
    setShowProfileModal(false);
  };

  if (!currentUser) return null;

  return (
    <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="My Profile" size="lg">
      <div className="space-y-6">
        {/* Avatar & Stats */}
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.initials}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-text-primary dark:text-white">{currentUser.name}</h3>
            <p className="text-text-secondary dark:text-text-muted">{currentUser.email}</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
              currentUser.role === 'manager'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-accent/20 text-accent'
            }`}>
              {currentUser.roleLabel}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-text-primary dark:text-white">{leads.length}</p>
            <p className="text-xs text-text-muted uppercase">Leads</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-text-primary dark:text-white">{totalActivities}</p>
            <p className="text-xs text-text-muted uppercase">Activities</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{wonLeads}</p>
            <p className="text-xs text-text-muted uppercase">Won</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
}
