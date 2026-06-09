import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';

export function LeadRulesModal() {
  const { showLeadRulesModal, setShowLeadRulesModal, leadRules, updateLeadRules, showToast } = useApp();
  const [formData, setFormData] = useState({
    warm_days: leadRules.warm_days,
    cold_days: leadRules.cold_days,
  });

  useEffect(() => {
    setFormData({
      warm_days: leadRules.warm_days,
      cold_days: leadRules.cold_days,
    });
  }, [leadRules]);

  const handleSave = async () => {
    if (formData.warm_days >= formData.cold_days) {
      showToast('error', 'Warm days must be less than cold days');
      return;
    }

    await updateLeadRules({
      warm_days: formData.warm_days,
      cold_days: formData.cold_days,
    });
    setShowLeadRulesModal(false);
  };

  return (
    <Modal
      isOpen={showLeadRulesModal}
      onClose={() => setShowLeadRulesModal(false)}
      title="Lead Temperature Rules"
      size="md"
    >
      <div className="space-y-6">
        <p className="text-text-secondary dark:text-text-muted">
          Configure the inactivity thresholds for lead temperature classification.
        </p>

        {/* Warm Days */}
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-2">
            Warm Threshold (Days)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="30"
              value={formData.warm_days}
              onChange={(e) => setFormData({ ...formData, warm_days: parseInt(e.target.value) || 7 })}
              className="w-24 px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
            />
            <p className="text-sm text-text-muted">Leads with inactivity less than this are classified as <span className="font-medium text-green-600">Warm</span></p>
          </div>
        </div>

        {/* Cold Days */}
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-white mb-2">
            Cold Threshold (Days)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="60"
              value={formData.cold_days}
              onChange={(e) => setFormData({ ...formData, cold_days: parseInt(e.target.value) || 14 })}
              className="w-24 px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
            />
            <p className="text-sm text-text-muted">Leads with inactivity at or above this are <span className="font-medium text-blue-600">Cold</span></p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
          <p className="text-sm font-medium text-text-primary dark:text-white mb-3">Classification Preview</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-text-secondary dark:text-text-muted">
                0-{formData.warm_days - 1} days inactive = Warm
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm text-text-secondary dark:text-text-muted">
                {formData.warm_days}-{formData.cold_days - 1} days inactive = Cooling
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm text-text-secondary dark:text-text-muted">
                {formData.cold_days}+ days inactive = Cold
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Save Rules
        </button>
      </div>
    </Modal>
  );
}
