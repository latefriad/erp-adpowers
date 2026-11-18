import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload, ExternalLink, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { currentYearMonth, formatMoney, todayIso } from '../lib/format';
import Modal from '../components/Modal';

const CATEGORIES = ['SALAIRES', 'LOYER', 'ADS', 'ABONNEMENTS', 'MATERIEL', 'IMPOTS', 'TRANSPORT', 'AUTRE'];

export default function Expenses() {
  const { t } = useLanguage();
  const { settings } = useAuth();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState({ date: todayIso(), category: 'ADS', description: '', amount: '', currency: 'DZD', exchangeRate: 1, notes: '', receiptBase64: '', receiptFileName: '', receiptMimeType: '' });
  const [budgetForm, setBudgetForm] = useState({ month: currentYearMonth(), revenueTarget: '', expenseBudgets: {} });

  const { data } = useQuery({ queryKey: ['expenses'], queryFn: () => gasCall('listExpenses') });
  const expenses = (data?.expenses || []).filter((e) => !filterCat || e.category === filterCat);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, receiptBase64: reader.result, receiptFileName: file.name, receiptMimeType: file.type }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await gasCall('saveExpense', { ...form, amount: Number(form.amount), exchangeRate: Number(form.exchangeRate || 1) });
      toast.success('Dépense enregistrée');
      setModalOpen(false);
      setForm({ date: todayIso(), category: 'ADS', description: '', amount: '', currency: 'DZD', exchangeRate: 1, notes: '', receiptBase64: '', receiptFileName: '', receiptMimeType: '' });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['benefits'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    await gasCall('saveBudgetGoal', {
      year: Number(budgetForm.month.slice(0, 4)),
      month: Number(budgetForm.month.slice(5, 7)),
      revenueTarget: Number(budgetForm.revenueTarget || 0),
      expenseBudgets: budgetForm.expenseBudgets
    });
    toast.success('Budget mensuel mis à jour');
    setBudgetOpen(false);
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const totalDzd = expenses.reduce((s, e) => s + Number(e.amountDzd || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.expenses')}</h1>
          <p className="text-xs text-[var(--text-muted)]">الإجمالي المعروض: {formatMoney(totalDzd)} • رفع الوصلات تلقائياً إلى Google Drive</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input-field w-auto text-xs">
            <option value="">كل الفئات</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={() => setBudgetOpen(true)} className="btn-secondary text-xs">
            <Target className="w-3.5 h-3.5" /> الميزانية الشهرية
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs">
            <Plus className="w-4 h-4" /> مصروف جديد
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div tabIndex={0} role="region" aria-label="Expenses table" className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr><th>{t('common.date')}</th><th>الفئة</th><th>الوصف</th><th>المبلغ</th><th>بالدينار (DZD)</th><th>الوصل (Drive)</th><th></th></tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--surface-subtle)]">{exp.category}</span></td>
                  <td className="font-semibold">{exp.description}</td>
                  <td>{formatMoney(exp.amount, exp.currency)}</td>
                  <td className="font-extrabold text-rose-500">{formatMoney(exp.amountDzd)}</td>
                  <td>
                    {exp.receiptUrl ? (
                      <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 font-bold inline-flex items-center gap-1 hover:underline">
                        Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={async () => { if (confirm(t('common.confirmDelete'))) { await gasCall('deleteExpense', { id: exp.id }); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['benefits'] }); } }}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مصروف جديد">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">التاريخ</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">الفئة</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">المبلغ</label><input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => {
                  const cur = e.target.value;
                  const rate = cur === 'EUR' ? (settings.eurRate || 245) : cur === 'USD' ? (settings.usdRate || 225) : 1;
                  setForm({ ...form, currency: cur, exchangeRate: rate });
                }}
                className="input-field"
              >
                <option value="DZD">DZD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">الوصف</label><input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
          <div>
            <label className="block text-xs font-semibold mb-1 flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> رفع الوصل إلى Google Drive (PDF / صورة)</label>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="input-field text-xs" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="تحديد الميزانية الشهرية وسقف المصاريف">
        <form onSubmit={handleSaveBudget} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">الشهر</label><input type="month" value={budgetForm.month} onChange={(e) => setBudgetForm({ ...budgetForm, month: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">هدف الإيرادات (DZD)</label><input type="number" value={budgetForm.revenueTarget} onChange={(e) => setBudgetForm({ ...budgetForm, revenueTarget: e.target.value })} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <div key={c}>
                <label className="block text-[11px] font-semibold mb-0.5">{c}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={budgetForm.expenseBudgets[c] || ''}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, expenseBudgets: { ...p.expenseBudgets, [c]: Number(e.target.value || 0) } }))}
                  className="input-field py-1.5 text-xs"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBudgetOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
