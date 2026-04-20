import QRCode from "qrcode";
import { VAT_RATE } from "@/lib/constants";

// ── Logo cache ────────────────────────────────────────────────────────────────
// Embed the logo as a Base64 data URL so it renders immediately in the print
// popup/iframe without waiting for a network request (fixes missing logo issue).
let _cachedLogoBase64: string = '';

// Candidate logo paths — tries each in order until one succeeds
const LOGO_PATHS = [
  '/black-rose-logo.png',
  '/blackrose-logo.png',
  '/logo.png',
  '/logo-192.png',
];

async function _fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

async function fetchLogoBase64(): Promise<string> {
  if (_cachedLogoBase64) return _cachedLogoBase64;
  for (const path of LOGO_PATHS) {
    try {
      const b64 = await _fetchImageAsBase64(path);
      if (b64 && b64.startsWith('data:image')) {
        _cachedLogoBase64 = b64;
        return _cachedLogoBase64;
      }
    } catch {
      // try next path
    }
  }
  return '';
}
// Pre-warm the cache on module load so it's ready by the time a receipt is printed
if (typeof window !== 'undefined') {
  fetchLogoBase64().catch(() => {});
}

/**
 * Formats an order number for employee display: #0042
 * Pads the numeric part to at least 4 digits with # prefix.
 */
export function fmtOrderNum(n: string | number): string {
  const str = String(n).trim();
  // Extract only digits for padding
  const digits = str.replace(/\D/g, '');
  if (!digits) return `#${str}`;
  return `#${digits.padStart(4, '0')}`;
}

interface OrderItem {
  coffeeItem: {
    nameAr: string;
    nameEn?: string;
    price: string;
  };
  quantity: number;
  itemDiscount?: number;
  customization?: {
    selectedItemAddons?: Array<{ nameAr: string; nameEn?: string; price?: number }>;
    [key: string]: any;
  };
}

interface TaxInvoiceData {
  orderNumber: string;
  invoiceNumber?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: string;
  discount?: {
    code: string;
    percentage: number;
    amount: string;
  };
  invoiceDiscount?: number | string;
  total: string;
  paymentMethod: string;
  splitPayment?: { cash: number; card: number };
  employeeName: string;
  tableNumber?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  orderTypeName?: string;
  date: string;
  branchName?: string;
  branchAddress?: string;
  crNumber?: string;
  vatNumber?: string;
}

interface PrintConfig {
  paperWidth?: '58mm' | '80mm';
  autoClose?: boolean;
  autoPrint?: boolean;
  showPrintButton?: boolean;
}

interface EmployeePrintData {
  employeeName: string;
  employeeId: string;
  employmentNumber: string;
  role: string;
  phone: string;
  branchName?: string;
  qrCode?: string;
}

interface KitchenOrderData {
  orderNumber: string;
  tableNumber?: string;
  items: OrderItem[];
  notes?: string;
  priority?: 'normal' | 'urgent';
  timestamp: string;
}

// ── iframe-based print queue (never touches the main page DOM during print) ──
let _printQueue: Array<{ html: string; paperWidth: string; isFullDoc: boolean }> = [];
let _isPrinting = false;

function _buildFullDoc(html: string, paperWidth: string): string {
  return `<!DOCTYPE html><html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    @page { size: ${paperWidth} auto; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Cairo', Arial, sans-serif; direction: rtl; color: #000; background: #fff; }
    .no-print { display: none !important; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

function _printViaIframe(html: string, paperWidth: string, isFullDoc: boolean): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    _isPrinting = false;
    setTimeout(_drainPrintQueue, 500);
    return;
  }

  const fullHtml = isFullDoc ? html : _buildFullDoc(html, paperWidth);

  iframeDoc.open();
  iframeDoc.write(fullHtml);
  iframeDoc.close();

  const iframeWin = iframe.contentWindow;
  if (!iframeWin) {
    iframe.remove();
    _isPrinting = false;
    setTimeout(_drainPrintQueue, 500);
    return;
  }

  let cleanupDone = false;
  const cleanup = () => {
    if (cleanupDone) return;
    cleanupDone = true;
    setTimeout(() => {
      try { iframe.remove(); } catch {}
      _isPrinting = false;
      // 800 ms between jobs — enough for thermal cutter
      setTimeout(_drainPrintQueue, 800);
    }, 150);
  };

  iframeWin.addEventListener('afterprint', cleanup, { once: true });

  // 500 ms — gives enough time for CSS, images, and QR codes to render
  // Note: do NOT call iframeWin.focus() — it steals focus from the main window
  //       and can cause the page to appear blank/white while the dialog opens.
  setTimeout(() => {
    try {
      iframeWin.print();
    } catch {
      // Silently ignored — some sandboxed environments block print()
    }
    // Fallback: if afterprint never fires, clean up after 6 s
    setTimeout(cleanup, 6000);
  }, 500);
}

function _drainPrintQueue() {
  if (_isPrinting || _printQueue.length === 0) return;
  _isPrinting = true;
  const { html, paperWidth, isFullDoc } = _printQueue.shift()!;
  _printViaIframe(html, paperWidth, isFullDoc);
}

/**
 * Write a full HTML document into an already-open popup window and auto-print it.
 * If the popup is null (blocked), falls back to the iframe queue.
 */
function _printInPopup(win: Window | null, html: string, delayMs: number): void {
  if (!win || win.closed) {
    // Popup was blocked — fall back to iframe queue
    _printQueue.push({ html, paperWidth: '80mm', isFullDoc: true });
    _drainPrintQueue();
    return;
  }
  try {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch {
    // cross-origin or other write error — silently ignore
  }
  setTimeout(() => {
    try { win.focus(); win.print(); } catch {}
    // Close the popup after printing (or after 8 s if afterprint never fires)
    const close = () => { try { if (!win.closed) win.close(); } catch {} };
    win.addEventListener('afterprint', close, { once: true });
    setTimeout(close, 8000);
  }, delayMs);
}

function openPrintWindow(html: string, _title: string, config: PrintConfig = {}): Window | null {
  const { paperWidth = '80mm', autoPrint = true, showPrintButton = true } = config;

  if (autoPrint) {
    // Determine if the provided HTML is a full document or a fragment
    const isFullDoc = /<html[\s>]/i.test(html);
    _printQueue.push({ html, paperWidth, isFullDoc });
    _drainPrintQueue();
    return null;
  }

  // autoPrint = false → open a popup window with a print button
  const dynamicStyles = `<style>
    @media print { @page { size: ${paperWidth} auto; margin: 0; } body { margin: 0; } .no-print { display: none !important; } }
  </style>`;
  let modifiedHtml = html.replace('</head>', `${dynamicStyles}</head>`);

  const printButtonHtml = showPrintButton ? `
    <div class="no-print" style="text-align:center;margin-top:20px;padding:20px;">
      <button onclick="window.print()" style="padding:12px 32px;font-size:16px;background:#b45309;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-left:10px;">طباعة</button>
      <button onclick="window.close()" style="padding:12px 32px;font-size:16px;background:#6b7280;color:#fff;border:none;border-radius:8px;cursor:pointer;">إغلاق</button>
    </div>` : '';

  if (showPrintButton && !modifiedHtml.includes('<div class="no-print"')) {
    modifiedHtml = modifiedHtml.replace('</body>', `${printButtonHtml}</body>`);
  }

  const printWindow = window.open('', '_blank', 'width=450,height=700,scrollbars=yes,resizable=yes');
  if (printWindow) {
    printWindow.document.write(modifiedHtml);
    printWindow.document.close();
    printWindow.document.title = _title;
  }
  return printWindow;
}

// Export for direct use from manual print buttons (user gesture context)
export function printHtmlInPage(html: string, paperWidth: string = '80mm'): void {
  // receipt-invoice sends raw HTML fragments (not full documents)
  _printQueue.push({ html, paperWidth, isFullDoc: false });
  _drainPrintQueue();
}

export async function printEmployeeCard(data: EmployeePrintData): Promise<void> {
  let qrCodeUrl = "";
  if (data.qrCode) {
    try {
      qrCodeUrl = await QRCode.toDataURL(data.qrCode, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>بطاقة الموظف - ${data.employeeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; direction: rtl; }
    .card { margin: 20px auto; padding: 24px; border: 2px solid #333; border-radius: 12px; }
    .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 16px; margin-bottom: 16px; }
    .company-name { font-size: 20px; font-weight: 700; color: #b45309; }
    .employee-title { font-size: 12px; color: #666; margin-top: 4px; }
    .employee-name { font-size: 18px; font-weight: 700; margin: 16px 0 8px; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
    .info-label { color: #666; }
    .info-value { font-weight: 600; }
    .qr-section { text-align: center; margin-top: 16px; padding-top: 16px; border-top: 2px dashed #333; }
    .qr-section img { width: 100px; height: 100px; }
    .qr-note { font-size: 10px; color: #888; margin-top: 8px; }
    @media print { body { margin: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="company-name">BLACK ROSE CAFE</div>
      <div class="employee-title">بطاقة تعريف الموظف</div>
    </div>
    <div class="employee-name">${data.employeeName}</div>
    <div class="info-row"><span class="info-label">رقم الموظف:</span><span class="info-value">${data.employmentNumber}</span></div>
    <div class="info-row"><span class="info-label">المنصب:</span><span class="info-value">${data.role}</span></div>
    <div class="info-row"><span class="info-label">الجوال:</span><span class="info-value">${data.phone}</span></div>
    ${data.branchName ? `<div class="info-row"><span class="info-label">الفرع:</span><span class="info-value">${data.branchName}</span></div>` : ''}
    ${qrCodeUrl ? `
    <div class="qr-section">
      <img src="${qrCodeUrl}" alt="QR Code" />
      <div class="qr-note">امسح للتسجيل السريع</div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
  openPrintWindow(html, `بطاقة الموظف - ${data.employeeName}`, { paperWidth: '80mm', autoPrint: true, showPrintButton: true });
}

