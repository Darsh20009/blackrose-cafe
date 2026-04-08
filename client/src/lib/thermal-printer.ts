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
  // Multi-variant cut for maximum compatibility:
  // GS V 65 (0x41) = full cut after feed — works on Xprinter, Epson, most clones
  // GS V 66 n (0x42 n) = partial cut after n-dot feed
  // We use full cut (65) as primary
  CUT_PAPER:     [GS,  0x56, 0x41, 0x03],  // GS V 65 3 — feed 3 lines + FULL CUT
  PARTIAL_CUT:   [GS,  0x56, 0x42, 0x01],  // GS V 66 1 — partial cut (fallback)
  UNDERLINE_ON:  [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  CHARSET_PC864: [ESC, 0x74, 0x1b],  // Arabic PC864
  CHARSET_UTF8:  [ESC, 0x74, 0x00],  // Latin
  SET_WIDTH_58:  [GS,  0x57, 0xd2, 0x00], // 58mm = 210 dots
  SET_WIDTH_80:  [GS,  0x57, 0x50, 0x01], // 80mm = 576 dots
};

export interface PrinterSettings {
  enabled: boolean;
  mode: 'webusb' | 'network' | 'bluetooth' | 'browser';
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
  // Bluetooth printer
  bluetoothDeviceName?: string;
  bluetoothDeviceId?: string;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: true,
  mode: 'network',           // ← Direct network printing — no dialogs
  paperWidth: '80mm',
  autoPrint: true,
  autoKitchenCopy: true,
  fontSize: 'normal',
  cuttingMode: 'auto',
  feedLines: 3,
  networkIp: '192.168.8.77',  // ← Default printer IP
  networkPort: 9100,           // ← Default printer port
};

const SETTINGS_KEY = 'qirox-printer-settings';
const DEVICE_KEY   = 'qirox-printer-device';

// ─── Settings persistence ────────────────────────────────────────────────────

export function loadPrinterSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Migration: if no networkIp saved, fill in the default printer
      if (!saved.networkIp) saved.networkIp = DEFAULT_SETTINGS.networkIp;
      if (!saved.networkPort) saved.networkPort = DEFAULT_SETTINGS.networkPort;
      // Migration: if mode was 'browser' and no explicit mode override, switch to 'network'
      // (Only applies if user never explicitly set the mode to browser themselves)
      if (saved.mode === 'browser' && !saved._modeExplicitlySet) {
        saved.mode = 'network';
      }
      return { ...DEFAULT_SETTINGS, ...saved };
    }
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

/**
 * Center a text string for ESC/POS printers.
 * For Arabic/multilingual text the printer's ESC a 1 center command may miscalculate
 * because UTF-8 bytes ≠ display columns. We pad manually instead.
 * Arabic characters: 2 UTF-8 bytes each but 1 display column → divide byte length by 2.
 */
function centerLine(text: string, width: number = 48): number[] {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  // Estimate display width: ASCII = 1 col, non-ASCII (Arabic) ≈ 1 col per 2 bytes
  let displayWidth = 0;
  for (let i = 0; i < encoded.length; ) {
    const b = encoded[i];
    if (b < 0x80) { displayWidth += 1; i += 1; }       // ASCII
    else if (b < 0xe0) { displayWidth += 1; i += 2; }  // 2-byte UTF-8 (Arabic, Latin ext)
    else if (b < 0xf0) { displayWidth += 1; i += 3; }  // 3-byte UTF-8
    else               { displayWidth += 1; i += 4; }  // 4-byte UTF-8
  }
  const pad = Math.max(0, Math.floor((width - displayWidth) / 2));
  // Use printer center-align command — more reliable on most printers
  return [...CMD.ALIGN_CENTER, ...textBytes(text), 0x0a];
}

function dottedLine(width: number = 48): number[] {
  return [...CMD.ALIGN_LEFT, ...textBytes('='.repeat(width)), 0x0a];
}

