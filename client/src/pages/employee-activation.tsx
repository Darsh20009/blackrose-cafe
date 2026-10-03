import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { useTranslate } from "@/lib/useTranslate";
import blackroseLogoStaff from "@assets/blackrose-logo.png";

export default function EmployeeActivation() {
  const [, setLocation] = useLocation();
  const tc = useTranslate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border border-border bg-card">
        <CardHeader className="space-y-3 text-center">
          <img src={blackroseLogoStaff} alt="BLACK ROSE" className="mx-auto h-12 object-contain" />
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold text-foreground">
            {tc("تفعيل الحساب بموافقة الإدارة", "Account activation requires admin approval")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {tc("لا يمكن تفعيل حساب الموظف من هذه الصفحة. اطلب من مديرك تفعيل الحساب، ثم سجّل الدخول برمز واتساب أو ببياناتك الحالية.", "Employee accounts must be activated by an administrator. Ask your manager to activate your account, then sign in with WhatsApp or your existing credentials.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => setLocation("/employee/login")} data-testid="button-back-to-login">
            {tc("العودة إلى تسجيل الدخول", "Back to sign in")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}