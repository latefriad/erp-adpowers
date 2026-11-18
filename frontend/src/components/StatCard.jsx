export default function StatCard({ title, value, subtitle, icon: Icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    sky: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
    violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400'
  };

  return (
    <div className="card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--text-muted)] truncate">{title}</p>
        <p className="text-xl font-extrabold mt-1 truncate">{value}</p>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-2.5 rounded-xl shrink-0 ${tones[tone] || tones.indigo}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
