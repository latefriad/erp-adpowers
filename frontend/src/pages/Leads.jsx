import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageCircle, UserCheck, LayoutGrid, Table as TableIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { buildWhatsAppUrl, formatMoney, todayIso } from '../lib/format';
import Modal from '../components/Modal';

const STAGES = [
  { key: 'NEW', label: 'جديد / New', color: 'border-t-sky-500' },
  { key: 'CONTACTED', label: 'تم التواصل / Contacted', color: 'border-t-indigo-500' },
  { key: 'QUOTE_SENT', label: 'عرض سعر / Quote Sent', color: 'border-t-violet-500' },
  { key: 'NEGOTIATION', label: 'تفاوض / Negotiation', color: 'border-t-amber-500' },
  { key: 'WON', label: 'فوز / Won', color: 'border-t-emerald-500' },
  { key: 'LOST', label: 'خسارة / Lost', color: 'border-t-rose-500' }
];

const SOURCES = ['WHATSAPP', 'ADS', 'FORM', 'CHATBOT', 'REFERRAL', 'OTHER'];

export default function Leads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [view, setView] = useState('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', source: 'WHATSAPP', stage: 'NEW', estimatedValue: '', followUpDate: todayIso(), note: '' });

  const { data } = useQuery({ queryKey: ['leads'], queryFn: () => gasCall('listLeads') });
  const leads = data?.leads || [];

  const today = todayIso();
  const wonCount = leads.filter((l) => l.stage === 'WON').length;
  const convRate = leads.length ? Math.round((wonCount / leads.length) * 100) : 0;
  const pipelineVal = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((s, l) => s + Number(l.estimatedValue || 0), 0);
  const overdueFollowUps = leads.filter((l) => !['WON', 'LOST'].includes(l.stage) && l.followUpDate && l.followUpDate < today).length;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await gasCall('saveLead', { ...form, estimatedValue: Number(form.estimatedValue || 0) });
      toast.success('Lead enregistré');
      setModalOpen(false);
      setForm({ name: '', company: '', phone: '', email: '', source: 'WHATSAPP', stage: 'NEW', estimatedValue: '', followUpDate: todayIso(), note: '' });
      qc.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const moveStage = async (leadId, stage) => {
    // Optimistic UI update
    qc.setQueryData(['leads'], (old) => ({
      ...old,
      leads: (old?.leads || []).map((l) => (l.id === leadId ? { ...l, stage } : l))
    }));
    try {
      await gasCall('saveLead', { id: leadId, stage });
    } catch (err) {
      toast.error(err.message);
      qc.invalidateQueries({ queryKey: ['leads'] });
    }
  };

  const handleConvert = async (id) => {
    try {
      await gasCall('convertLeadToClient', { id });
      toast.success('تم تحويل الـ Lead إلى عميل بنجاح!');
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await gasCall('deleteLead', { id });
    qc.invalidateQueries({ queryKey: ['leads'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.leads')}</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Pipeline: {formatMoney(pipelineVal)} • التحويل: {convRate}% ({wonCount}/{leads.length}) • متابعات متأخرة: {overdueFollowUps}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[var(--border-subtle)] p-0.5 bg-[var(--surface-card)]">
            <button type="button" onClick={() => setView('kanban')} className={`p-1.5 rounded-lg cursor-pointer ${view === 'kanban' ? 'bg-[var(--brand-primary)] text-white' : ''}`}><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" onClick={() => setView('table')} className={`p-1.5 rounded-lg cursor-pointer ${view === 'table' ? 'bg-[var(--brand-primary)] text-white' : ''}`}><TableIcon className="w-4 h-4" /></button>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs">
            <Plus className="w-4 h-4" /> Lead جديد
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          {STAGES.map((st) => {
            const colLeads = leads.filter((l) => l.stage === st.key);
            return (
              <div
                key={st.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (draggingId) moveStage(draggingId, st.key); setDraggingId(null); }}
                className={`card p-3 border-t-4 ${st.color} min-h-[360px] flex flex-col gap-2.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">{st.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--surface-subtle)] font-bold">{colLeads.length}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {colLeads.map((lead) => {
                    const isOverdue = !['WON', 'LOST'].includes(lead.stage) && lead.followUpDate && lead.followUpDate < today;
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggingId(lead.id)}
                        className="p-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--border-subtle)] space-y-2 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{lead.company || lead.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">{lead.name}</p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 shrink-0">{lead.source}</span>
                        </div>
                        <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(lead.estimatedValue, lead.currency)}
                        </p>
                        {lead.followUpDate && (
                          <p className={`text-[11px] ${isOverdue ? 'text-rose-500 font-bold' : 'text-[var(--text-muted)]'}`}>
                            متابعة: {lead.followUpDate} {isOverdue ? '⚠️' : ''}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                          <a
                            href={buildWhatsAppUrl(lead.phone, `السلام عليكم ${lead.name}، معك فريق Adpowrs Digital بخصوص مشروعكم.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline text-[11px] font-bold flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WA
                          </a>
                          {!lead.convertedClientId && (
                            <button
                              type="button"
                              onClick={() => handleConvert(lead.id)}
                              title="Convert to Client"
                              className="text-indigo-500 hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> عميل
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-4">
          <div tabIndex={0} role="region" aria-label="Leads table" className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>العميل المحتمل</th>
                  <th>المصدر</th>
                  <th>المرحلة</th>
                  <th>القيمة</th>
                  <th>تاريخ المتابعة</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <p className="font-bold">{l.company || l.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{l.name} • {l.phone}</p>
                    </td>
                    <td><span className="text-xs font-bold">{l.source}</span></td>
                    <td>
                      <select value={l.stage} onChange={(e) => moveStage(l.id, e.target.value)} className="input-field py-1 text-xs w-auto">
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="font-bold">{formatMoney(l.estimatedValue, l.currency)}</td>
                    <td>{l.followUpDate || '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {!l.convertedClientId && (
                          <button type="button" onClick={() => handleConvert(l.id)} className="btn-secondary py-1 px-2 text-xs">تحويل لعميل</button>
                        )}
                        <button type="button" onClick={() => handleDelete(l.id)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة عميل محتمل (Lead)">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">الاسم</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الشركة / البراند</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الهاتف</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="0550..." /></div>
            <div><label className="block text-xs font-semibold mb-1">الإيميل</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">المصدر</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="input-field">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">القيمة المتوقعة (DZD)</label><input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">تاريخ المتابعة</label><input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="input-field" /></div>
          <div><label className="block text-xs font-semibold mb-1">ملاحظة</label><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
