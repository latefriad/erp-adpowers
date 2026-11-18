import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { formatMoney, STATUS_COLORS, todayIso } from '../lib/format';
import Modal from '../components/Modal';

export default function Suppliers() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [supModal, setSupModal] = useState(false);
  const [billModal, setBillModal] = useState(false);
  const [supForm, setSupForm] = useState({ name: '', category: 'MATERIEL', email: '', phone: '', notes: '' });
  const [billForm, setBillForm] = useState({ supplierId: '', description: '', category: 'MATERIEL', amount: '', currency: 'DZD', dueDate: todayIso() });

  const { data } = useQuery({ queryKey: ['suppliers'], queryFn: () => gasCall('listSuppliers') });
  const suppliers = data?.suppliers || [];
  const bills = data?.bills || [];

  const handleSaveSup = async (e) => {
    e.preventDefault();
    await gasCall('saveSupplier', supForm);
    toast.success('Fournisseur ajouté');
    setSupModal(false);
    setSupForm({ name: '', category: 'MATERIEL', email: '', phone: '', notes: '' });
    qc.invalidateQueries({ queryKey: ['suppliers'] });
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    await gasCall('saveSupplierBill', { ...billForm, supplierId: billForm.supplierId || suppliers[0]?.id, amount: Number(billForm.amount) });
    toast.success('Facture fournisseur enregistrée');
    setBillModal(false);
    qc.invalidateQueries({ queryKey: ['suppliers'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handlePayBill = async (id) => {
    try {
      await gasCall('paySupplierBill', { id });
      toast.success('تم الدفع وإنشاء المصروف تلقائياً في Expenses ✓');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.suppliers')}</h1>
          <p className="text-xs text-[var(--text-muted)]">دفع فاتورة المورد يُسجّل مصروفاً تلقائياً بدون تكرار</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSupModal(true)} className="btn-secondary text-xs"><Plus className="w-4 h-4" /> مورد جديد</button>
          <button type="button" onClick={() => setBillModal(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> فاتورة مورد</button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-sm mb-3">فواتير الموردين ({bills.length})</h2>
        <div tabIndex={0} role="region" aria-label="Supplier bills" className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr><th>المورد</th><th>الوصف</th><th>الفئة</th><th>الاستحقاق</th><th>المبلغ</th><th>الحالة</th><th>إجراء</th></tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="font-bold">{b.supplierName}</td>
                  <td>{b.description}</td>
                  <td className="text-xs">{b.category}</td>
                  <td>{b.dueDate}</td>
                  <td className="font-extrabold">{formatMoney(b.amountDzd)}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      {b.status === 'A_PAYER' && (
                        <button type="button" onClick={() => handlePayBill(b.id)} className="btn-primary py-1 px-2.5 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> دفع الآن
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => { await gasCall('deleteSupplierBill', { id: b.id }); qc.invalidateQueries({ queryKey: ['suppliers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); }}
                        className="text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="card p-4 space-y-1">
            <div className="flex justify-between items-start">
              <p className="font-bold">{s.name}</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] font-bold">{s.category}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{s.email} • {s.phone}</p>
            {s.notes && <p className="text-xs text-[var(--text-muted)]">{s.notes}</p>}
          </div>
        ))}
      </div>

      <Modal open={supModal} onClose={() => setSupModal(false)} title="إضافة مورد جديد">
        <form onSubmit={handleSaveSup} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">اسم المورد</label><input required value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الفئة</label><input value={supForm.category} onChange={(e) => setSupForm({ ...supForm, category: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الإيميل</label><input type="email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الهاتف</label><input value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} className="input-field" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSupModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal open={billModal} onClose={() => setBillModal(false)} title="إضافة فاتورة مورد (Payable)">
        <form onSubmit={handleSaveBill} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">المورد</label>
              <select required value={billForm.supplierId} onChange={(e) => setBillForm({ ...billForm, supplierId: e.target.value })} className="input-field">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">تاريخ الاستحقاق</label><input type="date" required value={billForm.dueDate} onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">المبلغ (DZD)</label><input type="number" required value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">فئة المصروف</label>
              <select value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} className="input-field">
                {['SALAIRES', 'LOYER', 'ADS', 'ABONNEMENTS', 'MATERIEL', 'IMPOTS', 'TRANSPORT', 'AUTRE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">الوصف</label><input required value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBillModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
