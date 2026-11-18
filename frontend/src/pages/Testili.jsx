import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trophy, FlaskConical, ArrowUpRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { currentYearMonth, formatMoney, STATUS_COLORS } from '../lib/format';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';

export default function Testili() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ clientId: '', productName: '', productUrl: '', platform: 'META', testBudget: '', amountSpent: '', orders: '', revenue: '', targetCpa: '', targetRoas: '', status: 'RUNNING', verdict: 'PENDING', verdictNotes: '' });

  const { data } = useQuery({ queryKey: ['testili'], queryFn: () => gasCall('listTestili') });
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const tests = data?.tests || [];
  const clients = clientsRes?.clients || [];

  const winners = tests.filter((x) => x.verdict === 'WINNER').length;
  const winRate = tests.length ? Math.round((winners / tests.length) * 100) : 0;
  const totalSpent = tests.reduce((s, x) => s + Number(x.amountSpent || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    await gasCall('saveTestili', {
      ...form,
      clientId: form.clientId || clients[0]?.id,
      testBudget: Number(form.testBudget || 0),
      amountSpent: Number(form.amountSpent || 0),
      orders: Number(form.orders || 0),
      revenue: Number(form.revenue || 0),
      targetCpa: Number(form.targetCpa || 0),
      targetRoas: Number(form.targetRoas || 0)
    });
    toast.success('Test produit enregistré');
    setModalOpen(false);
    qc.invalidateQueries({ queryKey: ['testili'] });
  };

  const handlePush = async (id) => {
    await gasCall('pushTestiliToAdSpend', { id, month: currentYearMonth() });
    toast.success('تم تحويل الصرف إلى Ad Spend ✓');
    qc.invalidateQueries({ queryKey: ['testili'] });
    qc.invalidateQueries({ queryKey: ['adspend'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.testili')}</h1>
          <p className="text-xs text-[var(--text-muted)]">مختبر المنتجات الرابحة (Meta / TikTok) مع تحويل مباشر إلى Ad Spend</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs">
          <Plus className="w-4 h-4" /> اختبار منتج جديد
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="إجمالي الاختبارات" value={tests.length} icon={FlaskConical} tone="indigo" />
        <StatCard title="المنتجات الرابحة (Winners)" value={`${winners} (${winRate}%)`} icon={Trophy} tone="emerald" />
        <StatCard title="إجمالي صرف الاختبارات" value={formatMoney(totalSpent)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tests.map((ts) => (
          <div key={ts.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold">{ts.productName}</p>
                <p className="text-xs text-[var(--text-muted)]">{ts.clientName} • {ts.platform}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[ts.verdict] || ''}`}>{ts.verdict}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs p-3 rounded-xl bg-[var(--surface-subtle)]">
              <div><p className="text-[var(--text-muted)]">الصرف</p><p className="font-bold">{formatMoney(ts.amountSpent)}</p></div>
              <div><p className="text-[var(--text-muted)]">ROAS</p><p className="font-extrabold text-emerald-600 dark:text-emerald-400">{ts.actualRoas}x</p></div>
              <div><p className="text-[var(--text-muted)]">CPA</p><p className="font-bold">{formatMoney(ts.actualCpa)}</p></div>
            </div>

            {ts.verdictNotes && <p className="text-xs text-[var(--text-muted)]">{ts.verdictNotes}</p>}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
              {!ts.pushedToAdSpend ? (
                <button type="button" onClick={() => handlePush(ts.id)} className="text-indigo-500 font-bold flex items-center gap-1 hover:underline cursor-pointer">
                  <ArrowUpRight className="w-3.5 h-3.5" /> إرسال إلى AdSpend
                </button>
              ) : (
                <span className="text-emerald-600 font-bold">✓ في AdSpend</span>
              )}
              <button
                type="button"
                onClick={async () => { await gasCall('deleteTestili', { id: ts.id }); qc.invalidateQueries({ queryKey: ['testili'] }); }}
                className="text-rose-500 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="اختبار منتج جديد (Testili)">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">العميل</label>
              <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="input-field">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">اسم المنتج</label><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">المنصة</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="input-field">
                <option value="META">META</option>
                <option value="TIKTOK">TIKTOK</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">النتيجة (Verdict)</label>
              <select value={form.verdict} onChange={(e) => setForm({ ...form, verdict: e.target.value })} className="input-field">
                <option value="PENDING">PENDING</option>
                <option value="WINNER">WINNER 🏆</option>
                <option value="LOSER">LOSER ❌</option>
                <option value="NEEDS_MORE_DATA">NEEDS_MORE_DATA</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">ميزانية الاختبار</label><input type="number" value={form.testBudget} onChange={(e) => setForm({ ...form, testBudget: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">المصروف الفعلي</label><input type="number" value={form.amountSpent} onChange={(e) => setForm({ ...form, amountSpent: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الطلبات</label><input type="number" value={form.orders} onChange={(e) => setForm({ ...form, orders: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">المبيعات (Revenue)</label><input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">ملاحظات القرار</label><textarea rows={2} value={form.verdictNotes} onChange={(e) => setForm({ ...form, verdictNotes: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
