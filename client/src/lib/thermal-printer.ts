/**
 * Thermal Printer Service
 * Supports: WebUSB (ESC/POS) → silent auto-print, no dialog
 *           Browser Print fallback (window.print via iframe)
 */

const ESC = 0x1b;
const GS  = 0x1d;

function fmtOrderNum(n: string | number): string {
  const digits = String(n).replace(/\D/g, '');
  if (!digits) return `#${n}`;
  return `#${digits.padStart(4, '0')}`;
}

const CMD = {
  INIT:          [ESC, 0x40],
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  ALIGN_RIGHT:   [ESC, 0x61, 0x02],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  DOUBLE_SIZE:   [GS,  0x21, 0x11],
  LARGE_TEXT:    [GS,  0x21, 0x01],
  NORMAL_SIZE:   [GS,  0x21, 0x00],
  LINE_FEED:     [0x0a],
  FEED_3:        [ESC, 0x64, 0x03],
  FEED_5:        [ESC, 0x64, 0x05],
  CUT_PAPER:     [GS,  0x56, 0x42, 0x00],
  UNDERLINE_ON:  [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  CHARSET_PC864: [ESC, 0x74, 0x1b],  // Arabic PC864
  CHARSET_UTF8:  [ESC, 0x74, 0x00],  // Latin
  SET_WIDTH_58:  [GS,  0x57, 0xd2, 0x00], // 58mm = 210 dots
  SET_WIDTH_80:  [GS,  0x57, 0x50, 0x01], // 80mm = 576 dots
};

export interface PrinterSettings {
  enabled: boolean;
  mode: 'webusb' | 'network' | 'browser';
  paperWidth: '58mm' | '80mm';
  autoPrint: boolean;
  autoKitchenCopy: boolean;
  vendorId?: number;
  productId?: number;
  printerName?: string;
  fontSize: 'small' | 'normal';
  cuttingMode: 'auto' | 'manual';
  feedLines: number;
  // Network printer (LAN/TCP) — ProPos, Epson TM-T88 LAN, Xprinter NW, etc.
  networkIp?: string;
  networkPort?: number;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: true,
  mode: 'browser',
  paperWidth: '80mm',
  autoPrint: true,
  autoKitchenCopy: true,
  fontSize: 'normal',
  cuttingMode: 'auto',
  feedLines: 3,
  networkPort: 9100,
};

const SETTINGS_KEY = 'qirox-printer-settings';
const DEVICE_KEY   = 'qirox-printer-device';

// ─── Settings persistence ────────────────────────────────────────────────────

export function loadPrinterSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function savePrinterSettings(s: Partial<PrinterSettings>): PrinterSettings {
  const merged = { ...loadPrinterSettings(), ...s };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

// ─── WebUSB helpers ──────────────────────────────────────────────────────────

export function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

let _usbDevice: USBDevice | null = null;

export async function requestUSBPrinter(): Promise<USBDevice | null> {
  if (!isWebUSBSupported()) return null;
  try {
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    await _openDevice(device);
    localStorage.setItem(DEVICE_KEY, JSON.stringify({
      vendorId: device.vendorId,
      productId: device.productId,
      productName: device.productName || 'Thermal Printer',
    }));
    _usbDevice = device;
    return device;
  } catch {
    return null;
  }
}

export async function reconnectSavedUSBPrinter(): Promise<USBDevice | null> {
  if (!isWebUSBSupported()) return null;
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (!saved) return null;
    const { vendorId, productId } = JSON.parse(saved);
    const devices = await (navigator as any).usb.getDevices();
    const device = devices.find((d: USBDevice) => d.vendorId === vendorId && d.productId === productId);
    if (!device) return null;
    await _openDevice(device);
    _usbDevice = device;
    return device;
  } catch {
    return null;
  }
}

async function _openDevice(device: USBDevice): Promise<void> {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  // Find bulk-out endpoint
  for (const iface of device.configuration!.interfaces) {
    try {
      await device.claimInterface(iface.interfaceNumber);
    } catch {}
  }
}

export function getSavedDeviceInfo(): { vendorId: number; productId: number; productName: string } | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSavedDevice(): void {
  localStorage.removeItem(DEVICE_KEY);
  _usbDevice = null;
}

async function _sendToUSB(data: Uint8Array): Promise<boolean> {
  if (!_usbDevice) return false;
  try {
    // Find the bulk-out endpoint
    for (const iface of _usbDevice.configuration!.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            await _usbDevice.transferOut(ep.endpointNumber, data);
            return true;
          }
        }
      }
    }
    return false;
  } catch (err) {
    console.error('[Printer] USB transfer error:', err);
    _usbDevice = null;
    return false;
  }
}