export async function printKitchenOrder(data: KitchenOrderData): Promise<void> {
  const itemsHtml = data.items.map(item => `
    <div style="padding: 8px 0; border-bottom: 1px dashed #ccc; display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1; padding-left: 8px; font-size: 16px;">
        ${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}
      </div>
      <div style="font-size: 24px; font-weight: 700; background: #000; color: #fff; padding: 4px 12px; border-radius: 8px; flex-shrink: 0;">x${item.quantity}</div>
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>طلب المطبخ - ${data.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ticket { margin: 0 auto; padding: 16px; }
    .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
    .order-number { font-size: 28px; font-weight: 700; }
    .urgent { background: #dc2626; color: #fff; padding: 4px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; animation: blink 1s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .table-info { font-size: 20px; font-weight: 700; color: #b45309; margin-top: 8px; }
    .timestamp { font-size: 12px; color: #666; }
    .items { margin: 16px 0; }
    .notes { background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 12px; font-size: 14px; }
    .notes-label { font-weight: 700; color: #92400e; }
    @media print { body { margin: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="order-number">${fmtOrderNum(data.orderNumber)}</div>
      ${data.priority === 'urgent' ? '<div class="urgent">عاجل!</div>' : ''}
      ${data.tableNumber ? `<div class="table-info">طاولة ${data.tableNumber}</div>` : ''}
      <div class="timestamp">${data.timestamp}</div>
    </div>
    <div class="items">${itemsHtml}</div>
    ${data.notes ? `<div class="notes"><span class="notes-label">ملاحظات:</span> ${data.notes}</div>` : ''}
  </div>
</body>
</html>
  `;
  openPrintWindow(html, `طلب المطبخ - ${data.orderNumber}`, { paperWidth: '80mm', autoPrint: true, autoClose: true, showPrintButton: false });
}

const VAT_NUMBER = "312718675800003";
const COMPANY_NAME = "BLACK ROSE CAFE";
const COMPANY_NAME_EN = "BLACK ROSE CAFE";
const COMPANY_CR = "7025559423";
const COMPANY_WEBSITE = "blackrose.com.sa";
const DEFAULT_BRANCH = "الفرع الرئيسي - ينبع";
const DEFAULT_ADDRESS = "ينبع، المملكة العربية السعودية";

function generateZATCAQRCode(data: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: string;
  vatAmount: string;
}): string {
  const tlv = (tag: number, value: string): Uint8Array => {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  };

  const sellerNameTLV = tlv(1, data.sellerName);
  const vatNumberTLV = tlv(2, data.vatNumber);
  const timestampTLV = tlv(3, data.timestamp);
  const totalWithVatTLV = tlv(4, data.totalWithVat);
  const vatAmountTLV = tlv(5, data.vatAmount);

  const combined = new Uint8Array(
    sellerNameTLV.length + vatNumberTLV.length + timestampTLV.length + 
    totalWithVatTLV.length + vatAmountTLV.length
  );

  let offset = 0;
  combined.set(sellerNameTLV, offset); offset += sellerNameTLV.length;
  combined.set(vatNumberTLV, offset); offset += vatNumberTLV.length;
  combined.set(timestampTLV, offset); offset += timestampTLV.length;
  combined.set(totalWithVatTLV, offset); offset += totalWithVatTLV.length;
  combined.set(vatAmountTLV, offset);

  let binary = '';
  combined.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function parseNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function renderItemName(nameAr: string, nameEn?: string): string {
  if (!nameEn || nameEn.trim() === '' || nameEn.trim() === nameAr.trim()) {
    return `<span style="font-weight:600;">${nameAr}</span>`;
  }
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
    <span style="direction:ltr;text-align:left;font-size:10px;color:#444;flex:1;word-break:break-word;">${nameEn}</span>
    <span style="direction:rtl;text-align:right;font-weight:600;flex:1;word-break:break-word;">${nameAr}</span>
  </div>`;
}

export async function printUnifiedReceipt(data: TaxInvoiceData): Promise<void> {
  // Delegate to the fully featured printTaxInvoice which handles two separate print jobs
  await printTaxInvoice(data, { autoPrint: true });
}

export async function printBulkEmployeeInvoices(orders: any[]): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
    body { font-family: 'Cairo', sans-serif; direction: rtl; }
    .invoice-page { width: 80mm; padding: 10px; border-bottom: 2px dashed #000; page-break-after: always; }
    .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; }
    .content { margin-top: 10px; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
  </style>
</head>
<body>
  ${orders.map(order => {
    const d = new Date(order.createdAt);
    const dateStr = d.toLocaleDateString('ar-SA');
    const timeStr = d.toLocaleTimeString('ar-SA');
    return `
    <div class="invoice-page">
      <div class="header">
        <h3>ملخص طلب موظف</h3>
        <div>رقم الطلب: ${fmtOrderNum(order.orderNumber)}</div>
        <div>التاريخ: ${dateStr} ${timeStr}</div>
      </div>
      <div class="content">
        ${(order.items || []).map((item: any) => `
          <div class="row">
            <span>${item.name || item.coffeeItem?.nameAr}</span>
            <span>${item.quantity}</span>
          </div>
        `).join('')}
        <div class="row total">
          <span>الإجمالي:</span>
          <span>${order.totalAmount} ر.س</span>
        </div>
      </div>
    </div>
    `;
  }).join('')}
</body>
</html>
  `;
  openPrintWindow(html, `Bulk Employee Invoices`, { paperWidth: '80mm', autoPrint: true });
}

function formatDate(dateStr: string): { date: string; time: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { date: dateStr, time: '' };
    }
    return {
      date: d.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    };
  } catch {
    return { date: dateStr, time: '' };
  }
}

