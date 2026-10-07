import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslate } from "@/lib/useTranslate";
import { PlanGate } from "@/components/plan-gate";

interface ApiScope {
  key: string;
  nameAr: string;
}

interface ApiCatalog {
  scopes: ApiScope[];
}

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: "live" | "test";
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface CreatedApiKey extends ApiKeyRecord {
  plainKey: string;
}

export default function ApiKeysManagementPage() {
  const tc = useTranslate();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [rateLimit, setRateLimit] = useState("100");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["orders:read"]);

  const keysQuery = useQuery<ApiKeyRecord[]>({
    queryKey: ["/api/ecosystem/api-keys"],
    retry: false,
  });
  const catalogQuery = useQuery<ApiCatalog>({
    queryKey: ["/api/ecosystem/catalog"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ecosystem/api-keys", {
        name: name.trim(),
        scopes: selectedScopes,
        environment,
        rateLimit: Number(rateLimit),
      });
      return response.json() as Promise<CreatedApiKey>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/api-keys"] });
      setCreateOpen(false);
      setName("");
      setSelectedScopes(["orders:read"]);
      setCreatedKey(result.plainKey);
      toast({ title: tc("تم إنشاء مفتاح API", "API key created") });
    },
    onError: (error: Error) => toast({
      title: tc("تعذر إنشاء المفتاح", "Could not create key"),
      description: error.message,
      variant: "destructive",
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/ecosystem/api-keys/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/api-keys"] });
      toast({ title: tc("تم تحديث حالة المفتاح", "Key status updated") });
    },
    onError: (error: Error) => toast({
      title: tc("تعذر تحديث المفتاح", "Could not update key"),
      description: error.message,
      variant: "destructive",
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/ecosystem/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecosystem/api-keys"] });
      toast({ title: tc("تم حذف المفتاح", "Key deleted") });
    },
    onError: (error: Error) => toast({
      title: tc("تعذر حذف المفتاح", "Could not delete key"),
      description: error.message,
      variant: "destructive",
    }),
  });

  const toggleScope = (scope: string, checked: boolean) => {
    setSelectedScopes((current) => checked
      ? Array.from(new Set([...current, scope]))
      : current.filter((value) => value !== scope));
  };

  const copyCreatedKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      toast({ title: tc("تم نسخ المفتاح", "Key copied") });
    } catch {
      toast({
        title: tc("انسخ المفتاح يدوياً", "Copy the key manually"),
        description: tc("تعذر الوصول إلى الحافظة في هذا المتصفح.", "Clipboard access is unavailable in this browser."),
      });
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return tc("لم يُستخدم بعد", "Never used");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(tc("ar-SA", "en-US"), { dateStyle: "medium" }).format(date);
  };

  const scopes = catalogQuery.data?.scopes || [];

  return (
    <PlanGate feature="apiAccess">
      <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6" dir={tc("rtl", "ltr")}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{tc("مفاتيح API", "API keys")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tc("أنشئ مفاتيح وصول خارجية وحدد الصلاحيات المطلوبة لكل مفتاح.", "Create external access keys and assign only the permissions each key needs.")}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-api-key">
              <Plus className="ml-2 h-4 w-4" />
              {tc("مفتاح جديد", "New key")}
            </Button>
            <DialogContent className="max-w-xl" dir={tc("rtl", "ltr")}>
              <DialogHeader>
                <DialogTitle>{tc("إنشاء مفتاح API", "Create an API key")}</DialogTitle>
                <DialogDescription>
                  {tc("سيظهر المفتاح الكامل مرة واحدة بعد الإنشاء. احفظه في مكان آمن.", "The full key is shown once after creation. Save it securely.")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">{tc("اسم المفتاح", "Key name")}</Label>
                  <Input id="api-key-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="off" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tc("البيئة", "Environment")}</Label>
                    <Select value={environment} onValueChange={(value: "live" | "test") => setEnvironment(value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">{tc("حقيقية", "Live")}</SelectItem>
                        <SelectItem value="test">{tc("اختبار", "Test")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key-rate-limit">{tc("الطلبات في الدقيقة", "Requests per minute")}</Label>
                    <Input
                      id="api-key-rate-limit"
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      value={rateLimit}
                      onChange={(event) => setRateLimit(event.target.value)}
                    />
                  </div>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{tc("الصلاحيات", "Permissions")}</legend>
                  {catalogQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">{tc("جاري تحميل الصلاحيات…", "Loading permissions…")}</p>
                  ) : catalogQuery.isError ? (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{tc("تعذر تحميل الصلاحيات.", "Could not load permissions.")}</span>
                      <Button type="button" size="sm" variant="outline" onClick={() => catalogQuery.refetch()}>{tc("إعادة المحاولة", "Retry")}</Button>
                    </div>
                  ) : (
                    <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                      {scopes.map((scope) => (
                        <label key={scope.key} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedScopes.includes(scope.key)}
                            onCheckedChange={(checked) => toggleScope(scope.key, checked === true)}
                          />
                          <span>{tc(scope.nameAr, scope.key)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc("إلغاء", "Cancel")}</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!name.trim() || selectedScopes.length === 0 || !Number.isInteger(Number(rateLimit)) || Number(rateLimit) < 1 || Number(rateLimit) > 10000 || catalogQuery.isError || createMutation.isPending}
                >
                  {createMutation.isPending ? tc("جارٍ الإنشاء…", "Creating…") : tc("إنشاء المفتاح", "Create key")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {keysQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">{tc("جاري تحميل المفاتيح…", "Loading keys…")}</div>
        ) : keysQuery.isError ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <p className="text-sm text-muted-foreground">{tc("تعذر تحميل مفاتيح API. حاول مرة أخرى.", "Could not load API keys. Try again.")}</p>
              <Button variant="outline" onClick={() => keysQuery.refetch()}>{tc("إعادة المحاولة", "Retry")}</Button>
            </CardContent>
          </Card>
        ) : keysQuery.data?.length ? (
          <div className="grid gap-3">
            {keysQuery.data.map((key) => (
              <Card key={key.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-md border p-2 text-primary"><KeyRound className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{key.name}</CardTitle>
                      <CardDescription className="mt-1 font-mono" dir="ltr">{key.keyPrefix}••••••••</CardDescription>
                    </div>
                  </div>
                  <Badge variant={key.isActive ? "default" : "secondary"}>
                    {key.isActive ? tc("نشط", "Active") : tc("متوقف", "Disabled")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{key.environment === "live" ? tc("حقيقية", "Live") : tc("اختبار", "Test")}</Badge>
                    <Badge variant="outline">{key.rateLimit} {tc("طلب/دقيقة", "requests/min")}</Badge>
                    {key.scopes.map((scope) => <Badge key={scope} variant="secondary">{scope}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tc("آخر استخدام:", "Last used:")} {formatDate(key.lastUsedAt)}
                    <span className="mx-2">·</span>
                    {tc("تاريخ الإنشاء:", "Created:")} {formatDate(key.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: key.id, isActive: !key.isActive })}
                      disabled={toggleMutation.isPending}
                    >
                      <ShieldCheck className="ml-2 h-4 w-4" />
                      {key.isActive ? tc("إيقاف المفتاح", "Disable key") : tc("تفعيل المفتاح", "Enable key")}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="ml-2 h-4 w-4" />{tc("حذف", "Delete")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir={tc("rtl", "ltr")}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{tc("حذف مفتاح API؟", "Delete this API key?")}</AlertDialogTitle>
                          <AlertDialogDescription>{tc("لن تتمكن التطبيقات التي تستخدمه من الوصول إلى النظام بعد الحذف.", "Applications using this key will lose access immediately.")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tc("إلغاء", "Cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(key.id)} disabled={deleteMutation.isPending}>
                            {tc("تأكيد الحذف", "Delete key")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{tc("لا توجد مفاتيح API", "No API keys yet")}</p>
              <p className="text-sm text-muted-foreground">{tc("أنشئ مفتاحاً بصلاحيات محددة لربط تطبيق خارجي.", "Create a scoped key to connect an external application.")}</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!createdKey} onOpenChange={(open) => { if (!open) setCreatedKey(null); }}>
          <DialogContent dir={tc("rtl", "ltr")}>
            <DialogHeader>
              <DialogTitle>{tc("احفظ مفتاح API الآن", "Save your API key now")}</DialogTitle>
              <DialogDescription>{tc("لن يظهر المفتاح الكامل مرة أخرى بعد إغلاق هذه النافذة.", "The full key will not be shown again after closing this dialog.")}</DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3">
              <code className="min-w-0 flex-1 break-all text-sm" dir="ltr">{createdKey}</code>
              <Button type="button" size="icon" variant="outline" onClick={copyCreatedKey} aria-label={tc("نسخ المفتاح", "Copy key")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setCreatedKey(null)}><Check className="ml-2 h-4 w-4" />{tc("حفظت المفتاح", "I've saved it")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGate>
  );
}