function thinLine(width: number = 48): number[] {
  return [...CMD.ALIGN_LEFT, ...textBytes('-'.repeat(width)), 0x0a];
}

function padRow(label: string, value: string, width: number = 48): number[] {
  // label is Arabic (RTL), value is LTR numbers — space between them
  const labelBytes = new TextEncoder().encode(label).length;
  const valueBytes = new TextEncoder().encode(value).length;
  // Estimate display widths (Arabic chars: 2 bytes = 1 col)
  const labelCols = Math.ceil(labelBytes / 2);
  const valueCols = value.length; // numbers/ASCII = 1 col each
  const space = Math.max(1, width - labelCols - valueCols);
  const row = label + ' '.repeat(space) + value;
  return [...CMD.ALIGN_LEFT, ...textBytes(row), 0x0a];
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
  // Standard ESC/POS widths:
  // 58mm paper → 32 chars per line (standard is actually 32 at 12-dot font)
  // 80mm paper → 48 chars per line (standard is 48 at 12-dot font, 203 DPI)
  const w = data.paperWidth === '58mm' ? 32 : 48;
  const buf: number[] = [];

  // ── Init printer ──────────────────────────────────────────────────────────
  buf.push(...CMD.INIT);

  // ── Shop header (centered) ────────────────────────────────────────────────
  buf.push(...CMD.ALIGN_CENTER);
  buf.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
  buf.push(...textBytes(data.shopName), 0x0a);
  buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);

  if (data.branchName) buf.push(...centerLine(data.branchName, w));
  if (data.address)    buf.push(...centerLine(data.address, w));
  buf.push(...CMD.ALIGN_CENTER, ...textBytes(`VAT: ${data.vatNumber}`), 0x0a);
  buf.push(...dottedLine(w));

  // ── Invoice label ─────────────────────────────────────────────────────────
  buf.push(...CMD.ALIGN_CENTER, ...CMD.BOLD_ON);
  buf.push(...textBytes('فاتورة ضريبية مبسطة'), 0x0a);
  buf.push(...CMD.BOLD_OFF);

  // ── Order number (large, centered) ───────────────────────────────────────
  buf.push(...CMD.DOUBLE_SIZE, ...CMD.ALIGN_CENTER);
  buf.push(...textBytes(fmtOrderNum(data.orderNumber)), 0x0a);
  buf.push(...CMD.NORMAL_SIZE);

  buf.push(...thinLine(w));

  // ── Info block ────────────────────────────────────────────────────────────
  buf.push(...CMD.ALIGN_LEFT);
  buf.push(...line(`التاريخ : ${data.date}`));
  buf.push(...line(`الكاشير : ${data.cashierName}`));
  if (data.customerName && data.customerName !== 'عميل نقدي') {
    buf.push(...line(`العميل  : ${data.customerName}`));
  }
  if (data.tableNumber) buf.push(...line(`الطاولة : ${data.tableNumber}`));
  if (data.orderType)   buf.push(...line(`النوع   : ${data.orderType}`));
  buf.push(...thinLine(w));

  // ── Items ─────────────────────────────────────────────────────────────────
  for (const item of data.items) {
    const itemTotal = (item.qty * item.price).toFixed(2);
    buf.push(...CMD.BOLD_ON);
    buf.push(...CMD.ALIGN_LEFT, ...textBytes(item.name), 0x0a);
    buf.push(...CMD.BOLD_OFF);
    buf.push(...padRow(`  ${item.qty} x ${item.price.toFixed(2)}`, `${itemTotal} ر.س`, w));
    if (item.addons?.length) {
      for (const addon of item.addons) {
        buf.push(...line(`    + ${addon}`));
      }
    }
  }

  buf.push(...dottedLine(w));

  // ── Totals ────────────────────────────────────────────────────────────────
  buf.push(...padRow('المجموع قبل الضريبة :', `${data.subtotal.toFixed(2)} ر.س`, w));
  buf.push(...padRow('ضريبة القيمة 15%    :', `${data.vat.toFixed(2)} ر.س`, w));
  if (data.discount && data.discount > 0) {
    buf.push(...padRow('الخصم               :', `-${data.discount.toFixed(2)} ر.س`, w));
  }

  buf.push(...dottedLine(w));
  buf.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE, ...CMD.ALIGN_CENTER);
  buf.push(...textBytes(`الاجمالي : ${data.total.toFixed(2)} ر.س`), 0x0a);
  buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
  buf.push(...dottedLine(w));

  buf.push(...CMD.ALIGN_LEFT);
  buf.push(...line(`طريقة الدفع : ${data.paymentMethod}`));

  // ── Footer ────────────────────────────────────────────────────────────────
  buf.push(...CMD.ALIGN_CENTER);
  buf.push(...CMD.BOLD_ON);
  buf.push(...textBytes('** شكراً لزيارتكم **'), 0x0a);
  buf.push(...CMD.BOLD_OFF);
  buf.push(...textBytes('الاسعار شاملة ضريبة القيمة المضافة'), 0x0a);
  buf.push(...textBytes('BLACK ROSE CAFE'), 0x0a);

  // ── Feed then FULL CUT ────────────────────────────────────────────────────
  // GS V 0x41 n = feed n × (print_head_dots) lines then cut
  // This is the most compatible cut command across Xprinter / Epson / clones
  buf.push(ESC, 0x64, 4);      // Feed 4 lines before cut
  buf.push(...CMD.CUT_PAPER);  // GS V 65 3 — full cut

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
  const w = data.paperWidth === '58mm' ? 32 : 48;
  const buf: number[] = [];

  // ── Init ───────────────────────────────────────────────────────────────────
  buf.push(...CMD.INIT);

  // ── Kitchen header ─────────────────────────────────────────────────────────
  buf.push(...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
  buf.push(...textBytes('*** نسخة المطبخ ***'), 0x0a);
  buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);

  // ── Order number (extra large) ─────────────────────────────────────────────
  buf.push(...CMD.DOUBLE_SIZE, ...CMD.ALIGN_CENTER);
  buf.push(...textBytes(fmtOrderNum(data.orderNumber)), 0x0a);
  buf.push(...CMD.NORMAL_SIZE);

  if (data.tableNumber) {
    buf.push(...CMD.LARGE_TEXT, ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON);
    buf.push(...textBytes(`طاولة رقم: ${data.tableNumber}`), 0x0a);
    buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
  }
  if (data.orderType) {
    buf.push(...CMD.ALIGN_CENTER);
    buf.push(...textBytes(`[ ${data.orderType} ]`), 0x0a);
  }
  buf.push(...dottedLine(w));

  // ── Items (large text for kitchen readability) ─────────────────────────────
  buf.push(...CMD.ALIGN_LEFT);
  for (const item of data.items) {
    buf.push(...CMD.BOLD_ON, ...CMD.LARGE_TEXT);
    buf.push(...textBytes(`${item.qty}x  ${item.name}`), 0x0a);
    buf.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
    if (item.addons?.length) {
      for (const addon of item.addons) {
        buf.push(...line(`     --> ${addon}`));
      }
    }
  }

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (data.notes) {
    buf.push(...dottedLine(w));
    buf.push(...CMD.BOLD_ON);
    buf.push(...line('*** ملاحظات ***'));
    buf.push(...CMD.BOLD_OFF);
    buf.push(...line(data.notes));
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  buf.push(...dottedLine(w));
  buf.push(...CMD.ALIGN_CENTER);
  buf.push(...textBytes(`الكاشير: ${data.cashierName}`), 0x0a);

  // ── Feed then FULL CUT ─────────────────────────────────────────────────────
  buf.push(ESC, 0x64, 4);      // Feed 4 lines
  buf.push(...CMD.CUT_PAPER);  // GS V 65 3 — full cut

  return new Uint8Array(buf);
}