export async function printTaxInvoice(data: TaxInvoiceData, config: PrintConfig = {}): Promise<void> {
  const shouldAutoPrint = config.autoPrint !== undefined ? config.autoPrint : true;

  // ── ESC/POS Thermal printing — Full-quality image (Arabic-safe) ──────────────
  // Renders the full receipt HTML (logo + ZATCA QR + proper fonts) as a bitmap
  // and sends pixel data to the printer. No character-encoding issues whatsoever.
  if (shouldAutoPrint) {
    try {
      const { loadPrinterSettings, buildEscPosImageReceipt, thermalPrint } = await import('./thermal-printer');
      const printerSettings = loadPrinterSettings();

      if (printerSettings.enabled && printerSettings.mode !== 'browser') {
        const totalAmountThermal = parseNumber(data.total);
        const subtotalThermal = totalAmountThermal / (1 + VAT_RATE);
        const vatThermal = totalAmountThermal - subtotalThermal;
        const { date: fmtDate, time: fmtTime } = formatDate(data.date);
        const orderTypeStr = (data.orderTypeName || (data.orderType as string) || '');
        const orderTypeThermal =
          orderTypeStr === 'dine_in' || orderTypeStr === 'dine-in' ? 'طاولة' :
          orderTypeStr === 'takeaway' || orderTypeStr === 'pickup' ? 'سفري' :
          orderTypeStr === 'delivery' ? 'توصيل' :
          orderTypeStr === 'car_pickup' || orderTypeStr === 'car-pickup' ? 'سيارة' :
          orderTypeStr;
        const discThermal = data.invoiceDiscount ? parseNumber(data.invoiceDiscount) : 0;
        const orderNumDisplay = String(data.orderNumber).replace(/\D/g, '').padStart(4, '0') || data.orderNumber;

        // ── Fetch logo as base64 (cached) ──────────────────────────────────────
        const thermalLogo = await fetchLogoBase64().catch(() => '');

        // ── Generate ZATCA QR (tax compliance barcode) ─────────────────────────
        const invoiceTs = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
        const zatcaPayload = generateZATCAQRCode({
          sellerName: COMPANY_NAME,
          vatNumber: data.vatNumber || VAT_NUMBER,
          timestamp: invoiceTs,
          totalWithVat: totalAmountThermal.toFixed(2),
          vatAmount: vatThermal.toFixed(2),
        });
        let thermalZatcaQr = '';
        try {
          thermalZatcaQr = await QRCode.toDataURL(zatcaPayload, { width: 160, margin: 1, errorCorrectionLevel: 'M' });
        } catch { /* no QR — still print */ }

        // ── Build items rows — table layout for html2canvas compatibility ────────
        const itemsRowsThermal = data.items.map(item => {
          const up = parseNumber(item.coffeeItem.price);
          const addons = (item.customization?.selectedItemAddons || [])
            .map((a: any) => a.nameAr).join('، ');
          return `
            <div style="padding:6px 0;border-bottom:1.5px dashed #bbb;">
              <div style="font-weight:700;font-size:17px;line-height:1.3;">${item.coffeeItem.nameAr}</div>
              ${addons ? `<div style="font-size:13px;color:#555;margin-top:2px;">+ ${addons}</div>` : ''}
              <table style="width:100%;border-collapse:collapse;margin-top:3px;">
                <tr>
                  <td style="font-size:15px;color:#555;">${item.quantity} × ${up.toFixed(2)}</td>
                  <td style="font-size:15px;font-weight:700;text-align:left;">${(item.quantity * up).toFixed(2)} ر.س</td>
                </tr>
              </table>
            </div>`;
        }).join('');

        // ── Full-quality receipt HTML ───────────────────────────────────────────
        const receiptHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#000;background:#fff;width:100%;}
.sep{border-top:2.5px solid #000;margin:7px 0;}
.dsep{border-top:1.5px dashed #aaa;margin:5px 0;}
.c{text-align:center;}
.tbl{width:100%;border-collapse:collapse;}
.tbl td{padding:3px 0;font-size:15px;vertical-align:middle;}
.tbl td:last-child{text-align:left;font-weight:700;}
</style></head><body>
<div style="padding:8px 10px;">

  <!-- ── Logo / Name ── -->
  ${thermalLogo
    ? `<img src="${thermalLogo}" style="display:block;width:85%;max-height:80px;object-fit:contain;margin:0 auto 6px;" />`
    : `<div class="c" style="font-size:22px;font-weight:700;letter-spacing:2px;">${COMPANY_NAME}</div>`
  }
  ${data.branchName ? `<div class="c" style="font-size:14px;margin-top:3px;">${data.branchName}</div>` : ''}
  <div class="c" style="font-size:13px;color:#444;margin-top:2px;">رقم الضريبة: ${data.vatNumber || VAT_NUMBER}</div>
  <div class="sep"></div>

  <!-- ── Invoice type + number ── -->
  <div class="c" style="font-size:16px;font-weight:700;">فاتورة ضريبية مبسطة</div>
  <div class="c" style="font-size:34px;font-weight:700;letter-spacing:3px;border:2.5px solid #000;margin:5px 0;padding:5px 0;">#${orderNumDisplay}</div>
  <div class="dsep"></div>

  <!-- ── Info rows (table layout — html2canvas safe) ── -->
  <table class="tbl">
    <tr><td>التاريخ:</td><td>${fmtDate} ${fmtTime}</td></tr>
    <tr><td>الكاشير:</td><td>${data.employeeName || '—'}</td></tr>
    ${data.customerName && data.customerName !== 'عميل نقدي' ? `<tr><td>العميل:</td><td>${data.customerName}</td></tr>` : ''}
    ${data.tableNumber ? `<tr><td>الطاولة:</td><td>${data.tableNumber}</td></tr>` : ''}
    ${orderTypeThermal ? `<tr><td>نوع الطلب:</td><td>${orderTypeThermal}</td></tr>` : ''}
  </table>
  <div class="sep"></div>

  <!-- ── Items ── -->
  ${itemsRowsThermal}
  <div class="sep"></div>

  <!-- ── Totals ── -->
  <table class="tbl">
    <tr><td>قبل الضريبة:</td><td>${subtotalThermal.toFixed(2)} ر.س</td></tr>
    <tr><td>ضريبة القيمة المضافة 15%:</td><td>${vatThermal.toFixed(2)} ر.س</td></tr>
    ${discThermal > 0 ? `<tr><td style="color:#16a34a;">الخصم:</td><td style="color:#16a34a;">-${discThermal.toFixed(2)} ر.س</td></tr>` : ''}
  </table>
  <div class="sep"></div>
  <div class="c" style="font-size:24px;font-weight:700;border:3px solid #000;padding:7px 0;margin:5px 0;">*** الإجمالي: ${totalAmountThermal.toFixed(2)} ر.س ***</div>

  <!-- ── Payment ── -->
  <div class="sep"></div>
  <table class="tbl">
    <tr><td>طريقة الدفع:</td><td>${data.paymentMethod}</td></tr>
    ${data.splitPayment ? `<tr><td style="padding-right:10px;">نقدي:</td><td>${data.splitPayment.cash.toFixed(2)} ر.س</td></tr><tr><td style="padding-right:10px;">شبكة:</td><td>${data.splitPayment.card.toFixed(2)} ر.س</td></tr>` : ''}
  </table>

  <!-- ── ZATCA QR ── -->
  ${thermalZatcaQr ? `
  <div class="sep"></div>
  <div class="c" style="margin:6px 0;">
    <img src="${thermalZatcaQr}" style="width:130px;height:130px;display:block;margin:0 auto;" />
    <div style="font-size:12px;color:#555;margin-top:3px;">ZATCA · باركود الضريبة</div>
  </div>` : ''}

  <!-- ── Footer ── -->
  <div class="sep"></div>
  <div class="c" style="font-weight:700;font-size:18px;margin:4px 0;">** شكراً لزيارتكم **</div>
  <div class="c" style="font-size:13px;color:#444;">الأسعار شاملة ضريبة القيمة المضافة 15%</div>
  <div class="c" style="font-size:14px;font-weight:700;margin-top:4px;">${COMPANY_NAME}</div>

</div></body></html>`;

        // ── Kitchen copy ───────────────────────────────────────────────────────
        const kitchenItemsHtml = data.items.map(item => {
          const addons = (item.customization?.selectedItemAddons || [])
            .map((a: any) => a.nameAr).join('، ');
          return `
            <div style="padding:10px 0;border-bottom:2px dashed #000;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="font-size:20px;font-weight:700;line-height:1.4;">${item.coffeeItem.nameAr}${addons ? `<div style="font-size:14px;font-weight:400;margin-top:3px;">+ ${addons}</div>` : ''}</td>
                  <td style="text-align:left;font-size:32px;font-weight:700;border:3px solid #000;padding:2px 10px;white-space:nowrap;width:1%;">x${item.quantity}</td>
                </tr>
              </table>
            </div>`;
        }).join('');

        const kitchenHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#000;background:#fff;width:100%;}</style>
</head><body>
<div style="padding:8px 10px;">
  <div style="text-align:center;font-size:18px;font-weight:700;border:3px solid #000;padding:8px;letter-spacing:2px;margin-bottom:6px;">*** نسخة المطبخ ***</div>
  <div style="text-align:center;font-size:40px;font-weight:700;border:3px solid #000;margin:8px 0;padding:6px;letter-spacing:4px;">#${orderNumDisplay}</div>
  ${data.tableNumber ? `<div style="text-align:center;font-size:22px;font-weight:700;border:2px solid #000;padding:5px;margin-bottom:8px;">طاولة ${data.tableNumber}</div>` : ''}
  ${orderTypeThermal ? `<div style="text-align:center;font-size:18px;font-weight:700;border:1.5px solid #000;padding:4px;margin-bottom:8px;">${orderTypeThermal}</div>` : ''}
  <div style="border-top:3px solid #000;padding-top:5px;">${kitchenItemsHtml}</div>
  <div style="text-align:center;font-size:13px;color:#555;margin-top:10px;border-top:1px dashed #000;padding-top:5px;">الكاشير: ${data.employeeName || '—'} · ${fmtDate} ${fmtTime}</div>
</div></body></html>`;

        const feedLinesCount = printerSettings.feedLines ?? 4;
        const escData = await buildEscPosImageReceipt(receiptHtml, printerSettings.paperWidth, feedLinesCount);
        const result = await thermalPrint(escData, '', printerSettings.paperWidth);

        if (result.success) {
          if (printerSettings.autoKitchenCopy) {
            await new Promise(r => setTimeout(r, 1400));
            const kitchenEsc = await buildEscPosImageReceipt(kitchenHtml, printerSettings.paperWidth, feedLinesCount);
            await thermalPrint(kitchenEsc, '', printerSettings.paperWidth);
          }
          return;
        }

        const errMsg = result.error || 'فشلت الطباعة الحرارية';
        console.error('[PrintTaxInvoice] Hardware print failed — mode:', printerSettings.mode, '— error:', errMsg);
        if (typeof window !== 'undefined' && (window as any).__qiroxPrintError !== undefined) {
          (window as any).__qiroxPrintError(errMsg);
        } else {
          window.dispatchEvent(new CustomEvent('qirox:print-error', { detail: { error: errMsg, mode: printerSettings.mode } }));
        }
        return;
      }
    } catch (e) {
      console.warn('[PrintTaxInvoice] Thermal print error:', e);
    }
  }

  const totalAmount = parseNumber(data.total);

  const codeDiscountAmount = data.discount ? parseNumber(data.discount.amount) : 0;
  const invDiscountAmount = parseNumber(data.invoiceDiscount);
  const itemDiscountsTotal = data.items.reduce((sum, item) => sum + parseNumber(item.itemDiscount), 0);

  const subtotalBeforeTax = totalAmount / (1 + VAT_RATE);
  const vatAmount = totalAmount - subtotalBeforeTax;

  const totalDiscounts = codeDiscountAmount + invDiscountAmount + itemDiscountsTotal;

  const displayInvoiceNumber = fmtOrderNum(data.orderNumber);
  const { date: formattedDate, time: formattedTime } = formatDate(data.date);
  const displayBranchName = data.branchName || DEFAULT_BRANCH;

  const invoiceTimestamp = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const zatcaData = generateZATCAQRCode({
    sellerName: COMPANY_NAME,
    vatNumber: data.vatNumber || VAT_NUMBER,
    timestamp: invoiceTimestamp,
    totalWithVat: totalAmount.toFixed(2),
    vatAmount: vatAmount.toFixed(2)
  });

  let zatcaQrUrl = "";
  try {
    zatcaQrUrl = await QRCode.toDataURL(zatcaData, {
      width: 160,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating ZATCA QR:", error);
  }

  // Tracking QR — links to public order tracking page
  const trackingUrl = `${window.location.origin}/track/${data.orderNumber}`;
  let trackingQrUrl = "";
  try {
    trackingQrUrl = await QRCode.toDataURL(trackingUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating tracking QR:", error);
  }

  // Use base64-embedded logo so it renders instantly in the popup/iframe
  // without waiting for a network request (fixes logo not showing on print).
  // fetchLogoBase64 tries multiple paths (/black-rose-logo.png, /blackrose-logo.png, /logo.png, etc.)
  const logoBase64 = await fetchLogoBase64();
  const logoUrl = logoBase64 || `${window.location.origin}/black-rose-logo.png`;
  const logoHtml = logoUrl
    ? `<img class="logo-img" src="${logoUrl}" alt="Black Rose Cafe" onerror="this.style.display='none'" />`
    : `<div style="font-size:20px;font-weight:800;letter-spacing:2px;margin-bottom:4px;">BLACK ROSE CAFE</div>`;

  const itemsHtml = data.items.map(item => {
    const unitPrice = parseNumber(item.coffeeItem.price);
    const itemDiscount = parseNumber(item.itemDiscount);
    const lineAfterDiscount = unitPrice * item.quantity - itemDiscount;
    const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
    return `
      <tr>
        <td style="padding:3px 2px;font-size:12px;">
          <span style="font-weight:600;">${item.coffeeItem.nameAr}</span>
          ${itemDiscount > 0 ? ` <span style="color:#16a34a;font-size:9px;">(-${itemDiscount.toFixed(2)})</span>` : ''}
          ${addons ? `<div style="font-size:9px;color:#666;margin-top:1px;">+ ${addons}</div>` : ''}
        </td>
        <td style="text-align:center;font-size:12px;">${item.quantity}</td>
        <td style="text-align:center;font-size:12px;">${unitPrice.toFixed(2)}</td>
        <td style="text-align:left;font-size:12px;">${lineAfterDiscount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const orderTypeLabel = data.orderTypeName || (
    (data.orderType as string) === 'dine_in' || (data.orderType as string) === 'dine-in' ? 'طاولة' :
    (data.orderType as string) === 'takeaway' || (data.orderType as string) === 'pickup' ? 'سفري' :
    (data.orderType as string) === 'delivery' ? 'توصيل' :
    (data.orderType as string) === 'car_pickup' || (data.orderType as string) === 'car-pickup' ? 'سيارة' :
    (data.orderType as string) === 'online' ? 'أونلاين' :
    (data.orderType as string) === 'drive_thru' ? 'درايف ثرو' : ''
  );

  // ══════════════════════════════════════════════
  //  فاتورة العميل  (Job 1)
  // ══════════════════════════════════════════════
  const customerHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة العميل - ${displayInvoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', Arial, sans-serif; background: #fff; color: #000; direction: rtl;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 13px; }
    .wrap { width: 76mm; margin: 0 auto; padding: 5px 4px 8px; }

    /* ── Header ── */
    .hdr { text-align: center; padding-bottom: 7px; border-bottom: 2px solid #000; margin-bottom: 7px; }
    .logo-img { width: 60mm; height: auto; display: block; margin: 0 auto 4px; object-fit: contain; }
    .company { font-size: 16px; font-weight: 800; letter-spacing: 1px; }
    .subtitle { font-size: 11px; color: #444; margin-top: 2px; }
    .vat-line { font-size: 10px; font-family: monospace; direction: ltr; color: #333; margin-top: 2px; }
    .branch { font-size: 10px; color: #555; margin-top: 2px; }

    /* ── Invoice number ── */
    .inv-block { text-align: center; margin: 6px 0; padding: 5px 8px; background: #f0f0f0;
                 border-radius: 4px; border: 1.5px solid #ccc; }
    .inv-lbl { font-size: 10px; color: #666; }
    .inv-num { font-size: 22px; font-weight: 700; letter-spacing: 2px; font-family: monospace; direction: ltr; }

    /* ── Info rows ── */
    .info { font-size: 12px; margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px dashed #bbb; }
    .irow { display: flex; justify-content: space-between; padding: 2px 0; }
    .ilbl { color: #555; }
    .ival { font-weight: 600; }

    /* ── Items table ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
    thead tr { border-bottom: 1.5px solid #000; }
    th { padding: 3px 2px; font-size: 11px; font-weight: 700; }
    th:first-child { text-align: right; }
    th:nth-child(2), th:nth-child(3) { text-align: center; width: 28px; }
    th:last-child { text-align: left; width: 50px; }
    td { padding: 3px 2px; }
    td:first-child { text-align: right; }
    td:nth-child(2), td:nth-child(3) { text-align: center; }
    td:last-child { text-align: left; }
    tr { border-bottom: 1px solid #eee; }

    /* ── Totals ── */
    .totals { border-top: 1.5px solid #000; padding-top: 5px; font-size: 12px; }
    .trow { display: flex; justify-content: space-between; padding: 2px 0; }
    .trow.grand { font-size: 15px; font-weight: 700; background: #000; color: #fff;
                  padding: 5px 8px; border-radius: 4px; margin-top: 4px; }
    .trow.disc { color: #16a34a; }

    /* ── Payment ── */
    .pay { display: flex; justify-content: space-between; font-size: 12px;
           background: #f5f5f5; padding: 4px 8px; border-radius: 4px; margin: 5px 0; }
    .pay-val { font-weight: 700; }

    /* ── Tracking QR ── */
    .track-box { text-align: center; margin: 8px 0; border: 1.5px dashed #999;
                 border-radius: 5px; padding: 6px 4px; }
    .track-title { font-size: 12px; font-weight: 700; margin-bottom: 3px; }
    .track-img { width: 100px; height: 100px; display: block; margin: 0 auto; }
    .track-site { font-size: 10px; color: #444; margin-top: 3px; direction: ltr; }

    /* ── Quote ── */
    .quote { text-align: center; margin: 6px 0; padding: 6px 4px;
             border-top: 1px dashed #bbb; border-bottom: 1px dashed #bbb; }
    .quote-text { font-size: 13px; font-weight: 600; color: #1a1a1a; font-style: italic; }
    .quote-brand { font-size: 12px; font-weight: 700; color: #000; margin-top: 2px; letter-spacing: 1px; }

    /* ── ZATCA QR ── */
    .zatca { text-align: center; margin-top: 6px; }
    .zatca img { width: 110px; height: 110px; display: block; margin: 0 auto; }
    .zatca-lbl { font-size: 9px; color: #777; margin-top: 2px; }
    .vat-note { font-size: 10px; color: #555; margin-top: 2px; }

    @media print { body { margin: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
<div class="wrap">

  <!-- ── HEADER ── -->
  <div class="hdr">
    ${logoHtml}
    <div class="company">BLACK ROSE CAFE</div>
    <div class="subtitle">فاتورة ضريبية مبسطة</div>
    <div class="vat-line">VAT: ${data.vatNumber || VAT_NUMBER}</div>
    <div class="branch">${displayBranchName}</div>
  </div>

  <!-- ── INVOICE NUMBER ── -->
  <div class="inv-block">
    <div class="inv-lbl">رقم الفاتورة</div>
    <div class="inv-num">${displayInvoiceNumber}</div>
  </div>

  <!-- ── INFO ── -->
  <div class="info">
    <div class="irow"><span class="ilbl">التاريخ:</span><span class="ival">${formattedDate} ${formattedTime}</span></div>
    ${data.customerName && data.customerName !== 'عميل نقدي' ? `<div class="irow"><span class="ilbl">العميل:</span><span class="ival">${data.customerName}</span></div>` : ''}
    ${data.tableNumber ? `<div class="irow"><span class="ilbl">الطاولة:</span><span class="ival">${data.tableNumber}</span></div>` : ''}
    ${orderTypeLabel ? `<div class="irow"><span class="ilbl">نوع الطلب:</span><span class="ival">${orderTypeLabel}</span></div>` : ''}
  </div>

  <!-- ── ITEMS ── -->
  <table>
    <thead><tr><th>الصنف</th><th>ك</th><th>سعر</th><th>المجموع</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <!-- ── TOTALS ── -->
  <div class="totals">
    ${totalDiscounts > 0 ? `<div class="trow disc"><span>الخصومات:</span><span>-${(totalDiscounts / (1 + VAT_RATE)).toFixed(2)} ر.س</span></div>` : ''}
    <div class="trow"><span>قبل الضريبة:</span><span>${subtotalBeforeTax.toFixed(2)} ر.س</span></div>
    <div class="trow"><span>ضريبة 15%:</span><span>${vatAmount.toFixed(2)} ر.س</span></div>
    <div class="trow grand"><span>الإجمالي:</span><span>${totalAmount.toFixed(2)} ر.س</span></div>
  </div>

  <!-- ── PAYMENT ── -->
  <div class="pay"><span>طريقة الدفع:</span><span class="pay-val">${data.paymentMethod}</span></div>
  ${data.splitPayment ? `
  <div class="pay" style="font-size:11px;padding:2px 10px;"><span>نقدي:</span><span>${data.splitPayment.cash.toFixed(2)} ر.س</span></div>
  <div class="pay" style="font-size:11px;padding:2px 10px;"><span>شبكة:</span><span>${data.splitPayment.card.toFixed(2)} ر.س</span></div>` : ''}

  <!-- ── TRACKING QR ── -->
  ${trackingQrUrl ? `
  <div class="track-box">
    <div class="track-title">باركود تتبع الطلب 📦</div>
    <img class="track-img" src="${trackingQrUrl}" alt="tracking QR" />
    <div class="track-site">${COMPANY_WEBSITE}</div>
  </div>` : ''}

  <!-- ── QUOTE ── -->
  <div class="quote">
    <div class="quote-text">"قهوة تُقال وورد يُهدى"</div>
    <div class="quote-brand">BLACK ROSE</div>
  </div>

  <!-- ── ZATCA QR (الباركود الضريبي) ── -->
  ${zatcaQrUrl ? `
  <div class="zatca">
    <img src="${zatcaQrUrl}" alt="ZATCA QR" />
    <div class="zatca-lbl">رمز الضريبة · ZATCA Verified</div>
    <div class="vat-note">الأسعار شاملة ضريبة القيمة المضافة 15%</div>
  </div>` : ''}

</div>
</body>
</html>`;

  // ══════════════════════════════════════════════
  //  فاتورة الموظف / المطبخ  (Job 2)
  // ══════════════════════════════════════════════
  const empHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نسخة الموظف - ${displayInvoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', Arial, sans-serif; background: #fff; color: #000; direction: rtl; }
    .wrap { width: 76mm; margin: 0 auto; padding: 6px 4px; }
    .ehdr { text-align: center; font-size: 13px; font-weight: 700; background: #000; color: #fff;
            padding: 5px 4px; border-radius: 4px; margin-bottom: 8px; }
    .eorder { font-size: 34px; font-weight: 700; text-align: center; margin: 4px 0;
              letter-spacing: 3px; font-family: monospace; border: 2px solid #000;
              border-radius: 6px; padding: 4px 0; }
    .etable { text-align: center; }
    .etag { display: inline-block; font-size: 20px; font-weight: 700; border: 2px solid #b45309;
            color: #b45309; padding: 3px 14px; border-radius: 5px; margin: 4px auto; }
    .etype { text-align: center; font-size: 14px; font-weight: 700; background: #f0f0f0;
             padding: 4px; border-radius: 4px; margin: 4px 0 8px; }
    .eitems { border-top: 2px dashed #000; margin-top: 4px; padding-top: 4px; }
    .eitem { display: flex; justify-content: space-between; padding: 7px 0;
             border-bottom: 1px dashed #ccc; align-items: flex-start; }
    .ename { font-size: 15px; font-weight: 600; flex: 1; }
    .eaddons { font-size: 10px; color: #555; margin-top: 2px; }
    .eqty { font-size: 22px; font-weight: 700; background: #000; color: #fff;
            padding: 2px 14px; border-radius: 4px; flex-shrink: 0; margin-right: 6px;
            min-width: 48px; text-align: center; }
    .etotal { display: flex; justify-content: space-between; font-weight: 700; font-size: 15px;
              margin-top: 8px; padding-top: 6px; border-top: 1.5px solid #000; }
    .einfo { font-size: 10px; color: #666; text-align: center; margin-top: 8px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
<div class="wrap">
  <div class="ehdr">نسخة الموظف · ملخص الطلب</div>
  <div class="eorder">${displayInvoiceNumber}</div>
  ${data.tableNumber ? `<div class="etable"><span class="etag">طاولة ${data.tableNumber}</span></div>` : ''}
  ${orderTypeLabel ? `<div class="etype">${orderTypeLabel}</div>` : ''}

  <div class="eitems">
    ${data.items.map(item => {
      const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
      return `
      <div class="eitem">
        <div style="flex:1;">
          <div class="ename">${item.coffeeItem.nameAr}</div>
          ${addons ? `<div class="eaddons">+ ${addons}</div>` : ''}
        </div>
        <span class="eqty">x${item.quantity}</span>
      </div>`;
    }).join('')}
  </div>

  <div class="etotal">
    <span>الإجمالي:</span>
    <span>${totalAmount.toFixed(2)} ر.س</span>
  </div>
  <div class="einfo">الكاشير: ${data.employeeName || '—'} | ${formattedDate} ${formattedTime}</div>
</div>
</body>
</html>`;

  // ══════════════════════════════════════════════════════════════
  //  طباعة موحدة: العميل (ص١) + الموظف (ص٢) — مهمة واحدة بلا popups
  //  يحل مشكلة حجب النوافذ المنبثقة ومشكلة ظهور نسخة واحدة فقط
  // ══════════════════════════════════════════════════════════════

  // مساعدتان لاستخلاص محتوى <body> و <style> من مستند HTML كامل
  const _extractBody = (html: string): string => {
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1].trim() : html;
  };
  const _extractStyles = (html: string): string => {
    const out: string[] = [];
    const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) out.push(m[1]);
    return out.join('\n');
  };

  // مستند موحد: فاتورة العميل ثم نسخة الموظف مع فاصل صفحة بينهما
  const _buildCombined = (): string => `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { direction: rtl; font-family: 'Cairo', Arial, sans-serif; color: #000; background: #fff;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${_extractStyles(customerHtml)}
    ${_extractStyles(empHtml)}
    .pb { display: block; page-break-after: always; break-after: page; }
  </style>
</head>
<body>
  <div class="pb">${_extractBody(customerHtml)}</div>
  <div>${_extractBody(empHtml)}</div>
</body></html>`;

  if (shouldAutoPrint) {
    _printQueue.push({ html: _buildCombined(), paperWidth: '80mm', isFullDoc: true });
    _drainPrintQueue();
  } else {
    // وضع المعاينة اليدوية — نافذة واحدة مع زر طباعة موحد
    const combined = _buildCombined();
    const previewHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فواتير الطلب - ${displayInvoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', sans-serif; background: #f0f0f0; padding: 16px; direction: rtl; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 16px; justify-content: center; flex-wrap: wrap; }
    .btn { padding: 10px 24px; font-size: 14px; font-family: 'Cairo', sans-serif; border: none;
           border-radius: 8px; cursor: pointer; font-weight: 700; transition: opacity .2s; }
    .btn:hover { opacity: 0.85; }
    .btn-print { background: #1a1a1a; color: #fff; font-size: 16px; }
    .btn-close  { background: #6b7280; color: #fff; }
    .frames { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
    iframe { border: 1px solid #ccc; background: #fff; border-radius: 4px; box-shadow: 0 2px 8px #0002; }
    h3 { text-align: center; font-size: 11px; color: #555; margin-bottom: 6px; }
    .col { display: flex; flex-direction: column; align-items: center; }
    @media print { body { display: none; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn btn-print" onclick="printBoth()">🖨 طباعة النسختين معاً</button>
    <button class="btn btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
  <div class="frames">
    <div class="col">
      <h3>فاتورة العميل</h3>
      <iframe id="f-customer" width="320" height="600" srcdoc=""></iframe>
    </div>
    <div class="col">
      <h3>نسخة الموظف</h3>
      <iframe id="f-employee" width="320" height="420" srcdoc=""></iframe>
    </div>
  </div>
  <script>
    var _combined = ${JSON.stringify(combined)};
    function printBoth() {
      var f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
      document.body.appendChild(f);
      f.contentDocument.open();
      f.contentDocument.write(_combined);
      f.contentDocument.close();
      setTimeout(function() {
        f.contentWindow.focus();
        f.contentWindow.print();
        f.addEventListener('afterprint', function() { setTimeout(function(){ f.remove(); }, 300); });
        setTimeout(function(){ try{ f.remove(); }catch{} }, 8000);
      }, 250);
    }
    window.addEventListener('load', function() {
      var fc = document.getElementById('f-customer');
      var fe = document.getElementById('f-employee');
      if (fc) { fc.contentDocument.open(); fc.contentDocument.write(${JSON.stringify(customerHtml)}); fc.contentDocument.close(); }
      if (fe) { fe.contentDocument.open(); fe.contentDocument.write(${JSON.stringify(empHtml)}); fe.contentDocument.close(); }
    });
  </script>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=780,height=720,scrollbars=yes,resizable=yes');
    if (win) {
      win.document.write(previewHtml);
      win.document.close();
      win.document.title = `فواتير الطلب - ${displayInvoiceNumber}`;
    }
  }
}

export async function printCustomerPickupReceipt(data: TaxInvoiceData & { deliveryType?: string; deliveryTypeAr?: string }): Promise<void> {
  const orderTrackingUrl = `${window.location.origin}/order/${data.orderNumber}`;
  
  let qrCodeUrl = "";
  try {
    qrCodeUrl = await QRCode.toDataURL(orderTrackingUrl, {
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating order tracking QR:", error);
  }

  const { date: formattedDate, time: formattedTime } = formatDate(data.date);
  const deliveryTypeAr = data.deliveryTypeAr || (data.deliveryType === 'dine-in' ? 'في الكافيه' : data.deliveryType === 'delivery' ? 'توصيل' : 'استلام');

  const receiptHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إيصال استلام - ${data.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt { max-width: 80mm; margin: 0 auto; padding: 16px; }
    .header { text-align: center; border-bottom: 3px solid #b45309; padding-bottom: 16px; margin-bottom: 16px; }
    .company-name { font-size: 28px; font-weight: 700; color: #b45309; }
    .order-badge { display: inline-block; background: #fef3c7; border: 2px solid #b45309; padding: 12px 24px; border-radius: 12px; margin: 16px 0; }
    .order-number { font-size: 32px; font-weight: 700; color: #b45309; }
    .order-type { display: inline-block; background: ${data.deliveryType === 'dine-in' ? '#8b5cf6' : data.deliveryType === 'delivery' ? '#10b981' : '#3b82f6'}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 16px; font-weight: 600; margin-top: 8px; }
    .section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #ccc; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .items-section { background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .item-row:last-child { border-bottom: none; }
    .item-name { font-weight: 600; }
    .item-qty { background: #000; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 14px; }
    .total-section { background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 16px; }
    .total-amount { font-size: 28px; font-weight: 700; color: #b45309; }
    .qr-section { text-align: center; padding: 16px; border: 2px dashed #b45309; border-radius: 12px; background: #fffbeb; }
    .qr-title { font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 8px; }
    .qr-container img { width: 120px; height: 120px; }
    .qr-note { font-size: 11px; color: #666; margin-top: 8px; }
    .footer { text-align: center; padding-top: 16px; font-size: 12px; color: #666; }
    @media print { body { margin: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1 class="company-name">${COMPANY_NAME}</h1>
      <p style="color: #666; font-size: 14px;">إيصال الاستلام</p>
      <div class="order-badge">
        <div class="order-number">${fmtOrderNum(data.orderNumber)}</div>
      </div>
      <div class="order-type">${deliveryTypeAr}</div>
    </div>

    <div class="section">
      <div class="info-row">
        <span>العميل:</span>
        <span style="font-weight: 600;">${data.customerName}</span>
      </div>
      <div class="info-row">
        <span>التاريخ:</span>
        <span>${formattedDate} - ${formattedTime}</span>
      </div>
      ${data.tableNumber ? `
      <div class="info-row">
        <span>الطاولة:</span>
        <span style="font-weight: 700; font-size: 18px;">${data.tableNumber}</span>
      </div>
      ` : ''}
    </div>

    <div class="items-section">
      ${data.items.map(item => {
        const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
        return `
        <div class="item-row" style="align-items:flex-start;">
          <div class="item-name" style="flex:1;">
            ${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}
            ${addons ? `<div style="font-size:11px;color:#92400e;margin-top:2px;">+ ${addons}</div>` : ''}
          </div>
          <span class="item-qty">x${item.quantity}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="total-section">
      <p style="font-size: 14px; color: #92400e;">الإجمالي المدفوع</p>
      <p class="total-amount">${data.total} ر.س</p>
      <p style="font-size: 12px; color: #666; margin-top: 4px;">${data.paymentMethod}</p>
    </div>

    <div class="qr-section">
      <p class="qr-title">امسح لتتبع طلبك</p>
      ${qrCodeUrl ? `<div class="qr-container"><img src="${qrCodeUrl}" alt="Order Tracking QR" /></div>` : ''}
      <p class="qr-note">أو زر الرابط: blackrose.com.sa/order/${data.orderNumber}</p>
    </div>

    <div class="footer">
      <p style="font-weight: 600;">شكراً لزيارتكم</p>
      <p>نتمنى لكم تجربة ممتعة</p>
      <p style="margin-top: 8px;">@BLACK ROSE CAFE</p>
    </div>
  </div>
</body>
</html>
  `;

  openPrintWindow(receiptHtml, `إيصال استلام - ${data.orderNumber}`, { paperWidth: '80mm', autoPrint: true, showPrintButton: true });
}

export async function printCashierReceipt(data: TaxInvoiceData & { deliveryType?: string; deliveryTypeAr?: string }): Promise<void> {
  const { date: formattedDate, time: formattedTime } = formatDate(data.date);
  const deliveryTypeAr = data.deliveryTypeAr || (data.deliveryType === 'dine-in' ? 'في الكافيه' : data.deliveryType === 'delivery' ? 'توصيل' : 'استلام');
  const totalAmount = parseNumber(data.total);

  const receiptHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نسخة الكاشير - ${data.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; direction: rtl; }
    .receipt { max-width: 80mm; margin: 0 auto; padding: 12px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
    .title { font-size: 14px; font-weight: 700; background: #000; color: #fff; padding: 4px 12px; display: inline-block; margin-bottom: 8px; }
    .order-number { font-size: 24px; font-weight: 700; }
    .order-type { font-size: 14px; font-weight: 600; color: #666; }
    .section { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #999; font-size: 12px; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .items { font-size: 12px; }
    .item-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .totals { font-size: 12px; margin-top: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .total-grand { font-size: 16px; font-weight: 700; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
    .signature { margin-top: 24px; border-top: 1px solid #000; padding-top: 8px; }
    .signature-line { border-bottom: 1px solid #000; height: 30px; margin-top: 12px; }
    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 12px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <span class="title">نسخة الكاشير</span>
      <div class="order-number">${fmtOrderNum(data.orderNumber)}</div>
      <div class="order-type">${deliveryTypeAr}</div>
    </div>

    <div class="section">
      <div class="info-row"><span>التاريخ:</span><span>${formattedDate}</span></div>
      <div class="info-row"><span>الوقت:</span><span>${formattedTime}</span></div>
      <div class="info-row"><span>الكاشير:</span><span>${data.employeeName}</span></div>
      <div class="info-row"><span>العميل:</span><span>${data.customerName}</span></div>
      <div class="info-row"><span>الجوال:</span><span>${data.customerPhone}</span></div>
      ${data.tableNumber ? `<div class="info-row"><span>الطاولة:</span><span>${data.tableNumber}</span></div>` : ''}
    </div>

    <div class="items">
      ${data.items.map(item => {
        const price = parseNumber(item.coffeeItem.price);
        const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
        return `
        <div class="item-row" style="align-items:flex-start;">
          <div style="flex:1;">
            ${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}<span style="font-size:11px;color:#555;"> x${item.quantity}</span>
            ${addons ? `<div style="font-size:10px;color:#777;margin-top:2px;">+ ${addons}</div>` : ''}
          </div>
          <span style="flex-shrink:0;">${(price * item.quantity).toFixed(2)}</span>
        </div>
        `;
      }).join('')}
    </div>

    <div class="totals">
      <div class="total-row"><span>المجموع الفرعي:</span><span>${data.subtotal} ر.س</span></div>
      ${data.discount ? `<div class="total-row" style="color: green;"><span>الخصم (${data.discount.percentage}%):</span><span>-${data.discount.amount} ر.س</span></div>` : ''}
      <div class="total-row total-grand"><span>الإجمالي:</span><span>${totalAmount.toFixed(2)} ر.س</span></div>
      <div class="total-row"><span>طريقة الدفع:</span><span>${data.paymentMethod}</span></div>
      ${data.splitPayment ? `
      <div class="total-row" style="font-size:11px;"><span>نقدي:</span><span>${data.splitPayment.cash.toFixed(2)} ر.س</span></div>
      <div class="total-row" style="font-size:11px;"><span>شبكة:</span><span>${data.splitPayment.card.toFixed(2)} ر.س</span></div>` : ''}
    </div>

    <div class="signature">
      <p style="font-size: 11px;">توقيع العميل (للدفع بالبطاقة):</p>
      <div class="signature-line"></div>
    </div>

    <div class="footer">
      <p>تم الحفظ في ${formattedTime} - ${formattedDate}</p>
    </div>
  </div>
</body>
</html>
  `;

  openPrintWindow(receiptHtml, `نسخة الكاشير - ${data.orderNumber}`, { paperWidth: '80mm', autoPrint: true, showPrintButton: true });
}

export async function printAllReceipts(data: TaxInvoiceData & { deliveryType?: string; deliveryTypeAr?: string }): Promise<void> {
  // Try thermal printer (WebUSB) first
  try {
    const { loadPrinterSettings, buildEscPosReceipt, buildEscPosKitchenTicket, thermalPrint } = await import('./thermal-printer');
    const printerSettings = loadPrinterSettings();

    if (printerSettings.enabled && printerSettings.autoPrint) {
      const { date: fmtDate, time: fmtTime } = formatDate(data.date);
      const dateStr = `${fmtDate} ${fmtTime}`;
      const totalAmount = parseNumber(data.total);
      const subtotalBeforeTax = totalAmount / (1 + VAT_RATE);
      const vatAmount = totalAmount - subtotalBeforeTax;

      const orderTypeLabel = data.orderTypeName || (data.orderType === 'dine_in' ? 'محلي' : data.orderType === 'takeaway' ? 'سفري' : data.orderType === 'delivery' ? 'توصيل' : data.deliveryTypeAr || '');

      // Build ESC/POS receipt
      const escData = buildEscPosReceipt({
        shopName: COMPANY_NAME,
        vatNumber: data.vatNumber || VAT_NUMBER,
        branchName: data.branchName,
        address: data.branchAddress,
        orderNumber: data.orderNumber,
        date: dateStr,
        cashierName: data.employeeName,
        customerName: data.customerName !== 'عميل نقدي' ? data.customerName : undefined,
        tableNumber: data.tableNumber,
        orderType: orderTypeLabel || undefined,
        items: data.items.map(item => ({
          name: item.coffeeItem.nameAr,
          qty: item.quantity,
          price: parseNumber(item.coffeeItem.price),
          addons: (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr),
        })),
        subtotal: subtotalBeforeTax,
        vat: vatAmount,
        total: totalAmount,
        discount: data.invoiceDiscount ? parseNumber(data.invoiceDiscount) : undefined,
        paymentMethod: data.paymentMethod,
        paperWidth: printerSettings.paperWidth,
        feedLines: printerSettings.feedLines,
      });

      // pass empty fallbackHtml so browser fallback does nothing here —
      // we handle browser printing separately with the new format below
      const result = await thermalPrint(escData, '', printerSettings.paperWidth);
      console.log('[PrintAllReceipts] Result:', result.mode, result.success);

      if (result.mode === 'webusb' || result.mode === 'network') {
        // Hardware print succeeded — handle kitchen copy if needed
        if (result.mode === 'webusb' && printerSettings.autoKitchenCopy) {
          await new Promise(r => setTimeout(r, 1200));
          const kitchenEsc = buildEscPosKitchenTicket({
            orderNumber: data.orderNumber,
            tableNumber: data.tableNumber,
            orderType: orderTypeLabel || undefined,
            cashierName: data.employeeName,
            items: data.items.map(item => ({
              name: item.coffeeItem.nameAr,
              qty: item.quantity,
              addons: (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr),
            })),
            paperWidth: printerSettings.paperWidth,
          });
          const { thermalPrint: tp2 } = await import('./thermal-printer');
          await tp2(kitchenEsc, '', printerSettings.paperWidth);
        }
        return; // Hardware handled it — done
      }
      // mode === 'browser' or 'error': fall through to new-format HTML printing below
    }
  } catch (e) {
    console.error('[PrintAllReceipts] Thermal printer error, falling back:', e);
  }

  // Browser fallback — use the new ZATCA-compliant tax invoice format
  await printUnifiedReceipt(data as any);
}

export async function printSimpleReceipt(data: TaxInvoiceData): Promise<void> {
  const itemsHtml = data.items.map(item => {
    const unitPrice = parseNumber(item.coffeeItem.price);
    const lineTotal = unitPrice * item.quantity;
    const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
    return `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 8px 4px;">
          ${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}
          ${addons ? `<div style="font-size:11px;color:#666;margin-top:2px;">+ ${addons}</div>` : ''}
        </td>
        <td style="padding: 8px 4px; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 4px; text-align: left;">${lineTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const trackingUrl = `${window.location.origin}/tracking?order=${data.orderNumber}`;
  let trackingQRCode = "";
  try {
    trackingQRCode = await QRCode.toDataURL(trackingUrl, {
      width: 100,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating tracking QR code:", error);
  }

  const receiptHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إيصال - ${data.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Cairo', sans-serif;
      background: #fff;
      color: #000;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt {
      max-width: 80mm;
      margin: 0 auto;
      padding: 16px;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px dashed #333;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    
    .company-name { font-size: 24px; font-weight: 700; }
    .company-name-en { font-size: 14px; color: #666; }
    .order-num-block { text-align: center; margin: 12px 0; padding: 10px; background: #f0f0f0; border-radius: 6px; border: 1.5px solid #ccc; }
    .order-num-label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .order-num-value { font-size: 26px; font-weight: 700; letter-spacing: 1px; color: #000; font-family: monospace; direction: ltr; }
    
    .section {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #ccc;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }
    
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { padding: 8px 4px; font-weight: 700; border-bottom: 2px solid #333; }
    th:first-child { text-align: right; }
    th:nth-child(2) { text-align: center; }
    th:last-child { text-align: left; }
    
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #333; padding-top: 12px; }
    
    .footer { text-align: center; padding-top: 16px; border-top: 2px dashed #333; }
    
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1 class="company-name">${COMPANY_NAME}</h1>
      <p class="company-name-en">${COMPANY_NAME_EN}</p>
      <p style="margin-top: 8px; font-size: 12px;">فاتورة مبيعات</p>
    </div>

    <div class="order-num-block">
      <div class="order-num-label">رقم الطلب</div>
      <div class="order-num-value">${fmtOrderNum(data.orderNumber)}</div>
    </div>

    <div class="section">
      <div class="info-row">
        <span>التاريخ:</span>
        <span>${data.date}</span>
      </div>
      <div class="info-row">
        <span>العميل:</span>
        <span>${data.customerName}</span>
      </div>
      <div class="info-row">
        <span>الجوال:</span>
        <span>${data.customerPhone}</span>
      </div>
      ${data.tableNumber ? `
      <div class="info-row">
        <span>الطاولة:</span>
        <span>${data.tableNumber}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span>الكاشير:</span>
        <span>${data.employeeName}</span>
      </div>
    </div>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div>
      <div class="total-row">
        <span>المجموع الفرعي:</span>
        <span>${data.subtotal} ريال</span>
      </div>
      ${data.discount ? `
      <div class="total-row" style="color: #16a34a;">
        <span>الخصم (${data.discount.code} - ${data.discount.percentage}%):</span>
        <span>-${data.discount.amount} ريال</span>
      </div>
      ` : ''}
      <div class="total-row grand">
        <span>الإجمالي:</span>
        <span>${data.total} ريال</span>
      </div>
      <div class="total-row" style="margin-top: 12px;">
        <span>طريقة الدفع:</span>
        <span><strong>${data.paymentMethod}</strong></span>
      </div>
    </div>

    ${trackingQRCode ? `
    <div style="text-align: center; padding: 16px 0; border-top: 2px dashed #333; margin-top: 16px;">
      <p style="font-size: 12px; color: #666; margin-bottom: 8px;">امسح لتتبع طلبك</p>
      <img src="${trackingQRCode}" alt="تتبع الطلب" style="width: 80px; height: 80px;" />
      <p style="font-size: 10px; color: #888; margin-top: 4px;">رقم الطلب: ${fmtOrderNum(data.orderNumber)}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>شكراً لزيارتكم</p>
      <p style="font-size: 12px; color: #666;">نتمنى لكم تجربة ممتعة</p>
      <p style="margin-top: 12px; font-size: 12px;">تابعونا على وسائل التواصل الاجتماعي</p>
      <p style="font-family: monospace;">@BLACK ROSE CAFE</p>
    </div>
  </div>

</body>
</html>
  `;

  openPrintWindow(receiptHtml, `إيصال - ${data.orderNumber}`, { 
    paperWidth: '80mm', 
    autoPrint: true, 
    showPrintButton: true 
  });
}
