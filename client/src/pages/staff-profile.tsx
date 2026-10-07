import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslate } from "@/lib/useTranslate";

interface StaffProfileData {
  id: string;
  username: string;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  jobTitle?: string;
  branchId?: string;
  employmentNumber?: string;
  isActive?: number;
}

const roleNames: Record<string, [string, string]> = {
  owner: ["المالك", "Owner"],
  admin: ["مدير النظام", "Administrator"],
  manager: ["مدير", "Manager"],
  branch_manager: ["مدير فرع", "Branch manager"],
};

export default function StaffProfile() {
  const tc = useTranslate();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile, isLoading, isError } = useQuery<StaffProfileData>({
    queryKey: ["/api/employees/me"],
    retry: false,
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (passwords.newPassword.length < 8) {
        throw new Error(tc("كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل", "The new password must be at least 8 characters"));
      }
      if (passwords.newPassword !== passwords.confirmPassword) {
        throw new Error(tc("تأكيد كلمة المرور غير متطابق", "The password confirmation does not match"));
      }
      const response = await apiRequest("POST", "/api/employees/me/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: tc("تم تغيير كلمة المرور", "Password changed"),
        description: tc("تم حفظ كلمة المرور الجديدة", "Your new password has been saved"),
      });
    },
    onError: (error: Error) => toast({
      title: tc("تعذر تغيير كلمة المرور", "Could not change password"),
      description: error.message,
      variant: "destructive",
    }),
  });

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">{tc("جاري تحميل بيانات الحساب…", "Loading account details…")}</div>;
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6" dir={tc("rtl", "ltr")}>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {tc("تعذر تحميل بيانات الحساب. حدّث الصفحة أو سجّل الدخول مرة أخرى.", "Could not load account details. Refresh the page or sign in again.")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleName = roleNames[profile.role] || [profile.role, profile.role];
  const details = [
    { label: tc("اسم المستخدم", "Username"), value: profile.username, icon: UserRound },
    { label: tc("رقم الجوال", "Phone"), value: profile.phone || "—", icon: Phone },
    { label: tc("البريد الإلكتروني", "Email"), value: profile.email || "—", icon: Mail },
    { label: tc("المسمى الوظيفي", "Job title"), value: profile.jobTitle || "—", icon: ShieldCheck },
    { label: tc("الفرع", "Branch"), value: profile.branchId || tc("غير محدد", "Not assigned"), icon: MapPin },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6" dir={tc("rtl", "ltr")}>
      <header className="space-y-1">
        <h1 className="text-xl font-bold sm:text-2xl">{tc("حسابي", "My account")}</h1>
        <p className="text-sm text-muted-foreground">{tc("بيانات حسابك وإعدادات الأمان", "Your account details and security settings")}</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg">{profile.fullName}</CardTitle>
            <CardDescription className="mt-1" dir="ltr">@{profile.username}</CardDescription>
          </div>
          <Badge variant="secondary">{tc(roleName[0], roleName[1])}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-start gap-3 rounded-lg border p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 break-words text-sm font-medium" dir={label === tc("رقم الجوال", "Phone") ? "ltr" : undefined}>{value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{tc("تغيير كلمة المرور", "Change password")}</CardTitle>
          </div>
          <CardDescription>{tc("أدخل كلمة المرور الحالية ثم اختر كلمة مرور جديدة لا تقل عن ٨ أحرف.", "Enter your current password and choose a new one with at least 8 characters.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              changePassword.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="current-password">{tc("كلمة المرور الحالية", "Current password")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((value) => ({ ...value, currentPassword: event.target.value }))}
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{tc("كلمة المرور الجديدة", "New password")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwords.newPassword}
                onChange={(event) => setPasswords((value) => ({ ...value, newPassword: event.target.value }))}
                required
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{tc("تأكيد كلمة المرور", "Confirm password")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwords.confirmPassword}
                onChange={(event) => setPasswords((value) => ({ ...value, confirmPassword: event.target.value }))}
                required
                data-testid="input-confirm-password"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={changePassword.isPending} data-testid="button-change-password">
                {changePassword.isPending ? tc("جارٍ الحفظ…", "Saving…") : tc("حفظ كلمة المرور", "Save password")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
