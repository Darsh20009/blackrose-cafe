import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { brand } from "@/lib/brand";
import {
  Upload, Image, Palette, Type, Globe, Phone, Mail,
  Save, RefreshCw, Eye, Building2, CheckCircle2, Paintbrush
} from "lucide-react";
import qiroxLogo from "@assets/QIROX_LOGO_1768660955394.png";

// Load saved branding from localStorage (overrides brand.ts defaults at runtime)
function loadBranding() {
  try {
    const saved = localStorage.getItem("cafe-branding");
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveBranding(data: any) {
  localStorage.setItem("cafe-branding", JSON.stringify(data));
  // Apply colors immediately
  if (data.primaryColor) {
    document.documentElement.style.setProperty("--primary", hexToHsl(data.primaryColor));
  }
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  try {
    const [h, s, l] = hsl.split(/[\s%]+/).map(Number);
    const a = s / 100;
    const b2 = l / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = b2 - a * Math.min(b2, 1 - b2) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch { return '#7c3aed'; }
}

export default function AdminBrandingPage() {
  const { toast } = useToast();
  const saved = loadBranding();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoStaffInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nameAr: saved?.nameAr ?? brand.nameAr,
    nameEn: saved?.nameEn ?? brand.nameEn,
    taglineAr: saved?.taglineAr ?? brand.taglineAr,
    taglineEn: saved?.taglineEn ?? brand.taglineEn,
    primaryColor: saved?.primaryColor ?? hslToHex(brand.colors.primary.h + ' ' + brand.colors.primary.s + '% ' + brand.colors.primary.l + '%'),
    website: saved?.website ?? brand.website,
    phone: saved?.phone ?? '',
    email: saved?.email ?? brand.emailSupport,
    instagram: saved?.instagram ?? brand.social.instagram,
    logoCustomer: saved?.logoCustomer ?? null as string | null,
    logoStaff: saved?.logoStaff ?? null as string | null,
    taxNumber: saved?.taxNumber ?? brand.taxNumber,
    commercialRegister: saved?.commercialRegister ?? brand.commercialRegister,
  });

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'customer' | 'staff') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة صالحة", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm(prev => ({
        ...prev,
        [type === 'customer' ? 'logoCustomer' : 'logoStaff']: dataUrl
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      saveBranding(form);
      // Apply color immediately
      document.documentElement.style.setProperty("--primary", hexToHsl(form.primaryColor));
      document.documentElement.style.setProperty("--ring", hexToHsl(form.primaryColor));

      toast({
        title: "✅ تم الحفظ",
        description: "تم تطبيق هوية الكافيه الجديدة على النظام بالكامل",
      });
    } catch {
      toast({ title: "خطأ", description: "فشل في حفظ البيانات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("cafe-branding");
    window.location.reload();
  };

  const field = (key: keyof typeof form, label: string, placeholder?: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <Input
        type={type}
        value={(form[key] as string) ?? ''}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-white border-gray-200 focus:border-primary text-sm"
      />
    </div>
  );

  return (
    <AdminLayout title="البراندة">
      <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Paintbrush className="w-6 h-6 text-primary" />
              البراندة
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              غيّر كل تفصيلة في الكافيه من اسم ولوجو وألوان — يتغير النظام كله فوراً
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              إعادة تعيين
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'جارٍ الحفظ...' : 'حفظ وتطبيق'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Logo Section ── */}
          <Card className="border-gray-100 shadow-sm md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                الشعار (اللوجو)
              </CardTitle>
              <CardDescription>ارفع شعار الكافيه للعملاء وللموظفين بشكل منفصل</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Customer Logo */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">شعار العملاء (التطبيق العام)</Label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {form.logoCustomer ? (
                      <img src={form.logoCustomer} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">انقر لرفع الصورة</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG حتى 5MB</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      رفع شعار العملاء
                    </Button>
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, 'customer')} />
                </div>

                {/* Staff Logo */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">شعار الموظفين (لوحة التحكم)</Label>
                  <div
                    onClick={() => logoStaffInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {form.logoStaff ? (
                      <img src={form.logoStaff} alt="Staff Logo" className="w-20 h-20 object-contain rounded-lg" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">انقر لرفع الصورة</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG حتى 5MB</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      رفع شعار الموظفين
                    </Button>
                  </div>
                  <input ref={logoStaffInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, 'staff')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Color Section ── */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                الألوان
              </CardTitle>
              <CardDescription>اللون الأساسي يُطبَّق على كل النظام فوراً</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">اللون الأساسي</Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={e => {
                        setForm(prev => ({ ...prev, primaryColor: e.target.value }));
                        document.documentElement.style.setProperty("--primary", hexToHsl(e.target.value));
                      }}
                      className="w-14 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                  </div>
                  <Input
                    value={form.primaryColor}
                    onChange={e => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                        setForm(prev => ({ ...prev, primaryColor: e.target.value }));
                        if (e.target.value.length === 7) {
                          document.documentElement.style.setProperty("--primary", hexToHsl(e.target.value));
                        }
                      }
                    }}
                    className="font-mono uppercase text-sm"
                    placeholder="#7c3aed"
                  />
                </div>
              </div>

              {/* Color presets */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">ألوان جاهزة</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'البنفسجي', color: '#7c3aed' },
                    { name: 'الأزرق', color: '#2563eb' },
                    { name: 'الأخضر', color: '#059669' },
                    { name: 'الأحمر الورد', color: '#be1845' },
                    { name: 'البرتقالي', color: '#d97706' },
                    { name: 'الوردي', color: '#db2777' },
                    { name: 'الرمادي', color: '#374151' },
                    { name: 'الفيروزي', color: '#0891b2' },
                  ].map(({ name, color }) => (
                    <button
                      key={color}
                      onClick={() => {
                        setForm(prev => ({ ...prev, primaryColor: color }));
                        document.documentElement.style.setProperty("--primary", hexToHsl(color));
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs hover:shadow-sm transition-all"
                      style={{ borderColor: color + '40', backgroundColor: color + '15', color }}
                      title={name}
                    >
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Names Section ── */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                الاسم والوصف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {field('nameAr', 'اسم الكافيه بالعربية', 'مثال: بلاك روز كافيه')}
              {field('nameEn', 'Cafe Name (English)', 'e.g. BLACK ROSE CAFE')}
              {field('taglineAr', 'الشعار التسويقي بالعربية', 'مثال: تجربة قهوة فاخرة')}
              {field('taglineEn', 'Tagline (English)', 'e.g. Luxury Coffee Experience')}
            </CardContent>
          </Card>

          {/* ── Contact Section ── */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                التواصل والبيانات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {field('website', 'الموقع الإلكتروني', 'example.com')}
              {field('phone', 'رقم الهاتف', '+966 5x xxx xxxx')}
              {field('email', 'البريد الإلكتروني', 'info@example.com', 'email')}
              {field('instagram', 'انستقرام', '@handle')}
            </CardContent>
          </Card>

          {/* ── Business Info Section ── */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                البيانات التجارية (للفاتورة)
              </CardTitle>
              <CardDescription>تظهر على الفواتير والإيصالات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {field('taxNumber', 'الرقم الضريبي (VAT)', '3XXXXXXXXXX0000X')}
              {field('commercialRegister', 'السجل التجاري', '1XXXXXXXXX')}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between py-4 px-5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>التغييرات تُطبَّق فوراً على كل النظام — الإدارة، الموظفين، الإيصالات، والموقع</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة تعيين
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'جارٍ الحفظ...' : 'حفظ وتطبيق الهوية'}
            </Button>
          </div>
        </div>

        {/* QIROX STUDIO Credit */}
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
          <img src={qiroxLogo} alt="QIROX STUDIO" className="w-5 h-5 object-contain opacity-50" />
          <span>نظام البراندة مُطوَّر بواسطة <strong className="text-gray-500">QIROX STUDIO</strong></span>
        </div>
      </div>
    </AdminLayout>
  );
}
