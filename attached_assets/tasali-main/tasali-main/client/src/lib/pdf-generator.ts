import type { Order } from "@shared/schema";
import type { PaymentMethod } from "@shared/schema";
import QRCode from "qrcode";

interface CartItem {
 coffeeItemId: string;
 quantity: number;
 coffeeItem?: {
 nameAr: string;
 nameEn: string | null;
 price: string;
 };
}

const paymentMethodNames: Record<string, string> = {
  cash: 'نقدي',
  pos: 'شبكة',
  'pos-network': 'شبكة',
  card: 'شبكة',
  network: 'شبكة',
  delivery: 'الدفع عند التوصيل',
  apple_pay: 'Apple Pay',
  'neoleap-apple-pay': 'Apple Pay',
  'paymob-apple-pay': 'Apple Pay',
  geidea: 'بطاقة ائتمان',
  paymob: 'بطاقة ائتمان',
  'paymob-card': 'بطاقة ائتمان',
  split: 'نقدي + شبكة',
  'qahwa-card': 'بطاقة ولاء',
  'qirox-card': 'بطاقة ولاء',
  loyalty: 'بطاقة ولاء',
};

const paymentDetails: Record<string, string> = {
  cash: 'دفع نقدي',
  pos: 'جهاز نقاط البيع',
  'pos-network': 'جهاز نقاط البيع',
  card: 'جهاز نقاط البيع',
  delivery: 'ادفع عند استلام الطلب',
  apple_pay: 'Apple Pay',
  'neoleap-apple-pay': 'Apple Pay',
  'paymob-apple-pay': 'Apple Pay',
  geidea: 'بطاقة ائتمان إلكترونية',
  paymob: 'بطاقة ائتمان إلكترونية',
  'paymob-card': 'بطاقة ائتمان إلكترونية',
  split: 'دفع مختلط',
  'qahwa-card': 'مشروب مجاني من بطاقة الولاء',
  'qirox-card': 'بطاقة ولاء',
  loyalty: 'بطاقة ولاء',
};

// Simple PDF generation using browser print API
export const generatePDF = async (
  order: Order,
  cartItems: CartItem[],
  paymentMethod: PaymentMethod
): Promise<Blob> => {
  const websiteUrl = 'https://www.tasaliqurmash.com.sa';
  const qrCodeDataURL = await QRCode.toDataURL(websiteUrl, {
    width: 120,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Cairo', sans-serif; direction: rtl; background: white; color: #000; font-size: 14px; line-height: 1.6; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 4px solid #D4AF37; padding-bottom: 25px; background: linear-gradient(135deg, #FFF8DC, #FFFBEB); border-radius: 15px 15px 0 0; padding: 25px 20px; }
  h1 { font-size: 36px; color: #B8860B; margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px; border: 1px solid #ddd; text-align: right; }
  th { background: #f8f9fa; }
  .total { font-size: 18px; font-weight: bold; color: #D4AF37; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>TASALI QURUMSH</h1>
    <p>تجربة تسالي كرومش</p>
  </div>
  <img src="${qrCodeDataURL}" width="100" height="100" />
</div>
<h2 style="text-align:center;color:#D4AF37;">فاتورة استلام الطلب</h2>
<p><strong>العميل:</strong> ${(order.customerInfo as any)?.customerName || 'غير محدد'}</p>
<p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
<p><strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
<p><strong>الوقت:</strong> ${new Date(order.createdAt).toLocaleTimeString('ar-SA')}</p>
<h3>تفاصيل الطلب</h3>
<table>
  <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
  <tbody>
    ${cartItems.map(item => `
    <tr>
      <td>${item.coffeeItem?.nameAr || 'غير محدد'}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:center">${item.coffeeItem?.price || '0'} ريال</td>
      <td style="text-align:center">${(parseFloat(item.coffeeItem?.price || '0') * item.quantity).toFixed(2)} ريال</td>
    </tr>`).join('')}
  </tbody>
</table>
<p class="total">إجمالي المبلغ: ${order.totalAmount} ريال</p>
<p><strong>طريقة الدفع:</strong> ${paymentMethodNames[paymentMethod] || paymentMethod}</p>
<p><strong>التفاصيل:</strong> ${paymentDetails[paymentMethod] || ''}</p>
<div style="text-align:center;margin-top:30px;border-top:2px solid #D4AF37;padding-top:20px;">
  <p style="color:#B8860B;font-weight:bold;">شكراً لاختياركم TASALI QURUMSH</p>
  <p style="color:#8B6F47;font-style:italic;">"تسالي وكرومش .. لكل لحظة نكهة"</p>
</div>
</body></html>`;

  return new Blob([html], { type: 'text/html' });
};

export const printInvoice = async (
  order: Order,
  cartItems: CartItem[],
  paymentMethod: PaymentMethod
): Promise<void> => {
  const blob = await generatePDF(order, cartItems, paymentMethod);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => { win.print(); };
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

declare global {
  interface Window {
    html2canvas?: any;
    jsPDF?: any;
  }
}

export const loadPDFLibraries = async (): Promise<void> => {
  if (!window.html2canvas) {
    try {
      const html2canvas = await import('html2canvas');
      window.html2canvas = html2canvas.default;
    } catch {
      console.warn('html2canvas not available');
    }
  }
};

loadPDFLibraries().catch(console.error);
