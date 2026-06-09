import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';

type SettingsTab = 'general' | 'notifications' | 'appearance' | 'privacy' | 'data';

export function SettingsModal() {
  const { showSettingsModal, setShowSettingsModal, darkMode, toggleDarkMode, showToast, leads, activities } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState({
    language: 'English',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC+7',
    emailNotifications: true,
    pushNotifications: true,
    weeklyReport: true,
    dealAlerts: true,
    dataSharing: false,
    analytics: true,
  });

  const handleExportData = () => {
    const data = {
      leads,
      activities,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salestrack-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Data exported successfully');
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.clear();
      showToast('success', 'All data cleared');
      window.location.reload();
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'fa-gear' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
    { id: 'appearance', label: 'Appearance', icon: 'fa-palette' },
    { id: 'privacy', label: 'Privacy', icon: 'fa-shield-halved' },
    { id: 'data', label: 'Data', icon: 'fa-database' },
  ];

  return (
    <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Settings" size="xl">
      <div className="flex gap-6 -mx-6">
        {/* Tabs Sidebar */}
        <div className="w-48 border-r border-border dark:border-border px-6 py-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary dark:text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <i className={`fa-solid ${tab.icon} w-4`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pr-8 space-y-6 max-h-[400px] overflow-y-auto scrollbar-thin">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                >
                  <option>English</option>
                  <option>Tieng Viet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                >
                  <option>USD</option>
                  <option>VND</option>
                  <option>EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Date Format</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                >
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                >
                  <option>UTC+7</option>
                  <option>UTC-5</option>
                  <option>UTC+0</option>
                  <option>UTC+8</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive weekly sales summary' },
                { key: 'dealAlerts', label: 'Deal Alerts', desc: 'Get notified on deal updates' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div>
                    <p className="font-medium text-text-primary dark:text-white">{item.label}</p>
                    <p className="text-sm text-text-muted">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key as keyof typeof settings] })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      settings[item.key as keyof typeof settings] ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings[item.key as keyof typeof settings] ? 'left-7' : 'left-1'
                      }`}
                    ></span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <p className="font-medium text-text-primary dark:text-white">Dark Mode</p>
                  <p className="text-sm text-text-muted">Switch between light and dark themes</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    darkMode ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      darkMode ? 'left-7' : 'left-1'
                    }`}
                  ></span>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="font-medium text-text-primary dark:text-white mb-3">Theme Preview</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white border border-gray-200">
                    <p className="text-gray-900 font-medium">Light Mode</p>
                    <p className="text-sm text-gray-600">Clean and bright interface</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
                    <p className="text-white font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-400">Easy on the eyes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <p className="font-medium text-text-primary dark:text-white">Data Sharing</p>
                  <p className="text-sm text-text-muted">Share anonymous usage data to improve the app</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, dataSharing: !settings.dataSharing })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.dataSharing ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.dataSharing ? 'left-7' : 'left-1'
                    }`}
                  ></span>
                </button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <p className="font-medium text-text-primary dark:text-white">Analytics</p>
                  <p className="text-sm text-text-muted">Allow usage analytics for better insights</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, analytics: !settings.analytics })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.analytics ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.analytics ? 'left-7' : 'left-1'
                    }`}
                  ></span>
                </button>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <p className="font-medium text-text-primary dark:text-white">Data Summary</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-2xl font-bold text-accent">{leads.length}</p>
                    <p className="text-sm text-text-muted">Total Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-500">{activities.length}</p>
                    <p className="text-sm text-text-muted">Total Activities</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleExportData}
                className="w-full p-4 rounded-lg border border-border dark:border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-download text-accent"></i>
                <span className="text-text-primary dark:text-white">Export All Data (JSON)</span>
              </button>

              <button
                onClick={handleClearData}
                className="w-full p-4 rounded-lg border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-trash text-red-500"></i>
                <span className="text-red-500">Clear All Data</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
