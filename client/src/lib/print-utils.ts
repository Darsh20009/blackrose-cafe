import QRCode from "qrcode";
import { VAT_RATE } from "@/lib/constants";

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
    // Small delay so thermal printer finishes before iframe is removed
    setTimeout(() => {
      iframe.remove();
      _isPrinting = false;
      // Allow 1.5 s before next job so printer can cut
      setTimeout(_drainPrintQueue, 1500);
    }, 300);
  };

  iframeWin.addEventListener('afterprint', cleanup, { once: true });

  // Give the iframe time to render fonts + images before printing
  setTimeout(() => {
    try {
      iframeWin.focus();
      iframeWin.print();
    } catch {
      // ignore — some browsers block print() without user gesture in iframes
    }
    // Fallback: if afterprint never fires (mobile Safari etc.), clean up after 8 s
    setTimeout(cleanup, 8000);
  }, 500);
}

function _drainPrintQueue() {
  if (_isPrinting || _printQueue.length === 0) return;
  _isPrinting = true;
  const { html, paperWidth, isFullDoc } = _printQueue.shift()!;
  _printViaIframe(html, paperWidth, isFullDoc);
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
      <div class="order-number">${data.orderNumber}</div>
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
const COMPANY_CR = "1163184110";
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
  const totalAmount = parseNumber(data.total);
  const { date: formattedDate, time: formattedTime } = formatDate(data.date);
  const orderTypeLabel = data.orderTypeName || (data.orderType === 'dine_in' ? 'محلي' : data.orderType === 'takeaway' ? 'سفري' : data.orderType === 'delivery' ? 'توصيل' : '');

  const subtotalBeforeTax = totalAmount / (1 + VAT_RATE);
  const vatAmount = totalAmount - subtotalBeforeTax;

  const invoiceTimestamp = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const zatcaData = generateZATCAQRCode({
    sellerName: COMPANY_NAME,
    vatNumber: data.vatNumber || VAT_NUMBER,
    timestamp: invoiceTimestamp,
    totalWithVat: totalAmount.toFixed(2),
    vatAmount: vatAmount.toFixed(2)
  });

  let qrCodeUrl = "";
  try {
    qrCodeUrl = await QRCode.toDataURL(zatcaData, {
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
  }

  const customerItemsHtml = data.items.map(item => {
    const lineTotal = parseNumber(item.coffeeItem.price) * item.quantity;
    const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
    return `
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #eee;align-items:flex-start;font-size:12px;">
      <div style="flex:1;padding-left:4px;">
        ${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}
        ${addons ? `<div style="font-size:10px;color:#666;margin-top:1px;">+ ${addons}</div>` : ''}
      </div>
      <div style="width:32px;text-align:center;flex-shrink:0;">x${item.quantity}</div>
      <div style="width:60px;text-align:left;flex-shrink:0;">${lineTotal.toFixed(2)}</div>
    </div>`;
  }).join('');

  const kitchenItemsHtml = data.items.map(item => {
    const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
    return `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd;align-items:flex-start;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;">${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}</div>
        ${addons ? `<div style="font-size:10px;color:#555;margin-top:2px;">+ ${addons}</div>` : ''}
      </div>
      <span style="font-size:18px;font-weight:700;background:#000;color:#fff;padding:2px 12px;border-radius:4px;min-width:44px;text-align:center;flex-shrink:0;margin-right:4px;">x${item.quantity}</span>
    </div>`;
  }).join('');

  // ملف HTML واحد — نسختان مفصولتان بـ page-break-after
  const unifiedHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة - ${data.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; direction: rtl; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: 80mm; margin: 0 auto; padding: 8px; }
    /* ↓ هذا هو السر: قطع الورق بعد نسخة العميل */
    .customer-copy { page-break-after: always; break-after: page; }
    .hdr { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
    .company { font-size: 18px; font-weight: 700; }
    .vat-num { font-size: 10px; font-family: monospace; direction: ltr; color: #333; }
    .info { font-size: 11px; margin-bottom: 6px; padding-bottom: 5px; border-bottom: 1px dashed #ccc; }
    .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals { border-top: 1.5px solid #000; padding-top: 5px; margin-top: 6px; font-size: 11px; }
    .t-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .t-row.grand { font-size: 14px; font-weight: 700; background: #f0f0f0; padding: 5px 8px; border-radius: 4px; margin-top: 4px; }
    .payment { display:flex;justify-content:space-between;font-size:11px;background:#f5f5f5;padding:4px 8px;border-radius:4px;margin:5px 0; }
    .qr { text-align: center; margin: 6px 0; }
    .qr img { width: 110px; height: 110px; }
    .footer { text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #ccc; padding-top: 5px; margin-top: 5px; }
    /* نسخة الموظف */
    .k-header { text-align: center; font-size: 13px; font-weight: 700; background: #000; color: #fff; padding: 4px; border-radius: 4px; margin-bottom: 8px; }
    .k-order { font-size: 28px; font-weight: 700; text-align: center; margin: 6px 0; letter-spacing: 2px; }
    .k-table { text-align: center; }
    .k-table span { font-size: 18px; font-weight: 700; border: 2px solid #b45309; color: #b45309; padding: 3px 12px; border-radius: 6px; display: inline-block; margin: 3px 0; }
    .k-type { text-align: center; font-size: 12px; font-weight: 600; background: #f0f0f0; padding: 3px; border-radius: 4px; margin-bottom: 6px; }
    .k-info { font-size: 10px; color: #666; text-align: center; margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 6px; }
    @media print { body { margin: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <!-- ════ صفحة 1: نسخة العميل (فاتورة ضريبية) ════ -->
  <div class="customer-copy page">
    <div class="hdr">
      <div class="company">${COMPANY_NAME}</div>
      <div style="font-size:10px;color:#555;">فاتورة ضريبية مبسطة</div>
      <div class="vat-num">VAT: ${data.vatNumber || VAT_NUMBER}</div>
      ${(data.crNumber || COMPANY_CR) ? `<div class="vat-num">CR: ${data.crNumber || COMPANY_CR}</div>` : ''}
    </div>

    <div style="text-align:center;margin:6px 0;padding:6px;background:#f0f0f0;border-radius:6px;border:1.5px solid #ccc;">
      <div style="font-size:9px;color:#666;">رقم الطلب</div>
      <div style="font-size:20px;font-weight:700;font-family:monospace;direction:ltr;">${data.orderNumber}</div>
    </div>

    <div class="info">
      <div class="info-row"><span style="color:#666;">التاريخ:</span><span style="font-weight:600;">${formattedDate} ${formattedTime}</span></div>
      ${data.customerName && data.customerName !== 'عميل نقدي' ? `<div class="info-row"><span style="color:#666;">العميل:</span><span style="font-weight:600;">${data.customerName}</span></div>` : ''}
      ${data.tableNumber ? `<div class="info-row"><span style="color:#666;">طاولة:</span><span style="font-weight:600;">${data.tableNumber}</span></div>` : ''}
      ${orderTypeLabel ? `<div class="info-row"><span style="color:#666;">نوع الطلب:</span><span style="font-weight:600;">${orderTypeLabel}</span></div>` : ''}
    </div>

    <div>${customerItemsHtml}</div>

    <div class="totals">
      <div class="t-row"><span>قبل الضريبة:</span><span>${subtotalBeforeTax.toFixed(2)} ر.س</span></div>
      <div class="t-row"><span>ضريبة القيمة المضافة 15%:</span><span>${vatAmount.toFixed(2)} ر.س</span></div>
      <div class="t-row grand"><span>الإجمالي:</span><span>${totalAmount.toFixed(2)} ر.س</span></div>
    </div>

    <div class="payment"><span>الدفع:</span><span style="font-weight:700;">${data.paymentMethod}</span></div>

    ${qrCodeUrl ? `<div class="qr"><img src="${qrCodeUrl}" alt="ZATCA QR" /><div style="font-size:9px;color:#888;margin-top:2px;">رمز التحقق - ZATCA</div></div>` : ''}

    <div class="footer">
      <div><b>شكراً لزيارتكم</b></div>
      <div>الأسعار شاملة ضريبة القيمة المضافة 15%</div>
    </div>
  </div>

  <!-- ════ صفحة 2: نسخة الموظف (بدون أسعار) ════ -->
  <div class="page">
    <div class="k-header">نسخة الموظف - ملخص الطلب</div>
    <div class="k-order">${data.orderNumber}</div>
    ${data.tableNumber ? `<div class="k-table"><span>طاولة ${data.tableNumber}</span></div>` : ''}
    ${orderTypeLabel ? `<div class="k-type">${orderTypeLabel}</div>` : ''}
    <div>${kitchenItemsHtml}</div>
    <div class="k-info">الكاشير: ${data.employeeName} | ${formattedTime}</div>
  </div>
</body>
</html>`;

  openPrintWindow(unifiedHtml, `فاتورة - ${data.orderNumber}`, { paperWidth: '80mm', autoPrint: true });
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
        <div>رقم الطلب: ${order.orderNumber}</div>
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
  const totalAmount = parseNumber(data.total);
  
  const codeDiscountAmount = data.discount ? parseNumber(data.discount.amount) : 0;
  const invDiscountAmount = parseNumber(data.invoiceDiscount);
  const itemDiscountsTotal = data.items.reduce((sum, item) => sum + parseNumber(item.itemDiscount), 0);
  
  const subtotalBeforeTax = totalAmount / (1 + VAT_RATE);
  const vatAmount = totalAmount - subtotalBeforeTax;
  
  const totalDiscounts = codeDiscountAmount + invDiscountAmount + itemDiscountsTotal;
  const subtotalBeforeAllDiscounts = subtotalBeforeTax + (totalDiscounts / (1 + VAT_RATE));
  
  const displayInvoiceNumber = data.invoiceNumber || `INV-${data.orderNumber}`;
  const { date: formattedDate, time: formattedTime } = formatDate(data.date);
  const displayBranchName = data.branchName || DEFAULT_BRANCH;
  const displayBranchAddress = data.branchAddress || DEFAULT_ADDRESS;

  const invoiceTimestamp = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const zatcaData = generateZATCAQRCode({
    sellerName: COMPANY_NAME,
    vatNumber: data.vatNumber || VAT_NUMBER,
    timestamp: invoiceTimestamp,
    totalWithVat: totalAmount.toFixed(2),
    vatAmount: vatAmount.toFixed(2)
  });

  let qrCodeUrl = "";
  try {
    qrCodeUrl = await QRCode.toDataURL(zatcaData, {
      width: 180,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
  }

  // Generate tracking QR code
  const trackingUrl = `${window.location.origin}/tracking/${data.orderNumber}`;
  let trackingQrUrl = "";
  try {
    trackingQrUrl = await QRCode.toDataURL(trackingUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error("Error generating tracking QR:", error);
  }

  const itemsHtml = data.items.map(item => {
    const unitPrice = parseNumber(item.coffeeItem.price);
    const lineTotal = unitPrice * item.quantity;
    const itemDiscount = parseNumber(item.itemDiscount);
    const lineAfterDiscount = lineTotal - itemDiscount;
    const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
    return `
      <tr>
        <td style="padding:3px 2px;">
          ${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}${itemDiscount > 0 ? ` <span style="color:#16a34a;font-size:9px;">(-${itemDiscount.toFixed(2)})</span>` : ''}
          ${addons ? `<div style="font-size:9px;color:#666;margin-top:1px;">+ ${addons}</div>` : ''}
        </td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:center;">${unitPrice.toFixed(2)}</td>
        <td style="text-align:left;">${lineAfterDiscount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const orderTypeLabel = data.orderTypeName || (data.orderType === 'dine_in' ? 'محلي' : data.orderType === 'takeaway' ? 'سفري' : data.orderType === 'delivery' ? 'توصيل' : '');

  const invoiceHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ضريبية - ${displayInvoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt { max-width: 80mm; margin: 0 auto; padding: 8px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
    .company { font-size: 20px; font-weight: 700; }
    .subtitle { font-size: 11px; color: #555; }
    .vat-num { font-size: 10px; font-family: monospace; direction: ltr; color: #333; }
    .invoice-num-block { text-align: center; margin: 8px 0; padding: 8px; background: #f0f0f0; border-radius: 6px; border: 1.5px solid #ccc; }
    .invoice-num-label { font-size: 10px; color: #666; margin-bottom: 2px; }
    .invoice-num-value { font-size: 22px; font-weight: 700; letter-spacing: 1px; color: #000; font-family: monospace; direction: ltr; }
    .info { font-size: 11px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #ccc; }
    .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .info-label { color: #666; }
    .info-val { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px; }
    thead tr { border-bottom: 1.5px solid #000; }
    th { padding: 4px 2px; font-weight: 700; font-size: 10px; }
    th:first-child { text-align: right; }
    th:nth-child(2) { text-align: center; width: 30px; }
    th:nth-child(3) { text-align: center; width: 45px; }
    th:last-child { text-align: left; width: 55px; }
    td { padding: 3px 2px; }
    td:first-child { text-align: right; font-weight: 500; }
    td:nth-child(2) { text-align: center; }
    td:nth-child(3) { text-align: center; }
    td:last-child { text-align: left; font-weight: 500; }
    tr { border-bottom: 1px solid #eee; }
    .totals { border-top: 1.5px solid #000; padding-top: 6px; font-size: 11px; }
    .t-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .t-row.grand { font-size: 14px; font-weight: 700; background: #f0f0f0; padding: 6px 8px; border-radius: 4px; margin-top: 4px; }
    .t-row.discount { color: #16a34a; }
    .payment { display: flex; justify-content: space-between; font-size: 11px; background: #f5f5f5; padding: 4px 8px; border-radius: 4px; margin: 6px 0; }
    .payment .val { font-weight: 700; }
    .qr { text-align: center; margin: 8px 0; }
    .qr img { width: 110px; height: 110px; }
    .qr-note { font-size: 9px; color: #888; margin-top: 2px; }
    .footer { text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 6px; }
    .footer b { color: #000; }
    .emp-section { padding: 8px; }
    .emp-header { text-align: center; font-size: 13px; font-weight: 700; background: #000; color: #fff; padding: 4px; border-radius: 4px; margin-bottom: 8px; }
    .emp-order { font-size: 28px; font-weight: 700; text-align: center; margin: 6px 0; letter-spacing: 2px; }
    .emp-table { text-align: center; font-size: 18px; font-weight: 700; border: 2px solid #b45309; color: #b45309; padding: 4px 12px; border-radius: 6px; display: inline-block; margin: 4px auto; }
    .emp-type { text-align: center; font-size: 12px; font-weight: 600; background: #f0f0f0; padding: 3px; border-radius: 4px; margin-bottom: 6px; }
    .emp-items { font-size: 12px; }
    .emp-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #ddd; align-items: flex-start; }
    .emp-item-name { font-weight: 600; flex: 1; font-size: 13px; }
    .emp-item-addons { font-size: 10px; color: #555; margin-top: 2px; }
    .emp-item-qty { font-size: 18px; font-weight: 700; background: #000; color: #fff; padding: 2px 12px; border-radius: 4px; min-width: 44px; text-align: center; flex-shrink: 0; margin-right: 4px; }
    .emp-total { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; margin-top: 6px; padding-top: 6px; border-top: 1.5px solid #000; }
    .emp-info { font-size: 10px; color: #666; text-align: center; margin-top: 8px; }
    .customer-copy { page-break-after: always; break-after: page; }
    @media print { body { margin: 0; } .no-print { display: none !important; } .receipt { padding: 4px; } }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- صفحة 1: نسخة العميل — الطابعة تقطع بعدها تلقائياً -->
    <div class="customer-copy">
    <div class="header">
      <div class="company">${COMPANY_NAME}</div>
      <div class="subtitle">فاتورة ضريبية مبسطة</div>
      <div class="vat-num">VAT: ${data.vatNumber || VAT_NUMBER}</div>
      ${(data.crNumber || COMPANY_CR) ? `<div class="vat-num">CR: ${data.crNumber || COMPANY_CR}</div>` : ''}
    </div>

    <div class="invoice-num-block">
      <div class="invoice-num-label">رقم الفاتورة</div>
      <div class="invoice-num-value">${displayInvoiceNumber}</div>
    </div>

    <div class="info">
      <div class="info-row"><span class="info-label">التاريخ:</span><span class="info-val">${formattedDate} ${formattedTime}</span></div>
      ${data.customerName && data.customerName !== 'عميل نقدي' ? `<div class="info-row"><span class="info-label">العميل:</span><span class="info-val">${data.customerName}</span></div>` : ''}
      ${data.tableNumber ? `<div class="info-row"><span class="info-label">طاولة:</span><span class="info-val">${data.tableNumber}</span></div>` : ''}
      ${orderTypeLabel ? `<div class="info-row"><span class="info-label">نوع الطلب:</span><span class="info-val">${orderTypeLabel}</span></div>` : ''}
    </div>

    <table>
      <thead><tr><th>الصنف</th><th>ك</th><th>السعر</th><th>المجموع</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div class="totals">
      ${totalDiscounts > 0 ? `<div class="t-row discount"><span>الخصومات:</span><span>-${(totalDiscounts / (1 + VAT_RATE)).toFixed(2)} ر.س</span></div>` : ''}
      <div class="t-row"><span>قبل الضريبة:</span><span>${subtotalBeforeTax.toFixed(2)} ر.س</span></div>
      <div class="t-row"><span>ضريبة القيمة المضافة 15%:</span><span>${vatAmount.toFixed(2)} ر.س</span></div>
      <div class="t-row grand"><span>الإجمالي:</span><span>${totalAmount.toFixed(2)} ر.س</span></div>
    </div>

    <div class="payment"><span>الدفع:</span><span class="val">${data.paymentMethod}</span></div>

    ${qrCodeUrl ? `
    <div class="qr">
      <img src="${qrCodeUrl}" alt="ZATCA QR" />
      <div class="qr-note">رمز التحقق - ZATCA</div>
    </div>
    ` : ''}

    <div class="footer">
      <div><b>شكراً لزيارتكم</b></div>
      <div>الأسعار شاملة ضريبة القيمة المضافة 15%</div>
      <div>فاتورة إلكترونية</div>
    </div>
    </div><!-- end customer-copy — الطابعة تقطع هنا ✂️ -->

    <!-- صفحة 2: نسخة الموظف/المطبخ — بدون أسعار -->
    <div class="emp-section">
      <div class="emp-header">نسخة الموظف - ملخص الطلب</div>
      <div class="emp-order">${data.orderNumber}</div>
      ${data.tableNumber ? `<div style="text-align:center;"><span class="emp-table">طاولة ${data.tableNumber}</span></div>` : ''}
      ${orderTypeLabel ? `<div class="emp-type">${orderTypeLabel}</div>` : ''}
      
      <div class="emp-items">
        ${data.items.map(item => {
          const addons = (item.customization?.selectedItemAddons || []).map((a: any) => a.nameAr).join('، ');
          return `
          <div class="emp-item">
            <div style="flex:1;">
              <div class="emp-item-name">${renderItemName(item.coffeeItem.nameAr, item.coffeeItem.nameEn)}</div>
              ${addons ? `<div class="emp-item-addons">+ ${addons}</div>` : ''}
            </div>
            <span class="emp-item-qty">x${item.quantity}</span>
          </div>`;
        }).join('')}
      </div>
      
      <div class="emp-info">
        <div>الكاشير: ${data.employeeName} | ${formattedTime}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  openPrintWindow(invoiceHtml, `فاتورة ضريبية - ${displayInvoiceNumber}`, { 
    paperWidth: '80mm', 
    autoPrint: config.autoPrint !== undefined ? config.autoPrint : true,
    showPrintButton: true 
  });
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
        <div class="order-number">${data.orderNumber}</div>
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
      <div class="order-number">${data.orderNumber}</div>
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

      // Build fallback HTML
      const fallbackHtml = `<div style="text-align:center;font-family:Cairo,Arial,sans-serif;padding:20px;max-width:80mm;margin:auto">
        <b style="font-size:18px">BLACK ROSE CAFE</b><br/>
        <small>${data.branchName || ''}</small><br/><hr/>
        <div style="font-size:22px;font-weight:700;padding:8px;background:#eee;border-radius:4px">#${data.orderNumber}</div>
        <small>${dateStr}</small><br/>
        <small>الكاشير: ${data.employeeName}</small>
        <hr style="border-style:dashed"/>
        ${data.items.map(item => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0">
          <span>${item.coffeeItem.nameAr} x${item.quantity}</span>
          <span>${(parseNumber(item.coffeeItem.price) * item.quantity).toFixed(2)}</span>
        </div>`).join('')}
        <hr style="border-style:dashed"/>
        <div style="display:flex;justify-content:space-between;font-size:12px"><span>ضريبة 15%:</span><span>${vatAmount.toFixed(2)} ر.س</span></div>
        <div style="font-size:18px;font-weight:700;margin-top:6px">${totalAmount.toFixed(2)} ر.س</div>
        <small>${data.paymentMethod}</small>
        <hr style="border-style:dashed"/>
        <small>شكراً لزيارتكم</small>
      </div>`;

      const result = await thermalPrint(escData, fallbackHtml, printerSettings.paperWidth);
      console.log('[PrintAllReceipts] Result:', result.mode, result.success);

      // If WebUSB successful, also print kitchen copy
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

      return; // Done — thermal printer handled it
    }
  } catch (e) {
    console.error('[PrintAllReceipts] Thermal printer error, falling back:', e);
  }

  // Fallback: browser iframe print (existing logic)
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
      <div class="order-num-value">${data.orderNumber}</div>
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
      <p style="font-size: 10px; color: #888; margin-top: 4px;">رقم الطلب: ${data.orderNumber}</p>
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