// ─── Main print function ──────────────────────────────────────────────────────

export type PrintJobType = 'receipt' | 'kitchen' | 'employee-card';

export interface PrintResult {
  success: boolean;
  mode: 'webusb' | 'bluetooth' | 'network' | 'browser' | 'error';
  error?: string;
}

// ─── QZ Tray Integration ─────────────────────────────────────────────────────
// QZ Tray is a free desktop app that creates a local WebSocket bridge (wss://localhost:8181).
// The browser sends ESC/POS commands to QZ Tray, and QZ Tray forwards them directly
// to the LAN printer via raw TCP — this bypasses the cloud server entirely.
//
// Download & install: https://qz.io/download/
// Works with any ESC/POS thermal printer (Xprinter, Epson TM, Star, etc.)

let _qzLoadPromise: Promise<any> | null = null;
let _qzConnected = false;

async function _loadQZScript(): Promise<any> {
  if ((window as any).qz) return (window as any).qz;
  if (_qzLoadPromise) return _qzLoadPromise;

  _qzLoadPromise = new Promise<any>((resolve, reject) => {
    if (document.querySelector('script[data-qz-tray]')) {
      const poll = setInterval(() => {
        if ((window as any).qz) { clearInterval(poll); resolve((window as any).qz); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error('QZ timeout')); }, 10000);
      return;
    }
    const s = document.createElement('script');
    s.setAttribute('data-qz-tray', '1');
    s.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
    s.async = true;
    s.onload = () => (window as any).qz ? resolve((window as any).qz) : reject(new Error('qz not found'));
    s.onerror = () => reject(new Error('QZ script load failed'));
    document.head.appendChild(s);
  });
  return _qzLoadPromise;
}

