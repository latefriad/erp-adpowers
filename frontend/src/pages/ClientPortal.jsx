import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, CheckCircle2, FileText } from 'lucide-react';
import { gasCall } from '../lib/api';
import { currentYearMonth, formatMoney, STATUS_COLORS } from '../lib/format';
import { downloadClientReportPdf, downloadInvoicePdf } from '../lib/pdf';
import StatCard from '../components/StatCard';

export default function ClientPortal() {
  const { token } = useParams();
  const [month, setMonth] = useState(currentYearMonth());

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-portal', token, month],
    queryFn: () => gasCall('publicPortal', { token, month }, { skipAuth: true })
  });

  if (isLoading) return <div className="min-h-dvh flex items-center justify-center">جاري تحميل بوابة العميل...</div>;
  if (error || !data) return <div className="min-h-dvh flex items-center justify-center text-rose-500 font-bold">رابط غير صالح أو منتهي الصلاحية.</div>;

  const { agency, report } = data;

  return (
    <div className="min-h-dvh bg-[var(--surface-bg)] text-[var(--text-main)] pb-12">
      <header className="bg-slate-950 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {agency.logoUrl ? (
              <img src={agency.logoUrl} alt={agency.agencyName} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center font-extrabold text-xl">A</div>
            )}
            <div>
              <h1 className="text-xl font-extrabold">{agency.agencyName}</h1>
              <p className="text-xs text-slate-300">بوابة العميل الخاصة — {report.client.company || report.client.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-xs bg-slate-900 border-slate-700 text-white" />
            <button type="button" onClick={() => downloadClientReportPdf(report, agency)} className="btn-primary text-xs">
              <Download className="w-4 h-4" /> تحميل التقرير PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="صرف الإعلانات" value={formatMoney(report.adTotals.spend)} tone="indigo" />
          <StatCard title="المبيعات المحققة" value={formatMoney(report.adTotals.revenue)} tone="emerald" />
          <StatCard title="متوسط ROAS" value={`${report.adTotals.roas}x`} tone="sky" />
          <StatCard title="الرصيد المستحق" value={formatMoney(report.financials?.totalOutstanding || 0)} tone="amber" />
        </div>

        {/* Invoices */}
        <div className="card p-5">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> الفواتير وعروض الأسعار</h2>
          <div tabIndex={0} role="region" aria-label="Portal invoices" className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>#</th><th>النوع</th><th>التاريخ</th><th>الاستحقاق</th><th>المجموع</th><th>المتبقي</th><th>الحالة</th><th>PDF</th></tr>
              </thead>
              <tbody>
                {(report.invoices || []).map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-bold">{inv.number}</td>
                    <td>{inv.docType}</td>
                    <td>{inv.issueDate}</td>
                    <td>{inv.dueDate}</td>
                    <td className="font-bold">{formatMoney(inv.total, inv.currency)}</td>
                    <td>{formatMoney(inv.remaining, inv.currency)}</td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[inv.displayStatus] || ''}`}>{inv.displayStatus}</span></td>
                    <td>
                      <button type="button" onClick={() => downloadInvoicePdf(inv, agency)} className="text-indigo-500 hover:underline text-xs font-bold cursor-pointer">
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaigns & Deliverables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5 space-y-3">
            <h2 className="font-bold text-sm">أداء الحملات ({month})</h2>
            {(report.adSpend || []).map((a) => (
              <div key={a.id} className="p-3 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">{a.platform} — {a.campaignName}</p>
                  <p className="text-[var(--text-muted)]">صرف: {formatMoney(a.actualSpend)} • طلبات: {a.orders}</p>
                </div>
                <div className="text-end">
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400">ROAS {a.roas}x</p>
                  <p className="text-[var(--text-muted)]">CPA {formatMoney(a.cpa)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="font-bold text-sm">الأعمال المسلّمة ({(report.deliveredTasks || []).length})</h2>
            {(report.deliveredTasks || []).map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-[var(--surface-subtle)] flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
