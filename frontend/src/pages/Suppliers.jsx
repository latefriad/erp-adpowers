import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Trash2, CreditCard, Banknote, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { formatMoney, STATUS_COLORS, todayIso } from '../lib/format';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

export default function Suppliers() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [supModal, setSupModal] = useState(false);
  const [billModal, setBillModal] = useState(false);
  const [versementModal, setVersementModal] = useState(null);

  const [supForm, setSupForm] = useState({ name: '', category: 'MATERIEL', email: '', phone: '', notes: '' });
  const [billForm, setBillForm] = useState({ supplierId: '', description: '', category: 'MATERIEL', amount: '', currency: 'DZD', dueDate: todayIso() });
  const [versementForm, setVersementForm] = useState({ amount: '', date: todayIso(), method: 'VIREMENT', notes: '' });

  const { data } = useQuery({ queryKey: ['suppliers'], queryFn: () => gasCall('listSuppliers') });
  const suppliers = data?.suppliers || [];
  const bills = data?.bills || [];

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['suppliers'] });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['benefits'] });
  };

  // Live KPI totals for Supplier Bills
  const sumTotalBills = bills.reduce((s, b) => s + Number(b.totalAmount || b.amountDzd || b.amount || 0), 0);
  const sumPaidBills = bills.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
  const sumRemainingBills = bills.reduce((s, b) => s + Math.max(0, Number(b.remainingAmount !== undefined ? b.remainingAmount : (b.amountDzd || b.amount || 0) - (b.paidAmount || 0))), 0);

  const handleSaveSup = async (e) => {
    e.preventDefault();
    try {
      await gasCall('saveSupplier', supForm);
      toast.success('تمت إضافة المورد بنجاح ✓');
      setSupModal(false);
      setSupForm({ name: '', category: 'MATERIEL', email: '', phone: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    try {
      await gasCall('saveSupplierBill', {
        ...billForm,
        supplierId: billForm.supplierId || suppliers[0]?.id || '',
        amount: Number(billForm.amount)
      });
      toast.success('تم تسجيل فاتورة المورد بنجاح ✓');
      setBillModal(false);
      setBillForm({ supplierId: '', description: '', category: 'MATERIEL', amount: '', currency: 'DZD', dueDate: todayIso() });
      invalidateAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openVersementModal = (bill) => {
    const remaining = Number(bill.remainingAmount !== undefined ? bill.remainingAmount : (bill.amountDzd || bill.amount) - (bill.paidAmount || 0));
    setVersementModal(bill);
    setVersementForm({
      amount: String(remaining > 0 ? remaining : 0),
      date: todayIso(),
      method: 'VIREMENT',
      notes: ''
    });
  };

  const handleVersementSubmit = async (e) => {
    e.preventDefault();
    if (!versementModal) return;
    try {
      const payAmount = Number(versementForm.amount);
      if (!payAmount || payAmount <= 0) {
        toast.error('يرجى إدخال مبلغ دفع صالح');
        return;
      }
      await gasCall('recordSupplierBillPayment', {
        billId: versementModal.id,
        amount: payAmount,
        date: versementForm.date,
        method: versementForm.method,
        notes: versementForm.notes
      });
      toast.success('تم تسجيل الدفعة (Versement) وإدراج المصروف وتحديث الخزينة ✓');
      setVersementModal(null);
      invalidateAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteBill = async (id) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await gasCall('deleteSupplierBill', { id });
      toast.success('تم حذف فاتورة المورد وتحديث الحسابات ✓');
      invalidateAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteSup = async (id) => {
    if (!confirm('هل تريد حذف هذا المورد؟')) return;
    try {
      await gasCall('deleteSupplier', { id });
      toast.success('تم حذف المورد ✓');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.suppliers')}</h1>
          <p className="text-xs text-[var(--text-muted)]">إدارة فواتير الموردين • تسديد دفعات (كامل المبلغ أو النصف أو مخصص) • ربط تلقائي بالخزينة والمصاريف</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSupModal(true)} className="btn-secondary text-xs">
            <Plus className="w-4 h-4" /> مورد جديد
          </button>
          <button type="button" onClick={() => setBillModal(true)} className="btn-primary text-xs">
            <Plus className="w-4 h-4" /> فاتورة مورد (Payable)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="إجمالي فواتير الموردين (DZD)" value={formatMoney(sumTotalBills)} subtitle={`${bills.length} فاتورة مسجلة`} tone="sky" />
        <StatCard title="المسدّد للموردين (DZD)" value={formatMoney(sumPaidBills)} tone="emerald" />
        <StatCard title="المتبقي الواجب دفعه (DZD)" value={formatMoney(sumRemainingBills)} tone="amber" />
      </div>

      {/* Supplier Bills Table */}
      <div className="card p-5">
        <h2 className="font-bold text-sm mb-3">فواتير ومستحقات الموردين ({bills.length})</h2>
        <div tabIndex={0} role="region" aria-label="Supplier bills" className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr>
                <th>المورد</th>
                <th>الوصف</th>
                <th>الفئة</th>
                <th>الاستحقاق</th>
                <th>المبلغ الإجمالي</th>
                <th>المسدّد / المتبقي</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => {
                const total = Number(b.totalAmount || b.amountDzd || b.amount || 0);
                const paid = Number(b.paidAmount || 0);
                const remaining = Number(b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, total - paid));
                const isPaid = b.status === 'PAYEE' || remaining <= 0.01;

                return (
                  <tr key={b.id}>
                    <td className="font-bold text-sm">{b.supplierName || 'مورد غير محدد'}</td>
                    <td>{b.description}</td>
                    <td><span className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] font-semibold">{b.category}</span></td>
                    <td className="text-xs">{b.dueDate}</td>
                    <td className="font-extrabold">{formatMoney(total)}</td>
                    <td className="text-xs">
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(paid)}</p>
                      {remaining > 0 && <p className="text-rose-500 font-semibold">-{formatMoney(remaining)}</p>}
                    </td>
                    <td>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[b.status] || ''}`}>
                        {b.status === 'PAYEE' ? 'مدفوعة بالكامل' : b.status === 'PARTIELLE' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => openVersementModal(b)}
                            title="تسجيل دفعة للمورد (كامل المبلغ أو جزء منه)"
                            className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>تسجيل دفعة (Versement)</span>
                          </button>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-1">
                            <CheckCircle2 className="w-4 h-4" /> مسددة
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBill(b.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {bills.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-xs text-[var(--text-muted)] py-8">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suppliers Directory Cards */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm">دليل الموردين الشركاء ({suppliers.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="card p-4 space-y-2 relative group">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-base">{s.name}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] font-bold text-[var(--brand-primary)]">
                    {s.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSup(s.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{s.email || 'بدون إيميل'} • {s.phone || 'بدون هاتف'}</p>
              {s.notes && <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-subtle)] p-2 rounded-lg">{s.notes}</p>}
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="card p-6 text-center text-xs text-[var(--text-muted)] col-span-full">
              لا يوجد موردين مضافين بعد. اضغط على "+ مورد جديد" لإضافة أول شريك.
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Supplier */}
      <Modal open={supModal} onClose={() => setSupModal(false)} title="إضافة مورد جديد">
        <form onSubmit={handleSaveSup} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">اسم المورد أو الشركة</label>
              <input required value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} className="input-field" placeholder="مثال: Google Ads / مطبعة النور" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">فئة المورد</label>
              <select value={supForm.category} onChange={(e) => setSupForm({ ...supForm, category: e.target.value })} className="input-field">
                {['ADS', 'MATERIEL', 'ABONNEMENTS', 'LOYER', 'SALAIRES', 'TRANSPORT', 'AUTRE'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">البريد الإلكتروني</label>
              <input type="email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} className="input-field" placeholder="contact@supplier.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">رقم الهاتف</label>
              <input value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} className="input-field" placeholder="0550 00 00 00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">ملاحظات إضافية</label>
            <textarea rows={2} value={supForm.notes} onChange={(e) => setSupForm({ ...supForm, notes: e.target.value })} className="input-field" placeholder="شروط الدفع، معلومات الحساب البنكي..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSupModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Supplier Bill */}
      <Modal open={billModal} onClose={() => setBillModal(false)} title="إضافة فاتورة مورد جديدة (Payable)">
        <form onSubmit={handleSaveBill} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">المورد</label>
              <select required value={billForm.supplierId} onChange={(e) => setBillForm({ ...billForm, supplierId: e.target.value })} className="input-field">
                <option value="">-- اختر المورد --</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">تاريخ الاستحقاق (Échéance)</label>
              <input type="date" required value={billForm.dueDate} onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">المبلغ الإجمالي (DZD)</label>
              <input type="number" min="0" step="0.01" required value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} className="input-field" placeholder="50000" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">فئة المصروف</label>
              <select value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} className="input-field">
                {['SALAIRES', 'LOYER', 'ADS', 'ABONNEMENTS', 'MATERIEL', 'IMPOTS', 'TRANSPORT', 'AUTRE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">الوصف</label>
            <input required value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} className="input-field" placeholder="مثال: شراء شاشات جديدة للمكتب" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBillModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Versement (تسجيل دفعة للمورد: كامل المبلغ أو النصف أو مخصص) */}
      <Modal
        open={Boolean(versementModal)}
        onClose={() => setVersementModal(null)}
        title={`تسجيل دفعة (Versement) للمورد — ${versementModal?.supplierName || ''}`}
      >
        {versementModal && (() => {
          const total = Number(versementModal.totalAmount || versementModal.amountDzd || versementModal.amount || 0);
          const paid = Number(versementModal.paidAmount || 0);
          const remaining = Number(versementModal.remainingAmount !== undefined ? versementModal.remainingAmount : Math.max(0, total - paid));
          const half = Math.round(remaining / 2);

          return (
            <form onSubmit={handleVersementSubmit} className="space-y-4">
              {/* Bill Details Banner */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">الوصف:</span>
                  <span className="font-bold">{versementModal.description}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">الإجمالي</p>
                    <p className="font-extrabold text-sm">{formatMoney(total)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">المدفوع سابقاً</p>
                    <p className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{formatMoney(paid)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-rose-500 font-bold">المتبقي للدفع</p>
                    <p className="font-extrabold text-sm text-rose-500">{formatMoney(remaining)}</p>
                  </div>
                </div>
              </div>

              {/* Quick Choice Buttons: Total Budget vs Nos (Half) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-muted)]">خيارات الدفع السريع:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVersementForm((p) => ({ ...p, amount: String(remaining) }))}
                    className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex flex-col items-center justify-center hover:bg-indigo-100/70 transition-all cursor-pointer"
                  >
                    <span>كامل المبلغ المتبقي (100% Total)</span>
                    <span className="text-[11px] font-normal opacity-80">{formatMoney(remaining)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVersementForm((p) => ({ ...p, amount: String(half) }))}
                    className="p-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 font-bold text-xs flex flex-col items-center justify-center hover:bg-sky-100/70 transition-all cursor-pointer"
                  >
                    <span>النصف (50% Moitié / Nos)</span>
                    <span className="text-[11px] font-normal opacity-80">{formatMoney(half)}</span>
                  </button>
                </div>
              </div>

              {/* Payment Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">مبلغ الدفعة المراد تسديده (DZD)</label>
                  <input
                    type="number"
                    min="1"
                    max={remaining}
                    step="0.01"
                    required
                    value={versementForm.amount}
                    onChange={(e) => setVersementForm({ ...versementForm, amount: e.target.value })}
                    className="input-field font-extrabold text-sm text-indigo-600 dark:text-indigo-400"
                    placeholder="أدخل المبلغ..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">تاريخ الدفع</label>
                  <input
                    type="date"
                    required
                    value={versementForm.date}
                    onChange={(e) => setVersementForm({ ...versementForm, date: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">طريقة الدفع</label>
                  <select
                    value={versementForm.method}
                    onChange={(e) => setVersementForm({ ...versementForm, method: e.target.value })}
                    className="input-field"
                  >
                    <option value="VIREMENT">تحويل بنكي / BaridiMob</option>
                    <option value="ESPECES">نقداً (Espèces / كاش)</option>
                    <option value="CHEQUE">شيك بنكي (Chèque)</option>
                    <option value="CARTE">بطاقة / Paysera / Wise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">ملاحظة / مرجع الدفعة</label>
                  <input
                    value={versementForm.notes}
                    onChange={(e) => setVersementForm({ ...versementForm, notes: e.target.value })}
                    placeholder="مثال: دفعة أولى رقم 12345"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={() => setVersementModal(null)} className="btn-secondary">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  <Banknote className="w-4 h-4" />
                  <span>تأكيد الدفعة (Valider le versement)</span>
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
}
