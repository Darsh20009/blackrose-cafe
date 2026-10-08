import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Clock3, CreditCard, RotateCcw, Save, Truck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslate } from "@/lib/useTranslate";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEK = [
  { key: "sunday", ar: "الأحد", en: "Sunday" },
  { key: "monday", ar: "الإثنين", en: "Monday" },
  { key: "tuesday", ar: "الثلاثاء", en: "Tuesday" },
  { key: "wednesday", ar: "الأربعاء", en: "Wednesday" },
  { key: "thursday", ar: "الخميس", en: "Thursday" },
  { key: "friday", ar: "الجمعة", en: "Friday" },
  { key: "saturday", ar: "السبت", en: "Saturday" },
] as const;

const ORDER_METHODS = [
  { key: "enableTakeaway", ar: "استلام من الفرع", en: "Branch pickup" },
  { key: "enableDineIn", ar: "داخل المطعم", en: "Dine-in" },
  { key: "enableCarPickup", ar: "استلام من السيارة", en: "Car pickup" },
  { key: "enableDelivery", ar: "التوصيل للمنزل", en: "Home delivery" },
  { key: "enableScheduledPickup", ar: "الاستلام المجدول", en: "Scheduled pickup" },
] as const;

type OperationalForm = {
  isEmergencyClosed: boolean;
  storeHours: Record<string, { open: string; close: string; isOpen: boolean; isAlwaysOpen?: boolean }>;
  orderMethodsConfig: Record<string, boolean>;
  deliveryPolicy: { radiusKm: number; feeSar: number };
  enabledPaymentMethodIds: string[];
  vatPercentage: number;
  serviceFeeEnabled: boolean;
  serviceFeeAmount: number;
  serviceFeeLowOrderThreshold: number;
  serviceFeeLowOrderAmount: number;
};

function makeForm(effective: any, paymentMethods: any[], deliveryEnabled?: boolean): OperationalForm {
  const methods = effective?.orderMethodsConfig || {};
  const hours = effective?.storeHours || {};
  const ids = Array.isArray(effective?.enabledPaymentMethodIds)
    ? effective.enabledPaymentMethodIds
    : paymentMethods.map((method) => method.id);
  return {
    isEmergencyClosed: effective?.isEmergencyClosed === true,
    storeHours: Object.fromEntries(WEEK.map(({ key }) => {
      const day = hours[key] || {};
      return [key, {
        open: typeof day.open === "string" ? day.open : "06:00",
        close: typeof day.close === "string" ? day.close : "23:00",
        isOpen: day.isOpen !== false,
        isAlwaysOpen: day.isAlwaysOpen === true,
      }];
    })),
    orderMethodsConfig: Object.fromEntries(ORDER_METHODS.map(({ key }) => [
      key,
      key === "enableDelivery" && deliveryEnabled !== undefined ? deliveryEnabled : methods[key] !== false,
    ])),
    deliveryPolicy: {
      radiusKm: Number(effective?.deliveryPolicy?.radiusKm) || 30,
      feeSar: Number(effective?.deliveryPolicy?.feeSar) || 0,
    },
    enabledPaymentMethodIds: [...ids],
    vatPercentage: Number.isFinite(Number(effective?.vatPercentage)) ? Number(effective.vatPercentage) : 15,
    serviceFeeEnabled: effective?.serviceFeeEnabled !== false,
    serviceFeeAmount: Number(effective?.serviceFeeAmount ?? 0.7),
    serviceFeeLowOrderThreshold: Number(effective?.serviceFeeLowOrderThreshold ?? 5),
    serviceFeeLowOrderAmount: Number(effective?.serviceFeeLowOrderAmount ?? 0.35),
  };
}