// ─── ESC/POS receipt builder ─────────────────────────────────────────────────

function bytes(...cmds: number[][]): Uint8Array {
  const flat = ([] as number[]).concat(...cmds);
  return new Uint8Array(flat);
}

function textBytes(text: string): number[] {
  // Use TextEncoder for UTF-8 — most modern thermal printers support it
  return Array.from(new TextEncoder().encode(text));
}

function line(text: string): number[] {
  return [...textBytes(text), 0x0a];
}

function centerLine(text: string): number[] {
  return [...CMD.ALIGN_CENTER, ...textBytes(text), 0x0a];
}

function dottedLine(width: number = 32): number[] {
  return [...textBytes('-'.repeat(width)), 0x0a];
}

function dashedLine(width: number = 32): number[] {
  return [...textBytes('- '.repeat(Math.floor(width / 2))), 0x0a];
}

function padRow(label: string, value: string, width: number = 32): number[] {
  const space = width - label.length - value.length;
  const row = label + (space > 0 ? ' '.repeat(space) : ' ') + value;
  return [...textBytes(row), 0x0a];
}

export interface EscPosReceiptData {
  shopName: string;
  vatNumber: string;
  branchName?: string;
  address?: string;
  orderNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
  tableNumber?: string;
  orderType?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    addons?: string[];
  }>;
  subtotal: number;
  vat: number;
  total: number;
  discount?: number;
  paymentMethod: string;
  paperWidth: '58mm' | '80mm';
  feedLines?: number;
}

export function buildEscPosReceipt(data: EscPosReceiptData): Uint8Array {
  const w = data.paperWidth === '58mm' ? 28 : 42;
  const buf: number[] = [];

  // Init
  buf.push(...CMD.INIT);
  buf.push(...CMD.ALIGN_CENTER);

  // Shop header
  buf.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
  buf.push(...textBytes(data.shopName), 0x0a);
  buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);

  if (data.branchName) buf.push(...centerLine(data.branchName));
  if (data.address)    buf.push(...centerLine(data.address));
  buf.push(...textBytes(`VAT: ${data.vatNumber}`), 0x0a);
  buf.push(...dottedLine(w));

  // Invoice label
  buf.push(...CMD.BOLD_ON);
  buf.push(...centerLine('فاتورة ضريبية مبسطة'));
  buf.push(...CMD.BOLD_OFF);

  // Order number
  buf.push(...CMD.DOUBLE_SIZE, ...CMD.ALIGN_CENTER);
  buf.push(...textBytes(fmtOrderNum(data.orderNumber)), 0x0a);
  buf.push(...CMD.NORMAL_SIZE);

  buf.push(...dottedLine(w));

  // Info
  buf.push(...CMD.ALIGN_LEFT);
  buf.push(...line(`التاريخ: ${data.date}`));
  buf.push(...line(`الكاشير: ${data.cashierName}`));
  if (data.customerName && data.customerName !== 'عميل نقدي') {
    buf.push(...line(`العميل: ${data.customerName}`));
  }
  if (data.tableNumber) buf.push(...line(`الطاولة: ${data.tableNumber}`));
  if (data.orderType)   buf.push(...line(`نوع الطلب: ${data.orderType}`));
  buf.push(...dottedLine(w));

  // Items
  for (const item of data.items) {
    const total = (item.qty * item.price).toFixed(2);
    buf.push(...CMD.BOLD_ON);
    buf.push(...line(item.name));
    buf.push(...CMD.BOLD_OFF);
    buf.push(...padRow(`  ${item.qty} x ${item.price.toFixed(2)}`, `${total}`, w));
    if (item.addons?.length) {
      buf.push(...line(`  + ${item.addons.join('، ')}`));
    }
  }

  buf.push(...dottedLine(w));

  // Totals
  buf.push(...padRow('قبل الضريبة:', `${data.subtotal.toFixed(2)} ر.س`, w));
  buf.push(...padRow('ضريبة 15%:', `${data.vat.toFixed(2)} ر.س`, w));
  if (data.discount && data.discount > 0) {
    buf.push(...padRow('خصم:', `-${data.discount.toFixed(2)} ر.س`, w));
  }

  buf.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE, ...CMD.ALIGN_CENTER);
  buf.push(...textBytes(`الإجمالي: ${data.total.toFixed(2)} ر.س`), 0x0a);
  buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);

  buf.push(...CMD.ALIGN_LEFT);
  buf.push(...line(`طريقة الدفع: ${data.paymentMethod}`));

  buf.push(...dottedLine(w));

  // Footer
  buf.push(...CMD.ALIGN_CENTER);
  buf.push(...CMD.BOLD_ON);
  buf.push(...textBytes('شكراً لزيارتكم'), 0x0a);
  buf.push(...CMD.BOLD_OFF);
  buf.push(...textBytes('الأسعار شاملة ضريبة القيمة المضافة'), 0x0a);

  // Feed and cut
  const feedLines = data.feedLines ?? 3;
  buf.push(ESC, 0x64, feedLines); // ESC d n — feed n lines
  buf.push(...CMD.CUT_PAPER);

  return new Uint8Array(buf);
}

