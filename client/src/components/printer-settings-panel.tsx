import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Printer, Usb, Wifi, Network, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Trash2, TestTube2, Settings2, Bluetooth, BluetoothConnected, BluetoothOff,
} from "lucide-react";
import {
  loadPrinterSettings,
  savePrinterSettings,
  isWebUSBSupported,
  requestUSBPrinter,
  reconnectSavedUSBPrinter,
  getSavedDeviceInfo,
  clearSavedDevice,
  getPrinterStatus,
  buildEscPosReceipt,
  thermalPrint,
  testNetworkPrinter,
  discoverNetworkPrinters,
  isBluetoothSupported,
  connectBluetoothPrinter,
  testBluetoothPrinter,
  forgetBluetoothPrinter,
  loadSavedBtDevice,
  getBluetoothState,
  isQZTrayAvailable,
  type PrinterSettings,
  type PrinterStatus,
} from "@/lib/thermal-printer";
import { useToast } from "@/hooks/use-toast";
import { useTranslate } from "@/lib/useTranslate";

export default function PrinterSettingsPanel() {
  const { toast } = useToast();
  const tc = useTranslate();
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [settings, setSettings] = useState<PrinterSettings>(loadPrinterSettings());
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [networkTesting, setNetworkTesting] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  // Network discovery state
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<{ ip: string; port: number }[]>([]);
  const [discoverProgress, setDiscoverProgress] = useState<string | null>(null);
  const [subnetHint, setSubnetHint] = useState<string>(() => {
    // Pre-fill from saved IP if possible: "192.168.8.77" → "192.168.8."
    const saved = loadPrinterSettings().networkIp || '';
    const parts = saved.split('.');
    return parts.length === 4 ? parts.slice(0, 3).join('.') + '.' : '';
  });
  // QZ Tray state
  const [qzStatus, setQzStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null);

  // Bluetooth state
  const [btConnecting, setBtConnecting] = useState(false);
  const [btTesting, setBtTesting] = useState(false);
  const [btStatus, setBtStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [btState, setBtState] = useState<{ connected: boolean; deviceName: string | null }>(() => getBluetoothState());
  const savedBtDevice = loadSavedBtDevice();

  useEffect(() => {
    refreshStatus();
  }, []);

  // Check QZ Tray availability when in network mode
  useEffect(() => {
    if (settings.mode !== 'network') return;
    setQzStatus('checking');
    isQZTrayAvailable().then(ok => setQzStatus(ok ? 'available' : 'unavailable'));
  }, [settings.mode]);

  async function refreshStatus() {
    setLoading(true);
    const s = await getPrinterStatus();
    setStatus(s);
    setSettings(s.settings);
    setLoading(false);
  }

  function updateSetting<K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) {
    const updated = savePrinterSettings({ [key]: value });
    setSettings(updated);
  }

  async function handleConnectUSB() {
    if (!isWebUSBSupported()) {
      toast({ title: tc("غير مدعوم", "Not Supported"), description: tc("المتصفح لا يدعم WebUSB", "Browser does not support WebUSB"), variant: "destructive" });
      return;
    }
    setConnecting(true);
    try {
      const device = await requestUSBPrinter();
      if (device) {
        savePrinterSettings({ mode: 'webusb' });
        toast({ title: tc("✅ تم الاتصال", "✅ Connected"), description: tc(`تم الاتصال بـ: ${device.productName || 'طابعة'}`, `Connected to: ${device.productName || 'Printer'}`) });
        await refreshStatus();
      } else {
        toast({ title: tc("لم يتم الاتصال", "Not Connected"), description: tc("لم يتم اختيار أي طابعة", "No printer selected"), variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: tc("خطأ في الاتصال", "Connection Error"), description: e?.message || tc("فشل الاتصال", "Failed to connect"), variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    clearSavedDevice();
    savePrinterSettings({ mode: 'browser' });
    await refreshStatus();
    toast({ title: tc("تم قطع الاتصال", "Disconnected"), description: tc("سيتم استخدام الطباعة عبر المتصفح", "Browser print will be used") });
  }

  async function handleDiscoverPrinters() {
    setDiscovering(true);
    setDiscoverProgress(tc("جارٍ فحص الشبكة المحلية...", "Scanning local network..."));
    setDiscoveredPrinters([]);
    try {
      const port = settings.networkPort || 9100;
      const hint = subnetHint.trim() || undefined;
      const scanLabel = hint ? hint + '1-254' : tc("شبكة السيرفر", "server network");
      setDiscoverProgress(tc(`فحص ${scanLabel} على المنفذ ${port}...`, `Scanning ${scanLabel} on port ${port}...`));
      const found = await discoverNetworkPrinters(port, 300, hint);
      setDiscoveredPrinters(found);
      if (found.length > 0) {
        toast({
          title: tc(`✅ تم العثور على ${found.length} طابعة`, `✅ Found ${found.length} printer(s)`),
          description: found.map(p => p.ip).join(' • '),
        });
        // Auto-select if only one found
        if (found.length === 1) {
          updateSetting('networkIp', found[0].ip);
          updateSetting('networkPort', found[0].port);
          toast({ title: tc("✅ تم اختيار الطابعة تلقائياً", "✅ Printer auto-selected"), description: found[0].ip });
        }
      } else {
        toast({
          title: tc("لم يُعثر على طابعات", "No Printers Found"),
          description: hint
            ? tc(`لا توجد أجهزة على ${hint}1-254:${port}. تحقق من IP الطابعة والمنفذ.`, `No devices found on ${hint}1-254:${port}. Verify the printer IP and port.`)
            : tc(`لم يُعثر على شيء. جرّب كتابة نطاق الشبكة يدوياً (مثل 192.168.8.) ثم ابحث مجدداً.`, `Nothing found. Try entering the network subnet manually (e.g. 192.168.8.) then search again.`),
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: tc("خطأ في الاكتشاف", "Discovery Error"), description: e?.message, variant: "destructive" });
    } finally {
      setDiscovering(false);
      setDiscoverProgress(null);
    }
  }

  async function handleConnectBluetooth() {
    if (!isBluetoothSupported()) {
      toast({ title: tc("غير مدعوم", "Not Supported"), description: tc("Web Bluetooth يتطلب Chrome أو Edge على سطح المكتب أو Android", "Web Bluetooth requires Chrome or Edge on desktop or Android"), variant: "destructive" });
      return;
    }
    setBtConnecting(true);
    setBtStatus(null);
    try {
      const deviceName = await connectBluetoothPrinter();
      savePrinterSettings({ mode: 'bluetooth', bluetoothDeviceName: deviceName });
      setSettings(loadPrinterSettings());
      const state = getBluetoothState();
      setBtState(state);
      setBtStatus({ connected: true, message: `✅ ${tc("تم الاتصال بـ", "Connected to")} "${deviceName}"` });
      toast({ title: tc("✅ تم الاتصال بالبلوتوث", "✅ Bluetooth Connected"), description: `${tc("الطابعة", "Printer")}: ${deviceName}` });
    } catch (e: any) {
      setBtStatus({ connected: false, message: e?.message || tc("فشل الاتصال", "Connection failed") });
      toast({ title: tc("خطأ في البلوتوث", "Bluetooth Error"), description: e?.message || tc("فشل الاتصال بالطابعة", "Failed to connect to printer"), variant: "destructive" });
    } finally {
      setBtConnecting(false);
    }
  }

  async function handleTestBluetooth() {
    setBtTesting(true);
    setBtStatus(null);
    try {
      const result = await testBluetoothPrinter();
      setBtStatus(result);
      toast({
        title: result.connected ? tc("✅ الطابعة متاحة", "✅ Printer Ready") : tc("❌ لا يمكن الاتصال", "❌ Cannot Connect"),
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: tc("خطأ", "Error"), description: e?.message, variant: "destructive" });
    } finally {
      setBtTesting(false);
    }
  }

  function handleForgetBluetooth() {
    forgetBluetoothPrinter();
    savePrinterSettings({ mode: 'browser', bluetoothDeviceName: undefined, bluetoothDeviceId: undefined });
    setSettings(loadPrinterSettings());
    setBtState({ connected: false, deviceName: null });
    setBtStatus(null);
    toast({ title: tc("تم إزالة الطابعة", "Printer Removed"), description: tc("سيتم استخدام الطباعة عبر المتصفح", "Browser print will be used") });
  }

  async function handleTestNetworkPrinter() {
    const ip = settings.networkIp?.trim();
    if (!ip) {
      toast({ title: tc("خطأ", "Error"), description: tc("الرجاء إدخال IP الطابعة", "Please enter printer IP"), variant: "destructive" });
      return;
    }
    setNetworkTesting(true);
    setNetworkStatus(null);
    try {
      const result = await testNetworkPrinter(ip, settings.networkPort || 9100);
      setNetworkStatus(result);
      toast({
        title: result.connected ? tc("✅ الطابعة متاحة", "✅ Printer Reachable") : tc("❌ لا يمكن الاتصال", "❌ Cannot Connect"),
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: tc("خطأ", "Error"), description: e?.message, variant: "destructive" });
    } finally {
      setNetworkTesting(false);
    }
  }

  async function handleTestPrint() {
    setTesting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

      const escData = buildEscPosReceipt({
        shopName: 'BLACK ROSE CAFE',
        vatNumber: '312718675800003',
        branchName: 'اختبار الطابعة',
        orderNumber: 'TEST-001',
        date: dateStr,
        cashierName: 'النظام',
        items: [
          { name: 'قهوة تجريبية', qty: 1, price: 15.00 },
          { name: 'كيك شوكولاتة', qty: 2, price: 12.00 },
        ],
        subtotal: 34.09,
        vat: 5.91,
        total: 40.00,
        paymentMethod: 'نقدي',
        paperWidth: settings.paperWidth,
        feedLines: settings.feedLines,
      });

      const result = await thermalPrint(escData, '<p style="text-align:center;font-family:Cairo,sans-serif;padding:20px"><b>BLACK ROSE CAFE</b><br/>اختبار طباعة<br/>✓ الطابعة تعمل</p>', settings.paperWidth);

      if (result.success) {
        toast({
          title: tc("✅ طباعة ناجحة", "✅ Print Success"),
          description: settings.mode === 'network'
            ? tc(`تمت الطباعة على ${settings.networkIp}`, `Printed to ${settings.networkIp}`)
            : result.mode === 'webusb'
              ? tc("تمت الطباعة على الطابعة (USB)", "Printed directly via USB")
              : tc("تمت الطباعة عبر المتصفح", "Printed via browser dialog"),
        });
      } else {
        toast({ title: tc("فشلت الطباعة", "Print Failed"), description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: tc("خطأ في الطباعة", "Print Error"), description: e?.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  const webUsbAvailable = isWebUSBSupported();
  const btAvailable = isBluetoothSupported();
  const isUsbConnected = status?.isDeviceConnected;
  const savedDevice = status?.savedDevice;
  const isNetworkMode = settings.mode === 'network';
  const isBluetoothMode = settings.mode === 'bluetooth';

  const statusBadgeColor = isNetworkMode
    ? (networkStatus?.connected ? '#16a34a' : '#f59e0b')
    : isBluetoothMode
      ? (btState.connected ? '#16a34a' : (savedBtDevice ? '#f59e0b' : '#e5e7eb'))
      : isUsbConnected
        ? '#16a34a'
        : '#e5e7eb';

  const statusBadgeLabel = isNetworkMode
    ? (settings.networkIp ? `LAN: ${settings.networkIp}` : tc("طابعة شبكية", "Network Printer"))
    : isBluetoothMode
      ? (btState.connected
          ? `BT: ${btState.deviceName || tc("متصلة", "Connected")}`
          : savedBtDevice
            ? `BT: ${savedBtDevice.name} (${tc("غير متصلة", "Disconnected")})`
            : tc("طابعة بلوتوث", "Bluetooth Printer"))
      : isUsbConnected
        ? tc("متصلة (USB)", "Connected (USB)")
        : settings.mode === 'browser'
          ? tc("طباعة المتصفح", "Browser Print")
          : tc("غير متصلة", "Disconnected");

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="border-2" style={{ borderColor: statusBadgeColor }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Printer className="w-5 h-5" />
            {tc("حالة الطابعة", "Printer Status")}
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin ml-auto" />
            ) : (
              <Badge
                className="ml-auto"
                variant="secondary"
                style={{ backgroundColor: statusBadgeColor, color: statusBadgeColor !== '#e5e7eb' ? 'white' : undefined }}
              >
                {statusBadgeLabel}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* WebUSB availability */}
          {!isNetworkMode && !isBluetoothMode && (
            <div className="flex items-center gap-2 text-sm">
              {webUsbAvailable ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={webUsbAvailable ? 'text-green-700' : 'text-red-600'}>
                {webUsbAvailable
                  ? tc("المتصفح يدعم WebUSB (اتصال مباشر)", "Browser supports WebUSB (direct connection)")
                  : tc("المتصفح لا يدعم WebUSB — استخدم Chrome أو Edge", "Browser doesn't support WebUSB — use Chrome or Edge")
                }
              </span>
            </div>
          )}

          {/* Bluetooth availability */}
          {isBluetoothMode && (
            <div className="flex items-center gap-2 text-sm">
              {btAvailable ? (
                btState.connected
                  ? <BluetoothConnected className="w-4 h-4 text-green-600" />
                  : <Bluetooth className="w-4 h-4 text-blue-500" />
              ) : (
                <BluetoothOff className="w-4 h-4 text-red-500" />
              )}
              <span className={btAvailable ? (btState.connected ? 'text-green-700' : 'text-blue-600') : 'text-red-600'}>
                {btAvailable
                  ? btState.connected
                    ? tc(`متصلة بـ "${btState.deviceName}"`, `Connected to "${btState.deviceName}"`)
                    : tc("المتصفح يدعم Web Bluetooth — انقر للاقتران", "Browser supports Web Bluetooth — click to pair")
                  : tc("Web Bluetooth غير مدعوم — استخدم Chrome أو Edge", "Web Bluetooth not supported — use Chrome or Edge")
                }
              </span>
            </div>
          )}

          {/* USB device info */}
          {savedDevice && !isNetworkMode && !isBluetoothMode && (
            <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <Usb className="w-4 h-4 text-green-600" />
              <span className="flex-1 font-medium text-green-800">
                {savedDevice.productName || tc("طابعة حرارية", "Thermal Printer")}
                <span className="text-green-600 mr-2 font-mono text-xs">
                  [{savedDevice.vendorId.toString(16).padStart(4,'0')}:{savedDevice.productId.toString(16).padStart(4,'0')}]
                </span>
              </span>
              {isUsbConnected ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          )}

          {/* Bluetooth device info */}
          {isBluetoothMode && (savedBtDevice || btState.connected) && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${btState.connected ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              {btState.connected
                ? <BluetoothConnected className="w-4 h-4 text-green-600" />
                : <Bluetooth className="w-4 h-4 text-amber-600" />
              }
              <span className={`flex-1 font-medium ${btState.connected ? 'text-green-800' : 'text-amber-700'}`}>
                {btState.deviceName || savedBtDevice?.name || tc("طابعة بلوتوث", "Bluetooth Printer")}
              </span>
              {btState.connected
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <AlertCircle className="w-4 h-4 text-amber-500" />
              }
            </div>
          )}

          {/* BT test status */}
          {isBluetoothMode && btStatus && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${btStatus.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {btStatus.connected
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <XCircle className="w-4 h-4 text-red-500" />
              }
              <span className={`flex-1 font-medium ${btStatus.connected ? 'text-green-800' : 'text-red-700'}`}>{btStatus.message}</span>
            </div>
          )}

          {/* Network printer status */}
          {isNetworkMode && settings.networkIp && networkStatus && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${networkStatus.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <Network className={`w-4 h-4 ${networkStatus.connected ? 'text-green-600' : 'text-red-500'}`} />
              <span className={`flex-1 font-medium ${networkStatus.connected ? 'text-green-800' : 'text-red-700'}`}>
                {networkStatus.message}
              </span>
              {networkStatus.connected
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <XCircle className="w-4 h-4 text-red-500" />
              }
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {webUsbAvailable && !isNetworkMode && !isBluetoothMode && (
              <Button
                size="sm"
                onClick={handleConnectUSB}
                disabled={connecting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-connect-usb-printer"
              >
                <Usb className="w-4 h-4 ml-1" />
                {connecting ? tc("جارٍ الاتصال...", "Connecting...") : tc("اختر الطابعة (USB)", "Select Printer (USB)")}
              </Button>
            )}
            {isBluetoothMode && btAvailable && (
              <Button
                size="sm"
                onClick={handleConnectBluetooth}
                disabled={btConnecting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-connect-bluetooth-printer"
              >
                {btState.connected
                  ? <BluetoothConnected className="w-4 h-4 ml-1" />
                  : <Bluetooth className="w-4 h-4 ml-1" />
                }
                {btConnecting
                  ? tc("جارٍ الاقتران...", "Pairing...")
                  : btState.connected
                    ? tc("تغيير الطابعة", "Change Printer")
                    : tc("اقتران بطابعة بلوتوث", "Pair Bluetooth Printer")
                }
              </Button>
            )}
            {isBluetoothMode && btState.connected && (
              <Button
                size="sm"
                onClick={handleTestBluetooth}
                disabled={btTesting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-test-bluetooth-printer"
              >
                <TestTube2 className="w-4 h-4 ml-1" />
                {btTesting ? tc("جارٍ الفحص...", "Testing...") : tc("اختبار الاتصال", "Test Connection")}
              </Button>
            )}
            {isBluetoothMode && (savedBtDevice || btState.connected) && (
              <Button size="sm" variant="outline" onClick={handleForgetBluetooth} className="text-red-600 border-red-200" data-testid="button-forget-bluetooth-printer">
                <BluetoothOff className="w-4 h-4 ml-1" />
                {tc("إلغاء الاقتران", "Forget Printer")}
              </Button>
            )}
            {isNetworkMode && (
              <Button
                size="sm"
                onClick={handleTestNetworkPrinter}
                disabled={networkTesting || !settings.networkIp?.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-test-network-printer"
              >
                <Network className="w-4 h-4 ml-1" />
                {networkTesting ? tc("جارٍ الفحص...", "Testing...") : tc("اختبار الاتصال", "Test Connection")}
              </Button>
            )}
            {savedDevice && !isNetworkMode && !isBluetoothMode && (
              <Button size="sm" variant="outline" onClick={handleDisconnect} className="text-red-600 border-red-200" data-testid="button-disconnect-printer">
                <Trash2 className="w-4 h-4 ml-1" />
                {tc("إزالة الطابعة", "Remove Printer")}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={refreshStatus} disabled={loading} data-testid="button-refresh-printer-status">
              <RefreshCw className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
              {tc("تحديث", "Refresh")}
            </Button>
            <Button
              size="sm"
              onClick={handleTestPrint}
              disabled={testing}
              variant="outline"
              className="text-amber-700 border-amber-300"
              data-testid="button-test-print"
            >
              <TestTube2 className="w-4 h-4 ml-1" />
              {testing ? tc("جارٍ الطباعة...", "Printing...") : tc("طباعة تجريبية", "Test Print")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-5 h-5" />
            {tc("إعدادات الطباعة", "Print Settings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Print Mode */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">{tc("وضع الطباعة", "Print Mode")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings.mode === 'network'
                  ? tc("طابعة شبكية (LAN/WiFi) — ProPos، Epson، Xprinter", "Network printer (LAN/WiFi) — ProPos, Epson, Xprinter")
                  : settings.mode === 'bluetooth'
                    ? tc("طابعة بلوتوث (BLE) — Xprinter BT، MUNBYN، Rongta", "Bluetooth printer (BLE) — Xprinter BT, MUNBYN, Rongta")
                    : settings.mode === 'webusb'
                      ? tc("اتصال USB مباشر — بدون نوافذ طباعة", "Direct USB — no print dialogs")
                      : tc("طباعة عبر المتصفح — تظهر نافذة الطباعة", "Browser print — dialog will appear")
                }
              </p>
            </div>
            <Select value={settings.mode} onValueChange={(v: any) => updateSetting('mode', v)}>
              <SelectTrigger className="w-36" data-testid="select-print-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="network">
                  <span className="flex items-center gap-1"><Network className="w-3 h-3" /> {tc("شبكة LAN", "Network LAN")}</span>
                </SelectItem>
                <SelectItem value="bluetooth">
                  <span className="flex items-center gap-1"><Bluetooth className="w-3 h-3" /> {tc("بلوتوث", "Bluetooth")}</span>
                </SelectItem>
                <SelectItem value="webusb">
                  <span className="flex items-center gap-1"><Usb className="w-3 h-3" /> USB</span>
                </SelectItem>
                <SelectItem value="browser">
                  <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> {tc("متصفح", "Browser")}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Network Printer Settings (shown only in network mode) */}
          {isNetworkMode && (
            <>
              <Separator />
              <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                    <Network className="w-4 h-4" />
                    {tc("إعدادات الطابعة الشبكية (ProPos / LAN)", "Network Printer Settings (ProPos / LAN)")}
                  </div>
                </div>

                {/* Subnet hint input for discovery */}
                <div className="space-y-1">
                  <Label className="text-xs text-blue-700">{tc("نطاق الشبكة للبحث (اختياري)", "Network subnet to scan (optional)")}</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="192.168.8."
                      value={subnetHint}
                      onChange={(e) => setSubnetHint(e.target.value)}
                      className="font-mono text-sm flex-1"
                      data-testid="input-subnet-hint"
                      dir="ltr"
                    />
                    <span className="text-xs text-blue-500 whitespace-nowrap">{tc("مثال: 192.168.8.", "e.g. 192.168.8.")}</span>
                  </div>
                  <p className="text-xs text-blue-500">
                    {tc(
                      "إذا لم يجد البحث شيئاً، أدخل النطاق يدوياً (الأرقام الثلاثة الأولى من IP الطابعة + نقطة)",
                      "If auto-discover finds nothing, enter the subnet manually (first 3 numbers of printer IP + dot)"
                    )}
                  </p>
                </div>

                {/* Auto-discover button */}
                <Button
                  onClick={handleDiscoverPrinters}
                  disabled={discovering}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-discover-printers"
                >
                  {discovering ? (
                    <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />{tc("جارٍ البحث...", "Searching...")}</>
                  ) : (
                    <><Network className="w-4 h-4 ml-2" />{tc("🔍 بحث تلقائي عن الطابعة", "🔍 Auto-Discover Printer")}</>
                  )}
                </Button>

                {/* Scanning progress */}
                {discoverProgress && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
                    <span>{discoverProgress}</span>
                  </div>
                )}

                {/* Discovered printers list */}
                {discoveredPrinters.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-blue-800">
                      {tc(`✅ تم العثور على ${discoveredPrinters.length} طابعة — انقر لاختيارها:`, `✅ Found ${discoveredPrinters.length} printer(s) — click to select:`)}
                    </p>
                    {discoveredPrinters.map((p) => (
                      <button
                        key={p.ip}
                        onClick={() => { updateSetting('networkIp', p.ip); updateSetting('networkPort', p.port); setNetworkStatus(null); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${settings.networkIp === p.ip ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-blue-300 text-blue-800 hover:bg-blue-100'}`}
                        data-testid={`button-select-printer-${p.ip.replace(/\./g, '-')}`}
                      >
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4" />
                          <span className="font-mono font-bold">{p.ip}</span>
                        </div>
                        <span className="text-xs opacity-75">{tc(`منفذ ${p.port}`, `Port ${p.port}`)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {!discovering && discoveredPrinters.length === 0 && discoverProgress === null && (
                  <p className="text-xs text-blue-500 italic text-center">
                    {tc("انقر «بحث تلقائي» لفحص الشبكة، أو أدخل IP يدوياً", "Click 'Auto-Discover' to scan the network, or enter IP manually")}
                  </p>
                )}

                {/* Separator */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-blue-200" />
                  <span className="text-xs text-blue-400">{tc("أو أدخل يدوياً", "or enter manually")}</span>
                  <div className="flex-1 border-t border-blue-200" />
                </div>

                {/* Manual IP input */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-blue-700">{tc("عنوان IP الطابعة", "Printer IP Address")}</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={settings.networkIp || ''}
                      onChange={(e) => updateSetting('networkIp', e.target.value)}
                      className="font-mono text-sm"
                      data-testid="input-network-printer-ip"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">{tc("البورت", "Port")}</Label>
                    <Input
                      placeholder="9100"
                      value={String(settings.networkPort || 9100)}
                      onChange={(e) => updateSetting('networkPort', Number(e.target.value) || 9100)}
                      className="font-mono text-sm"
                      data-testid="input-network-printer-port"
                      type="number"
                      dir="ltr"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  {tc(
                    "💡 البورت الافتراضي 9100. الطابعة والجهاز يجب أن يكونا على نفس الشبكة.",
                    "💡 Default port is 9100. The printer and device must be on the same network."
                  )}
                </p>

                {/* QZ Tray status */}
                <div className={`rounded-lg border p-3 text-sm space-y-2 ${
                  qzStatus === 'available'
                    ? 'bg-green-50 border-green-200'
                    : qzStatus === 'unavailable'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {qzStatus === 'available' ? (
                      <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-800">{tc("QZ Tray مثبت ويعمل ✓", "QZ Tray installed & running ✓")}</span></>
                    ) : qzStatus === 'unavailable' ? (
                      <><AlertCircle className="w-4 h-4 text-amber-600" /><span className="text-amber-800">{tc("QZ Tray غير مكتشف", "QZ Tray not detected")}</span></>
                    ) : qzStatus === 'checking' ? (
                      <><RefreshCw className="w-4 h-4 animate-spin text-gray-500" /><span className="text-gray-600">{tc("جارٍ التحقق من QZ Tray...", "Checking QZ Tray...")}</span></>
                    ) : (
                      <><Network className="w-4 h-4 text-blue-500" /><span className="text-blue-700">QZ Tray</span></>
                    )}
                  </div>
                  {qzStatus === 'unavailable' && (
                    <div className="text-xs text-amber-700 space-y-1">
                      <p>{tc("لربط الطابعة الشبكية (LAN) مباشرةً من المتصفح، يجب تثبيت QZ Tray على الجهاز.", "To print to a LAN printer directly from the browser, install QZ Tray on this machine.")}</p>
                      <a
                        href="https://qz.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 underline font-medium hover:text-blue-800"
                      >
                        {tc("تحميل QZ Tray (مجاني)", "Download QZ Tray (Free)")} ↗
                      </a>
                      <p className="text-amber-600 text-xs mt-1">
                        {tc("بدون QZ Tray: الطباعة ستعمل عبر نافذة المتصفح (dialog).", "Without QZ Tray: printing will use the browser dialog instead.")}
                      </p>
                    </div>
                  )}
                  {qzStatus === 'available' && (
                    <p className="text-xs text-green-700">
                      {tc("الطباعة ستتم مباشرة للطابعة بدون نوافذ.", "Printing will go directly to the printer — no dialogs.")}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Bluetooth Printer Settings (shown only in bluetooth mode) */}
          {isBluetoothMode && (
            <>
              <Separator />
              <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                  <Bluetooth className="w-4 h-4" />
                  {tc("إعدادات الطابعة اللاسلكية (BLE Bluetooth)", "Bluetooth Wireless Printer Settings (BLE)")}
                </div>

                {/* Connection button */}
                <Button
                  onClick={handleConnectBluetooth}
                  disabled={btConnecting || !btAvailable}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-pair-bluetooth-printer-main"
                >
                  {btConnecting ? (
                    <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />{tc("جارٍ الاقتران...", "Pairing...")}</>
                  ) : btState.connected ? (
                    <><BluetoothConnected className="w-4 h-4 ml-2" />{tc("تغيير الطابعة", "Change Printer")}</>
                  ) : (
                    <><Bluetooth className="w-4 h-4 ml-2" />{tc("ابحث عن طابعة بلوتوث", "Search for Bluetooth Printer")}</>
                  )}
                </Button>

                {/* Device name display */}
                {(btState.deviceName || savedBtDevice?.name) && (
                  <div className="text-xs text-purple-700 text-center font-medium">
                    {tc("آخر طابعة مقترنة:", "Last paired:")} <strong>{btState.deviceName || savedBtDevice?.name}</strong>
                    {btState.connected
                      ? <span className="text-green-600 mr-1"> ● {tc("متصلة", "Connected")}</span>
                      : <span className="text-amber-600 mr-1"> ○ {tc("غير متصلة", "Disconnected")}</span>
                    }
                  </div>
                )}

                {/* Compatible printers */}
                <div className="text-xs text-purple-600 space-y-1">
                  <p className="font-semibold">{tc("🖨️ طابعات متوافقة:", "🖨️ Compatible printers:")}</p>
                  <p>• Xprinter XP-P300BT / XP-58BT / XP-80BT</p>
                  <p>• MUNBYN ITPP941 Bluetooth</p>
                  <p>• Rongta RPP300 / RPP200 BT</p>
                  <p>• EPSON TM-P20 / TM-P60II Bluetooth</p>
                  <p>• {tc("أي طابعة حرارية تدعم BLE ESC/POS", "Any thermal printer supporting BLE ESC/POS")}</p>
                </div>

                {/* Browser requirement */}
                {!btAvailable && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    <BluetoothOff className="w-3 h-3 flex-shrink-0" />
                    {tc(
                      "Web Bluetooth غير مدعوم في هذا المتصفح. استخدم Google Chrome أو Microsoft Edge على سطح المكتب أو Android.",
                      "Web Bluetooth is not supported in this browser. Use Google Chrome or Microsoft Edge on desktop or Android."
                    )}
                  </div>
                )}

                <p className="text-xs text-purple-600">
                  {tc(
                    "💡 تأكد من تشغيل البلوتوث على جهازك وأن الطابعة في وضع الاقتران قبل النقر على الزر أعلاه.",
                    "💡 Make sure Bluetooth is enabled on your device and the printer is in pairing mode before clicking the button above."
                  )}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Auto Print */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{tc("طباعة تلقائية عند إتمام الطلب", "Auto-print when order completes")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{tc("يطبع الفاتورة فور إتمام الدفع", "Prints receipt immediately after payment")}</p>
            </div>
            <Switch
              checked={settings.autoPrint}
              onCheckedChange={(v) => updateSetting('autoPrint', v)}
              data-testid="switch-auto-print"
            />
          </div>

          <Separator />

          {/* Kitchen Copy */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{tc("نسخة المطبخ التلقائية", "Auto kitchen copy")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{tc("يطبع نسخة للمطبخ مع فاتورة العميل", "Prints kitchen ticket alongside customer receipt")}</p>
            </div>
            <Switch
              checked={settings.autoKitchenCopy}
              onCheckedChange={(v) => updateSetting('autoKitchenCopy', v)}
              data-testid="switch-auto-kitchen"
            />
          </div>

          <Separator />

          {/* Paper Width */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">{tc("عرض الورق", "Paper Width")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{tc("حدد حجم ورق الطابعة الحرارية", "Select thermal printer paper size")}</p>
            </div>
            <Select value={settings.paperWidth} onValueChange={(v: any) => updateSetting('paperWidth', v)}>
              <SelectTrigger className="w-28" data-testid="select-paper-width">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58 مم</SelectItem>
                <SelectItem value="80mm">80 مم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Feed Lines */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">{tc("أسطر تغذية قبل القطع", "Feed lines before cut")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{tc("مسافة قبل قطع الورق", "Space before paper cut")}</p>
            </div>
            <Select value={String(settings.feedLines)} onValueChange={(v) => updateSetting('feedLines', Number(v))}>
              <SelectTrigger className="w-24" data-testid="select-feed-lines">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} {tc("سطر", "lines")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{tc("تفعيل نظام الطباعة", "Enable print system")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{tc("تعطيل هذا الخيار يوقف جميع الطباعة", "Disabling stops all printing")}</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => updateSetting('enabled', v)}
              data-testid="switch-printer-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-2">
              {isNetworkMode ? (
                <>
                  <p className="font-semibold">{tc("إعداد الطابعة الشبكية (ProPos / LAN):", "Network Printer Setup (ProPos / LAN):")}</p>
                  <ol className="list-decimal list-inside space-y-0.5 pr-2">
                    <li>{tc("تأكد أن الطابعة متصلة بنفس شبكة الـ WiFi أو الـ LAN", "Ensure printer is on the same WiFi/LAN network")}</li>
                    <li>{tc("افتح تطبيق ProPos أو لوحة الطابعة للحصول على IP", "Open ProPos app or printer panel to get the IP")}</li>
                    <li>{tc("أدخل IP الطابعة والبورت (الافتراضي 9100)", "Enter printer IP and port (default: 9100)")}</li>
                    <li>{tc("اضغط 'اختبار الاتصال' للتحقق", "Click 'Test Connection' to verify")}</li>
                    <li>{tc("اضغط 'طباعة تجريبية' للتأكد النهائي", "Click 'Test Print' to confirm")}</li>
                  </ol>
                  <p>{tc("💡 يعمل مع ProPos وEpson TM وXprinter NW وأي طابعة ESC/POS شبكية", "💡 Works with ProPos, Epson TM, Xprinter NW, and any ESC/POS network printer")}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">{tc("إعداد الطابعة USB (WebUSB):", "USB Printer Setup (WebUSB):")}</p>
                  <ol className="list-decimal list-inside space-y-0.5 pr-2">
                    <li>{tc("استخدم متصفح Chrome أو Edge", "Use Chrome or Edge browser")}</li>
                    <li>{tc("وصّل الطابعة الحرارية بـ USB", "Connect thermal printer via USB")}</li>
                    <li>{tc("اضغط 'اختر الطابعة (USB)' واختر طابعتك", "Click 'Select Printer (USB)' and choose your printer")}</li>
                    <li>{tc("اضغط 'طباعة تجريبية' للتأكد", "Click 'Test Print' to verify")}</li>
                    <li>{tc("الآن كل طلب يُطبع تلقائياً بدون نوافذ", "Every order prints automatically without dialogs")}</li>
                  </ol>
                  <p>{tc("💡 لطابعة شبكية (ProPos/LAN) غيّر الوضع إلى 'شبكة LAN' من القائمة أعلاه", "💡 For network printer (ProPos/LAN), switch mode to 'Network LAN' above")}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
