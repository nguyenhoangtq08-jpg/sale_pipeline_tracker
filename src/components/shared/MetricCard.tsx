
interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  color?: string;
  trend?: { value: number; up: boolean };
}

export function MetricCard({ label, value, subtext, icon, color = '#6366f1', trend }: MetricCardProps) {
  return (
    <div className="bg-bg-card dark:bg-bg-card rounded-xl p-5 shadow-sm border border-border dark:border-border relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
      <div className="pl-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white">{value}</p>
            {subtext && <p className="text-sm text-text-secondary mt-1">{subtext}</p>}
          </div>
          {icon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <i className={`fa-solid ${icon} text-xl`} style={{ color: color }}></i>
            </div>
          )}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            trend.up ? 'text-green-500' : 'text-red-500'
          }`}>
            <i className={`fa-solid fa-arrow-${trend.up ? 'up' : 'down'}`}></i>
            <span>{trend.value}%</span>
            <span className="text-text-muted ml-1">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