async function _connectQZ(timeoutMs = 4000): Promise<any> {
  const qz = await _loadQZScript();
  if (_qzConnected && qz.websocket.isActive()) return qz;
  qz.security.setCertificatePromise((res: (v: any) => void) => res(''));
  qz.security.setSignaturePromise((_: string, res: (v: any) => void) => res(''));
  await Promise.race([
    qz.websocket.connect({ retries: 1, delay: 1 }),
    new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), timeoutMs)),
  ]);
  _qzConnected = true;
  return qz;
}

/** Check if QZ Tray desktop app is running on this machine */
export async function isQZTrayAvailable(): Promise<boolean> {
  try {
    const qz = await Promise.race([
      _loadQZScript(),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 4000)),
    ]);
    if (qz.websocket.isActive()) return true;
    await _connectQZ(3000);
    return true;
  } catch {
    return false;
  }
}

/** Print raw ESC/POS data directly to a LAN printer via QZ Tray (no cloud server needed) */
export async function qzTrayNetworkPrint(escData: Uint8Array, ip: string, port = 9100): Promise<PrintResult> {
  try {
    const qz = await _connectQZ(5000);
    const config = qz.configs.create({ host: ip, port: { primary: port } });
    const b64 = btoa(Array.from(escData, b => String.fromCharCode(b)).join(''));
    await qz.print(config, [{ type: 'raw', format: 'base64', data: b64 }]);
    return { success: true, mode: 'network' };
  } catch (err: any) {
    return { success: false, mode: 'error', error: `QZ Tray: ${err?.message || 'فشل'}` };
  }
}

/** Returns true for private LAN IP ranges — cloud servers can never reach these */
function _isPrivateLanIP(ip: string): boolean {
  const t = ip.trim();
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(t) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(t) ||
    /^169\.254\.\d{1,3}\.\d{1,3}$/.test(t)
  );
}

/**
 * Send ESC/POS data to a network printer (LAN/TCP).
 *
 * Priority:
 *   1. QZ Tray — if already connected (set up via printer settings)
 *   2. Server-side TCP — only for public IPs; skipped for private LAN IPs
 *      (cloud servers physically cannot reach 192.168.x.x etc.)
 *   3. Returns failure immediately so the caller can fall back to browser print
 *
 * QZ Tray is never auto-loaded here to keep printing fast with no side-effects.
 */
