import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Download, Mail, MessageCircle, CreditCard, CheckCircle,
  ArrowRightLeft, Trash2, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { gasCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { buildWhatsAppUrl, exportToCsv, formatMoney, STATUS_COLORS, todayIso } from '../lib/format';
import { downloadInvoicePdf } from '../lib/pdf';
import Modal from '../components/Modal';

export default function Invoices() {
  const { t } = useLanguage();
  const { settings } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState('FACTURE'); // FACTURE | DEVIS | RECURRING
  const [createOpen, setCreateOpen] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'VIREMENT', paymentDate: todayIso(), reference: '' });

  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ clientId: '', title: 'Retainer Mensuel', frequency: 'MONTHLY', currency: 'DZD', nextRunAt: todayIso(), unitPrice: '', description: 'Gestion Ads Mensuel' });

  const [form, setForm] = useState({
    docType: 'FACTURE',
    clientId: '',
    currency: 'DZD',
    exchangeRate: 1,
    issueDate: todayIso(),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    discount: 0,
    notes: '',
    finalize: true,
    items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 19 }]
  });

  const { data } = useQuery({ queryKey: ['invoices'], queryFn: () => gasCall('listInvoices') });
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const { data: servicesRes } = useQuery({ queryKey: ['services'], queryFn: () => gasCall('listServices') });

  const invoices = (data?.invoices || []).filter((i) => i.docType === tab);
  const recurring = data?.recurring || [];
  const clients = clientsRes?.clients || [];
  const services = servicesRes?.services || [];

  const handleCurrencyChange = (currency) => {
    const rate = currency === 'EUR' ? (settings.eurRate || 245) : currency === 'USD' ? (settings.usdRate || 225) : 1;
    setForm((p) => ({ ...p, currency, exchangeRate: rate }));
  };

  const addServiceToItems = (srvId) => {
    const srv = services.find((s) => s.id === srvId);
    if (!srv) return;
    setForm((p) => ({
      ...p,
      items: [...p.items.filter((i) => i.description), { description: srv.name, quantity: 1, unitPrice: Number(srv.salePrice), taxRate: Number(settings.defaultTaxRate ?? 19) }]
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await gasCall('saveInvoice', {
        ...form,
        clientId: form.clientId || clients[0]?.id,
        discount: Number(form.discount || 0),
        exchangeRate: Number(form.exchangeRate || 1)
      });
      toast.success('Document créé avec succès');
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRecordPay = async (e) => {
    e.preventDefault();
    try {
      await gasCall('recordPayment', {
        invoiceId: payModal.id,
        amount: Number(payForm.amount),
        method: payForm.method,
        paymentDate: payForm.paymentDate,
        reference: payForm.reference
      });
      toast.success('Paiement enregistré ✓');
      setPayModal(null);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    await gasCall('saveRecurring', {
      clientId: recForm.clientId || clients[0]?.id,
      title: recForm.title,
      frequency: recForm.frequency,
      currency: recForm.currency,
      nextRunAt: recForm.nextRunAt,
      items: [{ description: recForm.description, quantity: 1, unitPrice: Number(recForm.unitPrice), taxRate: Number(settings.defaultTaxRate ?? 19) }]
    });
    toast.success('Abonnement récurrent enregistré');
    setRecOpen(false);
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  const handleExportCsv = () => {
    exportToCsv(
      `Adpowrs_${tab}_${todayIso()}`,
      [
        { label: 'Number', key: 'number' },
        { label: 'Client', key: 'clientName' },
        { label: 'Issue Date', key: 'issueDate' },
        { label: 'Due Date', key: 'dueDate' },
        { label: 'Total', key: 'total' },
        { label: 'Currency', key: 'currency' },
        { label: 'Total DZD', key: 'totalDzd' },
        { label: 'Paid', key: 'paidAmount' },
        { label: 'Remaining', key: 'remaining' },
        { label: 'Status', key: 'displayStatus' }
      ],
      invoices
    );
  };

  const computedPreview = form.items.reduce(
    (acc, it) => {
      const net = Number(it.quantity || 1) * Number(it.unitPrice || 0);
      const tax = net * (Number(it.taxRate ?? 19) / 100);
      acc.sub += net;
      acc.tax += tax;
      return acc;
    },
    { sub: 0, tax: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('nav.invoices')}</h1>
          <p className="text-xs text-[var(--text-muted)]">ترقيم قانوني ذري (FAC / DEV) • TVA 19% • DZD / EUR / USD • PDF وواتساب</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExportCsv} className="btn-secondary text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </button>
          <button type="button" onClick={() => setRecOpen(true)} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> فاتورة دورية
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((p) => ({ ...p, docType: tab === 'DEVIS' ? 'DEVIS' : 'FACTURE', clientId: clients[0]?.id || '' }));
              setCreateOpen(true);
            }}
            className="btn-primary text-xs"
          >
            <Plus className="w-4 h-4" /> فاتورة / عرض سعر
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'FACTURE', label: 'الفواتير (Factures)' },
          { key: 'DEVIS', label: 'عروض الأسعار (Devis)' },
          { key: 'RECURRING', label: `الفواتير الدورية (${recurring.length})` }
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

      {tab === 'RECURRING' ? (
        <div className="card p-4">
          <div tabIndex={0} role="region" aria-label="Recurring invoices" className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>العنوان</th><th>العميل</th><th>التكرار</th><th>التشغيل القادم</th><th>العملة</th><th></th></tr>
              </thead>
              <tbody>
                {recurring.map((r) => (
                  <tr key={r.id}>
                    <td className="font-bold">{r.title}</td>
                    <td>{r.clientName}</td>
                    <td><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-500">{r.frequency}</span></td>
                    <td>{r.nextRunAt}</td>
                    <td>{r.currency}</td>
                    <td>
                      <button
                        type="button"
                        onClick={async () => { await gasCall('deleteRecurring', { id: r.id }); qc.invalidateQueries({ queryKey: ['invoices'] }); }}
                        className="text-rose-500 p-1 cursor-pointer"
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
      ) : (
        <div className="card p-4">
          <div tabIndex={0} role="region" aria-label="Invoices list" className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>{t('common.client')}</th>
                  <th>التاريخ / الاستحقاق</th>
                  <th>المجموع</th>
                  <th>المدفوع / المتبقي</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <p className="font-extrabold">{inv.number || 'DRAFT'}</p>
                      {inv.viewedAt && <span className="text-[10px] text-emerald-500 font-bold">👁 Viewed</span>}
                    </td>
                    <td className="font-semibold">{inv.clientName}</td>
                    <td className="text-xs">
                      <p>{inv.issueDate}</p>
                      <p className="text-[var(--text-muted)]">→ {inv.dueDate}</p>
                    </td>
                    <td className="font-extrabold">{formatMoney(inv.total, inv.currency)}</td>
                    <td className="text-xs">
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(inv.paidAmount, inv.currency)}</p>
                      {inv.remaining > 0 && <p className="text-rose-500">-{formatMoney(inv.remaining, inv.currency)}</p>}
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[inv.displayStatus] || ''}`}>
                        {inv.displayStatus}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {inv.status === 'DRAFT' && (
                          <button
                            type="button"
                            title="Finalize"
                            onClick={async () => { await gasCall('finalizeInvoice', { id: inv.id }); toast.success('Finalisé'); qc.invalidateQueries({ queryKey: ['invoices'] }); }}
                            className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.docType === 'DEVIS' && (
                          <button
                            type="button"
                            title="Convert to Invoice"
                            onClick={async () => { await gasCall('convertQuoteToInvoice', { id: inv.id }); toast.success('Converti en Facture'); setTab('FACTURE'); qc.invalidateQueries({ queryKey: ['invoices'] }); }}
                            className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.docType === 'FACTURE' && inv.remaining > 0 && inv.status !== 'ANNULEE' && (
                          <button
                            type="button"
                            title="Record Payment"
                            onClick={() => {
                              setPayModal(inv);
                              setPayForm({ amount: String(inv.remaining), method: 'VIREMENT', paymentDate: todayIso(), reference: '' });
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Download PDF"
                          onClick={() => downloadInvoicePdf(inv, settings)}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Send Email"
                          onClick={async () => {
                            try {
                              await gasCall('sendInvoiceEmail', { id: inv.id, portalBaseUrl: window.location.origin });
                              toast.success('Email envoyé ✓');
                              qc.invalidateQueries({ queryKey: ['invoices'] });
                            } catch (e) { toast.error(e.message); }
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <a
                          title="WhatsApp Reminder"
                          href={buildWhatsAppUrl(inv.clientPhone, `السلام عليكم ${inv.clientName}، نذكركم بـ ${inv.docType === 'DEVIS' ? 'عرض السعر' : 'الفاتورة'} رقم ${inv.number || ''} بمبلغ ${formatMoney(inv.remaining || inv.total, inv.currency)}.\nرابط البوابة: ${window.location.origin}/portal/${inv.publicToken}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={async () => { if (confirm(t('common.confirmDelete'))) { await gasCall('deleteInvoice', { id: inv.id }); qc.invalidateQueries({ queryKey: ['invoices'] }); } }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice / Quote Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء فاتورة / عرض سعر" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">النوع</label>
              <select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })} className="input-field">
                <option value="FACTURE">FACTURE (فاتورة)</option>
                <option value="DEVIS">DEVIS (عرض سعر)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">العميل</label>
              <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="input-field">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">العملة</label>
              <select value={form.currency} onChange={(e) => handleCurrencyChange(e.target.value)} className="input-field">
                <option value="DZD">DZD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">سعر الصرف (DZD)</label>
              <input type="number" step="0.01" value={form.exchangeRate} onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-semibold mb-1">تاريخ الإصدار</label><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">تاريخ الاستحقاق</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">إضافة سريعة من الخدمات</label>
              <select onChange={(e) => { addServiceToItems(e.target.value); e.target.value = ''; }} className="input-field">
                <option value="">+ اختر خدمة...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.salePrice)})</option>)}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">البنود / Lignes</span>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, items: [...p.items, { description: '', quantity: 1, unitPrice: 0, taxRate: 19 }] }))}
                className="text-xs font-bold text-indigo-500 cursor-pointer"
              >
                + إضافة سطر
              </button>
            </div>
            {form.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input required placeholder="الوصف" value={it.description} onChange={(e) => {
                  const next = [...form.items]; next[idx].description = e.target.value; setForm({ ...form, items: next });
                }} className="input-field col-span-5 text-xs" />
                <input type="number" min="1" placeholder="الكمية" value={it.quantity} onChange={(e) => {
                  const next = [...form.items]; next[idx].quantity = Number(e.target.value); setForm({ ...form, items: next });
                }} className="input-field col-span-2 text-xs" />
                <input type="number" placeholder="السعر" value={it.unitPrice} onChange={(e) => {
                  const next = [...form.items]; next[idx].unitPrice = Number(e.target.value); setForm({ ...form, items: next });
                }} className="input-field col-span-2 text-xs" />
                <input type="number" placeholder="TVA%" value={it.taxRate} onChange={(e) => {
                  const next = [...form.items]; next[idx].taxRate = Number(e.target.value); setForm({ ...form, items: next });
                }} className="input-field col-span-2 text-xs" />
                <button type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="col-span-1 text-rose-500 cursor-pointer">
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] text-xs">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input type="checkbox" checked={form.finalize} onChange={(e) => setForm({ ...form, finalize: e.target.checked })} />
              <span>إصدار رقم قانوني مباشرة (FAC/DEV)</span>
            </label>
            <div className="text-end font-extrabold text-sm">
              Total TTC: {formatMoney(computedPreview.sub + computedPreview.tax - Number(form.discount || 0), form.currency)}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={Boolean(payModal)} onClose={() => setPayModal(null)} title={`تسجيل دفعة — ${payModal?.number || ''}`}>
        <form onSubmit={handleRecordPay} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1">المبلغ ({payModal?.currency})</label><input type="number" step="0.01" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">تاريخ الدفع</label><input type="date" required value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">الطريقة</label>
              <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="input-field">
                <option value="VIREMENT">Virement / BaridiMob</option>
                <option value="ESPECES">Espèces (كاش)</option>
                <option value="CHEQUE">Chèque</option>
                <option value="CARTE">Carte / Paysera / Wise</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">المرجع (Référence)</label><input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} className="input-field" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPayModal(null)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">تأكيد الدفع</button>
          </div>
        </form>
      </Modal>

      {/* Recurring Modal */}
      <Modal open={recOpen} onClose={() => setRecOpen(false)} title="إعداد فاتورة دورية (Recurring)">
        <form onSubmit={handleSaveRecurring} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">العميل</label>
              <select required value={recForm.clientId} onChange={(e) => setRecForm({ ...recForm, clientId: e.target.value })} className="input-field">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">العنوان</label><input required value={recForm.title} onChange={(e) => setRecForm({ ...recForm, title: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">التكرار</label>
              <select value={recForm.frequency} onChange={(e) => setRecForm({ ...recForm, frequency: e.target.value })} className="input-field">
                <option value="MONTHLY">شهري (MONTHLY)</option>
                <option value="QUARTERLY">ربع سنوي (QUARTERLY)</option>
                <option value="YEARLY">سنوي (YEARLY)</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold mb-1">تاريخ التشغيل القادم</label><input type="date" required value={recForm.nextRunAt} onChange={(e) => setRecForm({ ...recForm, nextRunAt: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">البند</label><input required value={recForm.description} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">السعر (HT)</label><input type="number" required value={recForm.unitPrice} onChange={(e) => setRecForm({ ...recForm, unitPrice: e.target.value })} className="input-field" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRecOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
