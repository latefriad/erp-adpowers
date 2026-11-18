import { formatMoney } from '../lib/format';

export function MultiBarChart({ data = [], series = [], height = 180 }) {
  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => Number(d[s.key] || 0)))
  );

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((d, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end gap-1.5 min-w-0">
            <div className="w-full flex items-end justify-center gap-1 flex-1">
              {series.map((s) => {
                const val = Number(d[s.key] || 0);
                const pct = Math.max(3, Math.round((val / maxVal) * 100));
                return (
                  <div
                    key={s.key}
                    title={`${d.month} — ${s.label}: ${formatMoney(val)}`}
                    className={`flex-1 max-w-6 rounded-t-md transition-all duration-300 ${s.colorClass}`}
                    style={{ height: `${pct}%` }}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-medium text-[var(--text-muted)] truncate">
              {d.month}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.colorClass}`} />
            <span className="text-[var(--text-muted)]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, colorClass = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
