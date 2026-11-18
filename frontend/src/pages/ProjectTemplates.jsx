import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { todayIso } from '../lib/format';
import Modal from '../components/Modal';

export default function ProjectTemplates() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [applyTarget, setApplyTarget] = useState(null);
  const [applyForm, setApplyForm] = useState({ clientId: '', startDate: todayIso() });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', serviceType: 'META_ADS', description: '', tasksText: 'Audit compte | HIGH | 1 | MEDIA_BUYER\nCréation créatives | MEDIUM | 3 | TEAM' });

  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => gasCall('listTemplates') });
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const templates = data?.templates || [];
  const clients = clientsRes?.clients || [];

  const handleApply = async (e) => {
    e.preventDefault();
    const res = await gasCall('applyTemplate', {
      templateId: applyTarget.id,
      clientId: applyForm.clientId || clients[0]?.id,
      startDate: applyForm.startDate
    });
    toast.success(`تم توليد ${res.createdCount} مهام للعميل تلقائياً!`);
    setApplyTarget(null);
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const tasks = form.tasksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, i) => {
        const [title, priority = 'MEDIUM', dayOffset = i + 1, defaultRole = 'TEAM'] = line.split('|').map((s) => s.trim());
        return { title, priority, dayOffset: Number(dayOffset || i + 1), defaultRole };
      });
    await gasCall('saveTemplate', { name: form.name, serviceType: form.serviceType, description: form.description, tasks });
    toast.success('Template enregistré');
    setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ['templates'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.templates')}</h1>
          <p className="text-xs text-[var(--text-muted)]">قوالب SOP جاهزة لتوليد وتوزيع مهام أي عميل جديد بضغطة زر</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
          <Plus className="w-4 h-4" /> قالب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div key={tpl.id} className="card p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-extrabold">{tpl.name}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">{tpl.serviceType}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => { await gasCall('deleteTemplate', { id: tpl.id }); qc.invalidateQueries({ queryKey: ['templates'] }); }}
                  className="text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{tpl.description}</p>
              <ul className="space-y-1 pt-2 text-xs">
                {(tpl.tasks || []).map((tk, i) => (
                  <li key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)]">
                    <span className="font-semibold">{i + 1}. {tk.title}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">J+{tk.dayOffset} • {tk.defaultRole}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => { setApplyTarget(tpl); setApplyForm({ clientId: clients[0]?.id || '', startDate: todayIso() }); }}
              className="btn-primary w-full text-xs"
            >
              <Play className="w-3.5 h-3.5" /> تطبيق القالب على عميل
            </button>
          </div>
        ))}
      </div>

      <Modal open={Boolean(applyTarget)} onClose={() => setApplyTarget(null)} title={`تطبيق القالب: ${applyTarget?.name || ''}`}>
        <form onSubmit={handleApply} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1">اختر العميل</label>
            <select required value={applyForm.clientId} onChange={(e) => setApplyForm({ ...applyForm, clientId: e.target.value })} className="input-field">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">تاريخ الانطلاق</label>
            <input type="date" required value={applyForm.startDate} onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })} className="input-field" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setApplyTarget(null)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">توليد المهام الآن</button>
          </div>
        </form>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء قالب SOP جديد">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">اسم القالب</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">نوع الخدمة</label>
              <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className="input-field">
                {['META_ADS', 'WEBSITE', 'TESTILI', 'VIDEO_EDITING', 'CONTENT'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">الوصف</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
          <div>
            <label className="block text-xs font-semibold mb-1">المهام (سطر لكل مهمة: العنوان | الأولوية | اليوم | الدور)</label>
            <textarea rows={4} value={form.tasksText} onChange={(e) => setForm({ ...form, tasksText: e.target.value })} className="input-field text-xs" dir="ltr" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
