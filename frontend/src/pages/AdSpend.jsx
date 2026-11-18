import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, TrendingUp, DollarSign, ShoppingBag, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { currentYearMonth, exportToCsv, formatMoney } from '../lib/format';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';

const PLATFORMS = ['META', 'TIKTOK', 'GOOGLE', 'OTHER'];

export default function AdSpend() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [filterMonth, setFilterMonth] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ clientId: '', month: currentYearMonth(), platform: 'META', campaignName: '', clientAdBudget: '', actualSpend: '', amountBilled: '', orders: '', revenueGenerated: '', notes: '' });

  const { data } = useQuery({ queryKey: ['adspend'], queryFn: () => gasCall('listAdSpend') });
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const clients = clientsRes?.clients || [];

  const rows = (data?.adSpend || []).filter((r) =>
    (!filterMonth || r.month === filterMonth) && (!filterPlatform || r.platform === filterPlatform)
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.spend += Number(r.actualSpend || 0);
      acc.billed += Number(r.amountBilled || 0);
      acc.orders += Number(r.orders || 0);
      acc.revenue += Number(r.revenueGenerated || 0);
      return acc;
    },
    { spend: 0, billed: 0, orders: 0, revenue: 0 }
  );
  const margin = totals.billed - totals.spend;
  const avgRoas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00';
  const avgCpa = totals.orders > 0 ? Math.round(totals.spend / totals.orders) : 0;

  const canWrite = user?.role === 'ADMIN' || user?.role === 'MEDIA_BUYER';

  const handleSave = async (e) => {
    e.preventDefault();
    await gasCall('saveAdSpend', {
      ...form,
      clientId: form.clientId || clients[0]?.id,
      clientAdBudget: Number(form.clientAdBudget || 0),
      actualSpend: Number(form.actualSpend || 0),
      amountBilled: Number(form.amountBilled || 0),
      orders: Number(form.orders || 0),
      revenueGenerated: Number(form.revenueGenerated || 0)
    });
    toast.success('Campagne enregistrée');
    setModalOpen(false);
    qc.invalidateQueries({ queryKey: ['adspend'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.adspend')}</h1>
          <p className="text-xs text-[var(--text-muted)]">تتبع صرف الإعلانات، الـ ROAS، الـ CPA وهامش الوكالة لكل عميل ومنصة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="input-field w-auto text-xs" />
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="input-field w-auto text-xs">
            <option value="">كل المنصات</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            type="button"
            onClick={() => exportToCsv('Adpowrs_AdSpend', [
              { label: 'Month', key: 'month' }, { label: 'Client', key: 'clientName' }, { label: 'Platform', key: 'platform' },
              { label: 'Campaign', key: 'campaignName' }, { label: 'Spend', key: 'actualSpend' }, { label: 'Billed', key: 'amountBilled' },
              { label: 'Margin', key: 'agencyMargin' }, { label: 'Orders', key: 'orders' }, { label: 'Revenue', key: 'revenueGenerated' },
              { label: 'ROAS', key: 'roas' }, { label: 'CPA', key: 'cpa' }
            ], rows)}
            className="btn-secondary text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          {canWrite && (
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs">
              <Plus className="w-4 h-4" /> حملة جديدة
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الصرف (Spend)" value={formatMoney(totals.spend)} subtitle={`المفوتر: ${formatMoney(totals.billed)}`} icon={DollarSign} tone="indigo" />
        <StatCard title="هامش الوكالة (Margin)" value={formatMoney(margin)} icon={Percent} tone={margin >= 0 ? 'emerald' : 'rose'} />
        <StatCard title="المبيعات المحققة" value={formatMoney(totals.revenue)} subtitle={`${totals.orders} طلب`} icon={ShoppingBag} tone="sky" />
        <StatCard title="متوسط ROAS / CPA" value={`${avgRoas}x`} subtitle={`CPA: ${formatMoney(avgCpa)}`} icon={TrendingUp} tone="amber" />
      </div>

      <div className="card p-4">
        <div tabIndex={0} role="region" aria-label="Ad Spend records" className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr><th>الشهر</th><th>العميل</th><th>المنصة / الحملة</th><th>الصرف</th><th>المفوتر</th><th>الهامش</th><th>الطلبات</th><th>المبيعات</th><th>ROAS</th><th>CPA</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-bold">{r.month}</td>
                  <td className="font-semibold">{r.clientName}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/15 text-indigo-500 me-1.5">{r.platform}</span>
                    <span className="text-xs">{r.campaignName}</span>
                  </td>
                  <td>{formatMoney(r.actualSpend)}</td>
                  <td>{formatMoney(r.amountBilled)}</td>
                  <td className={`font-bold ${r.agencyMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{formatMoney(r.agencyMargin)}</td>
                  <td>{r.orders}</td>
                  <td className="font-bold">{formatMoney(r.revenueGenerated)}</td>
                  <td className="font-extrabold text-sky-500">{r.roas}x</td>
                  <td>{formatMoney(r.cpa)}</td>
                  <td>
                    {canWrite && (
                      <button type="button" onClick={async () => { await gasCall('deleteAdSpend', { id: r.id }); qc.invalidateQueries({ queryKey: ['adspend'] }); }} className="text-rose-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تسجيل حملة إعلانية (Ad Spend)">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">العميل</label>
              <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="input-field">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">الشهر</label><input type="month" required value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">المنصة</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="input-field">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">اسم الحملة</label><input value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">ميزانية العميل (Budget)</label><input type="number" value={form.clientAdBudget} onChange={(e) => setForm({ ...form, clientAdBudget: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الصرف الفعلي (Spend)</label><input type="number" required value={form.actualSpend} onChange={(e) => setForm({ ...form, actualSpend: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">المبلغ المفوتر للعميل (Billed)</label><input type="number" required value={form.amountBilled} onChange={(e) => setForm({ ...form, amountBilled: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">عدد الطلبات (Orders)</label><input type="number" value={form.orders} onChange={(e) => setForm({ ...form, orders: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">المبيعات المحققة (Revenue DZD)</label><input type="number" value={form.revenueGenerated} onChange={(e) => setForm({ ...form, revenueGenerated: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
