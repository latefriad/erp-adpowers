import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Copy, ExternalLink, MessageCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppUrl } from '../lib/format';
import Modal from '../components/Modal';

export default function Clients() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', address: '', taxId: '', defaultTaxRate: 19, tagsText: '' });

  const { data } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const clients = (data?.clients || []).filter((c) =>
    `${c.name} ${c.company} ${c.email} ${c.phone} ${(c.tags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  );

  const duplicateMatch = form.phone.trim().length >= 8 || form.email.trim().length >= 5
    ? (data?.clients || []).find((c) =>
        (form.email && c.email && c.email.toLowerCase() === form.email.toLowerCase()) ||
        (form.phone && c.phone && c.phone.replace(/\D/g, '') === form.phone.replace(/\D/g, ''))
      )
    : null;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const tags = form.tagsText.split(',').map((s) => s.trim()).filter(Boolean);
      await gasCall('saveClient', { ...form, defaultTaxRate: Number(form.defaultTaxRate), tags });
      toast.success('Client enregistré');
      setModalOpen(false);
      setForm({ name: '', company: '', email: '', phone: '', address: '', taxId: '', defaultTaxRate: 19, tagsText: '' });
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const copyPortalLink = (token) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ رابط بوابة العميل!');
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await gasCall('deleteClient', { id });
    qc.invalidateQueries({ queryKey: ['clients'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.clients')}</h1>
          <p className="text-xs text-[var(--text-muted)]">{clients.length} عميل مسجل</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="input-field flex-1 sm:w-56 text-xs"
          />
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs shrink-0">
            <Plus className="w-4 h-4" /> عميل جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div key={c.id} className="card p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link to={`/clients/${c.id}`} className="font-extrabold text-base hover:text-indigo-500">
                    {c.company || c.name}
                  </Link>
                  <p className="text-xs text-[var(--text-muted)]">{c.name}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] font-bold">
                  TVA {c.defaultTaxRate ?? 19}%
                </span>
              </div>

              <div className="text-xs text-[var(--text-muted)] space-y-0.5">
                {c.email && <p>{c.email}</p>}
                {c.phone && <p dir="ltr" className="text-start">{c.phone}</p>}
                {c.address && <p>{c.address}</p>}
              </div>

              {c.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.tags.map((tg) => (
                    <span key={tg} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {tg}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                <Link to={`/clients/${c.id}`} className="font-bold text-indigo-500 hover:underline flex items-center gap-1">
                  360° <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                {c.portalToken && (
                  <button type="button" onClick={() => copyPortalLink(c.portalToken)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer">
                    <Copy className="w-3.5 h-3.5" /> Portal
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {c.phone && (
                  <a href={buildWhatsAppUrl(c.phone, `السلام عليكم ${c.name}`)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}
                {user?.role === 'ADMIN' && (
                  <button type="button" onClick={() => handleDelete(c.id)} className="text-rose-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة عميل جديد">
        <form onSubmit={handleSave} className="space-y-3">
          {duplicateMatch && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              ⚠️ تنبيه: يوجد عميل بنفس الهاتف أو الإيميل ({duplicateMatch.company || duplicateMatch.name})
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">اسم جهة الاتصال</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الشركة / البراند</label><input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الإيميل</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الهاتف</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="0550..." /></div>
            <div><label className="block text-xs font-semibold mb-1">العنوان</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">NIF / Tax ID</label><input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">TVA الافتراضية (%)</label><input type="number" value={form.defaultTaxRate} onChange={(e) => setForm({ ...form, defaultTaxRate: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الوسوم (مفصولة بفاصلة)</label><input value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} className="input-field" placeholder="E-Commerce, Meta Ads" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
