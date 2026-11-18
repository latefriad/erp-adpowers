import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatMoney } from '../lib/format';
import Modal from '../components/Modal';

export default function Services() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'ADS', description: '', basePrice: '', salePrice: '', chargeLabel: '', chargeAmount: '' });

  const { data } = useQuery({ queryKey: ['services'], queryFn: () => gasCall('listServices') });
  const services = data?.services || [];

  const handleSave = async (e) => {
    e.preventDefault();
    const charges = form.chargeLabel && form.chargeAmount ? [{ label: form.chargeLabel, amount: Number(form.chargeAmount) }] : [];
    await gasCall('saveService', {
      name: form.name,
      category: form.category,
      description: form.description,
      basePrice: Number(form.basePrice || 0),
      salePrice: Number(form.salePrice || 0),
      charges
    });
    toast.success('Service enregistré');
    setOpen(false);
    setForm({ name: '', category: 'ADS', description: '', basePrice: '', salePrice: '', chargeLabel: '', chargeAmount: '' });
    qc.invalidateQueries({ queryKey: ['services'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.services')}</h1>
          <p className="text-xs text-[var(--text-muted)]">كتالوج خدمات Adpowrs Digital — يُستخدم مباشرة داخل الفواتير وعروض الأسعار</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button type="button" onClick={() => setOpen(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> خدمة جديدة</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.id} className="card p-5 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-extrabold">{s.name}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">{s.category}</span>
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={async () => { await gasCall('deleteService', { id: s.id }); qc.invalidateQueries({ queryKey: ['services'] }); }}
                  className="text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {s.description && <p className="text-xs text-[var(--text-muted)]">{s.description}</p>}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
              <div><p className="text-[var(--text-muted)]">البيع</p><p className="font-extrabold">{formatMoney(s.salePrice)}</p></div>
              <div><p className="text-[var(--text-muted)]">التكاليف</p><p className="font-bold text-rose-500">{formatMoney(s.totalCharges)}</p></div>
              <div><p className="text-[var(--text-muted)]">الربح الصافي</p><p className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatMoney(s.netProfit)}</p></div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة خدمة جديدة">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">اسم الخدمة</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الفئة</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">سعر التكلفة الأساسي</label><input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">سعر البيع (DZD)</label><input type="number" required value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">مصاريف داخلية (مثلاً: مونتاج)</label><input value={form.chargeLabel} onChange={(e) => setForm({ ...form, chargeLabel: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">قيمة التكلفة</label><input type="number" value={form.chargeAmount} onChange={(e) => setForm({ ...form, chargeAmount: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">وصف</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