export function buildEscPosKitchenTicket(data: {
  orderNumber: string;
  tableNumber?: string;
  orderType?: string;
  cashierName: string;
  items: Array<{ name: string; qty: number; addons?: string[] }>;
  notes?: string;
  paperWidth: '58mm' | '80mm';
}): Uint8Array {
  const w = data.paperWidth === '58mm' ? 28 : 42;
  const buf: number[] = [];

  buf.push(...CMD.INIT);
  buf.push(...CMD.ALIGN_CENTER, ...CMD.BOLD_ON);
  buf.push(...textBytes('--- نسخة المطبخ ---'), 0x0a);
  buf.push(...CMD.BOLD_OFF);

  buf.push(...CMD.DOUBLE_SIZE, ...CMD.ALIGN_CENTER);
  buf.push(...textBytes(fmtOrderNum(data.orderNumber)), 0x0a);
  buf.push(...CMD.NORMAL_SIZE);

  if (data.tableNumber) {
    buf.push(...CMD.LARGE_TEXT, ...CMD.ALIGN_CENTER);
    buf.push(...textBytes(`طاولة ${data.tableNumber}`), 0x0a);
    buf.push(...CMD.NORMAL_SIZE);
  }
  if (data.orderType) buf.push(...centerLine(data.orderType));
  buf.push(...dottedLine(w));

  buf.push(...CMD.ALIGN_LEFT);
  for (const item of data.items) {
    buf.push(...CMD.BOLD_ON, ...CMD.LARGE_TEXT);
    buf.push(...textBytes(`x${item.qty}  ${item.name}`), 0x0a);
    buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
    if (item.addons?.length) {
      buf.push(...line(`   + ${item.addons.join('، ')}`));
    }
  }

  if (data.notes) {
    buf.push(...dottedLine(w));
    buf.push(...CMD.BOLD_ON);
    buf.push(...line('ملاحظات:'));
    buf.push(...CMD.BOLD_OFF);
    buf.push(...line(data.notes));
  }

  buf.push(...dottedLine(w));
  buf.push(...CMD.ALIGN_CENTER);
  buf.push(...line(`الكاشير: ${data.cashierName}`));
  buf.push(ESC, 0x64, 4);
  buf.push(...CMD.CUT_PAPER);

  return new Uint8Array(buf);
}

// ─── Main print function ──────────────────────────────────────────────────────

export type PrintJobType = 'receipt' | 'kitchen' | 'employee-card';

export interface PrintResult {
  success: boolean;
  mode: 'webusb' | 'browser' | 'error';
  error?: string;
}

/**
 * Send ESC/POS data to a network printer (LAN/TCP) via server-side TCP socket.
 * Works with ProPos, Epson TM-T88 LAN, Xprinter NW series, and any ESC/POS network printer.
 */
