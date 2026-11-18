import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Copy, ExternalLink, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { formatMoney, STATUS_COLORS } from '../lib/format';
import StatCard from '../components/StatCard';

export default function ClientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('timeline');
  const [noteText, setNoteText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['client-detail', id],
    queryFn: () => gasCall('getClientDetail', { id })
  });

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await gasCall('saveClient', { id, newNote: noteText.trim() });
    setNoteText('');
    toast.success('تمت إضافة الملاحظة');
    qc.invalidateQueries({ queryKey: ['client-detail', id] });
  };

  if (isLoading || !data) return <div className="p-10 text-center text-[var(--text-muted)]">...</div>;

  const { client, financials, invoices, tasks, timeline } = data;
  const portalUrl = `${window.location.origin}/portal/${client.portalToken}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/clients" className="p-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]">
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold">{client.company || client.name}</h1>
            <p className="text-xs text-[var(--text-muted)]">{client.name} • {client.email} • {client.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('تم نسخ رابط بوابة العميل'); }}
            className="btn-secondary text-xs"
          >
            <Copy className="w-3.5 h-3.5" /> نسخ رابط البوابة
          </button>
          <a href={portalUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> فتح البوابة
          </a>
        </div>
      </div>

      {financials && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="إجمالي الفوترة" value={formatMoney(financials.totalInvoiced)} tone="sky" />
          <StatCard title="المدفوع" value={formatMoney(financials.totalPaid)} tone="emerald" />
          <StatCard title="المتبقي" value={formatMoney(financials.totalRemaining)} tone="amber" />
          <StatCard title="المتأخر" value={formatMoney(financials.totalOverdue)} tone="rose" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-2">
        {[
          { key: 'timeline', label: `السجل الزمني (${timeline.length})` },
          { key: 'invoices', label: `الفواتير (${invoices.length})` },
          { key: 'tasks', label: `المهام (${tasks.length})` },
          { key: 'notes', label: `الملاحظات (${(client.notes || []).length})` }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              tab === item.key ? 'bg-[var(--brand-primary)] text-white' : 'hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'timeline' && (
        <div className="card p-5 space-y-3">
          {timeline.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">لا توجد أحداث مسجلة بعد.</p>
          ) : (
            timeline.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] text-xs">
                <div>
                  <span className="font-bold text-indigo-500">{a.action}</span>
                  <p className="font-semibold mt-0.5">{a.summary}</p>
                  <p className="text-[var(--text-muted)] mt-0.5">{a.actorName}</p>
                </div>
                <span className="text-[var(--text-muted)] shrink-0">{String(a.createdAt).slice(0, 10)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="card p-5">
          <div tabIndex={0} role="region" aria-label="Client invoices" className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>#</th><th>النوع</th><th>التاريخ</th><th>المجموع</th><th>المتبقي</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-bold">{inv.number || 'DRAFT'}</td>
                    <td>{inv.docType}</td>
                    <td>{inv.issueDate}</td>
                    <td className="font-bold">{formatMoney(inv.total, inv.currency)}</td>
                    <td>{formatMoney(inv.remaining, inv.currency)}</td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[inv.displayStatus] || ''}`}>{inv.displayStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card p-5 space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="p-3 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
              <div>
                <p className="font-bold">{t.title}</p>
                <p className="text-[var(--text-muted)]">{t.description}</p>
              </div>
              <span className="px-2 py-1 rounded-lg bg-[var(--surface-card)] font-bold">{t.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="card p-5 space-y-4">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="أضف ملاحظة داخلية حول العميل..."
              className="input-field"
            />
            <button type="submit" className="btn-primary shrink-0"><Send className="w-4 h-4" /></button>
          </form>
          <div className="space-y-2">
            {(client.notes || []).map((n) => (
              <div key={n.id || n.createdAt} className="p-3 rounded-xl bg-[var(--surface-subtle)] text-xs">
                <p className="font-semibold">{n.text}</p>
                <p className="text-[var(--text-muted)] mt-1">{n.author} • {String(n.createdAt).slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
