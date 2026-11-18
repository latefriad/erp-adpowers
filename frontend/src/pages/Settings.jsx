import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, HardDriveDownload, Archive, UserPlus, Link2, Sun, Moon, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall, getGasApiUrl, setGasApiUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function Settings() {
  const { t } = useLanguage();
  const { settings, refreshSettings } = useAuth();
  const { schemePreference, systemScheme, setSchemePreference } = useTheme();
  const qc = useQueryClient();

  const [tab, setTab] = useState('agency'); // agency | users | backup | connection
  const [form, setForm] = useState(settings || {});
  const [gasUrl, setGasUrl] = useState(() => getGasApiUrl());
  const [archiveYear, setArchiveYear] = useState(String(new Date().getFullYear() - 1));
  const [archiving, setArchiving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'TEAM', phone: '' });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => gasCall('listUsers') });
  const { data: backupsRes, refetch: refetchBackups } = useQuery({ queryKey: ['backups'], queryFn: () => gasCall('listBackups') });

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await gasCall('updateSettings', form);
      refreshSettings(res.settings);
      toast.success('تم حفظ إعدادات الوكالة ✓');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await gasCall('uploadLogo', { base64: reader.result, mimeType: file.type });
        setForm((p) => ({ ...p, logoUrl: res.logoUrl }));
        refreshSettings({ ...form, logoUrl: res.logoUrl });
        toast.success('تم رفع الشعار إلى Google Drive ✓');
      } catch (err) {
        toast.error(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await gasCall('createUser', newUser);
      toast.success('تم إنشاء حساب العضو بنجاح');
      setNewUser({ name: '', email: '', password: '', role: 'TEAM', phone: '' });
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const res = await gasCall('triggerBackup');
      toast.success(`تم إنشاء نسخة احتياطية: ${res.backupName}`);
      refetchBackups();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleArchiveYear = async () => {
    if (!confirm(`هل أنت متأكد من أرشفة سنة ${archiveYear}؟ سيتم إنشاء نسخة احتياطية أولاً ثم نقل الفواتير المغلقة والمصاريف والمهام المكتملة إلى شيت أرشيف منفصل مع ترحيل رصيد الخزينة تلقائياً.`)) {
      return;
    }
    setArchiving(true);
    try {
      const res = await gasCall('archiveYear', { year: archiveYear });
      toast.success(`تمت أرشفة سنة ${res.year} بنجاح! الرصيد الافتتاحي الجديد: ${res.newOpeningTreasuryBalance} DZD`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleSaveGasUrl = (e) => {
    e.preventDefault();
    setGasApiUrl(gasUrl);
    toast.success('تم تحديث رابط Google Apps Script — جاري إعادة التحميل...');
    setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t('nav.settings')}</h1>
        <p className="text-xs text-[var(--text-muted)]">هوية Adpowrs Digital، المستخدمين (4 أدوار)، النسخ الاحتياطي في Google Drive، والأرشفة السنوية</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'agency', label: 'ملف الوكالة والهوية' },
          { key: 'users', label: 'فريق العمل (4 أدوار)' },
          { key: 'backup', label: 'النسخ الاحتياطي والأرشفة السنوية' },
          { key: 'connection', label: 'ربط Google Apps Script' }
        ].map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              tab === tb.key ? 'bg-[var(--brand-primary)] text-white' : 'card text-[var(--text-muted)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'agency' && (
        <form onSubmit={handleSaveSettings} className="card p-6 space-y-5 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold mb-1">اسم الوكالة</label><input value={form.agencyName || ''} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الشعار النصي (Tagline)</label><input value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الإيميل</label><input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الهاتف (+213)</label><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">العنوان</label><input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الموقع الإلكتروني</label><input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">NIF / Tax ID</label><input value={form.taxId || ''} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">RC (السجل التجاري)</label><input value={form.rcNumber || ''} onChange={(e) => setForm({ ...form, rcNumber: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الحساب البنكي (RIB / CCP)</label><input value={form.bankAccount || ''} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الرصيد الافتتاحي للخزينة (DZD)</label><input type="number" value={form.openingTreasuryBalance ?? 0} onChange={(e) => setForm({ ...form, openingTreasuryBalance: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">سعر صرف EUR → DZD</label><input type="number" value={form.eurRate ?? 245} onChange={(e) => setForm({ ...form, eurRate: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">سعر صرف USD → DZD</label><input type="number" value={form.usdRate ?? 225} onChange={(e) => setForm({ ...form, usdRate: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">اللون الأساسي</label><input type="color" value={form.primaryColor || '#6366f1'} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="input-field h-10 p-1" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">رفع شعار الوكالة (Drive)</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="input-field text-xs" />
            </div>
          </div>

          {/* 3-State Theme Selector per modern-web-guidance */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <p className="text-xs font-bold">مظهر النظام (Color Scheme)</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'system', label: `النظام (حالياً ${systemScheme === 'dark' ? 'داكن' : 'فاتح'})`, icon: Monitor },
                { key: 'light', label: 'فاتح (Light)', icon: Sun },
                { key: 'dark', label: 'داكن (Dark)', icon: Moon }
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSchemePreference(opt.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      schemePreference === opt.key
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'border-[var(--border-subtle)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={Boolean(form.remindersEnabled)} onChange={(e) => setForm({ ...form, remindersEnabled: e.target.checked })} />
            <span>تفعيل تذكيرات الدفع التلقائية عبر Gmail يومياً الساعة 09:00 صباحاً</span>
          </label>

          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" /> حفظ التعديلات
          </button>
        </form>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <h2 className="font-bold text-sm mb-3">أعضاء الفريق ({(usersRes?.users || []).length})</h2>
            <div tabIndex={0} role="region" aria-label="Users table" className="table-wrapper">
              <table className="erp-table">
                <thead><tr><th>الاسم</th><th>الإيميل</th><th>الدور</th><th>الحالة</th></tr></thead>
                <tbody>
                  {(usersRes?.users || []).map((u) => (
                    <tr key={u.id}>
                      <td className="font-bold">{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500">{t(`roles.${u.role}`)}</span></td>
                      <td>
                        <button
                          type="button"
                          onClick={async () => { await gasCall('updateUser', { id: u.id, active: !u.active }); qc.invalidateQueries({ queryKey: ['users'] }); }}
                          className={`px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer ${u.active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-500'}`}
                        >
                          {u.active ? 'نشط' : 'موقوف'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="card p-5 space-y-3 h-fit">
            <h2 className="font-bold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-indigo-500" /> إضافة مستخدم جديد</h2>
            <div><label className="block text-xs font-semibold mb-1">الاسم</label><input required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">الإيميل</label><input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">كلمة السر (6 أحرف+)</label><input type="password" required minLength={6} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">الدور</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input-field">
                <option value="ADMIN">ADMIN (المدير العام)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (محاسب)</option>
                <option value="MEDIA_BUYER">MEDIA_BUYER (ميديا باير)</option>
                <option value="TEAM">TEAM (فريق العمل — مهامي فقط)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full text-xs">إنشاء الحساب</button>
          </form>
        </div>
      )}

      {tab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">النسخ الاحتياطي في Google Drive</h2>
                <p className="text-xs text-[var(--text-muted)]">نسخة تلقائية كل يوم جمعة الساعة 02:00 (يحتفظ بآخر 12 نسخة)</p>
              </div>
              <button type="button" disabled={backingUp} onClick={handleBackupNow} className="btn-primary text-xs">
                <HardDriveDownload className="w-4 h-4" /> {backingUp ? 'جاري النسخ...' : 'نسخة احتياطية الآن'}
              </button>
            </div>
            <div className="space-y-2">
              {(backupsRes?.backups || []).map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
                  <span className="font-semibold truncate">{b.name}</span>
                  <a href={b.url} target="_blank" rel="noreferrer" className="text-indigo-500 font-bold hover:underline shrink-0">فتح في Drive</a>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4 border-amber-500/40">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-500" /> الأرشفة السنوية (Yearly Archive)
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              يحافظ على سرعة Google Sheets لسنوات! يقوم تلقائياً بإنشاء نسخة احتياطية، ثم ينقل الفواتير المغلقة والمصاريف والمهام المكتملة وبيانات AdSpend الخاصة بالسنة المختارة إلى شيت أرشيف منفصل في Drive، مع ترحيل صافي الكاش إلى <strong>الرصيد الافتتاحي للخزينة</strong> بدقة 100%.
            </p>
            <div className="flex items-center gap-3">
              <input type="number" value={archiveYear} onChange={(e) => setArchiveYear(e.target.value)} className="input-field w-32 font-bold" />
              <button type="button" disabled={archiving} onClick={handleArchiveYear} className="btn-secondary text-amber-600 dark:text-amber-400 font-bold">
                {archiving ? 'جاري الأرشفة...' : `أرشفة سنة ${archiveYear}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'connection' && (
        <form onSubmit={handleSaveGasUrl} className="card p-6 space-y-4 max-w-2xl">
          <h2 className="font-bold text-base flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-500" /> رابط Google Apps Script Web App</h2>
          <p className="text-xs text-[var(--text-muted)]">
            بعد نشر ملفات <code>apps-script/</code> كـ Web App داخل Google Sheet، الصق الرابط هنا (أو ضعه في <code>VITE_GAS_API_URL</code> على Vercel). اتركه فارغاً للعودة لوضع التجربة المحلية.
          </p>
          <input
            type="url"
            dir="ltr"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="input-field text-xs"
          />
          <button type="submit" className="btn-primary text-xs">حفظ والاتصال بـ Google Sheets</button>
        </form>
      )}
    </div>
  );
}