function buildPatch(form: OperationalForm, baseline: OperationalForm): Record<string, any> {
  const patch: Record<string, any> = {};
  if (form.isEmergencyClosed !== baseline.isEmergencyClosed) patch.isEmergencyClosed = form.isEmergencyClosed;
  if (JSON.stringify(form.storeHours) !== JSON.stringify(baseline.storeHours)) patch.storeHours = form.storeHours;

  const changedMethods: Record<string, boolean> = {};
  for (const { key } of ORDER_METHODS) {
    if (form.orderMethodsConfig[key] !== baseline.orderMethodsConfig[key]) {
      changedMethods[key] = form.orderMethodsConfig[key];
    }
  }
  if (Object.keys(changedMethods).length) patch.orderMethodsConfig = changedMethods;

  const changedDelivery: Record<string, number> = {};
  if (form.deliveryPolicy.radiusKm !== baseline.deliveryPolicy.radiusKm) changedDelivery.radiusKm = form.deliveryPolicy.radiusKm;
  if (form.deliveryPolicy.feeSar !== baseline.deliveryPolicy.feeSar) changedDelivery.feeSar = form.deliveryPolicy.feeSar;
  if (Object.keys(changedDelivery).length) patch.deliveryPolicy = changedDelivery;

  const sortedCurrentMethods = [...form.enabledPaymentMethodIds].sort();
  const sortedBaselineMethods = [...baseline.enabledPaymentMethodIds].sort();
  if (JSON.stringify(sortedCurrentMethods) !== JSON.stringify(sortedBaselineMethods)) {
    patch.enabledPaymentMethodIds = sortedCurrentMethods;
  }

  for (const key of [
    "vatPercentage",
    "serviceFeeEnabled",
    "serviceFeeAmount",
    "serviceFeeLowOrderThreshold",
    "serviceFeeLowOrderAmount",
  ] as const) {
    if (form[key] !== baseline[key]) patch[key] = form[key];
  }
  return patch;
}