export async function networkPrint(escData: Uint8Array, ip: string, port: number = 9100): Promise<PrintResult> {
  // 1. Use QZ Tray if already connected (no CDN loading during print time)
  if (_qzConnected && (window as any).qz?.websocket?.isActive()) {
    const qzResult = await qzTrayNetworkPrint(escData, ip, port);
    if (qzResult.success) return qzResult;
    console.warn('[NetworkPrint] QZ Tray failed:', qzResult.error);
  }

  // 2. For private LAN IPs: skip server-side TCP entirely (cloud can't reach them)
  //    This prevents the 3-8 second timeout that freezes the UI
  if (_isPrivateLanIP(ip)) {
    console.info(`[NetworkPrint] ${ip} is a private LAN IP — skipping server-side TCP (install QZ Tray for silent LAN printing)`);
    return { success: false, mode: 'error', error: `طابعة LAN (${ip}) — ثبّت QZ Tray للطباعة الصامتة` };
  }

  // 3. Server-side TCP — only for public/accessible IPs (local server deployments)
  try {
    const base64Data = btoa(Array.from(escData, b => String.fromCharCode(b)).join(''));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const resp = await fetch('/api/print/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, data: base64Data, timeout: 3500 }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const result = await resp.json();
      if (!resp.ok || !result.success) {
        return { success: false, mode: 'error', error: result.error || 'فشلت الطباعة الشبكية' };
      }
      return { success: true, mode: 'network' as any };
    } finally {
      clearTimeout(timer);
    }
  } catch (err: any) {
    return { success: false, mode: 'error', error: err.name === 'AbortError' ? 'انتهت مهلة الاتصال' : (err.message || 'خطأ في الاتصال') };
  }
}

/**
 * Scan the local network for printers on a given port.
 * Calls the server-side discovery endpoint which probes the full /24 subnet.
 * @param subnetHint  Optional subnet prefix to scan, e.g. "192.168.8." — overrides
 *                    the server's auto-detected interface subnets. Useful when the
 *                    server is on a different subnet than the printer.
 */
export async function discoverNetworkPrinters(
  port: number = 9100,
  timeoutMs: number = 300,
  subnetHint?: string,
): Promise<{ ip: string; port: number }[]> {
  const resp = await fetch('/api/print/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port, timeout: timeoutMs, subnet: subnetHint }),
  });
  if (!resp.ok) throw new Error('فشل طلب الاكتشاف');
  const data = await resp.json();
  return data.found ?? [];
}

/**
 * Test network printer connectivity.
 * 1. Try QZ Tray first (browser-side — works for local LAN printers)
 * 2. Fall back to server-side TCP test (only succeeds if server is on same LAN)
 */
export async function testNetworkPrinter(ip: string, port: number = 9100): Promise<{ connected: boolean; message: string }> {
  // 1. QZ Tray path — browser connects directly to the LAN printer
  try {
    const qz = await _connectQZ(4000);
    const config = qz.configs.create({ host: ip, port: { primary: port } });
    // ESC INIT (0x1B 0x40) — safe no-op reset, just tests TCP reachability
    const initCmd = btoa(String.fromCharCode(0x1B, 0x40));
    await qz.print(config, [{ type: 'raw', format: 'base64', data: initCmd }]);
    return { connected: true, message: `✅ الطابعة ${ip}:${port} تعمل — تم الاتصال عبر QZ Tray` };
  } catch (qzErr: any) {
    const msg: string = qzErr?.message ?? '';
    // If QZ Tray connected but the printer itself rejected the connection
    if (!msg.includes('timeout') && !msg.includes('WebSocket') && !msg.includes('QZ script') && !msg.includes('qz not found') && !msg.includes('QZ Tray') && !msg.includes('load')) {
      return { connected: false, message: `❌ QZ Tray متصل لكن الطابعة ${ip}:${port} لا تستجيب — تحقق من IP والمنفذ` };
    }
    // QZ Tray not installed or not running — fall through to server-side test
  }

  // 2. Server-side TCP test (fails if server is cloud-hosted)
  try {
    const resp = await fetch('/api/print/network-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port, timeout: 4000 }),
    });
    const result = await resp.json();
    if (result.connected) {
      return { connected: true, message: result.message || `✅ الطابعة ${ip}:${port} متاحة` };
    }
    // Server couldn't reach the printer — explain why
    return {
      connected: false,
      message: `⚠️ السيرفر لا يصل للطابعة المحلية (${ip}:${port}).\nالحل: ثبّت برنامج QZ Tray على جهاز الكاشير ليتصل المتصفح بالطابعة مباشرةً.`,
    };
  } catch {
    return {
      connected: false,
      message: `⚠️ لا يمكن الاتصال بـ ${ip}:${port}.\nالسيرفر السحابي لا يصل للطابعة المحلية. ثبّت QZ Tray على جهاز الكاشير.`,
    };
  }
}

