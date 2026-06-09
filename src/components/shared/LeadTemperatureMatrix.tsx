import { useMemo } from 'react';
import { useApp, useFilteredData } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { STAGE_COLORS, STAGES, TEMPERATURE_COLORS, type Lead } from '../../types';

type Temperature = 'warm' | 'cooling' | 'cold';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calculateDaysInactive(lastActivityDate: string | null): number {
  if (!lastActivityDate) return 9999;
  const diffMs = Date.now() - new Date(lastActivityDate).getTime();
  return Math.floor(diffMs / 86400000);
}

function getTemperatureClass(daysInactive: number, warmDays: number, coldDays: number): Temperature {
  if (daysInactive < warmDays) return 'warm';
  if (daysInactive < coldDays) return 'cooling';
  return 'cold';
}

export function LeadTemperatureMatrix() {
  const { leadRules, currentUser, setShowLeadRulesModal } = useApp();
  const { getFilteredLeads, getFilteredActivities } = useFilteredData();

  const filteredLeads = getFilteredLeads();
  const filteredActivities = getFilteredActivities();

  // Calculate activity count and last activity date for each lead
  const leadMetrics = useMemo(() => {
    const metrics: Record<string, { count: number; lastActivity: string | null }> = {};

    filteredLeads.forEach(lead => {
      const leadActivities = filteredActivities.filter(a => a.lead_id === lead.id || a.lead_name === lead.name);
      const count = leadActivities.length;
      const lastActivity = leadActivities.length > 0
        ? leadActivities.reduce((latest, a) =>
            new Date(a.created_at) > new Date(latest) ? a.created_at : latest,
            leadActivities[0].created_at
          )
        : null;

      metrics[lead.id] = { count, lastActivity };
    });

    return metrics;
  }, [filteredLeads, filteredActivities]);

  // Group leads by stage and temperature
  const matrixData = useMemo(() => {
    const groups: Record<string, Record<Temperature, Lead[]>> = {};

    STAGES.forEach(stage => {
      groups[stage] = { warm: [], cooling: [], cold: [] };
    });

    filteredLeads.forEach(lead => {
      const metrics = leadMetrics[lead.id];
      const daysInactive = calculateDaysInactive(metrics.lastActivity);
      const temp = getTemperatureClass(daysInactive, leadRules.warm_days, leadRules.cold_days);

      if (groups[lead.stage]) {
        groups[lead.stage][temp].push(lead);
      }
    });

    return groups;
  }, [filteredLeads, leadMetrics, leadRules]);

  if (filteredLeads.length === 0) {
    return (
      <div className="bg-bg-card dark:bg-bg-card rounded-xl p-6 shadow-sm border border-border dark:border-border">
        <p className="text-text-muted text-center">No leads to display</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card dark:bg-bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border dark:border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-white">Lead Temperature Matrix</h3>
          <p className="text-sm text-text-muted">Track engagement decay across pipeline stages</p>
        </div>
        {currentUser?.role === 'manager' && (
          <button
            onClick={() => setShowLeadRulesModal(true)}
            className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-gear mr-1"></i>
            Configure Rules
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-sm text-text-secondary dark:text-text-muted">Warm ({'<'}{leadRules.warm_days} days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
          <span className="text-sm text-text-secondary dark:text-text-muted">Cooling ({leadRules.warm_days}-{leadRules.cold_days - 1} days)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-sm text-text-secondary dark:text-text-muted">Cold ({'>'}={leadRules.cold_days} days)</span>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Stage</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted" style={{ backgroundColor: `${TEMPERATURE_COLORS.warm.bg}50` }}>
                Warm
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted" style={{ backgroundColor: `${TEMPERATURE_COLORS.cooling.bg}50` }}>
                Cooling
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted" style={{ backgroundColor: `${TEMPERATURE_COLORS.cold.bg}50` }}>
                Cold
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border">
            {STAGES.map((stage) => {
              const stageLeads = matrixData[stage] || { warm: [], cooling: [], cold: [] };
              const stageColor = STAGE_COLORS[stage];

              return (
                <tr key={stage} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant="stage" color={stageColor}>{stage}</Badge>
                  </td>
                  {/* Warm */}
                  <td className="px-4 py-3" style={{ backgroundColor: `${TEMPERATURE_COLORS.warm.bg}30` }}>
                    <div className="flex flex-wrap gap-1">
                      {stageLeads.warm.map((lead) => (
                        <LeadChip key={lead.id} lead={lead} metrics={leadMetrics[lead.id]} temperature="warm" />
                      ))}
                      {stageLeads.warm.length === 0 && (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                  {/* Cooling */}
                  <td className="px-4 py-3" style={{ backgroundColor: `${TEMPERATURE_COLORS.cooling.bg}30` }}>
                    <div className="flex flex-wrap gap-1">
                      {stageLeads.cooling.map((lead) => (
                        <LeadChip key={lead.id} lead={lead} metrics={leadMetrics[lead.id]} temperature="cooling" />
                      ))}
                      {stageLeads.cooling.length === 0 && (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                  {/* Cold */}
                  <td className="px-4 py-3" style={{ backgroundColor: `${TEMPERATURE_COLORS.cold.bg}30` }}>
                    <div className="flex flex-wrap gap-1">
                      {stageLeads.cold.map((lead) => (
                        <LeadChip key={lead.id} lead={lead} metrics={leadMetrics[lead.id]} temperature="cold" />
                      ))}
                      {stageLeads.cold.length === 0 && (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadChip({ lead, metrics, temperature }: { lead: Lead; metrics: { count: number; lastActivity: string | null }; temperature: Temperature }) {
  const colors = TEMPERATURE_COLORS[temperature];

  const sparkWidth = Math.min(metrics.count * 20, 100);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all hover:shadow-md cursor-pointer"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderLeft: `3px solid ${colors.border}`,
      }}
      title={`${lead.name}\n${metrics.count} activities\nLast: ${metrics.lastActivity ? formatDate(metrics.lastActivity) : 'Never'}`}
    >
      <span className="truncate max-w-[100px]">{lead.name}</span>
      {/* Sparkline indicator */}
      <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${sparkWidth}%`, backgroundColor: colors.border }}
        ></div>
      </div>
    </div>
  );
}