export async function networkPrint(escData: Uint8Array, ip: string, port: number = 9100): Promise<PrintResult> {
  try {
    const base64Data = btoa(String.fromCharCode(...escData));
    const resp = await fetch('/api/print/network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port, data: base64Data }),
    });
    const result = await resp.json();
    if (!resp.ok || !result.success) {
      return { success: false, mode: 'error', error: result.error || 'فشلت الطباعة الشبكية' };
    }
    return { success: true, mode: 'network' as any };
  } catch (err: any) {
    return { success: false, mode: 'error', error: err.message || 'خطأ في الاتصال بالطابعة' };
  }
}

/**
 * Test network printer connectivity (TCP ping).
 */
export async function testNetworkPrinter(ip: string, port: number = 9100): Promise<{ connected: boolean; message: string }> {
  try {
    const resp = await fetch('/api/print/network-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port }),
    });
    const result = await resp.json();
    return { connected: !!result.connected, message: result.message || result.error || '' };
  } catch {
    return { connected: false, message: 'فشل الاتصال بالخادم' };
  }
}

/**
 * High-level print function.
 * 1. Tries Network (LAN/TCP) if mode=network and IP is configured
 * 2. Tries WebUSB if device is connected + mode=webusb
 * 3. Falls back to browser print dialog
 */
export async function thermalPrint(escData: Uint8Array, fallbackHtml: string, fallbackPaper: '58mm' | '80mm' = '80mm'): Promise<PrintResult> {
  const settings = loadPrinterSettings();

  if (!settings.enabled) return { success: false, mode: 'error', error: 'الطابعة معطّلة في الإعدادات' };

  // Network (LAN/TCP) mode — ProPos, Epson LAN, Xprinter NW, etc.
  if (settings.mode === 'network') {
    if (!settings.networkIp) {
      return { success: false, mode: 'error', error: 'لم يتم تحديد IP الطابعة الشبكية' };
    }
    const result = await networkPrint(escData, settings.networkIp, settings.networkPort || 9100);
    if (result.success) return result;
    // If network fails, fall through to browser
    console.warn('[NetworkPrint] Falling back to browser:', result.error);
  }

  // WebUSB mode
  if (settings.mode === 'webusb') {
    if (!_usbDevice) {
      await reconnectSavedUSBPrinter();
    }
    if (_usbDevice) {
      const ok = await _sendToUSB(escData);
      if (ok) return { success: true, mode: 'webusb' };
    }
  }

  // Fallback: browser print dialog via iframe
  const { printHtmlInPage } = await import('./print-utils');
  printHtmlInPage(fallbackHtml, fallbackPaper);
  return { success: true, mode: 'browser' };
}

/**
 * Auto-print receipt + kitchen ticket after a completed order.
 * Call this from checkout success handlers.
 */
export async function autoPrintOrder(receiptEsc: Uint8Array, kitchenEsc: Uint8Array | null, receiptHtml: string, paperWidth: '58mm' | '80mm'): Promise<void> {
  const settings = loadPrinterSettings();
  if (!settings.autoPrint) return;

  await thermalPrint(receiptEsc, receiptHtml, paperWidth);

  if (kitchenEsc && settings.autoKitchenCopy) {
    await new Promise(r => setTimeout(r, 1500));
    if (settings.mode === 'network' && settings.networkIp) {
      await networkPrint(kitchenEsc, settings.networkIp, settings.networkPort || 9100);
    } else if (_usbDevice) {
      await _sendToUSB(kitchenEsc);
    }
  }
}

// ─── Printer status ───────────────────────────────────────────────────────────

export interface PrinterStatus {
  isWebUSBSupported: boolean;
  isDeviceConnected: boolean;
  savedDevice: { vendorId: number; productId: number; productName: string } | null;
  settings: PrinterSettings;
}

export async function getPrinterStatus(): Promise<PrinterStatus> {
  const settings = loadPrinterSettings();
  const savedDevice = getSavedDeviceInfo();
  let isDeviceConnected = false;

  if (_usbDevice) {
    isDeviceConnected = true;
  } else if (savedDevice && isWebUSBSupported()) {
    const reconnected = await reconnectSavedUSBPrinter();
    isDeviceConnected = !!reconnected;
  }

  return {
    isWebUSBSupported: isWebUSBSupported(),
    isDeviceConnected,
    savedDevice,
    settings,
  };
}
