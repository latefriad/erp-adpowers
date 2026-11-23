import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, TrendingUp, TrendingDown, FileText, AlertTriangle,
  Clock, Truck, RefreshCw, Download, Printer, Target, MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppUrl, currentYearMonth, exportToCsv, formatLocalYmd, formatMoney, STATUS_COLORS } from '../lib/format';
import StatCard from '../components/StatCard';
import { MultiBarChart, ProgressBar } from '../components/Charts';
import Modal from '../components/Modal';

function getPeriodDates(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'quarter') {
    const qStart = Math.floor(m / 3) * 3;
    return {
      startDate: formatLocalYmd(y, qStart, 1),
      endDate: formatLocalYmd(y, qStart + 3, 0)
    };
  }
  if (preset === 'year') {
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
  }
  if (preset === 'last12') {
    return { startDate: formatLocalYmd(y, m - 11, 1), endDate: formatLocalYmd(y, m + 1, 0) };
  }
  return {
    startDate: formatLocalYmd(y, m, 1),
    endDate: formatLocalYmd(y, m + 1, 0)
  };
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [preset, setPreset] = useState('month');
  const [customRange, setCustomRange] = useState(() => getPeriodDates('month'));
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState('');

  const dates = preset === 'custom' ? customRange : getPeriodDates(preset);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', dates.startDate, dates.endDate],
    queryFn: () => gasCall('getDashboard', dates)
  });

  const handleExport = () => {
    if (!data) return;
    exportToCsv(
      `Adpowrs_Finance_${dates.startDate}_${dates.endDate}`,
      [
        { label: 'Metric', key: 'metric' },
        { label: 'Value (DZD)', key: 'value' }
      ],
      [
        { metric: 'Treasury Balance', value: data.treasuryBalance },
        { metric: 'Cash Received', value: data.kpis.cashReceived },
        { metric: 'Total Expenses', value: data.kpis.totalExpenses },
        { metric: 'Net Profit', value: data.kpis.netProfit },
        { metric: 'Total Billed', value: data.kpis.totalBilled },
        { metric: 'Outstanding Receivables', value: data.kpis.outstandingReceivables },
        { metric: 'Overdue Receivables', value: data.kpis.overdueReceivables },
        { metric: 'Supplier Payables', value: data.kpis.supplierPayables },
        { metric: 'MRR', value: data.kpis.mrr }
      ]
    );
    toast.success('Export CSV prêt');
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    const ym = currentYearMonth();
    await gasCall('saveBudgetGoal', {
      year: Number(ym.slice(0, 4)),
      month: Number(ym.slice(5, 7)),
      revenueTarget: Number(goalValue || 0)
    });
    toast.success('Objectif mis à jour');
    setGoalOpen(false);
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  if (isLoading || !data) {
    return <div className="p-10 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;
  }

  const { kpis, aging, budgetVsActuals } = data;

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.dashboard')}</h1>
          <p className="text-xs text-[var(--text-muted)]">{dates.startDate} → {dates.endDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="input-field w-auto text-xs font-semibold"
          >
            <option value="month">هذا الشهر / Ce mois</option>
            <option value="quarter">هذا الربع / Trimestre</option>
            <option value="year">هذه السنة / Année</option>
            <option value="last12">آخر 12 شهراً / 12 mois</option>
            <option value="custom">مخصص / Custom</option>
          </select>

          {preset === 'custom' && (
            <>
              <input type="date" value={customRange.startDate} onChange={(e) => setCustomRange((p) => ({ ...p, startDate: e.target.value }))} className="input-field w-auto text-xs" />
              <input type="date" value={customRange.endDate} onChange={(e) => setCustomRange((p) => ({ ...p, endDate: e.target.value }))} className="input-field w-auto text-xs" />
            </>
          )}

          <button type="button" onClick={() => refetch()} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={handleExport} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>{t('common.exportExcel')}</span>
          </button>
          <button type="button" onClick={() => window.print()} className="btn-secondary text-xs">
            <Printer className="w-3.5 h-3.5" />
            <span>{t('common.print')}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Treasury Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-100 font-semibold">{t('dashboard.treasury')}</p>
          <p className="text-3xl lg:text-4xl font-extrabold mt-1">{formatMoney(data.treasuryBalance)}</p>
          <p className="text-xs text-indigo-100 mt-1 font-medium">
            الرصيد الفعلي المتوفر (كاش وبنوك) = المقبوض فعلياً ({formatMoney(data.totalCashIn ?? kpis.cashReceived)}) - المصاريف ({formatMoney(data.totalCashOut ?? kpis.totalExpenses)})
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="bg-white/15 backdrop-blur-xs rounded-xl px-3.5 py-2.5 min-w-32">
            <p className="text-[11px] text-indigo-100 font-semibold">المحصّل كاش</p>
            <p className="text-base font-extrabold">{formatMoney(data.totalCashIn ?? kpis.cashReceived)}</p>
            <p className="text-[10px] text-indigo-100">Encaissé Réel</p>
          </div>
          <div className="bg-white/15 backdrop-blur-xs rounded-xl px-3.5 py-2.5 min-w-32">
            <p className="text-[11px] text-indigo-100 font-semibold">إجمالي المصاريف</p>
            <p className="text-base font-extrabold">{formatMoney(data.totalCashOut ?? kpis.totalExpenses)}</p>
            <p className="text-[10px] text-indigo-100">Dépenses Réglées</p>
          </div>
          <div className="bg-white/15 backdrop-blur-xs rounded-xl px-3.5 py-2.5 min-w-32">
            <p className="text-[11px] text-indigo-100 font-semibold">إجمالي الفواتير الصادرة</p>
            <p className="text-base font-extrabold">{formatMoney(data.totalInvoiced ?? kpis.totalBilled)}</p>
            <p className="text-[10px] text-indigo-100">Facturation Globale</p>
          </div>
          <div className="bg-white/15 backdrop-blur-xs rounded-xl px-3.5 py-2.5 min-w-32">
            <p className="text-[11px] text-indigo-100 font-semibold">المتبقي غير المحصل</p>
            <p className="text-base font-extrabold">{formatMoney(kpis.outstandingReceivables)}</p>
            <p className="text-[10px] text-indigo-100">Créances Clients</p>
          </div>
        </div>
      </div>

      {/* 7 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.cashReceived')} value={formatMoney(kpis.cashReceived)} subtitle="الكاش المحصل في الفترة" icon={TrendingUp} tone="emerald" />
        <StatCard title={t('dashboard.totalExpenses')} value={formatMoney(kpis.totalExpenses)} subtitle={`${kpis.expenseCount} مصاريف مدفوعة`} icon={TrendingDown} tone="rose" />
        <StatCard title={t('dashboard.netProfit')} value={formatMoney(kpis.netProfit)} subtitle={`هامش الربح: ${kpis.profitMargin}%`} icon={Wallet} tone={kpis.netProfit >= 0 ? 'indigo' : 'rose'} />
        <StatCard title={t('dashboard.totalBilled')} value={formatMoney(kpis.totalBilled)} subtitle={`نسبة التحصيل: ${kpis.collectionRate}%`} icon={FileText} tone="sky" />
        <StatCard title={t('dashboard.outstanding')} value={formatMoney(kpis.outstandingReceivables)} icon={Clock} tone="amber" />
        <StatCard title={t('dashboard.overdue')} value={formatMoney(kpis.overdueReceivables)} subtitle={`${kpis.overdueCount} factures`} icon={AlertTriangle} tone="rose" />
        <StatCard title={t('dashboard.payables')} value={formatMoney(kpis.supplierPayables)} subtitle={kpis.overduePayables > 0 ? `En retard: ${formatMoney(kpis.overduePayables)}` : 'À jour'} icon={Truck} tone="violet" />
        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">هدف الشهر ({budgetVsActuals.month})</span>
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => { setGoalValue(String(budgetVsActuals.revenueTarget || '')); setGoalOpen(true); }}
                className="text-xs text-indigo-500 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" /> تعديل
              </button>
            )}
          </div>
          <p className="text-lg font-extrabold mt-1">
            {formatMoney(budgetVsActuals.revenueActual)}
            <span className="text-xs font-normal text-[var(--text-muted)]"> / {formatMoney(budgetVsActuals.revenueTarget)}</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={budgetVsActuals.revenueActual} max={budgetVsActuals.revenueTarget || 1} colorClass="bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Charts Row: Monthly Cash Curve + Expenses Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-sm mb-4">{t('dashboard.monthlyCurve')}</h2>
          <MultiBarChart
            data={data.monthlyCashCurve}
            series={[
              { key: 'cashIn', label: t('dashboard.cashReceived'), colorClass: 'bg-emerald-500' },
              { key: 'expenses', label: t('dashboard.totalExpenses'), colorClass: 'bg-rose-500' }
            ]}
          />
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-sm">{t('dashboard.expensesByCat')}</h2>
          {data.expensesByCategory.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">{t('common.noData')}</p>
          ) : (
            data.expensesByCategory.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{item.category}</span>
                  <span>{formatMoney(item.total)} ({item.pct}%)</span>
                </div>
                <ProgressBar value={item.pct} max={100} colorClass="bg-indigo-500" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Aging + Forecast + Budget vs Actuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-sm">{t('dashboard.aging')} (DSO: {kpis.dso}j)</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--surface-subtle)]">
              <p className="text-[var(--text-muted)]">Non échu</p>
              <p className="font-extrabold text-sm mt-1">{formatMoney(aging.notDue)}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <p className="text-amber-600 dark:text-amber-400">1–30 jours</p>
              <p className="font-extrabold text-sm mt-1">{formatMoney(aging.d1_30)}</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10">
              <p className="text-orange-600 dark:text-orange-400">31–60 jours</p>
              <p className="font-extrabold text-sm mt-1">{formatMoney(aging.d31_60)}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10">
              <p className="text-rose-600 dark:text-rose-400">60+ jours</p>
              <p className="font-extrabold text-sm mt-1">{formatMoney(aging.d60Plus)}</p>
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-sm">{t('dashboard.forecast')}</h2>
          <div className="space-y-2.5">
            {data.forecast.map((f) => (
              <div key={f.month} className="p-3 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">{f.month}</p>
                  <p className="text-[var(--text-muted)]">+{formatMoney(f.expectedIn)} / -{formatMoney(f.expectedOut)}</p>
                </div>
                <p className={`font-extrabold text-sm ${f.projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {formatMoney(f.projectedBalance)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-sm">{t('dashboard.budgetVsActual')}</h2>
          {budgetVsActuals.categories.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">أضف الميزانية من صفحة المصاريف</p>
          ) : (
            budgetVsActuals.categories.map((c) => (
              <div key={c.category} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold">{c.category}</span>
                  <span className={c.over ? 'text-rose-500 font-bold' : ''}>
                    {formatMoney(c.actual)} / {formatMoney(c.budget)}
                  </span>
                </div>
                <ProgressBar value={c.actual} max={c.budget || c.actual || 1} colorClass={c.over ? 'bg-rose-500' : 'bg-sky-500'} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Overdue Priority + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-bold text-sm mb-3">{t('dashboard.priorityOverdue')}</h2>
          {data.overdueList.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 py-4">لا توجد فواتير متأخرة حالياً ✓</p>
          ) : (
            <div tabIndex={0} role="region" aria-label="Overdue invoices" className="table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('common.client')}</th>
                    <th>{t('common.amount')}</th>
                    <th>Retard</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueList.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-bold">{inv.number}</td>
                      <td>{inv.clientName}</td>
                      <td className="font-bold text-rose-500">{formatMoney(inv.remainingDzd)}</td>
                      <td><span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">{inv.daysOverdue}j</span></td>
                      <td>
                        <a
                          href={buildWhatsAppUrl(inv.clientPhone, `السلام عليكم ${inv.clientName}، تذكير بخصوص الفاتورة ${inv.number} بمبلغ متبقي ${formatMoney(inv.remainingDzd)} (متأخرة بـ ${inv.daysOverdue} يوم). شكراً.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-sm mb-3">{t('dashboard.topClients')}</h2>
          <div tabIndex={0} role="region" aria-label="Top clients" className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{t('common.client')}</th>
                  <th>Encaissé</th>
                  <th>Reste dû</th>
                </tr>
              </thead>
              <tbody>
                {data.topClients.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.name}</td>
                    <td className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(c.received)}</td>
                    <td className="text-[var(--text-muted)]">{formatMoney(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card p-5">
        <h2 className="font-bold text-sm mb-3">{t('dashboard.recentInvoices')}</h2>
        <div tabIndex={0} role="region" aria-label="Recent invoices" className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('common.client')}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.total')}</th>
                <th>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-bold">{inv.number || 'DRAFT'}</td>
                  <td>{inv.clientName}</td>
                  <td>{inv.issueDate}</td>
                  <td className="font-bold">{formatMoney(inv.total, inv.currency)}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[inv.displayStatus] || ''}`}>
                      {inv.displayStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="تحديد هدف الإيرادات الشهري">
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">هدف الشهر الحالي (DZD)</label>
            <input type="number" required value={goalValue} onChange={(e) => setGoalValue(e.target.value)} className="input-field" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setGoalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
