import { useState } from "react";
import { useTranslate, tc } from "@/lib/useTranslate";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, Percent, Package, ShoppingBag, Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface PromoOffer {
  _id: string;
  id: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  offerType: "bundle" | "discount" | "bogo";
  originalPrice: number;
  offerPrice: number;
  isActive: number;
  startDate?: string;
  endDate?: string;
}

function SarIcon() {
  const tc = useTranslate();
  return <span className="font-arabic text-xs font-bold">ر.س</span>;
}

const offerTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  bundle: { label: tc("باقة", "Bundle"), color: "bg-blue-100 text-blue-700 border-blue-200", icon: Package },
  discount: { label: tc("خصم", "Discount"), color: "bg-primary/10 text-primary border-primary/20", icon: Percent },
  bogo: { label: tc("اشتر واحد واحصل على واحد", "Buy One Get One"), color: "bg-purple-100 text-purple-700 border-purple-200", icon: ShoppingBag },
};

const defaultForm = {
  nameAr: "",
  nameEn: "",
  description: "",
  offerType: "bundle" as "bundle" | "discount" | "bogo",
  originalPrice: "",
  offerPrice: "",
  startDate: "",
  endDate: "",
  isActive: 1,
};

export default function PromotionsManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: offers = [], isLoading } = useQuery<PromoOffer[]>({
    queryKey: ["/api/admin/promo-offers"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        const res = await apiRequest("PUT", `/api/promo-offers/${editingId}`, data);
        if (!res.ok) throw new Error(tc("فشل تحديث العرض", "Failed to update offer"));
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/promo-offers`, data);
        if (!res.ok) throw new Error(tc("فشل إنشاء العرض", "Failed to create offer"));
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo-offers"] });
      setShowDialog(false);
      setEditingId(null);
      setForm({ ...defaultForm });
      toast({ title: editingId ? tc("تم التحديث", "Updated") : tc("تم الإنشاء", "Created") });
    },
    onError: (err: any) => toast({ variant: "destructive", title: tc("خطأ", "Error"), description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/promo-offers/${id}`);
      if (!res.ok) throw new Error(tc("فشل الحذف", "Failed to delete"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo-offers"] });
      setDeleteId(null);
      toast({ title: tc("تم الحذف", "Deleted") });
    },
    onError: (err: any) => toast({ variant: "destructive", title: tc("خطأ", "Error"), description: err.message }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const res = await apiRequest("PUT", `/api/promo-offers/${id}`, { isActive });
      if (!res.ok) throw new Error(tc("فشل التحديث", "Failed to update"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promo-offers"] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowDialog(true);
  };

  const openEdit = (offer: PromoOffer) => {
    setEditingId(offer._id || offer.id);
    setForm({
      nameAr: offer.nameAr,
      nameEn: offer.nameEn || "",
      description: offer.description || "",
      offerType: offer.offerType,
      originalPrice: String(offer.originalPrice),
      offerPrice: String(offer.offerPrice),
      startDate: offer.startDate ? offer.startDate.slice(0, 10) : "",
      endDate: offer.endDate ? offer.endDate.slice(0, 10) : "",
      isActive: offer.isActive,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.nameAr.trim()) return toast({ variant: "destructive", title: tc("يرجى إدخال اسم العرض", "Please enter offer name") });
    if (!form.originalPrice || !form.offerPrice) return toast({ variant: "destructive", title: tc("يرجى إدخال الأسعار", "Please enter prices") });
    saveMutation.mutate({
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      description: form.description,
      offerType: form.offerType,
      originalPrice: parseFloat(form.originalPrice),
      offerPrice: parseFloat(form.offerPrice),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      isActive: form.isActive,
    });
  };

  const discountPct = (offer: PromoOffer) => {
    if (!offer.originalPrice || offer.originalPrice === 0) return 0;
    return Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/manager/dashboard")} data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground">{tc("إدارة العروض الترويجية", "Promotions Management")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{tc("باقات، خصومات، اشتر واحد واحصل على واحد", "Bundles, discounts, buy one get one")}</p>
          </div>
        </div>
        <Button onClick={openCreate} data-testid="button-create-offer">
          <Plus className="w-4 h-4 ml-2" /> عرض جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (offers as PromoOffer[]).length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-semibold text-muted-foreground">{tc("لا توجد عروض بعد", "No offers yet")}</p>
            <p className="text-sm text-muted-foreground mt-1">{tc("أنشئ عرضك الأول الآن", "Create your first offer now")}</p>
            <Button className="mt-4" onClick={openCreate}>{tc("إضافة عرض", "Add Offer")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(offers as PromoOffer[]).map(offer => {
            const typeInfo = offerTypeLabels[offer.offerType] || offerTypeLabels.bundle;
            const TypeIcon = typeInfo.icon;
            const pct = discountPct(offer);
            return (
              <Card key={offer._id || offer.id} className={`transition-all ${!offer.isActive ? 'opacity-50' : ''}`} data-testid={`card-offer-${offer._id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-bold leading-tight">{offer.nameAr}</CardTitle>
                      {offer.nameEn && <p className="text-xs text-muted-foreground mt-0.5">{offer.nameEn}</p>}
                    </div>
                    <Switch
                      checked={!!offer.isActive}
                      onCheckedChange={v => toggleActive.mutate({ id: offer._id || offer.id, isActive: v ? 1 : 0 })}
                      data-testid={`switch-offer-active-${offer._id}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                      <TypeIcon className="w-3 h-3 ml-1" />
                      {typeInfo.label}
                    </Badge>
                    {pct > 0 && (
                      <Badge className="bg-primary text-white border-0 text-xs font-black">
                        -{pct}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {offer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    {offer.originalPrice !== offer.offerPrice && (
                      <span className="text-sm text-muted-foreground line-through">{offer.originalPrice.toFixed(2)} <SarIcon /></span>
                    )}
                    <span className="text-lg font-black text-primary">{offer.offerPrice.toFixed(2)} <SarIcon /></span>
                  </div>
                  {(offer.startDate || offer.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {offer.startDate && `من: ${new Date(offer.startDate).toLocaleDateString('ar')}`}
                      {offer.startDate && offer.endDate && " — "}
                      {offer.endDate && `إلى: ${new Date(offer.endDate).toLocaleDateString('ar')}`}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(offer)} data-testid={`button-edit-offer-${offer._id}`}>
                      <Pencil className="w-3.5 h-3.5 ml-1" /> تعديل
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => setDeleteId(offer._id || offer.id)} data-testid={`button-delete-offer-${offer._id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) { setEditingId(null); setForm({ ...defaultForm }); } }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? tc("تعديل العرض", "Edit Offer") : tc("إنشاء عرض جديد", "Create New Offer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{tc("اسم العرض (عربي) *", "Offer Name (Arabic) *")}</Label>
                <Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: باقة الصباح" data-testid="input-offer-nameAr" />
              </div>
              <div>
                <Label>{tc("الاسم (إنجليزي)", "English Name")}</Label>
                <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} placeholder="Morning Bundle" data-testid="input-offer-nameEn" />
              </div>
            </div>
            <div>
              <Label>{tc("الوصف", "Description")}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للعرض..." rows={2} data-testid="input-offer-description" />
            </div>
            <div>
              <Label>{tc("نوع العرض", "Offer Type")}</Label>
              <Select value={form.offerType} onValueChange={v => setForm(f => ({ ...f, offerType: v as any }))}>
                <SelectTrigger data-testid="select-offer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bundle">باقة (Bundle)</SelectItem>
                  <SelectItem value="discount">خصم بالنسبة (Discount)</SelectItem>
                  <SelectItem value="bogo">اشتر واحد واحصل على واحد (BOGO)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>السعر الأصلي (ر.س) *</Label>
                <Input type="number" min="0" step="0.01" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="0.00" data-testid="input-offer-originalPrice" />
              </div>
              <div>
                <Label>سعر العرض (ر.س) *</Label>
                <Input type="number" min="0" step="0.01" value={form.offerPrice} onChange={e => setForm(f => ({ ...f, offerPrice: e.target.value }))} placeholder="0.00" data-testid="input-offer-offerPrice" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البداية</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} data-testid="input-offer-startDate" />
              </div>
              <div>
                <Label>تاريخ النهاية</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} data-testid="input-offer-endDate" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={!!form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v ? 1 : 0 }))} data-testid="switch-offer-isActive" />
              <Label>نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-offer">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "حفظ التغييرات" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">هل أنت متأكد من حذف هذا العرض؟ لا يمكن التراجع.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-offer">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
