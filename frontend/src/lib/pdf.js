import { jsPDF } from 'jspdf';
import { formatMoney } from './format';

export function downloadInvoicePdf(invoice, agency = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const primary = agency.primaryColor || '#6366f1';

  // Top Header Band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 96, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(agency.agencyName || 'Adpowrs Digital', 40, 46);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(agency.tagline || 'Digital Marketing & E-Commerce Agency', 40, 64);
  if (agency.phone || agency.email) {
    doc.text(`${agency.phone || ''}  |  ${agency.email || ''}`, 40, 80);
  }

  // Document Type & Number
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const title = invoice.docType === 'DEVIS' ? 'DEVIS' : 'FACTURE';
  doc.text(title, w - 40, 46, { align: 'right' });
  doc.setFontSize(12);
  doc.text(invoice.number || 'BROUILLON', w - 40, 66, { align: 'right' });

  // Client & Meta Box
  doc.setTextColor(15, 23, 42);
  let y = 128;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT / BILL TO:', 40, y);
  doc.text('DETAILS:', w - 210, y);

  doc.setFont('helvetica', 'normal');
  y += 16;
  doc.text(invoice.clientName || '-', 40, y);
  doc.text(`Date d'emission : ${invoice.issueDate || '-'}`, w - 210, y);
  y += 14;
  if (invoice.clientEmail) doc.text(invoice.clientEmail, 40, y);
  doc.text(`Echeance : ${invoice.dueDate || '-'}`, w - 210, y);
  y += 14;
  if (invoice.clientPhone) doc.text(invoice.clientPhone, 40, y);
  doc.text(`Statut : ${invoice.displayStatus || invoice.status}`, w - 210, y);

  // Table Header
  y += 32;
  doc.setFillColor(241, 245, 249);
  doc.rect(40, y, w - 80, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIPTION', 50, y + 16);
  doc.text('QTE', w - 250, y + 16, { align: 'right' });
  doc.text('PRIX U.', w - 180, y + 16, { align: 'right' });
  doc.text('TVA %', w - 125, y + 16, { align: 'right' });
  doc.text('TOTAL TTC', w - 50, y + 16, { align: 'right' });

  // Items
  y += 40;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  (invoice.items || []).forEach((it) => {
    doc.text(String(it.description || '').slice(0, 56), 50, y);
    doc.text(String(it.quantity || 1), w - 250, y, { align: 'right' });
    doc.text(formatMoney(it.unitPrice, ''), w - 180, y, { align: 'right' });
    doc.text(`${it.taxRate ?? 19}%`, w - 125, y, { align: 'right' });
    doc.text(formatMoney(it.lineTotal, invoice.currency), w - 50, y, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(40, y + 8, w - 40, y + 8);
    y += 26;
  });

  // Totals block
  y += 16;
  const xLabel = w - 210;
  const xVal = w - 50;
  doc.setFontSize(10);
  doc.text('Sous-total HT :', xLabel, y);
  doc.text(formatMoney(invoice.subtotal, invoice.currency), xVal, y, { align: 'right' });
  y += 18;
  if (Number(invoice.discount || 0) > 0) {
    doc.text('Remise :', xLabel, y);
    doc.text(`- ${formatMoney(invoice.discount, invoice.currency)}`, xVal, y, { align: 'right' });
    y += 18;
  }
  doc.text('TVA :', xLabel, y);
  doc.text(formatMoney(invoice.taxTotal, invoice.currency), xVal, y, { align: 'right' });
  y += 22;

  doc.setFillColor(primary);
  doc.roundedRect(xLabel - 12, y - 15, 185, 28, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL TTC :', xLabel, y + 3);
  doc.text(formatMoney(invoice.total, invoice.currency), xVal, y + 3, { align: 'right' });

  // Legal Footer
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const footY = 770;
  doc.line(40, footY - 12, w - 40, footY - 12);
  const legal = [agency.rcNumber, agency.taxId, agency.nisNumber, agency.bankAccount].filter(Boolean).join('  •  ');
  if (legal) doc.text(legal, w / 2, footY + 2, { align: 'center' });
  if (invoice.notes) {
    doc.text(`Notes : ${invoice.notes}`, 40, y + 50);
  }

  doc.save(`${invoice.number || invoice.id}.pdf`);
}

export function downloadClientReportPdf(report, agency = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`${agency.agencyName || 'Adpowrs Digital'} — Monthly Report`, 40, 44);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${report.client?.company || report.client?.name || ''}  |  Period: ${report.month}`, 40, 68);

  let y = 124;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Ad Spend Performance Summary', 40, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const ad = report.adTotals || {};
  doc.text(`Total Spend: ${formatMoney(ad.spend)}   |   Orders: ${ad.orders || 0}   |   Revenue: ${formatMoney(ad.revenue)}`, 40, y);
  y += 16;
  doc.text(`Average ROAS: ${ad.roas || 0}x   |   Average CPA: ${formatMoney(ad.cpa)}`, 40, y);

  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. Financial Summary', 40, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const fin = report.financials || {};
  doc.text(`Invoiced (Month): ${formatMoney(fin.monthInvoiced)}   |   Paid: ${formatMoney(fin.monthPaid)}   |   Outstanding: ${formatMoney(fin.totalOutstanding)}`, 40, y);

  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`3. Delivered Tasks (${(report.deliveredTasks || []).length})`, 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  (report.deliveredTasks || []).slice(0, 12).forEach((t) => {
    doc.text(`• ${t.title}`, 48, y);
    y += 16;
  });

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`4. Product Testing (Testili: ${(report.testili || []).length})`, 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  (report.testili || []).slice(0, 10).forEach((t) => {
    doc.text(`• ${t.productName} (${t.platform}) — Verdict: ${t.verdict} | ROAS: ${t.actualRoas}x | CPA: ${formatMoney(t.actualCpa)}`, 48, y);
    y += 16;
  });

  doc.save(`Report_${(report.client?.company || 'Client').replace(/\s+/g, '_')}_${report.month}.pdf`);
}
