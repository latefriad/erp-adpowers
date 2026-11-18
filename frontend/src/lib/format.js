export function formatMoney(amount, currency = 'DZD') {
  const num = Number(amount || 0);
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
  return `${formatted} ${currency}`;
}

/**
 * Normalizes Algerian mobile numbers (05/06/07xxxxxxxx) to international 213xxxxxxxxx
 * for WhatsApp wa.me deep-links.
 */
export function normalizeDzPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00213')) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 10) digits = '213' + digits.slice(1);
  return digits;
}

export function buildWhatsAppUrl(phone, message) {
  const normalized = normalizeDzPhone(phone);
  const encoded = encodeURIComponent(message || '');
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function exportToCsv(filename, columns, rows) {
  const bom = '\uFEFF'; // UTF-8 BOM for Arabic Excel compatibility
  const header = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const val = typeof c.value === 'function' ? c.value(r) : r[c.key];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const STATUS_COLORS = {
  DRAFT: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SENT: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  EN_ATTENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  EN_RETARD: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  PAYEE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ANNULEE: 'bg-slate-200 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-500',
  A_PAYER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  WINNER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  LOSER: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  PENDING: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  NEEDS_MORE_DATA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  HIGH: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
};
