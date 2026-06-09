import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { Drawer } from '../shared/Drawer';
import { STAGES, STAGE_COLORS, type Lead } from '../../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(value);
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function DealManagement() {
  const { leads, setSelectedLead, selectedLead, updateLead, activities } = useApp();
  const [showDrawer, setShowDrawer] = useState(false);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.stage === stage);
    return acc;
  }, {} as Record<string, Lead[]>);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stage: string) => {
    if (!draggedLead || draggedLead.stage === stage) return;

    const newProbability = stage === 'Closed Won' ? 100 : stage === 'Closed Lost' ? 0 : draggedLead.probability;

    await updateLead(draggedLead.id, {
      stage,
      probability: newProbability,
    });

    setDraggedLead(null);
  };

  const openDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDrawer(true);
  };

  const leadActivities = selectedLead
    ? activities.filter(a => a.lead_id === selectedLead.id || a.lead_name === selectedLead.name)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Deal Management</h1>
        <p className="text-text-secondary dark:text-text-muted">Drag and drop deals between stages</p>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage] || [];
            const totalValue = stageLeads.reduce((sum, l) => sum + Number(l.deal_size), 0);
            const isWonClosed = stage === 'Closed Won';
            const isLostClosed = stage === 'Closed Lost';

            return (
              <div
                key={stage}
                className="w-[280px] flex-shrink-0 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage)}
              >
                {/* Column Header */}
                <div
                  className={`px-4 py-3 rounded-t-xl ${
                    isWonClosed ? 'bg-green-500' :
                    isLostClosed ? 'bg-red-500' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isWonClosed || isLostClosed ? 'text-white' : 'text-text-primary dark:text-white'}`}>
                      {stage}
                    </span>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${
                      isWonClosed || isLostClosed
                        ? 'bg-white/20 text-white'
                        : 'bg-accent text-white'
                    }`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${isWonClosed || isLostClosed ? 'text-white/80' : 'text-text-muted'}`}>
                    {formatCurrency(totalValue)}
                  </p>
                </div>

                {/* Cards Container */}
                <div
                  className={`flex-1 p-2 space-y-2 rounded-b-xl min-h-[400px] ${
                    isWonClosed ? 'bg-green-50 dark:bg-green-900/10 border-2 border-dashed border-green-300 dark:border-green-800' :
                    isLostClosed ? 'bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-300 dark:border-red-800' :
                    'bg-gray-50 dark:bg-gray-900/30 border-2 border-dashed border-transparent'
                  }`}
                >
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      onClick={() => openDrawer(lead)}
                      className="bg-bg-card dark:bg-bg-card rounded-lg p-4 shadow-sm border border-border dark:border-border cursor-pointer hover:shadow-md transition-shadow active:cursor-grabbing"
                    >
                      {/* Lead Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-text-primary dark:text-white">{lead.name}</p>
                          <p className="text-sm text-text-secondary dark:text-text-muted">{lead.company}</p>
                        </div>
                        <span className="text-lg font-bold text-accent">{formatCurrency(lead.deal_size)}</span>
                      </div>

                      {/* Probability Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                          <span>Probability</span>
                          <span>{lead.probability}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${lead.probability}%`,
                              backgroundColor: isWonClosed ? '#10b981' : isLostClosed ? '#ef4444' : STAGE_COLORS[stage as keyof typeof STAGE_COLORS],
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Source Badge */}
                      <div className="flex items-center justify-between">
                        <Badge variant="default" size="sm">{lead.source}</Badge>
                        <span className="text-xs text-text-muted">{timeAgo(lead.updated_at)}</span>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                      <span>No deals</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedLead(null); }}
        title="Lead Details"
        footer={
          <div className="flex gap-3">
            <select
              value={selectedLead?.stage || ''}
              onChange={(e) => {
                if (selectedLead) {
                  const newStage = e.target.value;
                  const newProb = newStage === 'Closed Won' ? 100 : newStage === 'Closed Lost' ? 0 : selectedLead.probability;
                  updateLead(selectedLead.id, { stage: newStage, probability: newProb });
                }
              }}
              className="flex-1 px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        }
      >
        {selectedLead && (
          <div className="space-y-6">
            {/* Lead Info */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS] }}
              >
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary dark:text-white">{selectedLead.name}</h3>
                <p className="text-text-secondary dark:text-text-muted">{selectedLead.company || 'No company'}</p>
                <Badge variant="stage" color={STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS]} size="md">
                  {selectedLead.stage}
                </Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Deal Size</p>
                <p className="text-lg font-bold text-accent">{formatCurrency(selectedLead.deal_size)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Probability</p>
                <p className="text-lg font-bold text-text-primary dark:text-white">{selectedLead.probability}%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Source</p>
                <p className="text-text-primary dark:text-white">{selectedLead.source}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Email</p>
                <p className="text-text-primary dark:text-white truncate">{selectedLead.email || '-'}</p>
              </div>
            </div>

            {/* Activity Timeline */}
            <div>
              <p className="text-xs text-text-muted uppercase font-semibold mb-3">Activity Timeline</p>
              {leadActivities.length === 0 ? (
                <p className="text-text-muted text-sm">No activities recorded</p>
              ) : (
                <div className="space-y-3">
                  {leadActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'Call' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                        activity.type === 'Email' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                        activity.type === 'Meeting' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600'
                      }`}>
                        <i className={`fa-solid text-xs ${
                          activity.type === 'Call' ? 'fa-phone' :
                          activity.type === 'Email' ? 'fa-envelope' :
                          activity.type === 'Meeting' ? 'fa-users' :
                          'fa-note-sticky'
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary dark:text-white">{activity.notes || activity.type}</p>
                        <p className="text-xs text-text-muted">{timeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
