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
  AlertCircle, RefreshCw, Trash2, TestTube2, Settings2,
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

  useEffect(() => {
    refreshStatus();
  }, []);

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
  const isUsbConnected = status?.isDeviceConnected;
  const savedDevice = status?.savedDevice;
  const isNetworkMode = settings.mode === 'network';

  const statusBadgeColor = isNetworkMode
    ? (networkStatus?.connected ? '#16a34a' : '#f59e0b')
    : isUsbConnected
      ? '#16a34a'
      : '#e5e7eb';

  const statusBadgeLabel = isNetworkMode
    ? (settings.networkIp ? `LAN: ${settings.networkIp}` : tc("طابعة شبكية", "Network Printer"))
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
          {!isNetworkMode && (
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

          {/* USB device info */}
          {savedDevice && !isNetworkMode && (
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
            {webUsbAvailable && !isNetworkMode && (
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
            {savedDevice && !isNetworkMode && (
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
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <Network className="w-4 h-4" />
                  {tc("إعدادات الطابعة الشبكية (ProPos / LAN)", "Network Printer Settings (ProPos / LAN)")}
                </div>
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
                    "💡 افتح تطبيق ProPos أو لوحة إعدادات الطابعة للحصول على IP. البورت الافتراضي 9100.",
                    "💡 Open the ProPos app or printer settings panel to find the IP. Default port is 9100."
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