// ─── Bluetooth (BLE) Printer ──────────────────────────────────────────────────
// Works with any ESC/POS BLE printer: Xprinter XP-P300BT, MUNBYN BT, Rongta, etc.
// Uses Web Bluetooth API — Chrome/Edge desktop & Android only.

/** Known BLE printer service UUIDs (ordered by prevalence) */
const BT_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic BLE SPP (most common)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Bluetooth printer SP service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic custom FF00
  '00001101-0000-1000-8000-00805f9b34fb', // SPP (classic, limited BLE support)
];

/** Known write characteristic UUIDs */
const BT_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Generic BLE write
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // BLE printer write
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC UART write
  '0000ff02-0000-1000-8000-00805f9b34fb', // FF00 write char
  '0000ff01-0000-1000-8000-00805f9b34fb', // FF00 write alt
];

const BT_DEVICE_KEY = 'qirox-bt-printer';

/** Cache connected BLE device & write characteristic */
let _btDevice: BluetoothDevice | null = null;
let _btCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

/** Is Web Bluetooth supported in this browser? */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/** Save BT device name/id to localStorage */
function saveBtDevice(name: string, id: string) {
  try { localStorage.setItem(BT_DEVICE_KEY, JSON.stringify({ name, id })); } catch {}
}

/** Load saved BT device info */
export function loadSavedBtDevice(): { name: string; id: string } | null {
  try {
    const raw = localStorage.getItem(BT_DEVICE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/** Forget the paired BT printer */
export function forgetBluetoothPrinter() {
  _btDevice = null;
  _btCharacteristic = null;
  try { localStorage.removeItem(BT_DEVICE_KEY); } catch {}
}

/**
 * Open the OS Bluetooth device picker and connect to the selected BLE printer.
 * Returns the device name on success, or throws an error.
 */
export async function connectBluetoothPrinter(): Promise<string> {
  if (!isBluetoothSupported()) throw new Error('Web Bluetooth غير مدعوم في هذا المتصفح — استخدم Chrome أو Edge');

  const bt = (navigator as any).bluetooth as Bluetooth;

  const device: BluetoothDevice = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: BT_SERVICE_UUIDS,
  });

  if (!device.gatt) throw new Error('GATT غير متوفر لهذا الجهاز');

  const server = await device.gatt.connect();
  const characteristic = await _findWriteCharacteristic(server);
  if (!characteristic) throw new Error('لم يُعثر على طابعة BLE متوافقة — تأكد من دعم الطابعة لـ ESC/POS');

  _btDevice = device;
  _btCharacteristic = characteristic;
  saveBtDevice(device.name ?? device.id, device.id);

  device.addEventListener('gattserverdisconnected', () => {
    _btDevice = null;
    _btCharacteristic = null;
  });

  return device.name ?? device.id;
}

/** Attempt to find a writable GATT characteristic across known service UUIDs. */
async function _findWriteCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  for (const svcUuid of BT_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(svcUuid);
      // Try known char UUIDs first
      for (const charUuid of BT_CHAR_UUIDS) {
        try {
          const char = await service.getCharacteristic(charUuid);
          if (char.properties.write || char.properties.writeWithoutResponse) return char;
        } catch {}
      }
      // Fall back: enumerate all characteristics
      try {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) return char;
        }
      } catch {}
    } catch {}
  }
  return null;
}

