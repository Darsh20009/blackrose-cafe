import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, ToggleLeft, ToggleRight, Ticket, Percent, Tag, Eye, EyeOff, Pencil } from "lucide-react";
import { useTranslate } from "@/lib/useTranslate";

interface DiscountCode {
  id: string;
  _id?: string;
  code: string;
  discountPercentage: number;
  reason: string;
  employeeId: string;
  isActive: number;
  usageCount?: number;
  usageLimit?: number | null;
  visibleToCustomers?: boolean;
  createdAt?: string;
}

export function CouponManagement() {
  const { toast } = useToast();
  const tc = useTranslate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountPercentage: 10,
    reason: "",
    usageLimit: "",
    visibleToCustomers: false,
    isActive: 1,
  });

  const { data: discountCodes = [], isLoading, isError, refetch } = useQuery<DiscountCode[]>({
    queryKey: ['/api/discount-codes'],
    retry: false,
  });

  const saveCouponMutation = useMutation({
    mutationFn: async (data: {
      code: string;
      discountPercentage: number;
      reason: string;
      usageLimit: number | null;
      visibleToCustomers: boolean;
      isActive: number;
    }) => {
      const response = editingId
        ? await apiRequest('PATCH', `/api/discount-codes/${editingId}`, data)
        : await apiRequest('POST', '/api/discount-codes', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: editingId ? tc("تم تعديل الكوبون", "Coupon updated") : tc("تم إنشاء الكوبون", "Coupon created"),
        description: editingId ? tc("تم حفظ التعديلات", "Your changes have been saved") : tc("تم إنشاء كود الخصم بنجاح", "Discount code created successfully"),
        className: "bg-green-600 text-white",
      });
      setIsAddDialogOpen(false);
      setEditingId(null);
      setNewCoupon({ code: "", discountPercentage: 10, reason: "", usageLimit: "", visibleToCustomers: false, isActive: 1 });
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes'] });
    },
    onError: (error: Error) => {
      toast({
        title: tc("تعذر حفظ الكوبون", "Could not save coupon"),
        description: error.message || tc("فشل في إنشاء كود الخصم", "Failed to create discount code"),
        variant: "destructive",
      });
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'isActive' | 'visibleToCustomers'; value: number | boolean }) => {
      const response = await apiRequest('PATCH', `/api/discount-codes/${id}`, { [field]: value });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: tc("تم التحديث", "Updated"), description: tc("تم تحديث حالة الكوبون", "Coupon status updated") });
      queryClient.invalidateQueries({ queryKey: ['/api/discount-codes'] });
    },
    onError: (error: Error) => {
      toast({ title: tc("تعذر تحديث الكوبون", "Could not update coupon"), description: error.message || tc("فشل في تحديث الكوبون", "Failed to update coupon"), variant: "destructive" });
    },
  });

  const handleSaveCoupon = () => {
    if (!newCoupon.code.trim()) {
      toast({ title: tc("خطأ", "Error"), description: tc("يرجى إدخال كود الخصم", "Please enter a discount code"), variant: "destructive" });
      return;
    }
    if (newCoupon.discountPercentage <= 0 || newCoupon.discountPercentage > 100) {
      toast({ title: tc("خطأ", "Error"), description: tc("نسبة الخصم يجب أن تكون بين 1 و 100", "Discount percentage must be between 1 and 100"), variant: "destructive" });
      return;
    }
    if (!newCoupon.reason.trim()) {
      toast({ title: tc("خطأ", "Error"), description: tc("يرجى إدخال سبب الخصم", "Please enter a discount reason"), variant: "destructive" });
      return;
    }
    const usageLimit = newCoupon.usageLimit.trim() ? Number(newCoupon.usageLimit) : null;
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
      toast({ title: tc("خطأ", "Error"), description: tc("حد الاستخدام يجب أن يكون رقماً صحيحاً موجباً", "Usage limit must be a positive whole number"), variant: "destructive" });
      return;
    }
    saveCouponMutation.mutate({
      code: newCoupon.code.toUpperCase(),
      discountPercentage: newCoupon.discountPercentage,
      reason: newCoupon.reason.trim(),
      visibleToCustomers: newCoupon.visibleToCustomers,
      usageLimit,
      isActive: newCoupon.isActive,
    });
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setNewCoupon({ code: "", discountPercentage: 10, reason: "", usageLimit: "", visibleToCustomers: false, isActive: 1 });
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (code: DiscountCode) => {
    setEditingId(code.id || code._id || "");
    setNewCoupon({
      code: code.code,
      discountPercentage: Number(code.discountPercentage) || 1,
      reason: code.reason || "",
      usageLimit: code.usageLimit ? String(code.usageLimit) : "",
      visibleToCustomers: !!code.visibleToCustomers,
      isActive: Number(code.isActive) === 0 ? 0 : 1,
    });
    setIsAddDialogOpen(true);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon({ ...newCoupon, code });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          <span className="font-medium">{tc("أكواد الخصم الخاصة بك", "Your Discount Codes")}</span>
          <Badge variant="secondary">{discountCodes.length}</Badge>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) setEditingId(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-add-coupon">
              <Plus className="w-4 h-4 ml-2" />
              {tc("إضافة كوبون", "Add Coupon")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? tc("تعديل كود الخصم", "Edit Discount Code") : tc("إنشاء كود خصم جديد", "Create New Discount Code")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">{tc("كود الخصم", "Discount Code")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="WELCOME20"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="flex-1"
                    dir="ltr"
                    data-testid="input-coupon-code"
                  />
                  {!editingId && <Button variant="outline" onClick={generateRandomCode} type="button">
                    {tc("توليد تلقائي", "Auto Generate")}
                  </Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage">{tc("نسبة الخصم (%)", "Discount % ")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="percentage"
                    type="number"
                    min="1"
                    max="100"
                    value={newCoupon.discountPercentage}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercentage: parseInt(e.target.value) || 0 })}
                    data-testid="input-coupon-percentage"
                  />
                  <Percent className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="usage-limit">{tc("حد الاستخدام (اختياري)", "Usage limit (optional)")}</Label>
                <Input
                  id="usage-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={newCoupon.usageLimit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                  placeholder={tc("اتركه فارغاً للاستخدام بلا حد", "Leave blank for unlimited uses")}
                  data-testid="input-coupon-usage-limit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">{tc("سبب الخصم", "Discount Reason")}</Label>
                <Input
                  id="reason"
                  placeholder={tc("مثال: عرض الافتتاح، عميل مميز", "e.g. Opening offer, VIP customer")}
                  value={newCoupon.reason}
                  onChange={(e) => setNewCoupon({ ...newCoupon, reason: e.target.value })}
                  data-testid="input-coupon-reason"
                />
              </div>
              {editingId && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="coupon-active" className="cursor-pointer">{tc("الكوبون مفعّل", "Coupon is active")}</Label>
                  <input
                    id="coupon-active"
                    type="checkbox"
                    checked={newCoupon.isActive === 1}
                    onChange={(e) => setNewCoupon({ ...newCoupon, isActive: e.target.checked ? 1 : 0 })}
                    className="h-4 w-4 accent-primary"
                    data-testid="switch-edit-coupon-active"
                  />
                </div>
              )}
              <div
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${newCoupon.visibleToCustomers ? 'border-primary bg-primary/5' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}
                onClick={() => setNewCoupon({ ...newCoupon, visibleToCustomers: !newCoupon.visibleToCustomers })}
                data-testid="toggle-visible-to-customers"
              >
                <div className="flex items-center gap-3">
                  {newCoupon.visibleToCustomers ? (
                    <Eye className="w-5 h-5 text-primary" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{tc("إظهار للعملاء", "Show to Customers")}</p>
                    <p className="text-xs text-muted-foreground">
                      {newCoupon.visibleToCustomers
                        ? tc('سيظهر هذا الكوبون في صفحة الدفع للعملاء', 'This coupon will appear on the checkout page for customers')
                        : tc('لن يظهر هذا الكوبون للعملاء (يُستخدم يدوياً فقط)', 'This coupon will not be visible to customers (manual use only)')}
                    </p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors ${newCoupon.visibleToCustomers ? 'bg-primary' : 'bg-muted-foreground/30'} relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${newCoupon.visibleToCustomers ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {tc("إلغاء", "Cancel")}
              </Button>
              <Button
                onClick={handleSaveCoupon}
                disabled={saveCouponMutation.isPending}
                data-testid="button-confirm-create-coupon"
              >
                {saveCouponMutation.isPending
                  ? tc("جارٍ الحفظ...", "Saving...")
                  : editingId ? tc("حفظ التعديلات", "Save changes") : tc("إنشاء", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">{tc("تعذر تحميل أكواد الخصم. تحقق من اتصالك وحاول مرة أخرى.", "Could not load discount codes. Check your connection and try again.")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>{tc("إعادة المحاولة", "Try again")}</Button>
          </CardContent>
        </Card>
      ) : discountCodes.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{tc("لم تقم بإنشاء أي أكواد خصم بعد", "You haven't created any discount codes yet")}</p>
            <p className="text-sm text-muted-foreground mt-1">{tc('اضغط على "إضافة كوبون" لإنشاء كود خصم جديد', 'Click "Add Coupon" to create a new discount code')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discountCodes.map((code) => {
            const codeId = code.id || code._id || '';
            return (
              <Card key={codeId} className={`border ${Number(code.isActive) === 1 ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/10' : 'border-gray-300 bg-gray-50/70 dark:bg-gray-900/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-mono font-bold text-lg">{code.code}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {code.visibleToCustomers && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0.5 gap-0.5">
                          <Eye className="w-3 h-3" />
                          {tc("عام", "Public")}
                        </Badge>
                      )}
                      <Badge className={Number(code.isActive) === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}>
                        {Number(code.isActive) === 1 ? tc('نشط', 'Active') : tc('ملغى', 'Disabled')}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-muted-foreground" />
                      <span>{tc("خصم", "Discount")} {code.discountPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{code.reason}</span>
                    </div>
                    {code.usageCount !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {tc("الاستخدام:", "Uses:")} {code.usageCount}{code.usageLimit ? ` / ${code.usageLimit}` : ""} {tc("مرة", "times")}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleCouponMutation.mutate({ id: codeId, field: 'isActive', value: Number(code.isActive) === 1 ? 0 : 1 })}
                      disabled={toggleCouponMutation.isPending}
                      data-testid={`button-toggle-coupon-${code.code}`}
                    >
                      {Number(code.isActive) === 1 ? <><ToggleRight className="w-4 h-4 ml-2" />{tc("إلغاء التفعيل", "Disable")}</> : <><ToggleLeft className="w-4 h-4 ml-2" />{tc("تفعيل", "Enable")}</>}
                    </Button>
                    <Button
                      variant={code.visibleToCustomers ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleCouponMutation.mutate({ id: codeId, field: 'visibleToCustomers', value: !code.visibleToCustomers })}
                      disabled={toggleCouponMutation.isPending}
                      data-testid={`button-visibility-coupon-${code.code}`}
                    >
                      {code.visibleToCustomers ? <><EyeOff className="w-4 h-4 ml-2" />{tc("إخفاء", "Hide")}</> : <><Eye className="w-4 h-4 ml-2" />{tc("إظهار", "Show")}</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(code)}
                      data-testid={`button-edit-coupon-${code.code}`}
                    >
                      <Pencil className="w-4 h-4 ml-2" />{tc("تعديل", "Edit")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CouponManagement;
