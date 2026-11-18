import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, Trash2, ArrowUpRight, ArrowDownRight, HandCoins } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { formatLocalYmd, formatMoney, todayIso } from '../lib/format';
import StatCard from '../components/StatCard';
import { MultiBarChart } from '../components/Charts';
import Modal from '../components/Modal';

export default function Benefits() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [range, setRange] = useState('month');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ date: todayIso(), type: 'WITHDRAWAL', category: 'PERSONAL', description: '', amountDzd: '', notes: '' });

  const bounds = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (range === 'today') return { startDate: todayIso(), endDate: todayIso() };
    if (range === 'year') return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    if (range === 'all') return { startDate: '', endDate: '' };
    return {
      startDate: formatLocalYmd(y, m, 1),
      endDate: formatLocalYmd(y, m + 1, 0)
    };
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['benefits', bounds.startDate, bounds.endDate],
    queryFn: () => gasCall('getBenefits', bounds)
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await gasCall('saveBenefitTx', { ...form, amountDzd: Number(form.amountDzd) });
      toast.success('Opération enregistrée');
      setModalOpen(false);
      setForm({ date: todayIso(), type: 'WITHDRAWAL', category: 'PERSONAL', description: '', amountDzd: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['benefits'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await gasCall('deleteBenefitTx', { id });
    toast.success('Supprimé');
    qc.invalidateQueries({ queryKey: ['benefits'] });
  };

  if (isLoading || !data) return <div className="p-10 text-center text-[var(--text-muted)]">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.benefits')} (Mes Bénéfices)</h1>
          <p className="text-xs text-[var(--text-muted)]">دفتر الأرباح الموحد: دفعات العملاء + مصاريف الوكالة + سحوباتك الشخصية</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="input-field w-auto text-xs font-semibold">
            <option value="today">اليوم / Aujourd&apos;hui</option>
            <option value="month">هذا الشهر / Ce mois</option>
            <option value="year">هذه السنة / Cette année</option>
            <option value="all">الكل / Tout</option>
          </select>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            <span>عملية / سحب شخصي</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="الرصيد المتاح الفعلي (Available)" value={formatMoney(data.availableBalance)} icon={Wallet} tone="indigo" />
        <StatCard title="مداخيل الفترة (Revenues)" value={formatMoney(data.period.revenue)} icon={ArrowUpRight} tone="emerald" />
        <StatCard title="مصاريف الفترة (Expenses)" value={formatMoney(data.period.expense)} icon={ArrowDownRight} tone="rose" />
        <StatCard title="السحوبات الشخصية (Withdrawals)" value={formatMoney(data.period.withdrawal)} icon={HandCoins} tone="amber" />
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-sm mb-4">تطور 6 أشهر (المداخيل vs المصاريف vs السحوبات)</h2>
        <MultiBarChart
          data={data.monthlySeries}
          series={[
            { key: 'revenue', label: 'Revenues', colorClass: 'bg-emerald-500' },
            { key: 'expense', label: 'Expenses', colorClass: 'bg-rose-500' },
            { key: 'withdrawal', label: 'Withdrawals', colorClass: 'bg-amber-500' }
          ]}
        />
      </div>

      <div className="card p-5">
        <div tabIndex={0} role="region" aria-label="Benefits ledger" className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{t('common.date')}</th>
                <th>النوع</th>
                <th>الفئة</th>
                <th>الوصف</th>
                <th>المصدر</th>
                <th>{t('common.amount')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      tx.type === 'REVENUE'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'WITHDRAWAL'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="text-xs">{tx.category}</td>
                  <td className="font-semibold">{tx.description}</td>
                  <td className="text-xs text-[var(--text-muted)]">{tx.source}</td>
                  <td className="font-extrabold">{formatMoney(tx.amountDzd)}</td>
                  <td>
                    {!tx.readOnly && (
                      <button type="button" onClick={() => handleDelete(tx.id)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة عملية شخصية / سحب">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="WITHDRAWAL">WITHDRAWAL (سحب شخصي)</option>
                <option value="REVENUE">REVENUE (مدخول إضافي)</option>
                <option value="EXPENSE">EXPENSE (مصروف)</option>
                <option value="TRANSFER">TRANSFER (تحويل)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">التاريخ</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">الفئة</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                <option value="PERSONAL">شخصي / Personnel</option>
                <option value="FAMILY">عائلة / Famille</option>
                <option value="FOOD">طعام / Food</option>
                <option value="TRANSPORT">تنقل / Transport</option>
                <option value="SHOPPING">مشتريات / Shopping</option>
                <option value="OTHER">أخرى / Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">المبلغ (DZD)</label>
              <input type="number" required value={form.amountDzd} onChange={(e) => setForm({ ...form, amountDzd: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">الوصف</label>
            <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
