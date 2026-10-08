import { useEffect, useRef, useState, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { useCustomer } from "@/contexts/CustomerContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getErrorMessage } from "@/lib/queryClient";
import PaymentMethods from "./payment-methods";
import { generatePDF } from "@/lib/pdf-generator";
import { saveOrderLocally } from "@/lib/local-orders";
import { CreditCard, FileText, MessageCircle, Check, ArrowRight, Coffee, ShoppingCart, Wallet, Star, Phone, Truck, Store, MapPin, Upload, User, Loader2 } from "lucide-react";
import type { PaymentMethodInfo, PaymentMethod } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import GeideaCheckoutWidget from "./geidea-checkout";
import PaymobCheckoutWidget from "./paymob-checkout";
import SarIcon from "@/components/sar-icon";
import { isFlutterWebView, openFlutterPaymentInSafari, withFlutterAppReturn } from "@/lib/platform";

const GEIDEA_METHODS = ['geidea', 'apple_pay', 'neoleap', 'neoleap-apple-pay'];
const PAYMOB_METHODS = ['paymob-card', 'paymob-wallet', 'paymob-apple-pay'];

type CheckoutStep = 'review' | 'delivery' | 'payment' | 'confirmation' | 'success';
type DeliveryType = 'pickup' | 'delivery' | 'curbside' | null;

const CheckoutModal = memo(() => {
 const [, navigate] = useLocation();
 const queryClient = useQueryClient();
 const { t, i18n } = useTranslation();
 const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
 const {
 cartItems,
 isCheckoutOpen,
 hideCheckout,
 clearCart,
 getTotalPrice
 } = useCartStore();
 const { customer } = useCustomer();

 const { toast } = useToast();
  const isCheckingFlutterPayment = useRef(false);
 const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
 const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
 const [orderDetails, setOrderDetails] = useState<any>(null);

 // State for customer form fields
 const [customerName, setCustomerName] = useState(customer?.name || "");
 const [customerPhone, setCustomerPhone] = useState(customer?.phone || "");

 // Vehicle info state
 const [carType, setCarType] = useState(customer?.carType || "");
 const [carColor, setCarColor] = useState(customer?.carColor || "");
 const [carPlate, setCarPlate] = useState("");

 // Delivery/Pickup state
 const [deliveryType, setDeliveryType] = useState<DeliveryType>(null);
 const [selectedBranch, setSelectedBranch] = useState<string>("");
 const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingDeliveryLocation, setIsGettingDeliveryLocation] = useState(false);
 const [deliveryNotes, setDeliveryNotes] = useState("");
 
 // Receipt upload state
 const [receiptFile, setReceiptFile] = useState<File | null>(null);
 const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
 const [showGeideaWidget, setShowGeideaWidget] = useState(false);
 const [showPaymobWidget, setShowPaymobWidget] = useState(false);
 const [paymobCheckoutUrl, setPaymobCheckoutUrl] = useState("");

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/public/branches"],
    enabled: isCheckoutOpen,
  });
  const deliveryBranches = branches.filter((branch) => branch.deliveryEnabled === true);
  const selectedBranchRecord = branches.find((branch) => String(branch.id || branch._id) === selectedBranch);
  const branchOperations = selectedBranchRecord?.operationalSettings || {};
  const branchOrderMethods = branchOperations.orderMethodsConfig || {};
  const branchServiceFeeEnabled = branchOperations.serviceFeeEnabled !== false;
  const branchServiceFee = !branchServiceFeeEnabled
    ? 0
    : getTotalPrice() < Number(branchOperations.serviceFeeLowOrderThreshold ?? 5)
      ? Number(branchOperations.serviceFeeLowOrderAmount ?? 0.35)
      : Number(branchOperations.serviceFeeAmount ?? 0.7);
  const branchDeliveryFee = Number(branchOperations.deliveryPolicy?.feeSar ?? 25);
  const { data: paymentMethods = [] } = useQuery<PaymentMethodInfo[]>({
    queryKey: ["/api/payment-methods", selectedBranch],
    queryFn: async () => {
      const response = await fetch(`/api/payment-methods?branchId=${encodeURIComponent(selectedBranch)}`);
      if (!response.ok) throw new Error("تعذر تحميل طرق الدفع لهذا الفرع");
      return response.json();
    },
    enabled: isCheckoutOpen && !!selectedBranch,
  });

  const captureDeliveryLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "المتصفح لا يدعم تحديد الموقع" });
      return;
    }
    setIsGettingDeliveryLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsGettingDeliveryLocation(false);
      },
      () => {
        setIsGettingDeliveryLocation(false);
        toast({ variant: "destructive", title: "تعذر تحديد موقعك. تحقق من إذن الموقع وحاول مرة أخرى." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!deliveryType) return;
    const candidates = deliveryType === "delivery" ? deliveryBranches : branches;
    const hasSelected = candidates.some((branch) => String(branch.id || branch._id) === selectedBranch);
    if (!hasSelected) setSelectedBranch(String(candidates[0]?.id || candidates[0]?._id || ""));
  }, [branches, deliveryBranches, deliveryType, selectedBranch]);

  useEffect(() => {
    if (!selectedBranchRecord) return;
    const methodEnabled = deliveryType === "delivery"
      ? selectedBranchRecord.deliveryEnabled === true && branchOrderMethods.enableDelivery !== false
      : deliveryType === "curbside"
        ? branchOrderMethods.enableCarPickup !== false && selectedBranchRecord.allowCarOrders !== false
        : deliveryType === "pickup"
          ? branchOrderMethods.enableTakeaway !== false
          : true;
    if (deliveryType && !methodEnabled) setDeliveryType(null);
  }, [branchOrderMethods, deliveryType, selectedBranchRecord]);

 const createOrderMutation = useMutation({
 mutationFn: async (orderData: any) => {
 const response = await apiRequest("POST", "/api/orders", orderData);
 return response.json();
 },
 onSuccess: async (order) => {
 setOrderDetails(order);
 queryClient.invalidateQueries({ queryKey: ["/api/orders/customer"] });
 if (!customer) saveOrderLocally(order.orderNumber);
 if (selectedPaymentMethod === 'cash') {
   handlePaymentConfirmed(order);
 } else if (selectedPaymentMethod && GEIDEA_METHODS.includes(selectedPaymentMethod as string)) {
   setShowGeideaWidget(true);
 } else if (selectedPaymentMethod && PAYMOB_METHODS.includes(selectedPaymentMethod as string)) {
   try {
      const returnUrl = withFlutterAppReturn(
        `${window.location.origin}/payment-return?provider=paymob&orderNumber=${encodeURIComponent(order.orderNumber)}`
      );
     const res = await apiRequest("POST", "/api/payments/init", {
       orderId: order.orderNumber,
       amount: getTotalPrice(),
       currency: "SAR",
       paymentMethod: selectedPaymentMethod,
       customerName: customerName,
       customerPhone: customerPhone,
       customerEmail: customer?.email,
       returnUrl,
     });
     const data = await res.json();
     if (data.success && data.redirectUrl) {
       sessionStorage.setItem('postPaymentRedirect', customer ? '/my-orders' : `/tracking?order=${order.orderNumber}`);
       sessionStorage.setItem('pendingOrderNumber', order.orderNumber);
        if (isFlutterWebView()) {
          if (!openFlutterPaymentInSafari(data.redirectUrl)) {
            throw new Error("تعذّر فتح Safari لبدء الدفع. حاول تحديث التطبيق.");
          }
        } else {
          window.location.href = data.redirectUrl;
        }
     } else {
       toast({ variant: "destructive", title: "خطأ في الدفع", description: data.error || "فشل تهيئة بوابة الدفع" });
       setCurrentStep('confirmation');
     }
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في الدفع", description: error?.message || "تعذر الاتصال ببوابة الدفع" });
     setCurrentStep('confirmation');
   }
 } else {
   setCurrentStep('confirmation');
 }
 },
 onError: (error) => {
 toast({
 variant: "destructive",
 title: "خطأ في إنشاء الطلب",
 description: getErrorMessage(error, "فشل إنشاء الطلب، يرجى المحاولة مرة أخرى"),
 });
 },
 });

 const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 if (file.size > 5 * 1024 * 1024) {
 toast({ variant: "destructive", title: "الملف كبير جداً", description: "يرجى اختيار صورة أقل من 5 ميجابايت" });
 return;
 }
 setReceiptFile(file);
 const reader = new FileReader();
 reader.onloadend = () => setReceiptPreview(reader.result as string);
 reader.readAsDataURL(file);
 }
 };

  const handleProceedDelivery = async () => {
 if (!deliveryType) {
 toast({ variant: "destructive", title: t("delivery.select_branch_error") });
 return;
 }
  if (!selectedBranch) {
 toast({ variant: "destructive", title: t("delivery.select_branch_error") });
 return;
 }
 if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
 toast({ variant: "destructive", title: t("delivery.select_arrival_error") });
 return;
 }
  if (deliveryType === 'delivery' && !deliveryCoordinates) {
    toast({ variant: "destructive", title: "حدد موقع التوصيل قبل المتابعة" });
    return;
  }
  if (deliveryType === "delivery") {
    try {
      const response = await fetch("/api/delivery/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: deliveryCoordinates!.lat,
          longitude: deliveryCoordinates!.lng,
          branchId: selectedBranch,
        }),
      });
      const availability = await response.json();
      if (!response.ok || !availability.canDeliver) {
        toast({ variant: "destructive", title: availability.messageAr || availability.error || "لا يتوفر التوصيل لهذا الموقع" });
        return;
      }
    } catch {
      toast({ variant: "destructive", title: "تعذر التحقق من نطاق التوصيل، حاول مرة أخرى" });
      return;
    }
  }
 if (deliveryType === 'curbside' && (!carType.trim() || !carColor.trim() || !carPlate.trim())) {
   toast({ variant: "destructive", title: t("delivery.select_arrival_error") });
   return;
 }
 setCurrentStep('payment');
 };

 const handleProceedPayment = () => {
 if (!selectedPaymentMethod) {
 toast({ variant: "destructive", title: t("checkout.select_payment") });
 return;
 }
 const selectedMethodInfo = paymentMethods.find(m => m.id === selectedPaymentMethod);
 if (selectedMethodInfo?.requiresReceipt && !receiptFile) {
 toast({ variant: "destructive", title: t("checkout.receipt_required") });
 return;
 }
 if (!customerName || !customerPhone) {
 toast({ variant: "destructive", title: t("checkout.enter_customer_name") });
 return;
 }

    const orderData = {
      items: cartItems.map(item => {
        const inlineAddons = (item as any).selectedItemAddons || [];
        const addonsExtra = inlineAddons.reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
        return {
          coffeeItemId: item.coffeeItemId,
          quantity: item.quantity,
          price: String(Number(item.coffeeItem?.price || 0) + addonsExtra),
          name: item.coffeeItem?.nameAr || "",
          customization: inlineAddons.length > 0 ? { selectedItemAddons: inlineAddons } : undefined,
        };
      }),
       totalAmount: (
         getTotalPrice() +
         branchServiceFee +
         (deliveryType === "delivery" ? branchDeliveryFee : 0)
       ).toString(),
       serviceFee: branchServiceFee,
       vatPercentage: branchOperations.vatPercentage,
      paymentMethod: selectedPaymentMethod,
      status: "pending",
      customerId: customer?.id || null,
      customerInfo: { name: customerName, phone: customerPhone },
      deliveryType: deliveryType,
      carPickup: deliveryType === 'curbside',
      carInfo: deliveryType === 'curbside' ? {
        carType: carType,
        carColor: carColor,
        plateNumber: carPlate
      } : null,
      carType: deliveryType === 'curbside' ? carType : null,
      carColor: deliveryType === 'curbside' ? carColor : null,
      carPlate: deliveryType === 'curbside' ? carPlate : null,
      plateNumber: deliveryType === 'curbside' ? carPlate : null,
      branchId: selectedBranch,
      deliveryAddress: deliveryType === 'delivery' ? {
        fullAddress: deliveryAddress,
        lat: deliveryCoordinates?.lat,
        lng: deliveryCoordinates?.lng,
        zone: "configured-branch-radius",
      } : null,
      deliveryFee: deliveryType === "delivery" ? branchDeliveryFee : 0,
      deliveryNotes: deliveryNotes || null,
      paymentReceiptUrl: receiptPreview || null,
      customerPhone: customerPhone,
    };
 createOrderMutation.mutate(orderData);
 };

  const handlePaymentConfirmed = async (order: any) => {
   setCurrentStep('success');
   toast({ title: t("checkout.order_success") });
   try {
     const configRes = await fetch("/api/business-config");
     const config = configRes.ok ? await configRes.json() : null;
     if (config?.employeeInvoiceEnabled) {
       const { printBulkEmployeeInvoices } = await import("@/lib/print-utils");
       await printBulkEmployeeInvoices([order]);
     } else {
       const pdfBlob = await generatePDF(order, cartItems as any, selectedPaymentMethod as any);
       const url = URL.createObjectURL(pdfBlob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `invoice-${order.orderNumber}.pdf`;
       link.click();
       URL.revokeObjectURL(url);
     }
   } catch (_) {}
   setTimeout(() => {
     clearCart();
     hideCheckout();
     navigate(customer ? "/my-orders" : `/tracking?order=${order.orderNumber}`);
   }, 2000);
  };

  useEffect(() => {
    if (!isFlutterWebView()) return;

    const checkPaymentAfterReturn = async () => {
      const orderNumber = sessionStorage.getItem("pendingOrderNumber");
      if (!orderNumber || isCheckingFlutterPayment.current) return;

      isCheckingFlutterPayment.current = true;
      try {
        const response = await fetch(`/api/payments/order-status/${encodeURIComponent(orderNumber)}`);
        const data = await response.json();
        if (!response.ok || data.paid !== true) return;

        const storedRedirect = sessionStorage.getItem("postPaymentRedirect");
        const redirect = storedRedirect?.startsWith("/") && !storedRedirect.startsWith("//")
          ? storedRedirect
          : customer ? "/my-orders" : `/tracking?order=${encodeURIComponent(orderNumber)}`;
        sessionStorage.removeItem("pendingOrderNumber");
        sessionStorage.removeItem("postPaymentRedirect");
        clearCart();
        hideCheckout();
        toast({ title: t("checkout.order_success"), description: `رقم طلبك: #${orderNumber}` });
        navigate(redirect);
      } catch {
        // Leave checkout open; the customer can check the order again later.
      } finally {
        isCheckingFlutterPayment.current = false;
      }
    };

    window.addEventListener("blackrose-app-resumed", checkPaymentAfterReturn);
    return () => window.removeEventListener("blackrose-app-resumed", checkPaymentAfterReturn);
  }, [clearCart, customer, hideCheckout, navigate, t, toast]);

 const handleClose = () => {
 hideCheckout();
 setCurrentStep('review');
 setOrderDetails(null);
 setSelectedPaymentMethod(null);
 setDeliveryType(null);
 setReceiptFile(null);
 setReceiptPreview(null);
 setShowGeideaWidget(false);
 };

 const steps = [
 { id: 'review', title: t('checkout.step_review'), icon: ShoppingCart },
 { id: 'delivery', title: t('checkout.step_delivery'), icon: Truck },
 { id: 'payment', title: t('checkout.step_payment'), icon: Wallet },
 { id: 'confirmation', title: t('checkout.step_confirmation'), icon: Check },
 { id: 'success', title: t('checkout.step_success'), icon: Star },
 ];

 const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);

 return (
<>
 <Dialog open={isCheckoutOpen} onOpenChange={handleClose} data-testid="modal-checkout">
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-card to-background border-primary/30" dir={dir}>
 <DialogHeader className="text-center pb-6">
 <DialogTitle className="flex items-center justify-center text-3xl font-bold text-primary font-amiri" data-testid="text-checkout-modal-title">
 <Coffee className="w-8 h-8 ml-3" />
 {t('checkout.complete_order')}
 </DialogTitle>
 <p className="text-muted-foreground mt-2">"{t('checkout.slogan')}"</p>
 </DialogHeader>

 <div className="flex items-center justify-center mb-8">
 <div className="flex items-center space-x-4 space-x-reverse">
 {steps.map((step, index) => {
 const isActive = step.id === currentStep;
 const isCompleted = index < getCurrentStepIndex();
 const StepIcon = step.icon;
 return (
 <div key={step.id} className="flex items-center">
 <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${isActive ? 'bg-primary border-primary text-primary-foreground' : (isCompleted ? 'bg-primary/20 border-primary text-primary' : 'bg-muted border-muted-foreground/30 text-muted-foreground')}`}>
 {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
 </div>
 {index < steps.length - 1 && <div className={`w-12 h-1 mx-2 rounded-full ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />}
 </div>
 );
 })}
 </div>
 </div>

 <div className="space-y-6">
 {currentStep === 'review' && (
 <div className="space-y-6 animate-in fade-in duration-500">
 {!customer && (
 <Card>
 <CardHeader><CardTitle className="text-right flex items-center gap-2"><User className="w-5 h-5" /> {t('checkout.customer_info')}</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div><Label>{t('checkout.full_name')}</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} dir={dir} /></div>
 <div><Label>{t('checkout.phone')}</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} dir="ltr" /></div>
 </CardContent>
 </Card>
 )}
 <div className="bg-card/50 rounded-xl p-6 border border-primary/20">
 <h3 className="text-lg font-semibold mb-4 flex items-center"><ShoppingCart className="w-5 h-5 ml-2" /> {t('checkout.order_summary')}</h3>
 <div className="space-y-3 mb-4">
 {cartItems.map((item) => (
 <div key={item.coffeeItemId} className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
 <span>{i18n.language === 'ar' ? item.coffeeItem?.nameAr : (item.coffeeItem?.nameEn || item.coffeeItem?.nameAr)} × {item.quantity}</span>
 <span className="font-semibold text-primary">{(Number(item.coffeeItem?.price || 0) * item.quantity).toFixed(2)} <SarIcon /></span>
 </div>
 ))}
 </div>
 <div className="border-t border-primary/30 pt-4"><div className="flex justify-between items-center bg-primary/10 p-4 rounded-lg"><span className="text-lg font-semibold">{t('checkout.total')}</span><span className="text-2xl font-bold text-primary">{getTotalPrice().toFixed(2)} <SarIcon /></span></div></div>
 </div>
 <Button onClick={() => setCurrentStep('delivery')} size="lg" className="w-full">{t('checkout.continue')}</Button>
 </div>
 )}

 {currentStep === 'delivery' && (
 <div className="space-y-6 animate-in fade-in duration-500">
 <div className="bg-card/50 rounded-xl p-6 border border-primary/20">
 <RadioGroup value={deliveryType || ""} onValueChange={(v) => setDeliveryType(v as DeliveryType)}>
 <div className="space-y-4">
  <div className={`p-4 rounded-lg border-2 ${deliveryType === 'pickup' ? 'border-primary bg-primary/10' : 'border-border'}`} onClick={() => setDeliveryType('pickup')}>
  <div className="flex items-center space-x-3 space-x-reverse"><RadioGroupItem value="pickup" id="pickup" /><Label htmlFor="pickup" className="font-semibold">{t('checkout.branch_pickup')}</Label></div>
  </div>
  {deliveryBranches.length > 0 && (
    <div className={`p-4 rounded-lg border-2 ${deliveryType === 'delivery' ? 'border-primary bg-primary/10' : 'border-border'}`} onClick={() => setDeliveryType('delivery')}>
      <div className="flex items-center space-x-3 space-x-reverse">
        <RadioGroupItem value="delivery" id="delivery" />
        <Label htmlFor="delivery" className="font-semibold">{t('checkout.home_delivery_price')}</Label>
      </div>
      {deliveryType === 'delivery' && (
        <div className="mt-3 space-y-3">
          <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder={t('checkout.delivery_address_placeholder')} dir={dir} />
          <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder={t('checkout.notes_placeholder')} dir={dir} />
          <Button type="button" variant="outline" onClick={captureDeliveryLocation} disabled={isGettingDeliveryLocation}>
            <MapPin className="me-2 h-4 w-4" />
            {isGettingDeliveryLocation ? "جارٍ تحديد الموقع…" : deliveryCoordinates ? "تم تحديد موقعك" : "حدد موقعي للتوصيل"}
          </Button>
          {deliveryCoordinates && (
            <p className="text-xs text-muted-foreground" dir="ltr">{deliveryCoordinates.lat.toFixed(6)}, {deliveryCoordinates.lng.toFixed(6)}</p>
          )}
        </div>
      )}
    </div>
  )}
                   <div className={`p-4 rounded-lg border-2 ${deliveryType === 'curbside' ? 'border-primary bg-primary/10' : 'border-border'}`} onClick={() => setDeliveryType('curbside')}>
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <RadioGroupItem value="curbside" id="curbside" />
                      <Label htmlFor="curbside" className="font-semibold flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        {t('delivery.car_pickup')}
                      </Label>
                    </div>
                    {deliveryType === 'curbside' && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t('delivery.car_model')}</Label>
                            <Input
                              value={carType}
                              onChange={(e) => setCarType(e.target.value)}
                              placeholder={t('checkout.car_model_placeholder')}
                              dir={dir}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('delivery.car_color')}</Label>
                            <Input
                              value={carColor}
                              onChange={(e) => setCarColor(e.target.value)}
                              placeholder={t('checkout.car_color_placeholder')}
                              dir={dir}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('delivery.car_plate')}</Label>
                          <Input
                            value={carPlate}
                            onChange={(e) => setCarPlate(e.target.value)}
                            placeholder={t('checkout.car_plate_placeholder')}
                            dir={dir}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
              {deliveryType && (
                <div className="space-y-2">
                  <Label htmlFor="checkout-branch-select">{t('checkout.select_branch_placeholder')}</Label>
                  <select
                    id="checkout-branch-select"
                    value={selectedBranch}
                    onChange={(event) => setSelectedBranch(event.target.value)}
                    className="w-full rounded border bg-background p-2"
                  >
                    <option value="">{t('checkout.select_branch_placeholder')}</option>
                    {(deliveryType === "delivery" ? deliveryBranches : branches).map((branch) => (
                      <option key={branch.id || branch._id} value={branch.id || branch._id}>
                        {i18n.language === "ar" ? branch.nameAr : (branch.nameEn || branch.nameAr)}
                      </option>
                    ))}
                  </select>
                  {selectedBranchRecord && (
                    <div className="rounded-lg border p-3 text-sm">
                      <p>{t("checkout.total")}: {(getTotalPrice() + branchServiceFee + (deliveryType === "delivery" ? branchDeliveryFee : 0)).toFixed(2)} <SarIcon /></p>
                      {branchServiceFee > 0 && <p className="text-muted-foreground">رسوم الخدمة: {branchServiceFee.toFixed(2)} <SarIcon /></p>}
                      {deliveryType === "delivery" && <p className="text-muted-foreground">رسوم التوصيل: {branchDeliveryFee.toFixed(2)} <SarIcon /></p>}
                    </div>
                  )}
                </div>
              )}
 </div>
 <div className="flex gap-3"><Button variant="outline" onClick={() => setCurrentStep('review')} className="flex-1">{t('checkout.back')}</Button><Button onClick={handleProceedDelivery} className="flex-1">{t('checkout.continue')}</Button></div>
 </div>
 )}

 {currentStep === 'payment' && (
 <div className="space-y-6 animate-in fade-in duration-500">
   {showGeideaWidget && orderDetails ? (
     <GeideaCheckoutWidget
       orderNumber={orderDetails.orderNumber}
       amount={getTotalPrice()}
       customerPhone={customerPhone}
       customerEmail={customer?.email}
       onSuccess={() => {
         setShowGeideaWidget(false);
         handlePaymentConfirmed(orderDetails);
       }}
       onError={(msg) => {
         setShowGeideaWidget(false);
         toast({ variant: "destructive", title: "فشل الدفع", description: msg });
       }}
       onCancel={() => {
         setShowGeideaWidget(false);
       }}
     />
   ) : (
     <>
       <div className="bg-card/50 rounded-xl p-6 border border-primary/20">
         <PaymentMethods paymentMethods={paymentMethods} selectedMethod={selectedPaymentMethod} onSelectMethod={setSelectedPaymentMethod} comingSoon={false} />
         {selectedPaymentMethod && paymentMethods.find(m => m.id === selectedPaymentMethod)?.requiresReceipt && (
           <div className="mt-4 p-4 border-2 border-dashed rounded-lg text-center">
             <Label htmlFor="receipt-upload" className="cursor-pointer">
               {receiptPreview ? <img src={receiptPreview} className="max-h-32 mx-auto" /> : <div><Upload className="mx-auto" /> {t('checkout.upload_receipt')}</div>}
             </Label>
             <input id="receipt-upload" type="file" onChange={handleReceiptUpload} className="hidden" />
           </div>
         )}
       </div>

       <div className="flex gap-3">
         <Button variant="outline" onClick={() => setCurrentStep('delivery')} className="flex-1" disabled={createOrderMutation.isPending}>
           {t('checkout.back')}
         </Button>
         <Button
           onClick={handleProceedPayment}
           disabled={createOrderMutation.isPending}
           className="flex-1"
           data-testid="button-confirm-order"
         >
           {createOrderMutation.isPending ? (
             <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> جاري المعالجة...</>
           ) : selectedPaymentMethod && GEIDEA_METHODS.includes(selectedPaymentMethod as string) ? (
             <><CreditCard className="w-4 h-4 mr-2" /> الدفع الآن</>
          ) : selectedPaymentMethod && PAYMOB_METHODS.includes(selectedPaymentMethod as string) ? (
            <><CreditCard className="w-4 h-4 mr-2" /> الدفع الآن</>
           ) : t('checkout.confirm_order')}
         </Button>
       </div>
     </>
   )}
 </div>
 )}
 </div>
 </DialogContent>
 </Dialog>

 {showPaymobWidget && orderDetails && paymobCheckoutUrl && (
   <PaymobCheckoutWidget
     orderNumber={orderDetails.orderNumber}
     amount={getTotalPrice()}
     checkoutUrl={paymobCheckoutUrl}
     onSuccess={() => {
       setShowPaymobWidget(false);
       handlePaymentConfirmed(orderDetails);
     }}
     onError={(msg) => {
       setShowPaymobWidget(false);
       toast({ variant: "destructive", title: "فشل الدفع", description: msg });
     }}
     onCancel={() => {
       setShowPaymobWidget(false);
       setPaymobCheckoutUrl("");
       toast({ title: "تم إغلاق نافذة الدفع", description: "إذا تم سحب المال، سيظهر طلبك في 'طلباتي' خلال لحظات." });
     }}
   />
 )}

</>
 );
});

export default CheckoutModal;
