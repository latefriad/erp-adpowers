import { useEffect, useState } from 'react';
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
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';

function makeDefaultForm(docType = 'FACTURE', clientId = '', defaultTaxRate = 0) {
  return {
    docType,
    clientId,
    clientName: '',
    currency: 'DZD',
    exchangeRate: 1,
    issueDate: todayIso(),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    discount: '',
    notes: '',
    finalize: true,
    markPaid: docType === 'FACTURE',
    items: [{ description: '', quantity: 1, unitPrice: '', taxRate: Number(defaultTaxRate || 0) }]
  };
}

export default function Invoices({ defaultTab = 'FACTURE' }) {
  const { t } = useLanguage();
  const { settings } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState(defaultTab); // FACTURE | DEVIS | RECURRING

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);
  const [createOpen, setCreateOpen] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'VIREMENT', paymentDate: todayIso(), reference: '' });

  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ clientId: '', title: 'Retainer Mensuel', frequency: 'MONTHLY', currency: 'DZD', nextRunAt: todayIso(), unitPrice: '', description: 'Gestion Ads Mensuel' });

  const [form, setForm] = useState(() => makeDefaultForm('FACTURE', '', settings?.defaultTaxRate ?? 19));

  const { data } = useQuery({ queryKey: ['invoices'], queryFn: () => gasCall('listInvoices') });
  const { data: clientsRes } = useQuery({ queryKey: ['clients'], queryFn: () => gasCall('listClients') });
  const { data: servicesRes } = useQuery({ queryKey: ['services'], queryFn: () => gasCall('listServices') });

  const allInvoices = data?.invoices || [];
  const invoices = allInvoices.filter((i) => i.docType === tab);
  const recurring = data?.recurring || [];
  const clients = clientsRes?.clients || [];
  const services = servicesRes?.services || [];

  const invalidateFinancials = () => {
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['benefits'] });
    qc.invalidateQueries({ queryKey: ['client-detail'] });
  };

  // Live summary totals for current tab (Factures / Devis)
  const activeDocs = invoices.filter((i) => i.status !== 'ANNULEE');
  const sumTotalDzd = activeDocs.reduce((s, i) => s + Number(i.totalDzd || (Number(i.total || 0) * Number(i.exchangeRate || 1))), 0);
  const sumPaidDzd = activeDocs.reduce((s, i) => s + Number(i.paidDzd || (Number(i.paidAmount || 0) * Number(i.exchangeRate || 1))), 0);
  const sumRemainingDzd = activeDocs.reduce((s, i) => s + Number(i.remainingDzd || (Number(i.remaining || 0) * Number(i.exchangeRate || 1))), 0);

  const handleCurrencyChange = (currency) => {
    const rate = currency === 'EUR' ? (settings.eurRate || 245) : currency === 'USD' ? (settings.usdRate || 225) : 1;
    setForm((p) => ({ ...p, currency, exchangeRate: rate }));
  };

  const updateItem = (idx, patch) => {
    setForm((p) => ({
      ...p,
      items: p.items.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    }));
  };

  const addServiceToItems = (srvId) => {
    const srv = services.find((s) => s.id === srvId);
    if (!srv) return;
    setForm((p) => ({
      ...p,
      items: [
        ...p.items.filter((i) => String(i.description || '').trim() !== ''),
        { description: srv.name, quantity: 1, unitPrice: srv.salePrice, taxRate: Number(settings.defaultTaxRate ?? 19) }
      ]
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const cleanItems = form.items.map((it) => ({
        description: String(it.description || '').trim() || 'Prestation',
        quantity: Math.max(1, Number(it.quantity || 1)),
        unitPrice: Math.max(0, Number(it.unitPrice || 0)),
        taxRate: Math.max(0, Number(it.taxRate !== undefined && it.taxRate !== '' ? it.taxRate : 19))
      }));

      const res = await gasCall('saveInvoice', {
        ...form,
        items: cleanItems,
        clientId: form.clientId,
        clientName: form.clientName,
        discount: Math.max(0, Number(form.discount || 0)),
        exchangeRate: Math.max(0.0001, Number(form.exchangeRate || 1)),
        finalize: form.finalize || form.markPaid
      });

      // Optionally mark immediately paid on creation so Cash Received & Treasury update in 1 click
      if (form.markPaid && form.docType === 'FACTURE' && res?.invoice?.id && Number(res.invoice.total) > 0) {
        await gasCall('recordPayment', {
          invoiceId: res.invoice.id,
          amount: Number(res.invoice.total),
          method: 'ESPECES',
          paymentDate: form.issueDate || todayIso(),
          reference: 'PAID-ON-CREATE'
        });
      }

      toast.success(form.docType === 'DEVIS' ? 'تم إنشاء عرض السعر بنجاح ✓' : 'تم حفظ الفاتورة وتحديث كل الحسابات ✓');
      setCreateOpen(false);
      setForm(makeDefaultForm(tab === 'DEVIS' ? 'DEVIS' : 'FACTURE', clients[0]?.id || '', settings?.defaultTaxRate ?? 19));
      invalidateFinancials();
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
      toast.success('تم تسجيل الدفعة وتحديث الخزينة ✓');
      setPayModal(null);
      invalidateFinancials();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await gasCall('deleteInvoice', { id });
      toast.success('تم حذف الفاتورة وإعادة حساب كل الأرقام ✓');
      invalidateFinancials();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    await gasCall('saveRecurring', {
      clientId: recForm.clientId || clients[0]?.id || '',
      title: recForm.title,
      frequency: recForm.frequency,
      currency: recForm.currency,
      nextRunAt: recForm.nextRunAt,
      items: [{ description: recForm.description, quantity: 1, unitPrice: Number(recForm.unitPrice), taxRate: Number(settings.defaultTaxRate ?? 19) }]
    });
    toast.success('Abonnement récurrent enregistré');
    setRecOpen(false);
    invalidateFinancials();
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
      const qty = Math.max(1, Number(it.quantity || 1));
      const up = Math.max(0, Number(it.unitPrice || 0));
      const tr = Math.max(0, Number(it.taxRate !== undefined && it.taxRate !== '' ? it.taxRate : 19));
      const lineNet = Math.round((qty * up + Number.EPSILON) * 100) / 100;
      acc.sub += lineNet;
      acc.lines.push({ qty, up, tr, lineNet });
      return acc;
    },
    { sub: 0, lines: [] }
  );

  const discountVal = Math.max(0, Number(form.discount || 0));
  const netCommercial = Math.max(0, Math.round((computedPreview.sub - discountVal) * 100) / 100);
  const discountRatio = computedPreview.sub > 0 ? (netCommercial / computedPreview.sub) : 1;
  const totalTax = Math.round(computedPreview.lines.reduce((s, l) => s + (l.lineNet * discountRatio * (l.tr / 100)), 0) * 100) / 100;
  const previewTotal = Math.round((netCommercial + totalTax) * 100) / 100;
  const rateVal = Math.max(0.0001, Number(form.exchangeRate || 1));
  const previewTotalDzd = Math.round(previewTotal * rateVal * 100) / 100;

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
              setForm(makeDefaultForm(tab === 'DEVIS' ? 'DEVIS' : 'FACTURE', clients[0]?.id || '', settings?.defaultTaxRate ?? 19));
              setCreateOpen(true);
            }}
            className="btn-primary text-xs"
          >
            <Plus className="w-4 h-4" /> فاتورة / عرض سعر
          </button>
        </div>
      </div>

      {/* Live Totals Strip */}
      {tab === 'FACTURE' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="إجمالي الفواتير (DZD)" value={formatMoney(sumTotalDzd)} subtitle={`${activeDocs.length} مستند`} tone="sky" />
          <StatCard title="المحصّل (الكاش DZD)" value={formatMoney(sumPaidDzd)} tone="emerald" />
          <StatCard title="المتبقي للتحصيل (DZD)" value={formatMoney(sumRemainingDzd)} tone="amber" />
        </div>
      )}
      {tab === 'DEVIS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="إجمالي عروض الأسعار (DZD)" value={formatMoney(sumTotalDzd)} subtitle={`${activeDocs.length} عرض سعر`} tone="sky" />
          <StatCard title="عروض قيد الانتظار" value={String(activeDocs.filter((i) => i.status === 'EN_ATTENTE' || i.status === 'DRAFT').length)} tone="amber" />
          <StatCard title="عروض محولة لفواتير" value={String(invoices.filter((i) => i.status === 'PAYEE' || i.status === 'ACCEPTE' || i.convertedFromId).length)} tone="emerald" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'FACTURE', label: `الفواتير (${allInvoices.filter((i) => i.docType === 'FACTURE').length})` },
          { key: 'DEVIS', label: `عروض الأسعار (${allInvoices.filter((i) => i.docType === 'DEVIS').length})` },
          { key: 'RECURRING', label: `الفواتير الدورية (${recurring.length})` }
        ].map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
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
                    <td>{r.clientName || '-'}</td>
                    <td><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-500">{r.frequency}</span></td>
                    <td>{r.nextRunAt}</td>
                    <td>{r.currency}</td>
                    <td>
                      <button
                        type="button"
                        onClick={async () => { await gasCall('deleteRecurring', { id: r.id }); invalidateFinancials(); }}
                        className="text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {recurring.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-xs text-[var(--text-muted)] py-6">{t('common.noData')}</td></tr>
                )}
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
                    <td className="font-semibold">{inv.clientName || '-'}</td>
                    <td className="text-xs">
                      <p>{inv.issueDate}</p>
                      <p className="text-[var(--text-muted)]">→ {inv.dueDate}</p>
                    </td>
                    <td className="font-extrabold">
                      <p>{formatMoney(inv.total, inv.currency)}</p>
                      {inv.currency !== 'DZD' && (
                        <p className="text-[10px] text-[var(--text-muted)] font-normal">
                          ≈ {formatMoney(inv.totalDzd || (Number(inv.total || 0) * Number(inv.exchangeRate || 1)), 'DZD')}
                        </p>
                      )}
                    </td>
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
                            onClick={async () => { await gasCall('finalizeInvoice', { id: inv.id }); toast.success('Finalisé'); invalidateFinancials(); }}
                            className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.docType === 'DEVIS' && (
                          <button
                            type="button"
                            title="Convert to Invoice"
                            onClick={async () => { await gasCall('convertQuoteToInvoice', { id: inv.id }); toast.success('Converti en Facture'); setTab('FACTURE'); invalidateFinancials(); }}
                            className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.docType === 'FACTURE' && inv.remaining > 0 && inv.status !== 'ANNULEE' && (
                          <>
                            <button
                              type="button"
                              title="تسديد كامل الفاتورة وإيداع المبلغ فوراً في الخزينة"
                              onClick={async () => {
                                try {
                                  await gasCall('markInvoicePaid', { id: inv.id });
                                  toast.success('تم تسديد الفاتورة بالكامل وتحديث رصيد الخزينة ✓');
                                  invalidateFinancials();
                                } catch (err) { toast.error(err.message); }
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>تسديد كامل</span>
                            </button>
                            <button
                              type="button"
                              title="تسجيل دفعة جزئية (Versement Partiel)"
                              onClick={() => {
                                setPayModal(inv);
                                setPayForm({ amount: String(inv.remaining), method: 'VIREMENT', paymentDate: todayIso(), reference: '' });
                              }}
                              className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500/25 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          </>
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
                              invalidateFinancials();
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
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-xs text-[var(--text-muted)] py-8">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice / Quote Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء فاتورة / عرض سعر" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">النوع</label>
              <select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })} className="input-field">
                <option value="FACTURE">FACTURE (فاتورة)</option>
                <option value="DEVIS">DEVIS (عرض سعر)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">العميل</label>
              {clients.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value, clientName: e.target.value ? '' : form.clientName })}
                    className="input-field"
                  >
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                    <option value="">+ عميل جديد (كتابة الاسم يدويّاً)...</option>
                  </select>
                  {!form.clientId && (
                    <input
                      required
                      placeholder="اسم العميل الجديد"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      className="input-field text-xs"
                    />
                  )}
                </div>
              ) : (
                <input
                  required
                  placeholder="اسم العميل (أو أضفه في صفحة العملاء)"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="input-field"
                />
              )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="block text-xs font-semibold mb-1">تاريخ الإصدار</label><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="input-field" /></div>
            <div><label className="block text-xs font-semibold mb-1">تاريخ الاستحقاق</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" /></div>
            <div>
              <label className="block text-xs font-semibold mb-1">خصم / Remise ({form.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">إضافة من الخدمات</label>
              <select onChange={(e) => { addServiceToItems(e.target.value); e.target.value = ''; }} className="input-field">
                <option value="">+ اختر خدمة...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.salePrice)})</option>)}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold">البنود / Lignes</span>
              <div className="flex items-center gap-1.5 bg-[var(--surface-subtle)] p-1 rounded-xl text-xs">
                <span className="text-[11px] text-[var(--text-muted)] px-1 font-medium">الضريبة:</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, items: p.items.map((it) => ({ ...it, taxRate: 0 })) }))}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                    form.items.every((it) => Number(it.taxRate || 0) === 0)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'hover:bg-[var(--surface)] text-[var(--text-muted)]'
                  }`}
                >
                  0% HT (بدون رسم)
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, items: p.items.map((it) => ({ ...it, taxRate: 19 })) }))}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                    form.items.some((it) => Number(it.taxRate) === 19)
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-[var(--surface)] text-[var(--text-muted)]'
                  }`}
                >
                  19% TVA
                </button>
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, items: [...p.items, { description: '', quantity: 1, unitPrice: '', taxRate: Number(p.items[0]?.taxRate || 0) }] }))}
                className="text-xs font-bold text-indigo-500 cursor-pointer"
              >
                + إضافة سطر
              </button>
            </div>
            {form.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 sm:p-0 rounded-xl bg-[var(--surface-subtle)] sm:bg-transparent">
                <input
                  required
                  placeholder="الوصف (اسم الخدمة أو البند)"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  className="input-field sm:col-span-5 text-xs"
                />
                <div className="grid grid-cols-3 sm:contents gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="الكمية"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    className="input-field sm:col-span-2 text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="السعر HT"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                    className="input-field sm:col-span-2 text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="TVA%"
                    value={it.taxRate}
                    onChange={(e) => updateItem(idx, { taxRate: e.target.value })}
                    className="input-field sm:col-span-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={form.items.length === 1}
                  onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                  aria-label="Remove line"
                  className="sm:col-span-1 text-rose-500 disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] text-xs">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input type="checkbox" checked={form.finalize} onChange={(e) => setForm({ ...form, finalize: e.target.checked })} />
                <span>إصدار رقم قانوني مباشرة (FAC/DEV)</span>
              </label>
              {form.docType === 'FACTURE' && (
                <label className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                  <input type="checkbox" checked={form.markPaid} onChange={(e) => setForm({ ...form, markPaid: e.target.checked, finalize: e.target.checked ? true : form.finalize })} />
                  <span>مدفوعة الآن (تُضاف مباشرة للخزينة والكاش)</span>
                </label>
              )}
            </div>
            <div className="text-end space-y-1">
              <p className="text-[var(--text-muted)]">
                المجموع الخام HT: {formatMoney(computedPreview.sub, form.currency)}
                {discountVal > 0 && <span className="text-amber-500"> | خصم: -{formatMoney(discountVal, form.currency)}</span>}
                {totalTax > 0 && <span> | TVA: +{formatMoney(totalTax, form.currency)}</span>}
              </p>
              <p className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                المجموع النهائي TTC: {formatMoney(previewTotal, form.currency)}
                {form.currency !== 'DZD' && (
                  <span className="text-xs font-semibold text-[var(--text-muted)] ms-2">
                    (≈ {formatMoney(previewTotalDzd, 'DZD')})
                  </span>
                )}
              </p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">العميل</label>
              <select value={recForm.clientId} onChange={(e) => setRecForm({ ...recForm, clientId: e.target.value })} className="input-field">
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