export function BranchOperationalSettings() {
  const tc = useTranslate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState("");
  const [form, setForm] = useState<OperationalForm | null>(null);

  const { data: branches = [], isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ["/api/branches?includeInactive=true"],
  });
  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
  });
  const settingsQuery = useQuery<any>({
    queryKey: ["/api/admin/branches", branchId, "operational-settings"],
    enabled: !!branchId,
    queryFn: async () => {
      const response = await fetch(`/api/admin/branches/${encodeURIComponent(branchId)}/operational-settings`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل إعدادات الفرع");
      return data;
    },
  });

  useEffect(() => {
    if (!branchId && branches.length) {
      setBranchId(String(branches[0].id || branches[0]._id || ""));
    }
  }, [branchId, branches]);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(makeForm(settingsQuery.data.effective, paymentMethods, settingsQuery.data.branch?.deliveryEnabled));
    }
  }, [settingsQuery.data, paymentMethods]);

  const baseline = useMemo(
    () => settingsQuery.data
      ? makeForm(settingsQuery.data.effective, paymentMethods, settingsQuery.data.branch?.deliveryEnabled)
      : null,
    [settingsQuery.data, paymentMethods],
  );
  const patch = useMemo(
    () => form && baseline ? buildPatch(form, baseline) : {},
    [form, baseline],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "PATCH",
        `/api/admin/branches/${encodeURIComponent(branchId)}/operational-settings`,
        { settings: patch },
      );
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/branches", branchId, "operational-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/public/branches"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/public/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }),
      ]);
      toast({ title: tc("تم الحفظ", "Saved"), description: tc("تم تحديث إعدادات الفرع", "Branch settings updated") });
    },
    onError: (error: Error) => toast({
      title: tc("تعذر الحفظ", "Could not save"),
      description: error.message,
      variant: "destructive",
    }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE",
        `/api/admin/branches/${encodeURIComponent(branchId)}/operational-settings`,
      );
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/branches", branchId, "operational-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/public/branches"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/public/settings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }),
      ]);
      toast({ title: tc("تمت استعادة الافتراضي", "Defaults restored") });
    },
    onError: (error: Error) => toast({
      title: tc("تعذر الاستعادة", "Could not restore defaults"),
      description: error.message,
      variant: "destructive",
    }),
  });

  const selectedBranch = branches.find((branch) => String(branch.id || branch._id) === branchId);
  const hasOverrides = Object.keys(settingsQuery.data?.overrides || {}).length > 0;
  const update = (updater: (current: OperationalForm) => OperationalForm) => {
    setForm((current) => current ? updater(current) : current);
  };

  if (branchesLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{tc("جارٍ تحميل الفروع…", "Loading branches…")}</div>;
  }
  if (!branches.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{tc("لا توجد فروع لإعدادها", "No branches to configure")}</p>
          <Button variant="outline" onClick={() => window.location.assign("/admin/branches")}>
            {tc("إدارة الفروع", "Manage branches")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir={tc("rtl", "ltr")}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {tc("إعدادات التشغيل حسب الفرع", "Branch operating settings")}
          </CardTitle>
          <CardDescription>
            {tc(
              "اختر الفرع لتخصيص تشغيله. أي قيمة لا تخصصها تبقى موروثة من إعدادات المنشأة.",
              "Choose a branch to customize. Values you do not override continue to inherit the business defaults.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="branch-operational-settings-select">{tc("الفرع", "Branch")}</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger id="branch-operational-settings-select" data-testid="select-branch-operational-settings">
              <SelectValue placeholder={tc("اختر فرعًا", "Choose a branch")} />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => {
                const id = String(branch.id || branch._id);
                return (
                  <SelectItem key={id} value={id}>
                    {branch.nameAr || branch.nameEn || tc("فرع بدون اسم", "Unnamed branch")}
                    {branch.isActive === false || branch.isActive === 0 ? ` · ${tc("متوقف", "Inactive")}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedBranch && (
            selectedBranch.allowOnlineOrders === false || selectedBranch.isOnline === false || selectedBranch.isActive === false
          ) && (
            <p className="text-xs text-amber-700">
              {selectedBranch.isActive === false
                ? tc("هذا الفرع غير نشط. فعّله من صفحة إدارة الفروع قبل استقبال الطلبات.", "This branch is inactive. Activate it in Branch Management before accepting orders.")
                : tc("استقبال الطلبات الإلكترونية متوقف لهذا الفرع من صفحة إدارة الفروع.", "Online ordering is disabled for this branch in Branch Management.")}
            </p>
          )}
        </CardContent>
      </Card>

      {settingsQuery.isError ? (
        <Card><CardContent className="py-8 text-center text-sm text-destructive">
          {(settingsQuery.error as Error)?.message || tc("تعذر تحميل إعدادات الفرع", "Could not load branch settings")}
        </CardContent></Card>
      ) : settingsQuery.isLoading || !form || !baseline ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{tc("جارٍ تحميل إعدادات الفرع…", "Loading branch settings…")}</div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" />{tc("ساعات العمل وحالة الفرع", "Hours and branch status")}</CardTitle>
              <CardDescription>{tc("الإغلاق الطارئ وساعات هذا الفرع فقط.", "Emergency closure and opening hours for this branch only.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="branch-emergency-close" className="cursor-pointer">{tc("إغلاق طارئ لهذا الفرع", "Emergency close this branch")}</Label>
                <Switch
                  id="branch-emergency-close"
                  checked={form.isEmergencyClosed}
                  onCheckedChange={(value) => update((current) => ({ ...current, isEmergencyClosed: value }))}
                  data-testid="switch-branch-emergency-close"
                />
              </div>
              <div className="space-y-2">
                {WEEK.map(({ key, ar, en }) => {
                  const day = form.storeHours[key];
                  return (
                    <div key={key} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(100px,1fr)_auto_minmax(100px,1fr)_auto] sm:items-center">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="font-medium">{tc(ar, en)}</Label>
                        <Switch
                          checked={day.isOpen}
                          onCheckedChange={(value) => update((current) => ({
                            ...current,
                            storeHours: { ...current.storeHours, [key]: { ...current.storeHours[key], isOpen: value } },
                          }))}
                          aria-label={tc(`فتح ${ar}`, `Open ${en}`)}
                        />
                      </div>
                      <span className="hidden text-muted-foreground sm:block">·</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={day.open}
                          disabled={!day.isOpen || day.isAlwaysOpen}
                          onChange={(event) => update((current) => ({
                            ...current,
                            storeHours: { ...current.storeHours, [key]: { ...current.storeHours[key], open: event.target.value } },
                          }))}
                          aria-label={tc(`وقت فتح ${ar}`, `Opening time ${en}`)}
                        />
                        <Input
                          type="time"
                          value={day.close}
                          disabled={!day.isOpen || day.isAlwaysOpen}
                          onChange={(event) => update((current) => ({
                            ...current,
                            storeHours: { ...current.storeHours, [key]: { ...current.storeHours[key], close: event.target.value } },
                          }))}
                          aria-label={tc(`وقت إغلاق ${ar}`, `Closing time ${en}`)}
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <Switch
                          checked={day.isAlwaysOpen === true}
                          disabled={!day.isOpen}
                          onCheckedChange={(value) => update((current) => ({
                            ...current,
                            storeHours: { ...current.storeHours, [key]: { ...current.storeHours[key], isAlwaysOpen: value } },
                          }))}
                          aria-label={tc(`مفتوح طوال اليوم ${ar}`, `Open all day ${en}`)}
                        />
                        <span className="text-xs text-muted-foreground">{tc("طوال اليوم", "All day")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" />{tc("طرق الطلب والتوصيل", "Order methods and delivery")}</CardTitle>
              <CardDescription>{tc("تتحكم هذه الخيارات فيما يستطيع العميل طلبه من الفرع المحدد.", "These options control what customers can order from this branch.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {ORDER_METHODS.map(({ key, ar, en }) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <Label htmlFor={`branch-${key}`} className="cursor-pointer">{tc(ar, en)}</Label>
                    <Switch
                      id={`branch-${key}`}
                      checked={form.orderMethodsConfig[key] !== false}
                      onCheckedChange={(value) => update((current) => ({
                        ...current,
                        orderMethodsConfig: { ...current.orderMethodsConfig, [key]: value },
                      }))}
                      data-testid={`switch-branch-${key}`}
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch-delivery-radius">{tc("نطاق التوصيل (كم)", "Delivery radius (km)")}</Label>
                  <Input
                    id="branch-delivery-radius"
                    type="number"
                    min="1"
                    max="200"
                    value={form.deliveryPolicy.radiusKm}
                    onChange={(event) => update((current) => ({
                      ...current,
                      deliveryPolicy: { ...current.deliveryPolicy, radiusKm: Number(event.target.value) },
                    }))}
                    data-testid="input-branch-delivery-radius"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-delivery-fee">{tc("رسوم التوصيل", "Delivery fee")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="branch-delivery-fee"
                      type="number"
                      min="0"
                      max="1000"
                      step="0.5"
                      value={form.deliveryPolicy.feeSar}
                      onChange={(event) => update((current) => ({
                        ...current,
                        deliveryPolicy: { ...current.deliveryPolicy, feeSar: Number(event.target.value) },
                      }))}
                      data-testid="input-branch-delivery-fee"
                    />
                    <span className="text-sm text-muted-foreground">{tc("ر.س", "SAR")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />{tc("الدفع والضريبة ورسوم الخدمة", "Payments, tax and service fee")}</CardTitle>
              <CardDescription>{tc("مفاتيح بوابات الدفع تبقى مشتركة وآمنة؛ اختر فقط الطرق المتاحة لهذا الفرع.", "Gateway credentials remain shared and secure; choose which available methods this branch accepts.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>{tc("طرق الدفع المتاحة", "Available payment methods")}</Label>
                {methodsLoading ? (
                  <p className="text-sm text-muted-foreground">{tc("جارٍ تحميل طرق الدفع…", "Loading payment methods…")}</p>
                ) : paymentMethods.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{tc("لا توجد طرق دفع مفعلة على مستوى المنشأة بعد.", "No payment methods are enabled for the business yet.")}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <Label htmlFor={`branch-payment-${method.id}`} className="cursor-pointer text-sm">
                          {tc(method.nameAr || method.id, method.nameEn || method.nameAr || method.id)}
                        </Label>
                        <Switch
                          id={`branch-payment-${method.id}`}
                          checked={form.enabledPaymentMethodIds.includes(method.id)}
                          onCheckedChange={(checked) => update((current) => ({
                            ...current,
                            enabledPaymentMethodIds: checked
                              ? [...new Set([...current.enabledPaymentMethodIds, method.id])]
                              : current.enabledPaymentMethodIds.filter((id) => id !== method.id),
                          }))}
                          aria-label={tc(`السماح بالدفع عبر ${method.nameAr || method.id}`, `Allow payment by ${method.nameEn || method.id}`)}
                          data-testid={`switch-branch-payment-${method.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch-vat">{tc("نسبة الضريبة (%)", "VAT rate (%)")}</Label>
                  <Input id="branch-vat" type="number" min="0" max="100" step="0.1" value={form.vatPercentage} onChange={(event) => update((current) => ({ ...current, vatPercentage: Number(event.target.value) }))} data-testid="input-branch-vat" />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="branch-service-fee-enabled" className="cursor-pointer">{tc("تفعيل رسوم الخدمة", "Enable service fee")}</Label>
                  <Switch id="branch-service-fee-enabled" checked={form.serviceFeeEnabled} onCheckedChange={(value) => update((current) => ({ ...current, serviceFeeEnabled: value }))} data-testid="switch-branch-service-fee" />
                </div>
              </div>
              {form.serviceFeeEnabled && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="branch-service-fee">{tc("الرسوم العادية", "Standard fee")}</Label>
                    <Input id="branch-service-fee" type="number" min="0" max="1000" step="0.05" value={form.serviceFeeAmount} onChange={(event) => update((current) => ({ ...current, serviceFeeAmount: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-service-threshold">{tc("حد الطلب المنخفض", "Low-order threshold")}</Label>
                    <Input id="branch-service-threshold" type="number" min="0" max="10000" step="0.5" value={form.serviceFeeLowOrderThreshold} onChange={(event) => update((current) => ({ ...current, serviceFeeLowOrderThreshold: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-service-low-fee">{tc("رسوم الطلب المنخفض", "Low-order fee")}</Label>
                    <Input id="branch-service-low-fee" type="number" min="0" max="1000" step="0.05" value={form.serviceFeeLowOrderAmount} onChange={(event) => update((current) => ({ ...current, serviceFeeLowOrderAmount: Number(event.target.value) }))} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {hasOverrides
                ? <Badge variant="secondary">{tc("له إعدادات مخصصة", "Custom settings")}</Badge>
                : <span>{tc("يستخدم القيم الافتراضية للمنشأة", "Using business defaults")}</span>}
              <span>{tc(`الفرع: ${selectedBranch?.nameAr || ""}`, `Branch: ${selectedBranch?.nameEn || selectedBranch?.nameAr || ""}`)}</span>
            </div>
            <div className="flex items-center gap-2">
              {hasOverrides && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending || saveMutation.isPending}
                  data-testid="button-reset-branch-operational-settings"
                >
                  <RotateCcw className="me-2 h-4 w-4" />
                  {tc("استعادة الافتراضي", "Restore defaults")}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || resetMutation.isPending || Object.keys(patch).length === 0}
                data-testid="button-save-branch-operational-settings"
              >
                <Save className="me-2 h-4 w-4" />
                {saveMutation.isPending ? tc("جارٍ الحفظ…", "Saving…") : tc("حفظ إعدادات الفرع", "Save branch settings")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