/** Reconnect if the device is known but disconnected. */
async function _ensureBtConnected(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (_btCharacteristic && _btDevice?.gatt?.connected) return _btCharacteristic;

  // Try to reconnect to cached device
  if (_btDevice && _btDevice.gatt) {
    try {
      const server = await _btDevice.gatt.connect();
      const char = await _findWriteCharacteristic(server);
      if (char) { _btCharacteristic = char; return char; }
    } catch {}
  }
  throw new Error('الطابعة البلوتوث غير متصلة — أعد الاقتران من الإعدادات');
}

/**
 * Send ESC/POS bytes to connected BLE printer.
 * Automatically chunks data into 512-byte packets (BLE MTU limit).
 */
export async function bluetoothPrint(escData: Uint8Array): Promise<PrintResult> {
  try {
    const char = await _ensureBtConnected();
    const useWriteWithoutResponse = char.properties.writeWithoutResponse && !char.properties.write;
    const CHUNK = 512;
    for (let i = 0; i < escData.length; i += CHUNK) {
      const chunk = escData.slice(i, i + CHUNK);
      if (useWriteWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        await char.writeValue(chunk);
      }
      // Small delay between chunks to avoid buffer overflow
      if (i + CHUNK < escData.length) await new Promise(r => setTimeout(r, 20));
    }
    return { success: true, mode: 'bluetooth' };
  } catch (err: any) {
    return { success: false, mode: 'error', error: err.message || 'خطأ في الطباعة عبر البلوتوث' };
  }
}

/**
 * Test BLE connection by sending a blank line + beep.
 */
export async function testBluetoothPrinter(): Promise<{ connected: boolean; message: string }> {
  try {
    const char = await _ensureBtConnected();
    // Just ping with ESC @  (printer init — safe no-op)
    const ping = new Uint8Array([0x1B, 0x40, 0x0A]);
    if (char.properties.writeWithoutResponse) {
      await char.writeValueWithoutResponse(ping);
    } else {
      await char.writeValue(ping);
    }
    const name = _btDevice?.name ?? 'الطابعة';
    return { connected: true, message: `✅ متصل بـ "${name}" — الطابعة جاهزة` };
  } catch (err: any) {
    return { connected: false, message: err.message || 'الطابعة غير متاحة' };
  }
}

/** Return current BT connection state */
export function getBluetoothState(): { connected: boolean; deviceName: string | null } {
  return {
    connected: !!(_btDevice?.gatt?.connected && _btCharacteristic),
    deviceName: _btDevice?.name ?? null,
  };
}

/**
 * High-level print function.
 * 1. Tries Network (LAN/TCP) if mode=network and IP is configured
 * 2. Tries Bluetooth (BLE) if mode=bluetooth
 * 3. Tries WebUSB if device is connected + mode=webusb
 * 4. Falls back to browser print dialog
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
    console.warn('[NetworkPrint] Falling back to browser:', result.error);
  }

  // Bluetooth (BLE) mode
  if (settings.mode === 'bluetooth') {
    const result = await bluetoothPrint(escData);
    if (result.success) return result;
    console.warn('[BluetoothPrint] Falling back to browser:', result.error);
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
  // Only trigger browser print if there is actual HTML content to show.
  // Passing empty fallbackHtml means the caller handles its own browser fallback.
  if (fallbackHtml && fallbackHtml.trim()) {
    const { printHtmlInPage } = await import('./print-utils');
    printHtmlInPage(fallbackHtml, fallbackPaper);
  }
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
    } else if (settings.mode === 'bluetooth') {
      await bluetoothPrint(kitchenEsc);
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
