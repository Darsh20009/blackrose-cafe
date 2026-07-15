import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AtSign, Lock, Mail, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslate } from "@/lib/useTranslate";
import blackroseLogoStaff from "@assets/blackrose-logo.png";

type Step = "username" | "otp" | "password" | "done";
type Method = "email" | "phone";

export default function EmployeeForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tc = useTranslate();

  const [step, setStep] = useState<Step>("username");
  const [method, setMethod] = useState<Method>("email");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1a: Request OTP via email ───────────────────────────────────────
  const requestOtpMutation = useMutation({
    mutationFn: async (u: string) => {
      const res = await fetch("/api/employees/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || tc("فشل الإرسال", "Failed to send"));
      return data;
    },
    onSuccess: () => {
      setError("");
      setStep("otp");
    },
    onError: (err: any) => setError(err?.message || tc("حدث خطأ", "An error occurred")),
  });

  // ── Step 1b: Verify phone (fallback method) ───────────────────────────────
  const verifyPhoneMutation = useMutation({
    mutationFn: async ({ username, phone }: { username: string; phone: string }) => {
      const res = await fetch("/api/employees/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || tc("رقم الجوال غير صحيح", "Incorrect phone number"));
      return data;
    },
    onSuccess: () => { setError(""); setStep("password"); },
    onError: (err: any) => setError(err?.message || tc("اسم المستخدم أو رقم الجوال غير صحيح", "Incorrect username or phone")),
  });

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/employees/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || tc("فشل التحقق", "Verification failed"));
      return data;
    },
    onSuccess: () => {
      setStep("done");
      toast({ title: tc("تم بنجاح!", "Success!"), description: tc("تم تغيير كلمة المرور. سيتم تحويلك لتسجيل الدخول", "Password changed. Redirecting...") });
      setTimeout(() => navigate("/employee/login"), 2500);
    },
    onError: (err: any) => setError(err?.message || tc("رمز التحقق غير صحيح أو منتهي", "Invalid or expired code")),
  });

  // ── Step 3 (phone method): Reset password directly ───────────────────────
  const resetByPhoneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/employees/reset-password-by-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || tc("فشل تغيير كلمة المرور", "Failed to change password"));
      return data;
    },
    onSuccess: () => {
      setStep("done");
      toast({ title: tc("تم بنجاح!", "Success!"), description: tc("تم تغيير كلمة المرور.", "Password changed.") });
      setTimeout(() => navigate("/employee/login"), 2000);
    },
    onError: (err: any) => setError(err?.message || tc("حدث خطأ", "An error occurred")),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError(tc("الرجاء إدخال اسم المستخدم أو البريد الإلكتروني", "Please enter username or email")); return; }
    if (method === "email") {
      requestOtpMutation.mutate(username.trim());
    } else {
      setStep("otp"); // skip to phone input (reuse otp step to show phone input)
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (method === "phone") {
      if (!phone.trim()) { setError(tc("الرجاء إدخال رقم الجوال", "Please enter your phone number")); return; }
      verifyPhoneMutation.mutate({ username: username.trim().toLowerCase(), phone: phone.trim() });
    } else {
      if (!otp.trim() || otp.trim().length !== 6) { setError(tc("الرجاء إدخال رمز التحقق المكون من 6 أرقام", "Please enter the 6-digit code")); return; }
      if (!newPassword || newPassword.length < 4) { setError(tc("كلمة المرور 4 أحرف على الأقل", "Password must be 4+ characters")); return; }
      if (newPassword !== confirmPassword) { setError(tc("كلمة المرور غير متطابقة", "Passwords do not match")); return; }
      verifyOtpMutation.mutate();
    }
  };

  const handlePhonePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || newPassword.length < 4) { setError(tc("كلمة المرور 4 أحرف على الأقل", "Password must be 4+ characters")); return; }
    if (newPassword !== confirmPassword) { setError(tc("كلمة المرور غير متطابقة", "Passwords do not match")); return; }
    resetByPhoneMutation.mutate();
  };

  const goBack = () => {
    setError("");
    if (step === "otp") setStep("username");
    else if (step === "password") setStep("otp");
    else navigate("/employee/login");
  };

  const isLoading = requestOtpMutation.isPending || verifyPhoneMutation.isPending || verifyOtpMutation.isPending || resetByPhoneMutation.isPending;

  // ── Done screen ───────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{tc("تم تغيير كلمة المرور!", "Password Changed!")}</h2>
          <p className="text-muted-foreground">{tc("سيتم تحويلك لصفحة تسجيل الدخول...", "Redirecting to login...")}</p>
          <Button onClick={() => navigate("/employee/login")} className="bg-primary text-primary-foreground">
            {tc("تسجيل الدخول الآن", "Login Now")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-40 h-28 mb-4">
            <img src={blackroseLogoStaff} alt="BLACK ROSE SYSTEMS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">BLACK ROSE SYSTEMS</h1>
          <p className="text-muted-foreground">{tc("استعادة كلمة المرور", "Password Recovery")}</p>
        </div>

        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-foreground">
              {tc("نسيت كلمة المرور؟", "Forgot Password?")}
            </CardTitle>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 pt-2" dir="ltr">
              {["username", "otp", "password"].map((s, i) => {
                const stepNum = { username: 0, otp: 1, password: 2, done: 3 }[step] ?? 0;
                const isDone = stepNum > i;
                const isActive = stepNum === i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all
                      ${isDone ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"}`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < 2 && <div className={`w-8 h-0.5 ${isDone ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* ── Step 1: Username + Method ── */}
            {step === "username" && (
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div className="relative">
                  <AtSign className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type="text"
                    placeholder={tc("اسم المستخدم أو البريد الإلكتروني", "Username or Email")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pr-10 bg-background border-border"
                    data-testid="input-username"
                    autoFocus
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>

                {/* Method selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all
                      ${method === "email" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    <Mail className="w-4 h-4" />
                    {tc("رمز عبر البريد", "Email OTP")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("phone")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all
                      ${method === "phone" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    <KeyRound className="w-4 h-4" />
                    {tc("التحقق بالجوال", "Phone Verify")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {method === "email"
                    ? tc("سنرسل رمز 6 أرقام إلى بريدك الإلكتروني المسجل", "We'll send a 6-digit code to your registered email")
                    : tc("سنتحقق من رقم جوالك المسجل في النظام", "We'll verify your registered phone number")}
                </p>

                {error && <p className="text-destructive text-sm text-right">{error}</p>}

                <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" data-testid="button-next">
                  {isLoading
                    ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />{tc("جاري الإرسال...", "Sending...")}</>
                    : <><ArrowRight className="w-4 h-4 mr-2" />{tc("التالي", "Next")}</>}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate("/employee/login")} className="w-full text-muted-foreground">
                  {tc("العودة لتسجيل الدخول", "Back to Login")}
                </Button>
              </form>
            )}

            {/* ── Step 2 (Email): OTP + New Password ── */}
            {step === "otp" && method === "email" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm flex items-center gap-2 border border-border">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{tc("تم إرسال رمز التحقق إلى بريدك الإلكتروني", "Code sent to your email")}</span>
                </div>

                <div className="relative">
                  <KeyRound className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder={tc("رمز التحقق (6 أرقام)", "Verification code (6 digits)")}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pr-10 bg-background border-border text-center text-2xl tracking-[0.5em] font-bold"
                    data-testid="input-otp"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder={tc("كلمة المرور الجديدة", "New password")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 pl-10 bg-background border-border"
                    data-testid="input-new-password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute left-3 top-3 text-primary hover:text-primary/80">
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={tc("تأكيد كلمة المرور", "Confirm password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 pl-10 bg-background border-border"
                    data-testid="input-confirm-password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-3 text-primary hover:text-primary/80">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">{tc("الرمز صالح لمدة 15 دقيقة • كلمة المرور 4 أحرف على الأقل", "Code valid 15 min • Password min 4 chars")}</p>
                {error && <p className="text-destructive text-sm text-right">{error}</p>}

                <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" data-testid="button-verify">
                  {isLoading
                    ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />{tc("جاري التحقق...", "Verifying...")}</>
                    : tc("تحقق وغيّر كلمة المرور", "Verify & Change Password")}
                </Button>
                <Button type="button" variant="ghost" onClick={goBack} className="w-full text-muted-foreground">
                  {tc("رجوع", "Back")}
                </Button>

                {/* Resend option */}
                <div className="text-center">
                  <button type="button" className="text-xs text-primary underline" onClick={() => requestOtpMutation.mutate(username.trim())} disabled={isLoading}>
                    {tc("إعادة إرسال الرمز", "Resend code")}
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 2 (Phone): Phone input ── */}
            {step === "otp" && method === "phone" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm flex items-center gap-2 border border-border">
                  <AtSign className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{username}</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type="tel"
                    placeholder={tc("رقم الجوال المسجل (مثال: 0501234567)", "Registered phone (e.g. 0501234567)")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 bg-background border-border"
                    data-testid="input-phone"
                    autoFocus
                    autoComplete="tel"
                    disabled={isLoading}
                  />
                </div>
                {error && <p className="text-destructive text-sm text-right">{error}</p>}
                <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" data-testid="button-verify-phone">
                  {isLoading
                    ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />{tc("جاري التحقق...", "Verifying...")}</>
                    : <><ArrowRight className="w-4 h-4 mr-2" />{tc("التحقق", "Verify")}</>}
                </Button>
                <Button type="button" variant="ghost" onClick={goBack} className="w-full text-muted-foreground">
                  {tc("رجوع", "Back")}
                </Button>
              </form>
            )}

            {/* ── Step 3 (Phone method): New Password ── */}
            {step === "password" && method === "phone" && (
              <form onSubmit={handlePhonePasswordSubmit} className="space-y-4">
                <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm flex items-center gap-2 border border-border">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{tc("تم التحقق من الهوية", "Identity verified")}</span>
                </div>

                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder={tc("كلمة المرور الجديدة", "New password")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 pl-10 bg-background border-border"
                    data-testid="input-new-password"
                    autoFocus
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute left-3 top-3 text-primary hover:text-primary/80">
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={tc("تأكيد كلمة المرور", "Confirm password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 pl-10 bg-background border-border"
                    data-testid="input-confirm-password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-3 text-primary hover:text-primary/80">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">{tc("كلمة المرور يجب أن تكون 4 أحرف على الأقل", "Password must be at least 4 characters")}</p>
                {error && <p className="text-destructive text-sm text-right">{error}</p>}

                <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" data-testid="button-reset">
                  {isLoading
                    ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />{tc("جاري الحفظ...", "Saving...")}</>
                    : tc("حفظ كلمة المرور الجديدة", "Save New Password")}
                </Button>
                <Button type="button" variant="ghost" onClick={goBack} className="w-full text-muted-foreground">
                  {tc("رجوع", "Back")}
                </Button>
              </form>
            )}

          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/employee/login")} className="text-primary hover:text-primary/80" data-testid="link-back">
            {tc("العودة لتسجيل الدخول", "Back to Login")}
          </Button>
        </div>
      </div>
    </div>
  );
}
