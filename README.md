# Adpowrs Digital ERP — Google Sheets + Apps Script Edition

نظام ERP متكامل لوكالة **Adpowrs Digital** بواجهة **React + Vite + Tailwind CSS** (تُنشر مجاناً على Vercel) وباك-إند **Google Apps Script + Google Sheets + Google Drive** (0 دولار/شهر).

---

## هيكل المشروع

- `apps-script/` — الباك-إند الكامل في Google Apps Script (8 ملفات `.gs` + `appsscript.json`)
- `frontend/` — الواجهة الأمامية (React 19, Vite, Tailwind CSS v4, TanStack Query, jsPDF, AR/FR/EN + Dark/Light Mode)

---

## خطوة 1: تجهيز Google Sheet و Google Apps Script (5 دقائق)

1. أنشئ ملف **Google Sheet** جديداً في Google Drive وسمّه: **`Adpowrs_ERP_DB`**.
2. من القائمة العلوية اختر **Extensions → Apps Script**.
3. أنشئ ملفات السكربت التالية داخل Apps Script وانسخ محتوى كل ملف من مجلد `apps-script/`:
   - `Code.gs`
   - `Setup.gs`
   - `SheetsDB.gs`
   - `Auth.gs`
   - `Finance.gs`
   - `CrmOps.gs`
   - `DriveBackup.gs`
   - `Triggers.gs`
4. من القائمة العلوية في محرر Apps Script، اختر الدالة **`setupAdpowrsERP`** واضغط **Run** (وافق على الصلاحيات عند الطلب):
   - ستُنشأ تلقائياً كل التبويبات والأعمدة الـ 18.
   - ستُنشأ مجلدات Google Drive (`/Adpowrs_ERP/Receipts`, `/Backups`, `/Branding`, `/Archives`).
   - سيُنشأ حساب المدير الأول:
     - **Email**: `admin@adpowrs.com`
     - **Password**: `Admin@2026` *(غيّرها فور الدخول)*
   - ستُفعّل الـ Triggers التلقائية (06:00 الفواتير الدورية، 09:00 تذكيرات Gmail، الجمعة 02:00 النسخ الاحتياطي الأسبوعي).
5. لنشر الـ API: اضغط **Deploy → New deployment → Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
   - انسخ رابط الـ **Web App URL** (`https://script.google.com/macros/s/.../exec`).

---

## خطوة 2: تشغيل الواجهة محلياً أو نشرها على Vercel

### محلياً (Local Dev)
```bash
cd frontend
cp .env.example .env
# الصق رابط Web App URL داخل VITE_GAS_API_URL (أو اتركه فارغاً للتجربة الفورية بـ Demo Mode)
npm install
npm run dev
```

### النشر على Vercel (`erp.adpowrs.com`)
1. ارفع المشروع إلى GitHub.
2. في Vercel اختر **Root Directory = `frontend`**.
3. أضف متغير البيئة:
   - `VITE_GAS_API_URL` = رابط Google Apps Script Web App الخاص بك.
4. اضغط **Deploy** — ثم اربط دومينك `erp.adpowrs.com` من إعدادات Vercel Domains.
