import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, LayoutGrid, List, Calendar as CalIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { STATUS_COLORS, todayIso } from '../lib/format';
import Modal from '../components/Modal';

const COLS = [
  { key: 'TODO', label: 'قيد الانتظار / To Do', color: 'border-t-slate-400' },
  { key: 'INPROGRESS', label: 'قيد التنفيذ / In Progress', color: 'border-t-indigo-500' },
  { key: 'DONE', label: 'مكتمل / Done', color: 'border-t-emerald-500' }
];

export default function Tasks() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [view, setView] = useState('kanban'); // kanban | list | calendar
  const [onlyMine, setOnlyMine] = useState(user?.role === 'TEAM');
  const [draggingId, setDraggingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', clientId: '', assignedTo: '', priority: 'MEDIUM', taskType: 'PROJECT', dueDate: todayIso() });

  const { data } = useQuery({ queryKey: ['tasks'], queryFn: () => gasCall('listTasks') });
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => gasCall('listUsers') });

  const clients = clientsRes?.clients || [];
  const users = usersRes?.users || [];
  const allTasks = data?.tasks || [];
  const tasks = onlyMine ? allTasks.filter((tk) => tk.assignedTo === user?.id) : allTasks;

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MEDIA_BUYER';

  const moveStatus = async (taskId, status) => {
    qc.setQueryData(['tasks'], (old) => ({
      ...old,
      tasks: (old?.tasks || []).map((tk) => (tk.id === taskId ? { ...tk, status } : tk))
    }));
    try {
      await gasCall('saveTask', { id: taskId, status });
    } catch (err) {
      toast.error(err.message);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await gasCall('saveTask', form);
    toast.success('Tâche créée');
    setModalOpen(false);
    setForm({ title: '', description: '', clientId: '', assignedTo: '', priority: 'MEDIUM', taskType: 'PROJECT', dueDate: todayIso() });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.tasks')}</h1>
          <p className="text-xs text-[var(--text-muted)]">اسحب وأفلت البطاقات لتحديث حالة المهمة فوراً</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'TEAM' && (
            <label className="flex items-center gap-1.5 text-xs font-semibold card px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              <span>مهامي فقط</span>
            </label>
          )}
          <div className="flex rounded-xl border border-[var(--border-subtle)] p-0.5 bg-[var(--surface-card)]">
            <button type="button" onClick={() => setView('kanban')} className={`p-1.5 rounded-lg cursor-pointer ${view === 'kanban' ? 'bg-[var(--brand-primary)] text-white' : ''}`}><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" onClick={() => setView('list')} className={`p-1.5 rounded-lg cursor-pointer ${view === 'list' ? 'bg-[var(--brand-primary)] text-white' : ''}`}><List className="w-4 h-4" /></button>
            <button type="button" onClick={() => setView('calendar')} className={`p-1.5 rounded-lg cursor-pointer ${view === 'calendar' ? 'bg-[var(--brand-primary)] text-white' : ''}`}><CalIcon className="w-4 h-4" /></button>
          </div>
          {canCreate && (
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> مهمة جديدة</button>
          )}
        </div>
      </div>

      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLS.map((col) => {
            const colTasks = tasks.filter((tk) => tk.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (draggingId) moveStatus(draggingId, col.key); setDraggingId(null); }}
                className={`card p-4 border-t-4 ${col.color} min-h-[420px] flex flex-col gap-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold">{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--surface-subtle)]">{colTasks.length}</span>
                </div>
                <div className="space-y-2.5 flex-1">
                  {colTasks.map((tk) => (
                    <div
                      key={tk.id}
                      draggable
                      onDragStart={() => setDraggingId(tk.id)}
                      className="p-3.5 rounded-xl bg-[var(--surface-bg)] border border-[var(--border-subtle)] space-y-2 cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm">{tk.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${STATUS_COLORS[tk.priority] || ''}`}>{tk.priority}</span>
                      </div>
                      {tk.description && <p className="text-xs text-[var(--text-muted)] line-clamp-2">{tk.description}</p>}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                        <span>{tk.clientName || 'داخلي'} • {tk.assigneeName || '-'}</span>
                        <span className="font-semibold">{tk.dueDate || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="card p-4">
          <div tabIndex={0} role="region" aria-label="Tasks list" className="table-wrapper">
            <table className="erp-table">
              <thead><tr><th>المهمة</th><th>العميل</th><th>المكلّف</th><th>الأولوية</th><th>التسليم</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {tasks.map((tk) => (
                  <tr key={tk.id}>
                    <td className="font-bold">{tk.title}</td>
                    <td>{tk.clientName || '-'}</td>
                    <td>{tk.assigneeName || '-'}</td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[tk.priority] || ''}`}>{tk.priority}</span></td>
                    <td>{tk.dueDate || '-'}</td>
                    <td>
                      <select value={tk.status} onChange={(e) => moveStatus(tk.id, e.target.value)} className="input-field py-1 text-xs w-auto">
                        {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td>
                      {canCreate && (
                        <button type="button" onClick={async () => { await gasCall('deleteTask', { id: tk.id }); qc.invalidateQueries({ queryKey: ['tasks'] }); }} className="text-rose-500 cursor-pointer">
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
      )}

      {view === 'calendar' && (
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-sm">التسليمات القادمة حسب التاريخ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(
              tasks.reduce((acc, tk) => {
                const key = tk.dueDate || 'بدون تاريخ';
                if (!acc[key]) acc[key] = [];
                acc[key].push(tk);
                return acc;
              }, {})
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, items]) => (
                <div key={dateKey} className="p-3 rounded-xl bg-[var(--surface-subtle)] space-y-2">
                  <p className="font-extrabold text-xs text-indigo-500">{dateKey}</p>
                  {items.map((tk) => (
                    <div key={tk.id} className="p-2 rounded-lg bg-[var(--surface-card)] text-xs">
                      <p className="font-bold">{tk.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{tk.status} • {tk.assigneeName}</p>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إنشاء مهمة جديدة">
        <form onSubmit={handleSave} className="space-y-3">
          <div><label className="block text-xs font-semibold mb-1">عنوان المهمة</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">العميل (اختياري)</label>
              <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="input-field">
                <option value="">داخلي</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">تعيين إلى</label>
              <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="input-field">
                <option value="">غير معيّن</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">الأولوية</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">تاريخ التسليم</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1">الوصف</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
