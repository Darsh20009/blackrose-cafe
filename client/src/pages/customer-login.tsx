import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Zap, Star, ChevronRight, MessageCircle, Loader2 } from "lucide-react";
import blackroseLogo from "@assets/blackrose-logo.png";
import { customerStorage } from "@/lib/customer-storage";
import { useToast } from "@/hooks/use-toast";
import { useTranslate } from "@/lib/useTranslate";

type Mode = 'choice' | 'quick' | 'whatsapp';

export default function CustomerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tc = useTranslate();
  const [mode, setMode] = useState<Mode>('choice');
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    document.title = tc("BLACK ROSE CAFE — ادخل الآن", "BLACK ROSE CAFE — Enter Now");
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', tc('تسجيل دخول عملاء BLACK ROSE CAFE — سجّل أو اطلب بسرعة', 'BLACK ROSE CAFE customer login — sign up or order quickly'));
  }, [tc]);

  const handleQuickOrder = () => {
    const trimName = name.trim();
    const trimPhone = phone.trim().replace(/\s/g, '');

    if (!trimName || trimName.length < 2) {
      toast({ variant: "destructive", title: tc("الاسم مطلوب", "Name Required"), description: tc("أدخل اسمك (حرفان على الأقل)", "Enter your name (at least 2 characters)") });
      return;
    }
    if (!trimPhone || trimPhone.length !== 9 || !trimPhone.startsWith('5')) {
      toast({ variant: "destructive", title: tc("رقم الجوال غير صحيح", "Invalid Phone"), description: tc("أدخل 9 أرقام تبدأ بـ 5", "Enter 9 digits starting with 5") });
      return;
    }

    setLoading(true);
    customerStorage.setGuestInfo(trimName, trimPhone);
    customerStorage.setGuestMode(true);
    toast({ title: tc("أهلاً ", "Welcome ") + trimName, description: tc("اختر مشروبك وأكمل الطلب", "Choose your drink and complete your order") });
    setLocation("/menu");
  };

  const requestWhatsAppCode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userType: "customer", phone, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tc("تعذر إرسال الرمز", "Could not send the code"));
      setOtpSent(true);
      setOtpCooldown(60);
      toast({ title: tc("تحقق من واتساب", "Check WhatsApp"), description: data.message });
    } catch (error: any) {
      toast({ title: tc("تعذر إرسال الرمز", "Could not send the code"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyWhatsAppCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userType: "customer", phone, code: otp, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tc("رمز التحقق غير صحيح", "Invalid verification code"));
      localStorage.setItem("currentCustomer", JSON.stringify(data.user));
      localStorage.removeItem("currentEmployee");
      customerStorage.setGuestMode(false);
      customerStorage.clearGuestInfo();
      setLocation("/menu");
    } catch (error: any) {
      toast({ title: tc("تعذر تسجيل الدخول", "Could not sign in"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setTimeout(() => setOtpCooldown(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpCooldown]);

  if (mode === 'choice') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2 mb-2">
            <img src={blackroseLogo} alt="BLACK ROSE CAFE" className="h-16 object-contain" />
            <h1 className="text-3xl font-bold font-playfair text-foreground">BLACK ROSE CAFE</h1>
          </div>
          <p className="text-muted-foreground text-lg font-cairo">{tc("لكل لحظة قهوة ، لحظة نجاح", "For every coffee moment, a moment of success")}</p>
        </div>

        <div className="w-full max-w-md space-y-3">
          <Card className="bg-card border-border/50 backdrop-blur shadow-lg">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-foreground font-playfair">{tc("مرحباً بك", "Welcome")}</CardTitle>
              <CardDescription className="text-muted-foreground">{tc("اختر طريقة المتابعة", "Choose how to continue")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => { setMode('whatsapp'); setOtpSent(false); setOtp(""); }}
                className="h-14 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold"
                data-testid="button-whatsapp-login"
              >
                <MessageCircle className="ml-2 h-5 w-5" />
                <div className="flex-1 text-right">
                  <div>{tc("الدخول أو التسجيل برقم الجوال", "Sign in or register with phone")}</div>
                  <div className="text-xs font-normal opacity-80">{tc("رمز تحقق يصل عبر واتساب", "A verification code sent via WhatsApp")}</div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </Button>

              <Button
                onClick={() => setLocation("/auth")}
                className="w-full h-14 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/95 hover:to-accent/85 text-accent-foreground text-base font-semibold"
                data-testid="button-login"
              >
                <User className="ml-2 w-5 h-5" />
                <div className="text-right flex-1">
                  <div>{tc("تسجيل الدخول / حساب جديد", "Login / New Account")}</div>
                  <div className="text-xs opacity-80 font-normal">{tc("احصل على بطاقة ولاء ونقاط مكافآت", "Get a loyalty card and reward points")}</div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </Button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{tc("أو", "or")}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                onClick={() => setMode('quick')}
                variant="outline"
                className="w-full h-14 border-primary/30 text-foreground hover:bg-primary/5 text-base"
                data-testid="button-quick-order"
              >
                <Zap className="ml-2 w-5 h-5 text-accent" />
                <div className="text-right flex-1">
                  <div>{tc("طلب سريع بدون تسجيل", "Quick Order Without Registration")}</div>
                  <div className="text-xs text-muted-foreground font-normal">{tc("اسمك ورقمك فقط • الدفع بالبطاقة", "Name & phone only • Card payment")}</div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-center">
            <Star className="w-4 h-4 text-accent" />
            <p className="text-muted-foreground text-sm font-cairo">
              {tc("التسجيل يتيح لك: بطاقة ولاء • نقاط مكافآت • متابعة طلباتك", "Registration gives you: loyalty card • reward points • order tracking")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'whatsapp') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">{tc("الدخول برمز واتساب", "Sign in with WhatsApp")}</CardTitle>
            <CardDescription>{tc("نرسل رمزاً مؤقتاً إلى رقمك. الحساب الجديد يُنشأ بعد تأكيد الرقم.", "We send a temporary code to your phone. New accounts are created after phone verification.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={event => {
              event.preventDefault();
              if (otpSent) verifyWhatsAppCode(event);
              else requestWhatsAppCode();
            }} className="space-y-4">
              <div>
                <Label htmlFor="otp-name" className="mb-1.5 block">{tc("الاسم (للحساب الجديد)", "Name (for new accounts)")}</Label>
                <Input id="otp-name" value={name} onChange={event => setName(event.target.value)}
                  placeholder={tc("اسمك", "Your name")} autoComplete="name" data-testid="input-customer-otp-name" />
              </div>
              <div>
                <Label htmlFor="otp-phone" className="mb-1.5 block">{tc("رقم الجوال السعودي", "Saudi mobile number")}</Label>
                <Input id="otp-phone" type="tel" value={phone} onChange={event => setPhone(event.target.value)}
                  placeholder="05xxxxxxxx أو +9665xxxxxxxx" dir="ltr" autoComplete="tel" disabled={otpSent}
                  data-testid="input-customer-otp-phone" />
              </div>
              {otpSent && (
                <div>
                  <Label htmlFor="otp-code" className="mb-1.5 block">{tc("رمز التحقق", "Verification code")}</Label>
                  <Input id="otp-code" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
                    className="text-center text-lg tracking-[0.3em]" data-testid="input-customer-otp-code" />
                </div>
              )}
              <Button type="button" variant="outline" disabled={loading || otpCooldown > 0}
                onClick={requestWhatsAppCode} className="w-full" data-testid="button-customer-send-otp">
                {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <MessageCircle className="ml-2 h-4 w-4" />}
                {otpSent
                  ? otpCooldown > 0 ? tc(`إعادة الإرسال بعد ${otpCooldown} ثانية`, `Resend in ${otpCooldown}s`) : tc("إعادة إرسال الرمز", "Resend code")
                  : tc("إرسال الرمز عبر واتساب", "Send code via WhatsApp")}
              </Button>
              {otpSent && (
                <Button type="submit" disabled={loading || otp.length !== 6} className="w-full" data-testid="button-customer-verify-otp">
                  {tc("تأكيد الرمز والمتابعة", "Verify code and continue")}
                </Button>
              )}
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("choice")}>
                {tc("العودة إلى خيارات الدخول", "Back to sign-in options")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border/50 backdrop-blur shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-7 h-7 text-accent" />
            <CardTitle className="text-2xl text-foreground font-playfair">{tc("طلب سريع", "Quick Order")}</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            {tc("أدخل اسمك ورقمك لمتابعة الطلب", "Enter your name and number to continue")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="quick-name" className="text-foreground mb-1.5 block">{tc("الاسم", "Name")}</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="quick-name"
                type="text"
                placeholder={tc("اسمك الكريم", "Your name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickOrder()}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 pr-10"
                data-testid="input-quick-name"
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quick-phone" className="text-foreground mb-1.5 block">{tc("رقم الجوال (9 أرقام تبدأ بـ 5)", "Mobile number (9 digits starting with 5)")}</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">+966</div>
              <Input
                id="quick-phone"
                type="tel"
                placeholder="5xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickOrder()}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground/50 pr-10 pl-14"
                data-testid="input-quick-phone"
              />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-0.5">{tc("ملاحظة", "Note")}</p>
            <p>{tc("الطلب السريع لا يشمل نقاط الولاء. يمكنك التسجيل لاحقاً بنفس رقم الجوال وسيتم ربط طلباتك تلقائياً.", "Quick orders don't include loyalty points. You can register later with the same number and your orders will be linked automatically.")}</p>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              onClick={handleQuickOrder}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/95 hover:to-accent/85 text-accent-foreground font-semibold"
              data-testid="button-confirm-quick"
            >
              <Zap className="w-4 h-4 ml-2" />
              {tc("متابعة للقائمة", "Continue to Menu")}
            </Button>

            <Button
              onClick={() => setMode('choice')}
              variant="ghost"
              className="w-full text-foreground/70 hover:text-foreground hover:bg-primary/10"
              data-testid="button-back-quick"
            >
              {tc("رجوع", "Back")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
