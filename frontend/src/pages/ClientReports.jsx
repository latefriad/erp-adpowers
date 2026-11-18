import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, MessageCircle, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppUrl, currentYearMonth, formatMoney, STATUS_COLORS } from '../lib/format';
import { downloadClientReportPdf } from '../lib/pdf';
import StatCard from '../components/StatCard';

export default function ClientReports() {
  const { settings } = useAuth();
  const [month, setMonth] = useState(currentYearMonth());
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const clients = clientsRes?.clients || [];
  const [clientId, setClientId] = useState('');
  const activeClientId = clientId || clients[0]?.id || '';

  const { data: report, isLoading } = useQuery({
    queryKey: ['client-report', activeClientId, month],
    queryFn: () => gasCall('getClientReport', { clientId: activeClientId, month }),
    enabled: Boolean(activeClientId)
  });

  const portalUrl = report?.client?.portalToken
    ? `${window.location.origin}/portal/${report.client.portalToken}`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">تقارير العملاء الشهرية</h1>
          <p className="text-xs text-[var(--text-muted)]">تقرير موحد (المالية + الإعلانات + Testili + المهام المنجزة) جاهز للإرسال للعميل</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={activeClientId} onChange={(e) => setClientId(e.target.value)} className="input-field w-auto text-xs font-semibold">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </select>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-xs" />
          {report && (
            <>
              <button type="button" onClick={() => downloadClientReportPdf(report, settings)} className="btn-primary text-xs">
                <Download className="w-4 h-4" /> PDF
              </button>
              {portalUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('تم نسخ رابط التقرير'); }}
                    className="btn-secondary text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" /> Portal
                  </button>
                  <a
                    href={buildWhatsAppUrl(report.client.phone, `السلام عليكم ${report.client.name}، تقريركم الشهري (${month}) من ${settings.agencyName} جاهز على بوابة العميل:\n${portalUrl}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs text-emerald-600"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> واتساب
                  </a>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading || !report ? (
        <div className="p-10 text-center text-[var(--text-muted)]">...</div>
      ) : (
        <div className="space-y-5">
          {/* Ad Performance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="صرف الإعلانات (Spend)" value={formatMoney(report.adTotals.spend)} tone="indigo" />
            <StatCard title="المبيعات المحققة (Revenue)" value={formatMoney(report.adTotals.revenue)} tone="emerald" />
            <StatCard title="متوسط ROAS" value={`${report.adTotals.roas}x`} tone="sky" />
            <StatCard title="متوسط CPA" value={formatMoney(report.adTotals.cpa)} subtitle={`${report.adTotals.orders} طلب`} tone="amber" />
            <StatCard title="الرصيد المستحق" value={formatMoney(report.financials?.totalOutstanding || 0)} tone="rose" />
          </div>

          {/* Campaigns table */}
          <div className="card p-5">
            <h2 className="font-bold text-sm mb-3">تفاصيل الحملات الإعلانية ({month})</h2>
            <div tabIndex={0} role="region" aria-label="Campaigns" className="table-wrapper">
              <table className="erp-table">
                <thead>
                  <tr><th>المنصة</th><th>الحملة</th><th>الصرف</th><th>الطلبات</th><th>المبيعات</th><th>ROAS</th><th>CPA</th></tr>
                </thead>
                <tbody>
                  {report.adSpend.map((a) => (
                    <tr key={a.id}>
                      <td className="font-bold">{a.platform}</td>
                      <td>{a.campaignName || '-'}</td>
                      <td>{formatMoney(a.actualSpend)}</td>
                      <td>{a.orders}</td>
                      <td className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(a.revenueGenerated)}</td>
                      <td className="font-extrabold">{a.roas}x</td>
                      <td>{formatMoney(a.cpa)}</td>
                    </tr>
                  ))}
                  {report.adSpend.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-[var(--text-muted)]">لا توجد حملات مسجلة لهذا الشهر</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Delivered Tasks */}
            <div className="card p-5 space-y-3">
              <h2 className="font-bold text-sm">الأعمال المسلّمة ({report.deliveredTasks.length})</h2>
              {report.deliveredTasks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">لا توجد مهام مكتملة لهذا الشهر</p>
              ) : (
                report.deliveredTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-subtle)] text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t.title}</span>
                  </div>
                ))
              )}
            </div>

            {/* Testili Verdicts */}
            <div className="card p-5 space-y-3">
              <h2 className="font-bold text-sm">اختبارات المنتجات — Testili ({report.testili.length})</h2>
              {report.testili.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">لا توجد اختبارات منتجات</p>
              ) : (
                report.testili.map((ts) => (
                  <div key={ts.id} className="p-3 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold">{ts.productName}</p>
                      <p className="text-[var(--text-muted)]">{ts.platform} • ROAS {ts.actualRoas}x • CPA {formatMoney(ts.actualCpa)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[ts.verdict] || ''}`}>{ts.verdict}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
